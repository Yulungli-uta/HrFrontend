// hooks/useNotificationWebSocket.ts
import { useEffect, useState, useCallback, useRef } from "react";
import * as signalR from "@microsoft/signalr";
import { getBrowserId } from "@/utils/browserId";
import { logger } from "@/lib/logger";

const DEBUG = import.meta.env.VITE_DEBUG_AUTH === "true";

export interface WebSocketMessage {
  eventId?: string;
  eventType: string;
  timestamp: string;

  browserId?: string; // 🔥 requerido por AuthContext v6

  context?: {
    initiatingApplication?: string;
    loginSource?: string;
    sessionScope?: string;
    notificationType?: string;
    /** LoginFailed: categoría genérica del fallo (ver azureLoginMessages.ts). */
    code?: string;
    /** LoginFailed: referencia corta que soporte puede buscar en el log del servidor. */
    reference?: string;
  };

  data?: {
    userId: string;
    email: string;
    displayName: string;
    loginType?: string;
    ipAddress?: string;
    roles?: string[];
    permissions?: any[];
  };

  pair?: {
    accessToken: string;
    refreshToken: string;
  };

  // PKCE (RFC 7636): cuando el servidor tiene SecureTokenDelivery activo, el par de
  // tokens NO viaja aquí — solo esta referencia de un solo uso, canjeable en
  // POST /api/auth/azure/exchange junto con el codeVerifier (ver AuthContext.tsx).
  deliveryCode?: string;
}

export interface UseNotificationWebSocketOptions {
  /**
   * Se invoca de forma síncrona por CADA mensaje recibido. `lastMessage` solo conserva el último:
   * si llegan dos seguidos en el mismo ciclo de render, el primero se pierde. Los eventos que no
   * pueden perderse (login) deben consumirse por aquí.
   */
  onMessage?: (msg: WebSocketMessage) => void;
  /** Se invoca cada vez que la conexión queda lista (inicial o tras reconectar) con los grupos ya unidos. */
  onConnected?: () => void;
}

interface UseNotificationWebSocketReturn {
  isConnected: boolean;
  connection: signalR.HubConnection | null;
  lastMessage: WebSocketMessage | null;
  sendMessage: (msg: any) => Promise<void>;
  reconnect: () => Promise<void>;
  disconnect: () => Promise<void>;
  /** Espera (hasta `timeoutMs`) a que la conexión esté lista; false si no se logró. Nunca lanza. */
  ensureConnected: (timeoutMs?: number) => Promise<boolean>;
}

const HUB_URL =
  import.meta.env.VITE_NOTIFICATION_HUB_URL ||
  "http://localhost:5010/notificationHub";

/** withAutomaticReconnect() se rinde tras ~45 s; después de eso se reintenta con esta espera creciente. */
const RECONNECT_DELAYS_MS = [2_000, 5_000, 10_000, 20_000, 30_000];

// ----------------------------------------------------------------------

export function useNotificationWebSocket(
  clientId: string | null,
  options: UseNotificationWebSocketOptions = {}
): UseNotificationWebSocketReturn {
  const [connection, setConnection] = useState<signalR.HubConnection | null>(
    null
  );
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);

  const reconnectingRef = useRef(false);
  const connectionRef = useRef<signalR.HubConnection | null>(null);
  const connectedRef = useRef(false);
  const stoppedRef = useRef(false);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCountRef = useRef(0);

  // Los callbacks del llamador se guardan en refs para que cambiarlos no reconecte el hub.
  const onMessageRef = useRef(options.onMessage);
  const onConnectedRef = useRef(options.onConnected);
  onMessageRef.current = options.onMessage;
  onConnectedRef.current = options.onConnected;

  const browserId = getBrowserId();

  const markConnected = useCallback((value: boolean) => {
    connectedRef.current = value;
    setIsConnected(value);
  }, []);

  const clearRetryTimer = useCallback(() => {
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
  }, []);

  // ----------------------------------------------------------------------
  const connectWebSocket = useCallback(async () => {
    if (!clientId) {
      logger.auth.warn("[WS] No clientId → skip connect");
      return;
    }

    if (!browserId) {
      logger.auth.warn("[WS] No browserId → skip connect");
      return;
    }

    if (reconnectingRef.current) {
      logger.auth.warn("[WS] Already reconnecting, skip");
      return;
    }

    clearRetryTimer();
    let hub: signalR.HubConnection | null = null;

    try {
      reconnectingRef.current = true;

      const url = `${HUB_URL}?clientId=${encodeURIComponent(
        clientId
      )}&browserId=${encodeURIComponent(browserId)}`;

      logger.auth.debug("[WS] Connecting to hub");

      const created = new signalR.HubConnectionBuilder()
        .withUrl(url)
        .withAutomaticReconnect()
        .configureLogging(DEBUG ? signalR.LogLevel.Information : signalR.LogLevel.None)
        .build();
      hub = created;

      // Los mensajes llegan al llamador uno por uno (onMessage) y además quedan en lastMessage.
      const dispatch = (msg: WebSocketMessage) => {
        try {
          onMessageRef.current?.(msg);
        } catch (e) {
          logger.auth.error("[WS] onMessage handler error:", e);
        }
        setLastMessage(msg);
      };

      created.on("connected", () => {
        logger.auth.debug("[WS] Server connected callback");
      });

      created.on("ReceiveNotification", (msg: WebSocketMessage) => {
        logger.auth.debug("[WS] ReceiveNotification:", msg?.eventType);
        dispatch(msg);
      });

      created.on("LoginNotification", (msg: WebSocketMessage) => {
        logger.auth.debug("[WS] LoginNotification:", msg?.eventType);
        dispatch(msg);
      });

      created.onreconnecting(() => {
        logger.auth.debug("[WS] Reconnecting");
        markConnected(false);
      });

      created.onreconnected(async () => {
        logger.auth.debug("[WS] Reconnected");

        try {
          // Sin volver a unirse a los grupos el servidor no puede avisar a esta pestaña.
          await created.invoke("JoinApplicationGroup", clientId, "UTA-Licencias");
          await created.invoke("JoinBrowserGroup", clientId, browserId);
          markConnected(true);
          onConnectedRef.current?.();
        } catch (e) {
          logger.auth.error("[WS] Error rejoining groups:", e);
          // Conexión viva pero sin grupos: es inútil. Se cierra y onclose programa un reintento limpio.
          void created.stop();
        }
      });

      // Cuando withAutomaticReconnect agota sus intentos (o el servidor cierra) la conexión queda
      // muerta para siempre: se programa un reintento propio en vez de esperar una recarga de página.
      created.onclose(() => {
        // Solo cuenta el cierre de la conexión vigente: el de un hub ya reemplazado o detenido a propósito
        // (desmontaje, StrictMode) no debe marcar como caída a la conexión nueva.
        if (connectionRef.current !== created) return;
        logger.auth.debug("[WS] Disconnected");
        connectionRef.current = null;
        setConnection(null);
        markConnected(false);
        scheduleReconnectRef.current();
      });

      await created.start();

      logger.auth.debug("[WS] Connected OK");

      await created.invoke("JoinApplicationGroup", clientId, "UTA-Licencias");
      await created.invoke("JoinBrowserGroup", clientId, browserId);

      if (stoppedRef.current) {
        // El hook se desmontó mientras conectaba: no dejar una conexión huérfana.
        void created.stop();
        return;
      }

      connectionRef.current = created;
      setConnection(created);
      retryCountRef.current = 0;
      markConnected(true);
      onConnectedRef.current?.();
    } catch (error) {
      logger.auth.error("[WS] Connection failed:", error);
      if (hub) {
        // Una conexión iniciada pero sin grupos no sirve; onclose (si ya se registró) reintentará.
        try {
          await hub.stop();
        } catch {
          /* ignore */
        }
      }
      scheduleReconnectRef.current();
    } finally {
      reconnectingRef.current = false;
    }
  }, [clientId, browserId, clearRetryTimer, markConnected]);

  // El reintento llama a connectWebSocket, que a su vez programa reintentos: se enlazan por ref.
  const scheduleReconnectRef = useRef<() => void>(() => { });
  scheduleReconnectRef.current = () => {
    if (stoppedRef.current || retryTimerRef.current) return;
    const delay =
      RECONNECT_DELAYS_MS[Math.min(retryCountRef.current, RECONNECT_DELAYS_MS.length - 1)];
    retryCountRef.current += 1;
    logger.auth.debug(`[WS] Reintento de conexión en ${delay} ms`);
    retryTimerRef.current = setTimeout(() => {
      retryTimerRef.current = null;
      if (!stoppedRef.current && !connectedRef.current) void connectWebSocket();
    }, delay);
  };

  // ----------------------------------------------------------------------

  const disconnectWebSocket = useCallback(async () => {
    stoppedRef.current = true;
    clearRetryTimer();
    const hub = connectionRef.current;
    if (hub) {
      logger.auth.debug("[WS] Disconnect requested");

      connectionRef.current = null;
      try {
        await hub.stop();
      } catch (e) {
        logger.auth.error("[WS] Error stopping hub:", e);
      }

      markConnected(false);
      setConnection(null);
    }
  }, [clearRetryTimer, markConnected]);

  // ----------------------------------------------------------------------

  useEffect(() => {
    stoppedRef.current = false;
    if (clientId) void connectWebSocket();

    return () => {
      void disconnectWebSocket();
    };
  }, [clientId, connectWebSocket, disconnectWebSocket]);

  // Al volver a la pestaña (típico en celular tras usar Microsoft/Authenticator) el navegador pudo haber
  // cortado la conexión: se reconecta de inmediato en vez de esperar al siguiente reintento programado.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      if (stoppedRef.current || connectedRef.current || !clientId) return;
      void connectWebSocket();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [clientId, connectWebSocket]);

  // ----------------------------------------------------------------------

  const sendMessage = useCallback(
    async (msg: any) => {
      if (!connectionRef.current || !isConnected) {
        logger.auth.warn("[WS] sendMessage ignored → not connected");
        return;
      }

      try {
        await connectionRef.current.invoke("SendMessage", msg);
      } catch (error) {
        logger.auth.error("[WS] SendMessage error:", error);
      }
    },
    [isConnected]
  );

  // ----------------------------------------------------------------------

  const ensureConnected = useCallback(
    async (timeoutMs = 3_000): Promise<boolean> => {
      if (connectedRef.current) return true;
      if (!stoppedRef.current && !reconnectingRef.current) void connectWebSocket();

      const deadline = Date.now() + timeoutMs;
      while (Date.now() < deadline) {
        if (connectedRef.current) return true;
        await new Promise((resolve) => setTimeout(resolve, 150));
      }
      return connectedRef.current;
    },
    [connectWebSocket]
  );

  // ----------------------------------------------------------------------

  return {
    isConnected,
    connection,
    lastMessage,
    sendMessage,
    reconnect: connectWebSocket,
    disconnect: disconnectWebSocket,
    ensureConnected,
  };
}

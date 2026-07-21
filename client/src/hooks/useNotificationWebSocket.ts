// hooks/useNotificationWebSocket.ts — VERSIÓN FINAL OPTIMIZADA
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

interface UseNotificationWebSocketReturn {
  isConnected: boolean;
  connection: signalR.HubConnection | null;
  lastMessage: WebSocketMessage | null;
  sendMessage: (msg: any) => Promise<void>;
  reconnect: () => Promise<void>;
  disconnect: () => Promise<void>;
}

const HUB_URL =
  import.meta.env.VITE_NOTIFICATION_HUB_URL ||
  "http://localhost:5010/notificationHub";

// ----------------------------------------------------------------------

export function useNotificationWebSocket(
  clientId: string | null
): UseNotificationWebSocketReturn {
  const [connection, setConnection] = useState<signalR.HubConnection | null>(
    null
  );
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);

  const reconnectingRef = useRef(false);
  const connectionRef = useRef<signalR.HubConnection | null>(null);

  const browserId = getBrowserId();

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

    try {
      reconnectingRef.current = true;

      const url = `${HUB_URL}?clientId=${encodeURIComponent(
        clientId
      )}&browserId=${encodeURIComponent(browserId)}`;

      logger.auth.debug("[WS] Connecting to hub");

      // const hub = new signalR.HubConnectionBuilder()
      //   .withUrl(url, {
      //     skipNegotiation: true,
      //     transport: signalR.HttpTransportType.WebSockets,
      //   })
      //   .withAutomaticReconnect()
      //   .configureLogging(DEBUG ? signalR.LogLevel.Information : signalR.LogLevel.None)
      //   .build();

      const hub = new signalR.HubConnectionBuilder()
        .withUrl(url)
        .withAutomaticReconnect()
        .configureLogging(DEBUG ? signalR.LogLevel.Information : signalR.LogLevel.None)
        .build();
        
      // 🔥 Un solo handler unificado
      hub.on("connected", (msg: any) => {
        logger.auth.debug("[WS] Server connected callback");
      });

      hub.on("ReceiveNotification", (msg: WebSocketMessage) => {
        logger.auth.debug("[WS] ReceiveNotification:", msg?.eventType);
        setLastMessage(msg);
      });

      hub.on("LoginNotification", (msg: WebSocketMessage) => {
        logger.auth.debug("[WS] LoginNotification:", msg?.eventType);
        setLastMessage(msg);
      });

      hub.onreconnected(async () => {
        logger.auth.debug("[WS] Reconnected");

        setIsConnected(true);

        try {
          await hub.invoke("JoinApplicationGroup", clientId, "UTA-Licencias");
          await hub.invoke("JoinBrowserGroup", clientId, browserId);
        } catch (e) {
          logger.auth.error("[WS] Error rejoining groups:", e);
        }
      });

      hub.onclose(() => {
        logger.auth.debug("[WS] Disconnected");
        setIsConnected(false);
      });

      await hub.start();

      logger.auth.debug("[WS] Connected OK");

      // await hub.invoke("JoinApplicationGroup", clientId);
      // await hub.invoke("JoinBrowserGroup", clientId, browserId);
      await hub.invoke("JoinApplicationGroup", clientId, "UTA-Licencias");
      await hub.invoke("JoinBrowserGroup", clientId, browserId);

      connectionRef.current = hub;
      setConnection(hub);
      setIsConnected(true);
    } catch (error) {
      logger.auth.error("[WS] Connection failed:", error);
    } finally {
      reconnectingRef.current = false;
    }
  }, [clientId, browserId]);

  // ----------------------------------------------------------------------

  const disconnectWebSocket = useCallback(async () => {
    if (connectionRef.current) {
      logger.auth.debug("[WS] Disconnect requested");

      await connectionRef.current.stop();
      connectionRef.current = null;

      setIsConnected(false);
      setConnection(null);
    }
  }, []);

  // ----------------------------------------------------------------------

  useEffect(() => {
    if (clientId) connectWebSocket();

    return () => {
      disconnectWebSocket();
    };
  }, [clientId, connectWebSocket, disconnectWebSocket]);

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

  return {
    isConnected,
    connection,
    lastMessage,
    sendMessage,
    reconnect: connectWebSocket,
    disconnect: disconnectWebSocket,
  };
}

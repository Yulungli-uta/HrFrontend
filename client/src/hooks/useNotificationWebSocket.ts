// hooks/useNotificationWebSocket.ts — VERSIÓN FINAL OPTIMIZADA
import { useEffect, useState, useCallback, useRef } from "react";
import * as signalR from "@microsoft/signalr";
import { getBrowserId } from "@/utils/browserId";

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
      DEBUG && console.warn("[WS] No clientId → skip connect");
      return;
    }

    if (!browserId) {
      DEBUG && console.warn("[WS] No browserId → skip connect");
      return;
    }

    if (reconnectingRef.current) {
      DEBUG && console.warn("[WS] Already reconnecting, skip");
      return;
    }

    try {
      reconnectingRef.current = true;

      const url = `${HUB_URL}?clientId=${encodeURIComponent(
        clientId
      )}&browserId=${encodeURIComponent(browserId)}`;

      DEBUG && console.log("[WS] Connecting to:", url);

      // const hub = new signalR.HubConnectionBuilder()
      //   .withUrl(url, {
      //     skipNegotiation: true,
      //     transport: signalR.HttpTransportType.WebSockets,
      //   })
      //   .withAutomaticReconnect()
      //   .configureLogging(DEBUG ? signalR.LogLevel.Information : signalR.LogLevel.None)
      //   .build();

      const hub = new signalR.HubConnectionBuilder()
        .withUrl(url /*, aquí luego metes accessTokenFactory si lo necesitas */)
        .withAutomaticReconnect()
        .configureLogging(DEBUG ? signalR.LogLevel.Information : signalR.LogLevel.None)
        .build();
        
      // 🔥 Un solo handler unificado
      hub.on("connected", (msg: any) => {
        if (DEBUG) console.log("[WS] Server connected callback:", msg);
      });

      hub.on("ReceiveNotification", (msg: WebSocketMessage) => {
        DEBUG && console.log("[WS] ReceiveNotification:", msg);
        setLastMessage(msg);
      });

      hub.on("LoginNotification", (msg: WebSocketMessage) => {
        DEBUG && console.log("[WS] LoginNotification:", msg);
        setLastMessage(msg);
      });

      hub.onreconnected(async () => {
        DEBUG && console.log("[WS] Reconnected");

        setIsConnected(true);

        try {
          await hub.invoke("JoinApplicationGroup", clientId, "UTA-Licencias");
          await hub.invoke("JoinBrowserGroup", clientId, browserId);
        } catch (e) {
          console.error("[WS] Error rejoining groups:", e);
        }
      });

      hub.onclose(() => {
        DEBUG && console.log("[WS] Disconnected");
        setIsConnected(false);
      });

      await hub.start();

      DEBUG && console.log("[WS] Connected OK");

      // await hub.invoke("JoinApplicationGroup", clientId);
      // await hub.invoke("JoinBrowserGroup", clientId, browserId);
      await hub.invoke("JoinApplicationGroup", clientId, "UTA-Licencias");
      await hub.invoke("JoinBrowserGroup", clientId, browserId);

      connectionRef.current = hub;
      setConnection(hub);
      setIsConnected(true);
    } catch (error) {
      console.error("[WS] Connection failed:", error);
    } finally {
      reconnectingRef.current = false;
    }
  }, [clientId, browserId]);

  // ----------------------------------------------------------------------

  const disconnectWebSocket = useCallback(async () => {
    if (connectionRef.current) {
      DEBUG && console.log("[WS] Disconnect requested");

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
        DEBUG && console.warn("[WS] sendMessage ignored → not connected");
        return;
      }

      try {
        await connectionRef.current.invoke("SendMessage", msg);
      } catch (error) {
        console.error("[WS] SendMessage error:", error);
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

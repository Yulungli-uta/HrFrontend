// hooks/useNotificationWebSocket.ts
import { useEffect, useState, useCallback, useRef } from 'react';
import * as signalR from '@microsoft/signalr';

export interface WebSocketMessage {
  eventType: string;
  timestamp: string;
  context: {
    initiatingApplication: string;
    loginSource: string;
    sessionScope: string;
    notificationType: string;
  };
  data: {
    userId: string;
    email: string;
    displayName: string;
    loginType: string;
    ipAddress: string;
    roles: string[];
    permissions: any[];
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
  sendMessage: (message: any) => Promise<void>;
  reconnect: () => Promise<void>;
  disconnect: () => Promise<void>;
}

export const useNotificationWebSocket = (clientId: string | null): UseNotificationWebSocketReturn => {
  const [connection, setConnection] = useState<signalR.HubConnection | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const connectionRef = useRef<signalR.HubConnection | null>(null);

  const connectWebSocket = useCallback(async () => {
    if (!clientId) return;

    try {
      const newConnection = new signalR.HubConnectionBuilder()
        .withUrl('http://localhost:5010/notificationHub', {
          skipNegotiation: true,
          transport: signalR.HttpTransportType.WebSockets
        })
        .withAutomaticReconnect()
        .build();

      newConnection.on('ReceiveNotification', (data: WebSocketMessage) => {
        console.log('Notification received:', data);
        setLastMessage(data);
      });

      newConnection.on('LoginNotification', (data: WebSocketMessage) => {
        console.log('Login notification received:', data);
        setLastMessage(data);
      });

      newConnection.onreconnected(() => {
        console.log('WebSocket reconnected');
        setIsConnected(true);
        if (clientId) {
          newConnection.invoke('JoinApplicationGroup', clientId, null);
        }
      });

      newConnection.onclose(() => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
      });

      await newConnection.start();
      console.log('WebSocket connected');
      
      if (clientId) {
        await newConnection.invoke('JoinApplicationGroup', clientId, null);
      }
      
      setConnection(newConnection);
      connectionRef.current = newConnection;
      setIsConnected(true);

    } catch (error) {
      console.error('Error connecting to WebSocket:', error);
    }
  }, [clientId]);

  const disconnectWebSocket = useCallback(async () => {
    if (connectionRef.current) {
      await connectionRef.current.stop();
      connectionRef.current = null;
      setConnection(null);
      setIsConnected(false);
    }
  }, []);

  useEffect(() => {
  console.log('WebSocket connection status changed:', isConnected);
}, [isConnected]);

  useEffect(() => {
    if (clientId) {
      connectWebSocket();
    }

    return () => {
      disconnectWebSocket();
    };
  }, [clientId, connectWebSocket, disconnectWebSocket]);

  const sendMessage = useCallback(async (message: any) => {
    if (connectionRef.current && isConnected) {
      try {
        await connectionRef.current.invoke('SendMessage', message);
      } catch (error) {
        console.error('Error sending message:', error);
      }
    }
  }, [isConnected]);

  return {
    isConnected,
    connection,
    lastMessage,
    sendMessage,
    reconnect: connectWebSocket,
    disconnect: disconnectWebSocket
  };
};
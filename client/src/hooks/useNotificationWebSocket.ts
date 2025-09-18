import { useEffect, useState, useCallback, useRef } from 'react';
import * as signalR from '@microsoft/signalr';

export const useNotificationWebSocket = (clientId: string | null) => {
    const [connection, setConnection] = useState<signalR.HubConnection | null>(null);
    const [isConnected, setIsConnected] = useState(false);
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

            newConnection.on('LoginNotification', (data) => {
                console.log('Login notification received:', data);
                if (data.eventType === 'Login') {
                    // Manejar la notificación de login
                    localStorage.setItem('user', JSON.stringify(data.data));
                    window.location.href = '/dashboard';
                }
            });

            newConnection.onreconnected(() => {
                console.log('WebSocket reconnected');
                setIsConnected(true);
                newConnection.invoke('JoinApplicationGroup', clientId);
            });

            newConnection.onclose(() => {
                console.log('WebSocket disconnected');
                setIsConnected(false);
            });

            await newConnection.start();
            console.log('WebSocket connected');
            
            await newConnection.invoke('JoinApplicationGroup', clientId);
            
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
        if (clientId) {
            connectWebSocket();
        }

        return () => {
            disconnectWebSocket();
        };
    }, [clientId, connectWebSocket, disconnectWebSocket]);

    return {
        isConnected,
        connection,
        reconnect: connectWebSocket,
        disconnect: disconnectWebSocket
    };
};
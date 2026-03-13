import { useEffect, useRef, useCallback } from 'react';
import { getWebSocketUrl } from '@/api/chat';

type MessageType = 'CONNECTION_ESTABLISHED' | 'NEW_MESSAGE' | 'MESSAGE_SENT' | 'MESSAGES_READ' | 'USER_TYPING' | 'ERROR' | 'PONG' | 'SEND_MESSAGE' | 'NEW_CHAT_REQUEST' | 'CHAT_REQUEST_ACCEPTED' | 'CHAT_REQUEST_REJECTED' | 'SERVICE_REQUEST_ACCEPTED' | 'SERVICE_REQUEST_EXPIRED' | 'NEW_JOB_REQUEST' | 'JOB_CANCELLED' | 'JOB_REJECTED' | 'JOB_STATUS_UPDATED' | 'TEAM_REQUEST' | 'MESSAGE_RECEIVED';

interface WebSocketMessage {
    type: MessageType;
    [key: string]: any;
}

export const useWebSocket = (onMessage: (message: WebSocketMessage) => void) => {
    const ws = useRef<WebSocket | null>(null);
    const reconnectTimeout = useRef<NodeJS.Timeout>();

    const connect = useCallback(() => {
        try {
            const wsUrl = getWebSocketUrl();
            ws.current = new WebSocket(wsUrl);

            ws.current.onopen = () => {
                console.log('WebSocket connected');
            };

            ws.current.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    onMessage(data);
                } catch (error) {
                    console.error('Error parsing WebSocket message:', error);
                }
            };

            ws.current.onerror = (error) => {
                console.error('WebSocket error:', error);
            };

            ws.current.onclose = () => {
                console.log('WebSocket disconnected');
                // Attempt to reconnect after 3 seconds
                reconnectTimeout.current = setTimeout(() => {
                    console.log('Attempting to reconnect...');
                    connect();
                }, 3000);
            };
        } catch (error) {
            console.error('WebSocket connection error:', error);
        }
    }, [onMessage]);

    const sendMessage = useCallback((message: WebSocketMessage) => {
        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify(message));
        } else {
            console.error('WebSocket is not connected');
        }
    }, []);

    const disconnect = useCallback(() => {
        if (reconnectTimeout.current) {
            clearTimeout(reconnectTimeout.current);
        }
        if (ws.current) {
            ws.current.close();
            ws.current = null;
        }
    }, []);

    useEffect(() => {
        connect();
        return () => {
            disconnect();
        };
    }, [connect, disconnect]);

    return { sendMessage, disconnect };
};

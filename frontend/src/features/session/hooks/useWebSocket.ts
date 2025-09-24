import { useState, useEffect, useCallback, useRef } from 'react';
import { getWebSocketUrl } from '../../../utils/ws';
import {
  MESSAGE_TYPES,
  TypedWebSocketMessage,
  ToolCallRequest
} from '../../../types/websocket';

export interface WebSocketHook {
  ws: WebSocket | null;
  isConnected: boolean;
  sendMessage: (data: ToolCallRequest | { type: string; [key: string]: any }) => void;
  sendTypedMessage: (message: TypedWebSocketMessage) => void;
  reconnect: () => void;
}

export const useWebSocket = (sessionId: string): WebSocketHook => {
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const isConnectingRef = useRef(false);

  const connect = useCallback(() => {
    // Prevent duplicate connections during StrictMode double-mounting
    if (wsRef.current?.readyState === WebSocket.OPEN || isConnectingRef.current) {
      return;
    }

    const wsUrl = getWebSocketUrl(`/api/sessions/${sessionId}/ws`);
    console.log('Connecting to WebSocket:', wsUrl);

    isConnectingRef.current = true;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket connected');
      isConnectingRef.current = false;
      setIsConnected(true);
      // Clear any pending reconnect
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      // Request current workflow status immediately
      console.log('🔄 WebSocket connected, requesting workflow status for session:', sessionId);
      ws.send(JSON.stringify({ type: MESSAGE_TYPES.GET_WORKFLOW_STATUS }));
    };

    ws.onclose = (event) => {
      console.log('WebSocket disconnected', { code: event.code, reason: event.reason });
      isConnectingRef.current = false;
      setIsConnected(false);

      // Auto-reconnect after 3 seconds if not intentional
      if (!event.wasClean && event.code !== 1000) {
        console.log('Scheduling reconnect in 3 seconds...');
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, 3000);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      isConnectingRef.current = false;
      setIsConnected(false);
    };

    return ws;
  }, [sessionId]);

  const sendMessage = useCallback((data: ToolCallRequest | { type: string; [key: string]: any }) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    } else {
      console.warn('WebSocket not connected, cannot send message');
    }
  }, []);

  const sendTypedMessage = useCallback((message: TypedWebSocketMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected, cannot send typed message');
    }
  }, []);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  return {
    ws: wsRef.current,
    isConnected,
    sendMessage,
    sendTypedMessage,
    reconnect: connect
  };
};
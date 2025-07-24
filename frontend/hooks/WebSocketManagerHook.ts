import { useCallback, useEffect, useRef, useState } from 'react';

import { WebSocketStatus } from '@/types/WebSocketType';
import type { UseWebSocketManagerReturn } from '@/types/WebSocketType';

export const useWebSocketManager = (): UseWebSocketManagerReturn => {
  const [status, setStatus] = useState<WebSocketStatus>(
    WebSocketStatus.DISCONNECTED
  );
  const [error, setError] = useState<string | null>(null);
  const [currentUrl, setCurrentUrl] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 清理函数
  const cleanup = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.onopen = null;
      wsRef.current.onclose = null;
      wsRef.current.onmessage = null;
      wsRef.current.onerror = null;

      if (wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.close();
      }

      wsRef.current = null;
    }
  }, []);

  // 连接WebSocket
  const connect = useCallback(
    (url: string) => {
      // 如果已经连接到相同的URL，则不重复连接
      if (
        wsRef.current &&
        currentUrl === url &&
        status === WebSocketStatus.CONNECTED
      ) {
        return;
      }

      // 清理现有连接
      cleanup();

      setStatus(WebSocketStatus.CONNECTING);
      setError(null);
      setCurrentUrl(url);

      try {
        const ws = new WebSocket(url);
        wsRef.current = ws;

        ws.onopen = () => {
          setStatus(WebSocketStatus.CONNECTED);
          setError(null);
          console.log('WebSocket connected to:', url);
        };

        ws.onclose = event => {
          console.log('WebSocket disconnected:', event.code, event.reason);

          // 如果不是主动关闭，设置为错误状态
          if (event.code !== 1000) {
            setStatus(WebSocketStatus.ERROR);
            setError(`Connection closed: ${event.reason || 'Unknown reason'}`);
          } else {
            setStatus(WebSocketStatus.DISCONNECTED);
          }
        };

        ws.onmessage = event => {
          // 消息接收处理 - 可以在这里添加语音模块需要的消息处理逻辑
          console.log('WebSocket message received:', event.data);
        };

        ws.onerror = event => {
          setStatus(WebSocketStatus.ERROR);
          setError('WebSocket connection error');
          console.error('WebSocket error:', event);
        };
      } catch (err) {
        setStatus(WebSocketStatus.ERROR);
        setError(
          err instanceof Error
            ? err.message
            : 'Failed to create WebSocket connection'
        );
        console.error('Failed to create WebSocket:', err);
      }
    },
    [cleanup, currentUrl, status]
  );

  // 断开连接
  const disconnect = useCallback(() => {
    cleanup();
    setStatus(WebSocketStatus.DISCONNECTED);
    setCurrentUrl(null);
    setError(null);
  }, [cleanup]);

  // 发送消息 (供其他组件使用，如语音模块)
  const sendMessage = useCallback((data: unknown) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      setError('WebSocket is not connected');
      return;
    }

    try {
      const messageData =
        typeof data === 'string' ? data : JSON.stringify(data);
      wsRef.current.send(messageData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
      console.error('Failed to send message:', err);
    }
  }, []);

  // 组件卸载时清理
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return {
    status,
    isConnected: status === WebSocketStatus.CONNECTED,
    connect,
    disconnect,
    sendMessage,
    error,
    currentUrl,
  };
};

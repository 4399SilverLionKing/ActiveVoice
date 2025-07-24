'use client';

import React, { useState } from 'react';

import { Circle, Send, Trash2, Wifi, WifiOff } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useWebSocketManager } from '@/hooks/WebSocketManagerHook';
import { WebSocketStatus } from '@/types/WebSocketType';

const DEFAULT_WS_URL = 'ws://localhost:8765';

export const WebSocketManager: React.FC = () => {
  const [wsUrl, setWsUrl] = useState(DEFAULT_WS_URL);
  const [messageInput, setMessageInput] = useState('');

  const {
    status,
    isConnected,
    connect,
    disconnect,
    sendMessage,
    messages,
    clearMessages,
    currentUrl,
  } = useWebSocketManager();

  const handleConnect = () => {
    if (wsUrl.trim()) {
      connect(wsUrl.trim());
    }
  };

  const handleDisconnect = () => {
    disconnect();
  };

  const handleSendMessage = () => {
    try {
      // 尝试解析为JSON，如果失败则作为普通字符串发送
      const data = JSON.parse(messageInput);
      sendMessage(data);
    } catch {
      sendMessage(messageInput);
    }
    setMessageInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case WebSocketStatus.CONNECTED:
        return 'text-green-500';
      case WebSocketStatus.CONNECTING:
        return 'text-yellow-500';
      case WebSocketStatus.ERROR:
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case WebSocketStatus.CONNECTED:
        return '已连接';
      case WebSocketStatus.CONNECTING:
        return '连接中...';
      case WebSocketStatus.ERROR:
        return '连接错误';
      default:
        return '未连接';
    }
  };

  const formatMessageData = (data: unknown): string => {
    if (typeof data === 'string') {
      return data;
    }
    return JSON.stringify(data, null, 2);
  };

  const formatTimestamp = (timestamp: number): string => {
    return new Date(timestamp).toLocaleTimeString();
  };

  return (
    <div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wifi className="h-5 w-5" />
            WebSocket 管理器
            <div className="ml-auto flex items-center gap-2">
              <Circle className={`h-3 w-3 fill-current ${getStatusColor()}`} />
              <span className={`text-sm ${getStatusColor()}`}>
                {getStatusText()}
              </span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 连接控制区域 */}
          <div className="space-y-3">
            <div className="space-y-2">
              <Input
                id="ws-url"
                type="text"
                value={wsUrl}
                onChange={e => setWsUrl(e.target.value)}
                placeholder="输入 WebSocket 地址"
                disabled={status === WebSocketStatus.CONNECTING}
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleConnect}
                disabled={
                  !wsUrl.trim() ||
                  status === WebSocketStatus.CONNECTING ||
                  (isConnected && currentUrl === wsUrl.trim())
                }
                className="flex items-center gap-2"
              >
                <Wifi className="h-4 w-4" />
                {status === WebSocketStatus.CONNECTING ? '连接中...' : '连接'}
              </Button>

              <Button
                variant="outline"
                onClick={handleDisconnect}
                disabled={!isConnected && status !== WebSocketStatus.CONNECTING}
                className="flex items-center gap-2"
              >
                <WifiOff className="h-4 w-4" />
                断开连接
              </Button>
            </div>
          </div>

          {/* 消息发送区域 */}
          {isConnected && (
            <div className="space-y-3 border-t pt-4">
              <Label htmlFor="message-input">发送消息</Label>
              <div className="flex gap-2">
                <Input
                  id="message-input"
                  type="text"
                  value={messageInput}
                  onChange={e => setMessageInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="输入消息 (支持 JSON 格式)"
                  className="flex-1"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!messageInput.trim()}
                  className="flex items-center gap-2"
                >
                  <Send className="h-4 w-4" />
                  发送
                </Button>
              </div>
            </div>
          )}

          {/* 消息历史区域 */}
          {isConnected && (
            <div className="space-y-3 border-t pt-4">
              <div className="flex items-center justify-between">
                <Label>消息历史</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearMessages}
                  disabled={messages.length === 0}
                  className="flex items-center gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  清空
                </Button>
              </div>

              <div className="max-h-96 space-y-2 overflow-y-auto rounded-md border bg-gray-50 p-3">
                {messages.length === 0 ? (
                  <div className="text-muted-foreground py-4 text-center text-sm">
                    暂无消息
                  </div>
                ) : (
                  messages.map(message => (
                    <div
                      key={message.id}
                      className={`rounded p-2 text-sm ${
                        message.type === 'sent'
                          ? 'ml-8 bg-blue-100 text-blue-900'
                          : 'mr-8 bg-green-100 text-green-900'
                      }`}
                    >
                      <div className="mb-1 flex items-center justify-between">
                        <span className="font-medium">
                          {message.type === 'sent' ? '发送' : '接收'}
                        </span>
                        <span className="text-xs opacity-70">
                          {formatTimestamp(message.timestamp)}
                        </span>
                      </div>
                      <pre className="font-mono text-xs whitespace-pre-wrap">
                        {formatMessageData(message.data)}
                      </pre>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

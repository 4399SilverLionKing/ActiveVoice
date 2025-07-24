'use client';

import React, { useState } from 'react';

import { Circle, Wifi, WifiOff } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useWebSocketManager } from '@/hooks/WebSocketManagerHook';
import { WebSocketStatus } from '@/types/WebSocketType';

const DEFAULT_WS_URL = 'ws://localhost:8765';

export const WebSocketManager: React.FC = () => {
  const [wsUrl, setWsUrl] = useState(DEFAULT_WS_URL);

  const { status, isConnected, connect, disconnect, currentUrl } =
    useWebSocketManager();

  const handleConnect = () => {
    if (wsUrl.trim()) {
      connect(wsUrl.trim());
    }
  };

  const handleDisconnect = () => {
    disconnect();
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
        </CardContent>
      </Card>
    </div>
  );
};

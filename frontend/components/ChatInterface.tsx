'use client';

import React, { useEffect, useRef } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useRealtimeTranscription } from '@/hooks/useRealtimeTranscription';
import { useAudioAgentStore } from '@/lib/stores/AudioAgentStore';

import { MessageList } from './MessageItem';

interface ChatInterfaceProps {
  className?: string;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ className }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { messages, currentTranscription, isTranscribing, isConnected, error } =
    useAudioAgentStore();

  const { handleWebSocketMessage } = useRealtimeTranscription({
    onTranscriptionStart: () => {
      console.log('开始转录');
    },
    onTranscriptionUpdate: text => {
      console.log('转录更新:', text);
    },
    onTranscriptionComplete: text => {
      console.log('转录完成:', text);
    },
    onError: error => {
      console.error('转录错误:', error);
    },
  });

  // 自动滚动到底部
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 模拟WebSocket消息处理（实际应用中应该从WebSocket接收）
  useEffect(() => {
    // 这里可以添加WebSocket消息监听逻辑
    // 例如：websocket.onmessage = (event) => {
    //   const message = JSON.parse(event.data);
    //   handleWebSocketMessage(message);
    // };
  }, [handleWebSocketMessage]);

  return (
    <div className={className}>
      <Card className="flex h-full flex-col">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>语音对话</span>
            <div className="flex items-center gap-2">
              <div
                className={`h-2 w-2 rounded-full ${
                  isConnected ? 'bg-green-500' : 'bg-red-500'
                }`}
              />
              <span className="text-sm text-gray-500">
                {isConnected ? '已连接' : '未连接'}
              </span>
            </div>
          </CardTitle>
        </CardHeader>

        <CardContent className="flex min-h-0 flex-1 flex-col">
          {/* 错误提示 */}
          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* 消息列表 */}
          <div className="mb-4 flex-1 overflow-y-auto">
            <MessageList messages={messages} />

            {/* 实时转录显示 */}
            {isTranscribing && currentTranscription && (
              <div className="mb-4 flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500 text-white">
                  <span className="text-xs">U</span>
                </div>
                <div className="max-w-[70%] rounded-lg border-2 border-dashed border-blue-300 bg-blue-100 px-4 py-2">
                  <div className="mb-1 flex items-center gap-2">
                    <div className="h-2 w-2 animate-pulse rounded-full bg-blue-500" />
                    <span className="text-xs text-blue-600">正在转录...</span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap text-blue-800">
                    {currentTranscription}
                  </p>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* 这里可以添加输入组件或其他控制组件 */}
          <div className="border-t pt-4">
            <div className="text-center text-sm text-gray-500">
              {isConnected ? '语音对话已准备就绪' : '请先连接到语音服务'}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

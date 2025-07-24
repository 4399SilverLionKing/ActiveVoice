'use client';

import React from 'react';

import { AlertCircle, Bot, Loader2, Mic, User, Volume2 } from 'lucide-react';

import { Message, MessageStatus, MessageType } from '@/types/MessageType';

import { cn } from '../lib/utils/tailwindUtil';

interface MessageItemProps {
  message: Message;
  className?: string;
}

// 获取消息内容的辅助函数
const getMessageContent = (message: Message): string => {
  switch (message.type) {
    case MessageType.TEXT:
      return message.content;
    case MessageType.MIXED:
      return message.content;
    case MessageType.AUDIO:
      if (message.transcription?.finalText) {
        return message.transcription.finalText;
      }
      if (message.transcription?.partialText) {
        return message.transcription.partialText;
      }
      return '正在转录...';
    default:
      return '';
  }
};

// 获取状态指示器
const StatusIndicator: React.FC<{
  status: MessageStatus;
  isTranscribing?: boolean;
}> = ({ status, isTranscribing }) => {
  switch (status) {
    case MessageStatus.TRANSCRIBING:
      return (
        <div className="flex items-center gap-1 text-xs text-blue-500">
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>转录中...</span>
        </div>
      );
    case MessageStatus.SENDING:
      return (
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>发送中...</span>
        </div>
      );
    case MessageStatus.ERROR:
      return (
        <div className="flex items-center gap-1 text-xs text-red-500">
          <AlertCircle className="h-3 w-3" />
          <span>发送失败</span>
        </div>
      );
    case MessageStatus.SENT:
      return <div className="text-xs text-gray-400">已发送</div>;
    case MessageStatus.RECEIVED:
      return null; // AI消息不显示已接收状态
    default:
      return null;
  }
};

// 打字效果组件
const TypingIndicator: React.FC = () => (
  <div className="flex items-center gap-1">
    <div className="flex gap-1">
      <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.3s]" />
      <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.15s]" />
      <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400" />
    </div>
    <span className="text-sm text-gray-500">正在输入...</span>
  </div>
);

// 主消息组件
export const MessageItem: React.FC<MessageItemProps> = ({
  message,
  className,
}) => {
  const isUser = message.sender === 'user';
  const content = getMessageContent(message);
  const isTranscribing = message.status === MessageStatus.TRANSCRIBING;
  const hasAudio =
    message.type === MessageType.AUDIO || message.type === MessageType.MIXED;

  return (
    <div
      className={cn('mb-4 flex gap-3', isUser && 'flex-row-reverse', className)}
    >
      {/* 头像 */}
      <div
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
          isUser ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'
        )}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>

      {/* 消息内容 */}
      <div
        className={cn(
          'max-w-[70%] rounded-lg px-4 py-2',
          isUser ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-900'
        )}
      >
        {/* 音频标识 */}
        {hasAudio && (
          <div
            className={cn(
              'mb-2 flex items-center gap-1 text-xs',
              isUser ? 'text-blue-100' : 'text-gray-500'
            )}
          >
            <Mic className="h-3 w-3" />
            <span>语音消息</span>
            {message.type === MessageType.AUDIO && (
              <Volume2 className="h-3 w-3" />
            )}
          </div>
        )}

        {/* 文本内容 */}
        <div className="prose prose-sm max-w-none">
          {content ? (
            <p className="mb-0 whitespace-pre-wrap">{content}</p>
          ) : (
            <div
              className={cn(
                'italic',
                isUser ? 'text-blue-100' : 'text-gray-500'
              )}
            >
              {isTranscribing ? '正在转录...' : '暂无内容'}
            </div>
          )}

          {/* 转录中的动态效果 */}
          {isTranscribing && <TypingIndicator />}
        </div>

        {/* 转录置信度 */}
        {message.type !== MessageType.TEXT &&
          message.transcription?.confidence &&
          message.transcription.confidence < 0.8 && (
            <div
              className={cn(
                'mt-2 text-xs',
                isUser ? 'text-blue-100' : 'text-gray-500'
              )}
            >
              转录置信度: {Math.round(message.transcription.confidence * 100)}%
            </div>
          )}

        {/* 状态指示器 */}
        <div
          className={cn(
            'mt-2 flex items-center justify-between',
            isUser ? 'flex-row-reverse' : ''
          )}
        >
          <StatusIndicator
            status={message.status}
            isTranscribing={isTranscribing}
          />

          {/* 时间戳 */}
          <div
            className={cn(
              'text-xs',
              isUser ? 'text-blue-100' : 'text-gray-400'
            )}
          >
            {new Date(message.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

// 消息列表组件
interface MessageListProps {
  messages: Message[];
  className?: string;
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  className,
}) => {
  return (
    <div className={cn('space-y-4', className)}>
      {messages.length === 0 ? (
        <div className="flex h-32 items-center justify-center text-gray-500">
          <div className="text-center">
            <Bot className="mx-auto mb-2 h-8 w-8 opacity-50" />
            <p>开始对话吧！</p>
          </div>
        </div>
      ) : (
        messages.map(message => (
          <MessageItem key={message.id} message={message} />
        ))
      )}
    </div>
  );
};

export default MessageItem;

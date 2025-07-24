/**
 * 对话消息相关类型定义
 */

// 消息发送者类型
export type MessageSender = 'user' | 'ai';

// 消息状态
export enum MessageStatus {
  PENDING = 'pending', // 等待中
  SENDING = 'sending', // 发送中
  SENT = 'sent', // 已发送
  RECEIVED = 'received', // 已接收
  ERROR = 'error', // 错误
  TRANSCRIBING = 'transcribing', // 转录中
}

// 消息类型
export enum MessageType {
  TEXT = 'text', // 纯文本消息
  AUDIO = 'audio', // 音频消息
  MIXED = 'mixed', // 混合消息（音频+文本）
}

// 音频转录状态
export interface TranscriptionState {
  isTranscribing: boolean;
  partialText: string; // 部分转录结果
  finalText: string; // 最终转录结果
  confidence?: number; // 置信度
}

// 基础消息接口
export interface BaseMessage {
  id: string;
  timestamp: number;
  sender: MessageSender;
  type: MessageType;
  status: MessageStatus;
}

// 文本消息
export interface TextMessage extends BaseMessage {
  type: MessageType.TEXT;
  content: string;
}

// 音频消息
export interface AudioMessage extends BaseMessage {
  type: MessageType.AUDIO;
  audioData?: Blob | ArrayBuffer;
  audioUrl?: string;
  duration?: number;
  transcription?: TranscriptionState;
}

// 混合消息（音频+文本）
export interface MixedMessage extends BaseMessage {
  type: MessageType.MIXED;
  content: string;
  audioData?: Blob | ArrayBuffer;
  audioUrl?: string;
  duration?: number;
  transcription?: TranscriptionState;
}

// 联合消息类型
export type Message = TextMessage | AudioMessage | MixedMessage;

// 消息创建参数
export interface CreateMessageParams {
  sender: MessageSender;
  type: MessageType;
  content?: string;
  audioData?: Blob | ArrayBuffer;
  audioUrl?: string;
  duration?: number;
}

// 消息更新参数
export interface UpdateMessageParams {
  id: string;
  status?: MessageStatus;
  content?: string;
  transcription?: Partial<TranscriptionState>;
  audioUrl?: string;
  duration?: number;
}

// 对话会话接口
export interface ConversationSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
  isActive: boolean;
}

// 消息过滤器
export interface MessageFilter {
  sender?: MessageSender;
  type?: MessageType;
  status?: MessageStatus;
  dateRange?: {
    start: number;
    end: number;
  };
}

// 消息统计
export interface MessageStats {
  total: number;
  byType: Record<MessageType, number>;
  bySender: Record<MessageSender, number>;
  byStatus: Record<MessageStatus, number>;
}

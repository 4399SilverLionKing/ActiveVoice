/**
 * WebSocket 相关类型定义
 */

// WebSocket 连接状态枚举
export enum WebSocketStatus {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  ERROR = 'error',
}

// WebSocket 消息类型
export type WebSocketMessageType = 'sent' | 'received';

// WebSocket 消息接口
export interface WebSocketMessage {
  id: string;
  timestamp: number;
  type: WebSocketMessageType;
  data: unknown;
}

// WebSocket 连接配置接口
export interface WebSocketConfig {
  url: string;
  protocols?: string | string[];
  reconnectAttempts?: number;
  reconnectInterval?: number;
  heartbeatInterval?: number;
  timeout?: number;
}

// WebSocket 事件类型
export interface WebSocketEvents {
  onOpen?: (event: Event) => void;
  onClose?: (event: CloseEvent) => void;
  onMessage?: (event: MessageEvent) => void;
  onError?: (event: Event) => void;
}

// WebSocket 管理器返回类型
export interface UseWebSocketManagerReturn {
  // 连接状态
  status: WebSocketStatus;
  isConnected: boolean;

  // 连接管理
  connect: (url: string) => void;
  disconnect: () => void;

  // 消息管理
  sendMessage: (data: unknown) => void;
  messages: WebSocketMessage[];
  clearMessages: () => void;

  // 错误信息
  error: string | null;

  // 连接信息
  currentUrl: string | null;
}

// WebSocket 管理器配置接口
export interface WebSocketManagerConfig {
  defaultUrl?: string;
  autoConnect?: boolean;
  maxReconnectAttempts?: number;
  reconnectInterval?: number;
  messageHistoryLimit?: number;
}

// WebSocket 连接选项
export interface WebSocketConnectionOptions {
  url: string;
  protocols?: string | string[];
  binaryType?: BinaryType;
}

// WebSocket 错误类型
export interface WebSocketError {
  code?: number;
  message: string;
  timestamp: number;
  url?: string;
}

// WebSocket 统计信息
export interface WebSocketStats {
  connectTime?: number;
  disconnectTime?: number;
  messagesSent: number;
  messagesReceived: number;
  reconnectCount: number;
  lastError?: WebSocketError;
}

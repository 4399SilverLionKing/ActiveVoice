import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

import {
  ConversationSession,
  CreateMessageParams,
  Message,
  MessageSender,
  MessageStatus,
  MessageType,
  TranscriptionState,
  UpdateMessageParams,
} from '@/types/MessageType';

// 生成唯一ID
const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
};

// 创建消息的辅助函数
const createMessage = (params: CreateMessageParams): Message => {
  const baseMessage = {
    id: generateId(),
    timestamp: Date.now(),
    sender: params.sender,
    type: params.type,
    status: MessageStatus.PENDING,
  };

  switch (params.type) {
    case MessageType.TEXT:
      return {
        ...baseMessage,
        type: MessageType.TEXT,
        content: params.content || '',
      };

    case MessageType.AUDIO:
      return {
        ...baseMessage,
        type: MessageType.AUDIO,
        audioData: params.audioData,
        audioUrl: params.audioUrl,
        duration: params.duration,
        transcription: {
          isTranscribing: false,
          partialText: '',
          finalText: '',
        },
      };

    case MessageType.MIXED:
      return {
        ...baseMessage,
        type: MessageType.MIXED,
        content: params.content || '',
        audioData: params.audioData,
        audioUrl: params.audioUrl,
        duration: params.duration,
        transcription: {
          isTranscribing: false,
          partialText: '',
          finalText: '',
        },
      };

    default:
      throw new Error(`Unsupported message type: ${params.type}`);
  }
};

// Store 状态接口
interface AudioAgentState {
  // 当前会话
  currentSession: ConversationSession | null;

  // 消息列表
  messages: Message[];

  // 实时转录状态
  isTranscribing: boolean;
  currentTranscription: string;

  // 连接状态
  isConnected: boolean;
  isConnecting: boolean;

  // 错误状态
  error: string | null;

  // Actions
  // 会话管理
  createSession: (title?: string) => ConversationSession;
  setCurrentSession: (session: ConversationSession | null) => void;

  // 消息管理
  addMessage: (params: CreateMessageParams) => Message;
  updateMessage: (params: UpdateMessageParams) => void;
  deleteMessage: (messageId: string) => void;
  clearMessages: () => void;

  // 转录管理
  startTranscription: (messageId: string) => void;
  updateTranscription: (
    messageId: string,
    transcription: Partial<TranscriptionState>
  ) => void;
  finishTranscription: (messageId: string, finalText: string) => void;

  // 实时转录
  setCurrentTranscription: (text: string) => void;
  setIsTranscribing: (isTranscribing: boolean) => void;

  // 连接状态管理
  setConnected: (connected: boolean) => void;
  setConnecting: (connecting: boolean) => void;
  setError: (error: string | null) => void;

  // 工具方法
  getMessageById: (messageId: string) => Message | undefined;
  getMessagesByType: (type: MessageType) => Message[];
  getMessagesBySender: (sender: MessageSender) => Message[];
}

export const useAudioAgentStore = create<AudioAgentState>()(
  devtools(
    (set, get) => ({
      // 初始状态
      currentSession: null,
      messages: [],
      isTranscribing: false,
      currentTranscription: '',
      isConnected: false,
      isConnecting: false,
      error: null,

      // 会话管理
      createSession: (title = '新对话') => {
        const session: ConversationSession = {
          id: generateId(),
          title,
          messages: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
          isActive: true,
        };

        set({ currentSession: session, messages: [] });
        return session;
      },

      setCurrentSession: session => {
        set({
          currentSession: session,
          messages: session?.messages || [],
        });
      },

      // 消息管理
      addMessage: params => {
        const message = createMessage(params);

        set(state => ({
          messages: [...state.messages, message],
          currentSession: state.currentSession
            ? {
                ...state.currentSession,
                messages: [...state.messages, message],
                updatedAt: Date.now(),
              }
            : null,
        }));

        return message;
      },

      updateMessage: params => {
        set(state => {
          const updatedMessages = state.messages.map(message => {
            if (message.id === params.id) {
              const updatedMessage = { ...message };

              if (params.status !== undefined) {
                updatedMessage.status = params.status;
              }

              if (params.content !== undefined && 'content' in updatedMessage) {
                (updatedMessage as any).content = params.content;
              }

              if (
                params.transcription !== undefined &&
                'transcription' in updatedMessage
              ) {
                (updatedMessage as any).transcription = {
                  ...(updatedMessage as any).transcription,
                  ...params.transcription,
                };
              }

              if (
                params.audioUrl !== undefined &&
                'audioUrl' in updatedMessage
              ) {
                (updatedMessage as any).audioUrl = params.audioUrl;
              }

              if (
                params.duration !== undefined &&
                'duration' in updatedMessage
              ) {
                (updatedMessage as any).duration = params.duration;
              }

              return updatedMessage;
            }
            return message;
          });

          return {
            messages: updatedMessages,
            currentSession: state.currentSession
              ? {
                  ...state.currentSession,
                  messages: updatedMessages,
                  updatedAt: Date.now(),
                }
              : null,
          };
        });
      },

      deleteMessage: messageId => {
        set(state => {
          const updatedMessages = state.messages.filter(
            message => message.id !== messageId
          );

          return {
            messages: updatedMessages,
            currentSession: state.currentSession
              ? {
                  ...state.currentSession,
                  messages: updatedMessages,
                  updatedAt: Date.now(),
                }
              : null,
          };
        });
      },

      clearMessages: () => {
        set(state => ({
          messages: [],
          currentSession: state.currentSession
            ? {
                ...state.currentSession,
                messages: [],
                updatedAt: Date.now(),
              }
            : null,
        }));
      },

      // 转录管理
      startTranscription: messageId => {
        set(state => {
          const updatedMessages = state.messages.map(message => {
            if (message.id === messageId && 'transcription' in message) {
              return {
                ...message,
                transcription: {
                  ...(message as any).transcription,
                  isTranscribing: true,
                },
                status: MessageStatus.TRANSCRIBING,
              };
            }
            return message;
          });

          return { messages: updatedMessages };
        });
      },

      updateTranscription: (messageId, transcription) => {
        set(state => {
          const updatedMessages = state.messages.map(message => {
            if (message.id === messageId && 'transcription' in message) {
              return {
                ...message,
                transcription: {
                  ...(message as any).transcription,
                  ...transcription,
                },
              };
            }
            return message;
          });

          return { messages: updatedMessages };
        });
      },

      finishTranscription: (messageId, finalText) => {
        set(state => {
          const updatedMessages = state.messages.map(message => {
            if (message.id === messageId && 'transcription' in message) {
              return {
                ...message,
                transcription: {
                  ...(message as any).transcription,
                  isTranscribing: false,
                  finalText,
                },
                status: MessageStatus.RECEIVED,
              };
            }
            return message;
          });

          return { messages: updatedMessages };
        });
      },

      // 实时转录
      setCurrentTranscription: text => {
        set({ currentTranscription: text });
      },

      setIsTranscribing: isTranscribing => {
        set({ isTranscribing });
      },

      // 连接状态管理
      setConnected: connected => {
        set({ isConnected: connected, isConnecting: false });
      },

      setConnecting: connecting => {
        set({ isConnecting: connecting });
      },

      setError: error => {
        set({ error });
      },

      // 工具方法
      getMessageById: messageId => {
        const { messages } = get();
        return messages.find(message => message.id === messageId);
      },

      getMessagesByType: type => {
        const { messages } = get();
        return messages.filter(message => message.type === type);
      },

      getMessagesBySender: sender => {
        const { messages } = get();
        return messages.filter(message => message.sender === sender);
      },
    }),
    {
      name: 'audio-agent-store',
    }
  )
);

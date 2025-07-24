import { useCallback, useEffect, useRef } from 'react';
import { useAudioAgentStore } from '@/lib/stores/AudioAgentStore';
import { MessageType, MessageStatus } from '@/types/MessageType';

// WebSocket消息类型定义
interface TranscriptionMessage {
  type: 'transcription.delta' | 'transcription.done' | 'audio.speech_started' | 'audio.speech_stopped';
  delta?: string;
  transcript?: string;
  item_id?: string;
}

interface RealtimeTranscriptionOptions {
  onTranscriptionStart?: () => void;
  onTranscriptionUpdate?: (text: string) => void;
  onTranscriptionComplete?: (text: string) => void;
  onError?: (error: string) => void;
}

export const useRealtimeTranscription = (options: RealtimeTranscriptionOptions = {}) => {
  const {
    messages,
    addMessage,
    updateMessage,
    setCurrentTranscription,
    setIsTranscribing,
    currentTranscription,
    isTranscribing,
  } = useAudioAgentStore();

  const currentMessageRef = useRef<string | null>(null);
  const accumulatedTextRef = useRef<string>('');

  // 开始用户语音转录
  const startUserTranscription = useCallback(() => {
    // 创建一个新的用户消息用于显示实时转录
    const message = addMessage({
      sender: 'user',
      type: MessageType.AUDIO,
    });

    currentMessageRef.current = message.id;
    accumulatedTextRef.current = '';
    setIsTranscribing(true);
    setCurrentTranscription('');
    
    options.onTranscriptionStart?.();
  }, [addMessage, setIsTranscribing, setCurrentTranscription, options]);

  // 更新转录文本
  const updateTranscriptionText = useCallback((delta: string) => {
    if (!currentMessageRef.current) return;

    accumulatedTextRef.current += delta;
    setCurrentTranscription(accumulatedTextRef.current);

    // 更新消息的转录状态
    updateMessage({
      id: currentMessageRef.current,
      transcription: {
        isTranscribing: true,
        partialText: accumulatedTextRef.current,
      },
      status: MessageStatus.TRANSCRIBING,
    });

    options.onTranscriptionUpdate?.(accumulatedTextRef.current);
  }, [updateMessage, setCurrentTranscription, options]);

  // 完成转录
  const finishTranscription = useCallback((finalText?: string) => {
    if (!currentMessageRef.current) return;

    const finalTranscript = finalText || accumulatedTextRef.current;
    
    // 更新消息为最终状态
    updateMessage({
      id: currentMessageRef.current,
      transcription: {
        isTranscribing: false,
        finalText: finalTranscript,
        partialText: finalTranscript,
      },
      status: MessageStatus.RECEIVED,
    });

    setIsTranscribing(false);
    setCurrentTranscription('');
    currentMessageRef.current = null;
    accumulatedTextRef.current = '';

    options.onTranscriptionComplete?.(finalTranscript);
  }, [updateMessage, setIsTranscribing, setCurrentTranscription, options]);

  // 开始AI语音转录
  const startAITranscription = useCallback(() => {
    const message = addMessage({
      sender: 'ai',
      type: MessageType.AUDIO,
    });

    return message.id;
  }, [addMessage]);

  // 更新AI转录
  const updateAITranscription = useCallback((messageId: string, delta: string) => {
    updateMessage({
      id: messageId,
      transcription: {
        isTranscribing: true,
        partialText: delta,
      },
      status: MessageStatus.TRANSCRIBING,
    });
  }, [updateMessage]);

  // 完成AI转录
  const finishAITranscription = useCallback((messageId: string, finalText: string) => {
    updateMessage({
      id: messageId,
      transcription: {
        isTranscribing: false,
        finalText,
        partialText: finalText,
      },
      status: MessageStatus.RECEIVED,
    });
  }, [updateMessage]);

  // 处理WebSocket消息
  const handleWebSocketMessage = useCallback((message: TranscriptionMessage) => {
    try {
      switch (message.type) {
        case 'audio.speech_started':
          startUserTranscription();
          break;

        case 'transcription.delta':
          if (message.delta) {
            updateTranscriptionText(message.delta);
          }
          break;

        case 'transcription.done':
          if (message.transcript) {
            finishTranscription(message.transcript);
          }
          break;

        case 'audio.speech_stopped':
          // 语音停止，等待最终转录结果
          break;

        default:
          console.warn('Unknown transcription message type:', message.type);
      }
    } catch (error) {
      console.error('Error handling transcription message:', error);
      options.onError?.(`转录处理错误: ${error}`);
    }
  }, [startUserTranscription, updateTranscriptionText, finishTranscription, options]);

  // 取消当前转录
  const cancelTranscription = useCallback(() => {
    if (currentMessageRef.current) {
      updateMessage({
        id: currentMessageRef.current,
        status: MessageStatus.ERROR,
        transcription: {
          isTranscribing: false,
          finalText: '转录已取消',
          partialText: '',
        },
      });
    }

    setIsTranscribing(false);
    setCurrentTranscription('');
    currentMessageRef.current = null;
    accumulatedTextRef.current = '';
  }, [updateMessage, setIsTranscribing, setCurrentTranscription]);

  // 清理函数
  useEffect(() => {
    return () => {
      if (isTranscribing) {
        cancelTranscription();
      }
    };
  }, [isTranscribing, cancelTranscription]);

  return {
    // 状态
    isTranscribing,
    currentTranscription,
    messages,

    // 用户转录方法
    startUserTranscription,
    updateTranscriptionText,
    finishTranscription,
    cancelTranscription,

    // AI转录方法
    startAITranscription,
    updateAITranscription,
    finishAITranscription,

    // WebSocket消息处理
    handleWebSocketMessage,
  };
};

export type { TranscriptionMessage, RealtimeTranscriptionOptions };

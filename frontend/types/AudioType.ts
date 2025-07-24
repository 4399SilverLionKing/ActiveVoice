/**
 * 音频相关类型定义 - 简化版本
 */

// 音频状态枚举
export enum AudioStatus {
  IDLE = 'idle',
  RECORDING = 'recording',
  PLAYING = 'playing',
  ERROR = 'error',
}

// 麦克风权限状态
export enum MicrophonePermission {
  GRANTED = 'granted',
  DENIED = 'denied',
  PROMPT = 'prompt',
  UNKNOWN = 'unknown',
}

// 音频消息类型
export interface AudioMessage {
  type: 'audio_start' | 'audio_data' | 'audio_end' | 'audio_error';
  data?: ArrayBuffer | Float32Array | string;
  error?: string;
  sessionId?: string;
}

//音频管理器返回类型
export interface UseAudioManagerReturn {
  // 状态
  status: AudioStatus;
  isRecording: boolean;
  isPlaying: boolean;
  micPermission: MicrophonePermission;

  // 录音控制
  startRecording: () => Promise<void>;
  stopRecording: () => void;

  // 播放控制
  playAudio: (audioData: ArrayBuffer | Float32Array) => Promise<void>;
  stopPlaying: () => void;

  // 音频数据
  audioLevel: number;
  recordingDuration: number;

  // 错误信息
  error: string | null;
}

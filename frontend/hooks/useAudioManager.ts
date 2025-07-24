import { useCallback, useEffect, useRef, useState } from 'react';

import {
  AudioStatus,
  MicrophonePermission,
  UseAudioManagerReturn,
} from '@/types/AudioType';

// 默认音频配置
const DEFAULT_CONFIG = {
  sampleRate: 16000,
  channels: 1,
  bufferSize: 4096,
  enableEchoCancellation: true,
  enableNoiseSuppression: true,
  enableAutoGainControl: true,
};

export const useAudioManager = (): UseAudioManagerReturn => {
  // 状态管理
  const [status, setStatus] = useState<AudioStatus>(AudioStatus.IDLE);
  const [micPermission, setMicPermission] = useState<MicrophonePermission>(
    MicrophonePermission.UNKNOWN
  );
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [recordingDuration, setRecordingDuration] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  // Refs
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const recordingStartTimeRef = useRef<number>(0);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioBufferSourceRef = useRef<AudioBufferSourceNode | null>(null);

  // 计算属性
  const isRecording = status === AudioStatus.RECORDING;
  const isPlaying = status === AudioStatus.PLAYING;

  // 检查麦克风权限
  const checkMicrophonePermission = useCallback(async () => {
    try {
      const permission = await navigator.permissions.query({
        name: 'microphone' as PermissionName,
      });

      switch (permission.state) {
        case 'granted':
          setMicPermission(MicrophonePermission.GRANTED);
          break;
        case 'denied':
          setMicPermission(MicrophonePermission.DENIED);
          break;
        case 'prompt':
          setMicPermission(MicrophonePermission.PROMPT);
          break;
        default:
          setMicPermission(MicrophonePermission.UNKNOWN);
      }
    } catch (err) {
      console.warn('Permission API not supported:', err);
      setMicPermission(MicrophonePermission.UNKNOWN);
    }
  }, []);

  // 清理音频资源
  const cleanup = useCallback(() => {
    // 停止录音计时器
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    // 停止音频播放
    if (audioBufferSourceRef.current) {
      try {
        audioBufferSourceRef.current.stop();
      } catch (err) {
        console.warn('Error stopping audio buffer source:', err);
      }
      audioBufferSourceRef.current = null;
    }

    // 清理音频处理器
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }

    // 清理分析器
    if (analyserRef.current) {
      analyserRef.current.disconnect();
      analyserRef.current = null;
    }

    // 停止媒体流
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }

    // 关闭音频上下文
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    setAudioLevel(0);
    setRecordingDuration(0);
  }, []);

  // 停止录音
  const stopRecording = useCallback(() => {
    cleanup();
    setStatus(AudioStatus.IDLE);
  }, [cleanup]);

  // 开始录音
  const startRecording = useCallback(async () => {
    try {
      setError(null);
      setStatus(AudioStatus.RECORDING);

      // 获取媒体流 - 使用默认设备和配置
      const constraints: MediaStreamConstraints = {
        audio: {
          sampleRate: DEFAULT_CONFIG.sampleRate,
          channelCount: DEFAULT_CONFIG.channels,
          echoCancellation: DEFAULT_CONFIG.enableEchoCancellation,
          noiseSuppression: DEFAULT_CONFIG.enableNoiseSuppression,
          autoGainControl: DEFAULT_CONFIG.enableAutoGainControl,
        },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      mediaStreamRef.current = stream;

      // 创建音频上下文
      const AudioContextClass =
        window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContextClass({
        sampleRate: DEFAULT_CONFIG.sampleRate,
      });
      audioContextRef.current = audioContext;

      // 创建音频源
      const source = audioContext.createMediaStreamSource(stream);

      // 创建分析器用于音量检测
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;

      // 创建音频处理器
      const processor = audioContext.createScriptProcessor(
        DEFAULT_CONFIG.bufferSize,
        DEFAULT_CONFIG.channels,
        DEFAULT_CONFIG.channels
      );
      processorRef.current = processor;

      // 连接音频节点
      source.connect(analyser);
      analyser.connect(processor);
      processor.connect(audioContext.destination);

      // 处理音频数据
      processor.onaudioprocess = event => {
        const inputBuffer = event.inputBuffer;
        const audioData = inputBuffer.getChannelData(0);

        // 计算音频级别
        let sum = 0;
        for (let i = 0; i < audioData.length; i++) {
          sum += audioData[i] * audioData[i];
        }
        const rms = Math.sqrt(sum / audioData.length);
        const level = Math.min(1, rms * 10); // 放大并限制在0-1之间
        setAudioLevel(level);

        // 这里可以添加音频数据处理逻辑，比如发送到WebSocket
        // onAudioData?.(audioData);
      };

      // 开始录音计时
      recordingStartTimeRef.current = Date.now();
      recordingTimerRef.current = setInterval(() => {
        const duration = Date.now() - recordingStartTimeRef.current;
        setRecordingDuration(duration);

        // 5分钟后自动停止录音
        if (duration >= 300000) {
          cleanup();
          setStatus(AudioStatus.IDLE);
        }
      }, 100);

      setMicPermission(MicrophonePermission.GRANTED);
    } catch (err) {
      console.error('Failed to start recording:', err);
      setStatus(AudioStatus.ERROR);
      setError(err instanceof Error ? err.message : '无法开始录音');
      setMicPermission(MicrophonePermission.DENIED);
    }
  }, [cleanup]);

  // 播放音频
  const playAudio = useCallback(
    async (audioData: ArrayBuffer | Float32Array) => {
      try {
        setError(null);
        setStatus(AudioStatus.PLAYING);

        // 创建音频上下文（如果不存在）
        if (!audioContextRef.current) {
          const AudioContextClass =
            window.AudioContext || (window as any).webkitAudioContext;
          audioContextRef.current = new AudioContextClass({
            sampleRate: DEFAULT_CONFIG.sampleRate,
          });
        }

        const audioContext = audioContextRef.current;

        let audioBuffer: AudioBuffer;

        if (audioData instanceof ArrayBuffer) {
          // 解码音频数据
          audioBuffer = await audioContext.decodeAudioData(audioData);
        } else {
          // 创建音频缓冲区
          audioBuffer = audioContext.createBuffer(
            DEFAULT_CONFIG.channels,
            audioData.length,
            DEFAULT_CONFIG.sampleRate
          );
          audioBuffer.getChannelData(0).set(audioData);
        }

        // 创建音频源
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;

        // 连接到输出设备
        source.connect(audioContext.destination);

        // 播放结束回调
        source.onended = () => {
          setStatus(AudioStatus.IDLE);
          audioBufferSourceRef.current = null;
        };

        audioBufferSourceRef.current = source;
        source.start();
      } catch (err) {
        console.error('Failed to play audio:', err);
        setStatus(AudioStatus.ERROR);
        setError(err instanceof Error ? err.message : '无法播放音频');
      }
    },
    []
  );

  // 停止播放
  const stopPlaying = useCallback(() => {
    if (audioBufferSourceRef.current) {
      try {
        audioBufferSourceRef.current.stop();
      } catch (err) {
        console.warn('Error stopping audio playback:', err);
      }
      audioBufferSourceRef.current = null;
    }
    setStatus(AudioStatus.IDLE);
  }, []);

  // 初始化
  useEffect(() => {
    checkMicrophonePermission();

    return () => {
      cleanup();
    };
  }, [checkMicrophonePermission, cleanup]);

  return {
    // 状态
    status,
    isRecording,
    isPlaying,
    micPermission,

    // 录音控制
    startRecording,
    stopRecording,

    // 播放控制
    playAudio,
    stopPlaying,

    // 音频数据
    audioLevel,
    recordingDuration,

    // 错误信息
    error,
  };
};

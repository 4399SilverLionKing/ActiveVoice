'use client';

import React, { useCallback } from 'react';

import { Circle, Mic, Settings, Square, Volume2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useWebSocketManager } from '@/hooks/WebSocketManagerHook';
import { useAudioManager } from '@/hooks/useAudioManager';
import { AudioStatus, MicrophonePermission } from '@/types/AudioType';

export const AudioManager: React.FC = () => {
  const {
    status,
    isRecording,
    micPermission,
    startRecording,
    stopRecording,
    audioLevel,
    recordingDuration,
    error: audioError,
  } = useAudioManager();

  const { isConnected: wsConnected, sendMessage } = useWebSocketManager();

  // 处理录音开始
  const handleStartRecording = useCallback(async () => {
    // 检查WebSocket连接状态
    if (!wsConnected) {
      toast.error('WebSocket未连接', {
        description: '请先在WebSocket管理器中建立连接后再开始录音',
        duration: 3000,
      });
      return;
    }

    try {
      await startRecording();
      // 发送录音开始消息
      sendMessage({
        type: 'audio_start',
        sessionId: Date.now().toString(),
        config: {
          sampleRate: 16000,
          channels: 1,
          format: 'pcm',
        },
      });
      toast.success('开始录音', {
        description: '录音已开始，音频数据将通过WebSocket发送',
        duration: 2000,
      });
    } catch (err) {
      console.error('Failed to start recording:', err);
      toast.error('录音失败', {
        description: err instanceof Error ? err.message : '无法开始录音',
        duration: 3000,
      });
    }
  }, [wsConnected, startRecording, sendMessage]);

  // 处理录音停止
  const handleStopRecording = useCallback(() => {
    stopRecording();
    if (wsConnected) {
      sendMessage({
        type: 'audio_end',
        sessionId: Date.now().toString(),
      });
      toast.success('录音已停止', {
        description: '录音结束信号已发送',
        duration: 2000,
      });
    } else {
      toast.warning('录音已停止', {
        description: 'WebSocket连接已断开，无法发送结束信号',
        duration: 3000,
      });
    }
  }, [stopRecording, wsConnected, sendMessage]);

  // 格式化录音时长
  const formatDuration = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // 获取状态颜色
  const getStatusColor = () => {
    switch (status) {
      case AudioStatus.RECORDING:
        return 'text-red-500';
      case AudioStatus.PLAYING:
        return 'text-green-500';
      case AudioStatus.ERROR:
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  // 获取状态文本
  const getStatusText = () => {
    switch (status) {
      case AudioStatus.RECORDING:
        return '录音中';
      case AudioStatus.PLAYING:
        return '播放中';
      case AudioStatus.ERROR:
        return '错误';
      default:
        return '空闲';
    }
  };

  // 获取麦克风权限状态
  const getMicPermissionText = () => {
    switch (micPermission) {
      case MicrophonePermission.GRANTED:
        return '已授权';
      case MicrophonePermission.DENIED:
        return '已拒绝';
      case MicrophonePermission.PROMPT:
        return '等待授权';
      default:
        return '未知';
    }
  };

  // 获取麦克风权限颜色
  const getMicPermissionColor = () => {
    switch (micPermission) {
      case MicrophonePermission.GRANTED:
        return 'text-green-500';
      case MicrophonePermission.DENIED:
        return 'text-red-500';
      case MicrophonePermission.PROMPT:
        return 'text-yellow-500';
      default:
        return 'text-gray-500';
    }
  };

  return (
    <div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Volume2 className="h-5 w-5" />
            音频管理器
            <div className="ml-auto flex items-center gap-4">
              {/* 音频状态 */}
              <div className="flex items-center gap-2">
                <Circle
                  className={`h-3 w-3 fill-current ${getStatusColor()}`}
                />
                <span className={`text-sm ${getStatusColor()}`}>
                  {getStatusText()}
                </span>
              </div>

              {/* 麦克风权限状态 */}
              <div className="flex items-center gap-2">
                <Mic className={`h-4 w-4 ${getMicPermissionColor()}`} />
                <span className={`text-sm ${getMicPermissionColor()}`}>
                  {getMicPermissionText()}
                </span>
              </div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 录音控制区域 */}
          <div className="space-y-4">
            {/* 录音按钮和状态 */}
            <div className="flex items-center gap-4">
              <Button
                size="lg"
                variant={isRecording ? 'destructive' : 'default'}
                onClick={
                  isRecording ? handleStopRecording : handleStartRecording
                }
                disabled={micPermission === MicrophonePermission.DENIED}
                className="flex items-center gap-2"
              >
                {isRecording ? (
                  <>
                    <Square className="h-5 w-5" />
                    停止录音
                  </>
                ) : (
                  <>
                    <Mic className="h-5 w-5" />
                    开始录音
                  </>
                )}
              </Button>

              {/* 录音时长显示 */}
              {isRecording && (
                <div className="flex items-center gap-2">
                  <Circle className="h-3 w-3 animate-pulse fill-current text-red-500" />
                  <span className="font-mono text-sm">
                    {formatDuration(recordingDuration)}
                  </span>
                </div>
              )}
            </div>

            {/* 音频级别显示 */}
            {isRecording && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">音频级别</span>
                  <span className="text-sm text-gray-600">
                    {Math.round(audioLevel * 100)}%
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-gray-200">
                  <div
                    className="h-2 rounded-full bg-green-500 transition-all duration-100"
                    style={{ width: `${audioLevel * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* 错误信息显示 */}
          {audioError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3">
              <div className="flex items-center gap-2">
                <Circle className="h-3 w-3 fill-current text-red-500" />
                <span className="text-sm font-medium text-red-700">
                  音频错误
                </span>
              </div>
              <p className="mt-1 text-sm text-red-600">{audioError}</p>
            </div>
          )}

          {/* 配置信息显示 */}
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
            <h4 className="mb-2 text-sm font-medium text-blue-700">音频配置</h4>
            <div className="grid grid-cols-2 gap-2 text-xs text-blue-600">
              <div>采样率: 16000Hz</div>
              <div>声道数: 1</div>
              <div>缓冲区: 4096</div>
              <div>回声消除: 开启</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

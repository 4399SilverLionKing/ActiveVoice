'use client';

import { useState } from 'react';

import { AudioManager } from '@/components/AudioManager';
import { ChatInterface } from '@/components/ChatInterface';
import { WebSocketManager } from '@/components/WebSocketManager';

export default function Home() {
  const [currentView, setCurrentView] = useState<'demo' | 'debug'>('demo');

  return (
    <main className="min-h-screen">
      <div className="flex flex-col space-y-5">
        {/* WebSocket管理器 */}
        <WebSocketManager />
        {/* 音频管理器 */}
        <AudioManager />
        {/* 语音对话界面 */}
        <ChatInterface />
      </div>
    </main>
  );
}

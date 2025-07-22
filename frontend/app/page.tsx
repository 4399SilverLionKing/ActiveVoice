'use client';

import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function Home() {
  const [message, setMessage] = useState('');
  const [responses, setResponses] = useState<string[]>([]);
  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    // 组件加载时创建 WebSocket 连接
    ws.current = new WebSocket('ws://localhost:8000/ws');

    ws.current.onopen = () => {
      console.log('WebSocket connected');
    };

    ws.current.onmessage = event => {
      console.log('Received from server:', event.data);
      setResponses(prev => [...prev, event.data]);
    };

    ws.current.onclose = () => {
      console.log('WebSocket disconnected');
    };

    ws.current.onerror = error => {
      console.error('WebSocket error:', error);
    };

    // 组件卸载时关闭连接
    return () => {
      ws.current?.close();
    };
  }, []);

  const sendMessage = () => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(message);
      setMessage('');
    } else {
      console.log('WebSocket is not connected.');
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center space-y-10 p-24">
      <div className="flex space-x-4">
        <Input
          type="text"
          value={message}
          onChange={e => setMessage(e.target.value)}
        />
        <Button
          onClick={sendMessage}
          variant={'outline'}
          className="hover:cursor-pointer"
        >
          Send Message
        </Button>
      </div>
      <div className="flex flex-col space-y-4">
        <h2>Responses from Server:</h2>
        <ul>
          {responses.map((res, index) => (
            <li key={index}>{res}</li>
          ))}
        </ul>
      </div>
    </main>
  );
}

import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const socket = io('http://localhost:3001');

export const useSocket = (onEvent) => {
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socket.on('request:classified', (data) => onEvent('classified', data));
    socket.on('request:updated', (data) => onEvent('updated', data));
    socket.on('request:failed', (data) => onEvent('failed', data));

    return () => {
      socket.off('request:classified');
      socket.off('request:updated');
      socket.off('request:failed');
    };
  }, [onEvent]);

  return { connected };
};
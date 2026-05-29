import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

// Create socket ONCE outside the hook — persists across page navigation
const socket = io(process.env.REACT_APP_SOCKET_URL || 'http://localhost:3001', {
  reconnection: true,           // auto reconnect if dropped
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

export const useSocket = (onEvent) => {
  const [connected, setConnected] = useState(socket.connected);

  useEffect(() => {
    // If already connected, set true immediately
    if (socket.connected) setConnected(true);

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('connect_error', () => setConnected(false));

    socket.on('request:classified', (data) => onEvent('classified', data));
    socket.on('request:updated', (data) => onEvent('updated', data));
    socket.on('request:failed', (data) => onEvent('failed', data));

    return () => {
      // Remove listeners only — DON'T disconnect the socket
      socket.off('connect');
      socket.off('disconnect');
      socket.off('connect_error');
      socket.off('request:classified');
      socket.off('request:updated');
      socket.off('request:failed');
    };
  }, [onEvent]);

  return { connected };
};
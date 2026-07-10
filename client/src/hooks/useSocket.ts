'use client';

import { useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';
import { connectSocket, getSocket } from '@/lib/socket';

export function useSocket() {
  const socketRef = useRef<Socket>(getSocket());

  useEffect(() => {
    const socket = connectSocket();
    socketRef.current = socket;

    return () => {
      // Não desconectar — o socket é singleton e pode ser reutilizado
    };
  }, []);

  return socketRef;
}

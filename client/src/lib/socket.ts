import { io, Socket } from 'socket.io-client';

function getSocketUrl(): string {
  // 1. NEXT_PUBLIC_* definido em build-time (Docker com ngrok fixo)
  if (process.env.NEXT_PUBLIC_SOCKET_URL) {
    return process.env.NEXT_PUBLIC_SOCKET_URL;
  }
  // 2. localStorage (setado em runtime, sem rebuild — útil para ngrok)
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('socketUrl');
    if (stored) return stored;
  }
  // 3. Fallback: localhost (desenvolvimento local)
  return 'http://localhost:3001';
}

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(getSocketUrl(), {
      autoConnect: false,
      transports: ['websocket', 'polling'],
    });
  }
  return socket;
}

export function connectSocket(): Socket {
  const s = getSocket();
  if (!s.connected) {
    s.connect();
  }
  return s;
}

export function disconnectSocket(): void {
  if (socket?.connected) {
    socket.disconnect();
  }
}

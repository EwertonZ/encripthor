import { io, Socket } from 'socket.io-client';

// Conectar via mesma origem da página (Next.js faz proxy para o servidor)
// Isso permite acesso de outros dispositivos sem precisar de porta separada
function getSocketUrl(): string {
  if (process.env.NEXT_PUBLIC_SOCKET_URL) {
    return process.env.NEXT_PUBLIC_SOCKET_URL;
  }
  // Conectar no mesmo hostname/porta da página (Next.js faz proxy)
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return 'http://localhost:3000';
}

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(getSocketUrl(), {
      autoConnect: false,
      // Apenas polling (Next.js proxy não suporta WebSocket upgrade)
      transports: ['polling'],
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

'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getSocket } from '@/lib/socket';
import { useSocket } from '@/hooks/useSocket';
import { useGame } from '@/hooks/useGame';
import SalaEspera from '@/components/SalaEspera';

export default function SalaPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params.roomId as string;
  const socketRef = useSocket();
  const socket = socketRef.current;
  const gameState = useGame(socket);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!socket) return;

    const handleError = (data: { message: string }) => {
      setError(data.message);
    };

    const handleRoomLeft = () => {
      router.push('/');
    };

    const handlePlayerKicked = (data: { playerId: string }) => {
      if (data.playerId === socket.id) {
        setError('Você foi expulso da sala');
      }
    };

    socket.on('error', handleError);
    socket.on('room_left', handleRoomLeft);
    socket.on('player_kicked', handlePlayerKicked);

    // Fallback: se o store não tinha os dados, pedir estado atual ao servidor
    if (!gameState.room) {
      socket.emit('get_room_state', { roomId });
    }

    return () => {
      socket.off('error', handleError);
      socket.off('room_left', handleRoomLeft);
      socket.off('player_kicked', handlePlayerKicked);
    };
  }, [socket, router, roomId, gameState.room]);

  // Estado de erro
  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0f0f1a] p-4">
        <div className="bg-zinc-900/80 backdrop-blur-sm border border-zinc-800 rounded-2xl p-8 shadow-2xl text-center max-w-sm">
          <p className="text-red-400 text-lg mb-2">⚠️</p>
          <p className="text-red-400 text-lg mb-6">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-2.5 bg-violet-600 hover:bg-violet-500 text-white font-medium rounded-lg transition-all duration-200 active:scale-95"
          >
            Voltar ao Início
          </button>
        </div>
      </div>
    );
  }

  // Estado de carregamento
  if (!gameState.room) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0f0f1a]">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-zinc-400 text-lg">Conectando...</p>
        </div>
      </div>
    );
  }

  // Sala de espera
  if (gameState.gamePhase === 'waiting') {
    return (
      <SalaEspera
        roomId={roomId}
        socket={socket!}
        room={gameState.room}
        myPlayerId={gameState.myPlayerId}
        isLeader={gameState.isLeader}
      />
    );
  }

  // Jogo ativo (GameBoard será implementado na Spec 05)
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0f0f1a]">
      <div className="text-center">
        <p className="text-zinc-400 text-lg">🎮 Jogo em andamento...</p>
        <p className="text-zinc-600 text-sm mt-2">Fase: {gameState.gamePhase}</p>
      </div>
    </div>
  );
}

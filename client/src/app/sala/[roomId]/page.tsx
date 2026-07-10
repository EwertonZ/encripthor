'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getSocket, connectSocket } from '@/lib/socket';
import { Room, Player } from '@/types/game';
import SalaEspera from '@/components/SalaEspera';

export default function SalaPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params.roomId as string;

  const [room, setRoom] = useState<Room | null>(null);
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null);
  const [isLeader, setIsLeader] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const socket = getSocket();
    if (!socket.connected) {
      connectSocket();
    }

    const handleRoomJoined = (data: { room: Room; isLeader: boolean }) => {
      setRoom(data.room);
      setIsLeader(data.isLeader);
    };

    const handlePlayerJoined = (data: { player: Player }) => {
      setRoom((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          players: [...prev.players, data.player],
        };
      });
    };

    const handlePlayerLeft = (data: { playerId: string; newLeaderId: string | null }) => {
      setRoom((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          leaderId: data.newLeaderId || prev.leaderId,
          players: prev.players.filter((p) => p.id !== data.playerId),
        };
      });
    };

    const handleRoomLeft = () => {
      router.push('/');
    };

    const handleError = (data: { message: string }) => {
      setError(data.message);
    };

    socket.on('room_joined', handleRoomJoined);
    socket.on('player_joined', handlePlayerJoined);
    socket.on('player_left', handlePlayerLeft);
    socket.on('room_left', handleRoomLeft);
    socket.on('error', handleError);

    // O socket já deve estar conectado e na sala
    // Se não, redirecionar para home

    setMyPlayerId(socket.id || null);

    return () => {
      socket.off('room_joined', handleRoomJoined);
      socket.off('player_joined', handlePlayerJoined);
      socket.off('player_left', handlePlayerLeft);
      socket.off('room_left', handleRoomLeft);
      socket.off('error', handleError);
    };
  }, [roomId, router]);

  const handleLeaveRoom = useCallback(() => {
    const socket = getSocket();
    socket.emit('leave_room', { roomId });
  }, [roomId]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0f0f1a] p-4">
        <div className="text-center">
          <p className="text-red-400 text-lg mb-4">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="px-5 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg transition-all"
          >
            Voltar ao Início
          </button>
        </div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0f0f1a]">
        <div className="animate-pulse text-zinc-400 text-lg">Conectando...</div>
      </div>
    );
  }

  return <SalaEspera roomId={roomId} socket={getSocket()} room={room} myPlayerId={myPlayerId} />;
}

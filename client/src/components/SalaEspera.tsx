'use client';

import { Socket } from 'socket.io-client';
import { Room, Player } from '@/types/game';

interface SalaEsperaProps {
  roomId: string;
  socket: Socket;
  room: Room;
  myPlayerId: string | null;
}

export default function SalaEspera({ roomId, socket, room, myPlayerId }: SalaEsperaProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0f0f1a] p-4">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-white mb-4">🚪 Sala {roomId}</h1>
        <p className="text-zinc-400">Aguardando jogadores...</p>
        <div className="mt-6 space-y-2">
          {room.players.map((player: Player) => (
            <div
              key={player.id}
              className="bg-zinc-800/80 rounded-lg px-4 py-2 text-white"
            >
              {player.id === room.leaderId ? '👑 ' : ''}{player.nickname}
              {player.id === myPlayerId && ' (você)'}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Socket } from 'socket.io-client';
import { Room, Player } from '@/types/game';

interface SalaEsperaProps {
  roomId: string;
  socket: Socket;
  room: Room;
  myPlayerId: string | null;
  isLeader: boolean;
}

export default function SalaEspera({ roomId, socket, room, myPlayerId, isLeader }: SalaEsperaProps) {
  const router = useRouter();

  const handleLeaveRoom = useCallback(() => {
    socket.emit('leave_room', { roomId });
    router.push('/');
  }, [socket, roomId, router]);

  const handleToggleReady = useCallback(() => {
    socket.emit('toggle_ready', { roomId });
  }, [socket, roomId]);

  const handleStartGame = useCallback(() => {
    socket.emit('start_game', { roomId });
  }, [socket, roomId]);

  const handleKickPlayer = useCallback((playerId: string) => {
    socket.emit('kick_player', { roomId, playerId });
  }, [socket, roomId]);

  const allReady = room.players.length >= 2 && room.players
    .filter((p) => p.id !== room.leaderId)
    .every((p) => p.ready);
  const canStart = isLeader && allReady;
  const myPlayer = room.players.find((p) => p.id === myPlayerId);
  const amIReady = myPlayer?.ready ?? false;

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0f0f1a] p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={handleLeaveRoom}
            className="flex items-center gap-1.5 text-zinc-400 hover:text-white transition-colors text-sm"
          >
            <span>🏠</span> Sair
          </button>
          <div className="text-zinc-500 text-sm font-mono tracking-wider">
            Sala: <span className="text-zinc-300">{roomId}</span>
          </div>
        </div>

        {/* Card */}
        <div className="bg-zinc-900/80 backdrop-blur-sm border border-zinc-800 rounded-2xl p-6 shadow-2xl">
          <h2 className="text-zinc-400 text-xs font-medium uppercase tracking-wider mb-4">
            Jogadores ({room.players.length})
          </h2>

          {/* Lista de jogadores */}
          <div className="space-y-2 mb-6">
            {room.players.map((player: Player) => (
              <div
                key={player.id}
                className={`flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${
                  player.id === myPlayerId
                    ? 'bg-violet-900/30 border border-violet-800/40'
                    : 'bg-zinc-800/50 border border-zinc-700/50'
                }`}
              >
                <div className="flex items-center gap-2">
                  {player.id === room.leaderId ? (
                    <span className="text-lg" title="Líder">👑</span>
                  ) : (
                    <span className="text-lg">👤</span>
                  )}
                  <span className="text-white text-sm font-medium">
                    {player.nickname}
                    {player.id === myPlayerId && (
                      <span className="text-zinc-500 font-normal"> (você)</span>
                    )}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {/* Status de pronto */}
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      player.ready
                        ? 'bg-emerald-900/50 text-emerald-400 border border-emerald-700/50'
                        : 'bg-zinc-800 text-zinc-500 border border-zinc-700'
                    }`}
                  >
                    {player.ready ? '✅ Pronto' : '⏳'}
                  </span>

                  {/* Botão de expulsar (só líder, não pode expulsar a si mesmo) */}
                  {isLeader && player.id !== myPlayerId && (
                    <button
                      onClick={() => handleKickPlayer(player.id)}
                      className="text-zinc-600 hover:text-red-400 transition-colors p-1 rounded hover:bg-red-900/20"
                      title="Expulsar jogador"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Botões de ação */}
          <div className="space-y-3">
            {isLeader ? (
              <button
                onClick={handleStartGame}
                disabled={!canStart}
                className={`w-full py-3 rounded-xl font-medium text-sm transition-all duration-200 active:scale-[0.98] ${
                  canStart
                    ? 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-lg shadow-violet-900/30'
                    : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                }`}
              >
                {room.players.length < 2
                  ? 'Aguardando jogadores...'
                  : !allReady
                  ? 'Aguardando todos ficarem prontos...'
                  : '🎮 Iniciar Jogo'}
              </button>
            ) : (
              <button
                onClick={handleToggleReady}
                className={`w-full py-3 rounded-xl font-medium text-sm transition-all duration-200 active:scale-[0.98] ${
                  amIReady
                    ? 'bg-zinc-800 text-zinc-300 border border-zinc-700 hover:bg-zinc-700'
                    : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-900/30'
                }`}
              >
                {amIReady ? '❌ Não Pronto' : '✅ Pronto'}
              </button>
            )}

            {/* Info do líder */}
            <p className="text-center text-zinc-600 text-xs">
              {isLeader
                ? 'Você é o líder da sala'
                : `Líder: ${room.players.find((p) => p.id === room.leaderId)?.nickname || '...'}`}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

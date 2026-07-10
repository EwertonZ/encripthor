'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { connectSocket, getSocket } from '@/lib/socket';
import { Room } from '@/types/game';
import { setRoomData } from '@/lib/store';

export default function TelaInicial() {
  const router = useRouter();
  const [nickname, setNickname] = useState('');
  const [roomIdInput, setRoomIdInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateNickname = useCallback((): string | null => {
    if (!nickname.trim()) return 'Digite um apelido';
    if (nickname.trim().length > 20) return 'Apelido muito longo (máx. 20 caracteres)';
    return null;
  }, [nickname]);

  useEffect(() => {
    const socket = getSocket();

    const handleError = (data: { message: string }) => {
      setError(data.message);
      setLoading(false);
    };

    const handleRoomCreated = (data: { roomId: string; room: Room }) => {
      setLoading(false);
      setRoomData({ room: data.room, isLeader: true });
      router.push(`/sala/${data.roomId}`);
    };

    const handleRoomJoined = (data: { room: Room; isLeader: boolean }) => {
      setLoading(false);
      setRoomData({ room: data.room, isLeader: data.isLeader });
      router.push(`/sala/${data.room.id}`);
    };

    socket.on('error', handleError);
    socket.on('room_created', handleRoomCreated);
    socket.on('room_joined', handleRoomJoined);

    // Conectar se não estiver conectado
    if (!socket.connected) {
      connectSocket();
    }

    return () => {
      socket.off('error', handleError);
      socket.off('room_created', handleRoomCreated);
      socket.off('room_joined', handleRoomJoined);
    };
  }, [router]);

  const handleCreateRoom = () => {
    const nickError = validateNickname();
    if (nickError) {
      setError(nickError);
      return;
    }
    setError(null);
    setLoading(true);
    const socket = getSocket();
    socket.emit('create_room', { nickname: nickname.trim() });
  };

  const handleJoinRoom = () => {
    const nickError = validateNickname();
    if (nickError) {
      setError(nickError);
      return;
    }
    if (!roomIdInput.trim() || roomIdInput.trim().length < 3) {
      setError('Digite um ID de sala válido');
      return;
    }
    setError(null);
    setLoading(true);
    const socket = getSocket();
    socket.emit('join_room', {
      roomId: roomIdInput.trim().toUpperCase(),
      nickname: nickname.trim(),
    });
  };

  const canJoin = roomIdInput.trim().length >= 3;

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0f0f1a] p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-10">
          <h1 className="text-5xl font-bold text-white mb-2 tracking-tight">
            🧩 <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">ENCRYPTHOR</span>
          </h1>
          <p className="text-zinc-500 text-sm">Adivinhe a palavra embaralhada!</p>
        </div>

        {/* Card principal */}
        <div className="bg-zinc-900/80 backdrop-blur-sm border border-zinc-800 rounded-2xl p-6 shadow-2xl">
          {/* Nickname + Criar Sala */}
          <div className="flex gap-3 mb-4">
            <div className="flex-1">
              <label className="block text-zinc-400 text-xs font-medium mb-1.5 uppercase tracking-wider">
                Seu Apelido
              </label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => {
                  setNickname(e.target.value);
                  setError(null);
                }}
                placeholder="Digite seu nick"
                maxLength={20}
                disabled={loading}
                className="w-full bg-zinc-800/80 border border-zinc-700 rounded-lg px-3 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all disabled:opacity-50 text-sm"
                onKeyDown={(e) => e.key === 'Enter' && handleCreateRoom()}
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={handleCreateRoom}
                disabled={loading}
                className="h-[38px] px-5 bg-violet-600 hover:bg-violet-500 disabled:bg-violet-800/50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-all duration-200 active:scale-95 text-sm whitespace-nowrap"
              >
                {loading ? '...' : 'Criar Sala'}
              </button>
            </div>
          </div>

          {/* Separador */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-zinc-800" />
            <span className="text-zinc-500 text-xs font-medium uppercase tracking-widest">ou</span>
            <div className="flex-1 h-px bg-zinc-800" />
          </div>

          {/* ID Sala + Entrar */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-zinc-400 text-xs font-medium mb-1.5 uppercase tracking-wider">
                ID da Sala
              </label>
              <input
                type="text"
                value={roomIdInput}
                onChange={(e) => {
                  setRoomIdInput(e.target.value.toUpperCase());
                  setError(null);
                }}
                placeholder="Ex: ABC123"
                maxLength={6}
                disabled={loading}
                className="w-full bg-zinc-800/80 border border-zinc-700 rounded-lg px-3 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all disabled:opacity-50 text-sm uppercase tracking-wider"
                onKeyDown={(e) => e.key === 'Enter' && handleJoinRoom()}
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={handleJoinRoom}
                disabled={loading || !canJoin}
                className={`h-[38px] px-5 font-medium rounded-lg transition-all duration-200 active:scale-95 text-sm whitespace-nowrap ${
                  canJoin && !loading
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                }`}
              >
                {loading ? '...' : 'Entrar'}
              </button>
            </div>
          </div>
        </div>

        {/* Mensagem de erro */}
        {error && (
          <div className="mt-4 p-3 bg-red-900/40 border border-red-800/60 rounded-lg">
            <p className="text-red-400 text-sm text-center">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}

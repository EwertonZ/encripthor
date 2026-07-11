'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Player, GameScore } from '@/types/game';

interface ResultadoRodadaProps {
  word: string;
  correctPlayers: string[];
  players: Player[];
  scores: GameScore[];
  isGameOver: boolean;
  winnerId: string | null;
  myPlayerId: string | null;
}

export default function ResultadoRodada({
  word,
  correctPlayers,
  players,
  scores,
  isGameOver,
  winnerId,
  myPlayerId,
}: ResultadoRodadaProps) {
  const router = useRouter();
  const [countdown, setCountdown] = useState(5);
  const [revealed, setRevealed] = useState(false);

  // Animação de revelação da palavra
  useEffect(() => {
    const timer = setTimeout(() => setRevealed(true), 300);
    return () => clearTimeout(timer);
  }, []);

  // Contagem regressiva (só para fim de rodada)
  useEffect(() => {
    if (isGameOver) return;

    const interval = setInterval(() => {
      setCountdown((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [isGameOver]);

  // Fim de rodada
  if (!isGameOver) {
    return (
      <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
        <p className="text-zinc-400 text-sm font-medium uppercase tracking-wider mb-3">
          ⏱ Fim da Rodada
        </p>

        {/* Palavra revelada */}
        <div className="mb-6">
          <p className="text-zinc-600 text-xs mb-2">A palavra era:</p>
          <div
            className={`transition-all duration-500 ${
              revealed ? 'opacity-100 scale-100' : 'opacity-0 scale-50'
            }`}
          >
            <span className="text-3xl sm:text-4xl font-bold font-mono tracking-[0.3em] text-white bg-zinc-900/50 px-6 py-3 rounded-xl border border-zinc-800">
              {word}
            </span>
          </div>
        </div>

        {/* Quem acertou */}
        <div className="mb-6">
          <p className="text-zinc-500 text-sm mb-2">
            {correctPlayers.length > 0
              ? `${correctPlayers.length} jogador(es) acertaram:`
              : 'Ninguém acertou essa rodada!'}
          </p>
          {correctPlayers.length > 0 && (
            <div className="flex flex-wrap justify-center gap-2">
              {correctPlayers.map((playerId) => {
                const player = players.find((p) => p.id === playerId);
                const isMe = playerId === myPlayerId;
                return (
                  <span
                    key={playerId}
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      isMe
                        ? 'bg-emerald-900/40 text-emerald-400 border border-emerald-700/50'
                        : 'bg-emerald-900/20 text-emerald-500 border border-emerald-800/30'
                    }`}
                  >
                    ✅ {player?.nickname || '...'}
                    {isMe && ' (você)'}
                  </span>
                );
              })}
            </div>
          )}
        </div>

        {/* Contagem */}
        <p className="text-zinc-600 text-sm animate-pulse">
          Próxima rodada em {countdown}s...
        </p>
      </div>
    );
  }

  // ===================== FIM DE JOGO =====================
  const sorted = [...scores].sort((a, b) => b.score - a.score);
  const p1 = sorted[0];
  const p2 = sorted[1];
  const p3 = sorted[2];

  // Verificar empate no primeiro lugar
  const isTie = p1 && sorted.filter((s) => s.score === p1.score).length > 1;
  const tiedPlayers = isTie
    ? sorted.filter((s) => s.score === p1.score).map((s) => s.nickname)
    : [];

  return (
    <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
      <p className="text-amber-400 text-sm font-medium uppercase tracking-wider mb-1">
        🏆 Fim de Jogo!
      </p>
      <p className="text-zinc-600 text-xs mb-6">Resultado final</p>

      {/* Pódio */}
      <div className="flex items-end justify-center gap-3 mb-8">
        {/* 2º lugar */}
        {p2 && (
          <div className="flex flex-col items-center">
            <span className="text-zinc-300 text-sm font-medium mb-1 truncate max-w-[80px]">
              {p2.nickname}
            </span>
            <div className="w-20 h-16 bg-zinc-800 border border-zinc-700 rounded-t-lg flex items-center justify-center">
              <span className="text-zinc-400 text-lg font-bold">2º</span>
            </div>
            <span className="text-zinc-500 text-xs font-mono mt-1">{p2.score} pts</span>
          </div>
        )}

        {/* 1º lugar */}
        {p1 && (
          <div className="flex flex-col items-center">
            <span
              className={`text-sm font-bold mb-1 truncate max-w-[100px] ${
                p1.playerId === myPlayerId ? 'text-violet-400' : 'text-amber-400'
              }`}
            >
              {p1.nickname}
              {p1.playerId === myPlayerId && ' (você)'}
            </span>
            <div className="w-24 h-24 bg-gradient-to-t from-amber-900/40 to-amber-800/20 border-2 border-amber-600/50 rounded-t-xl flex items-center justify-center">
              <span className="text-amber-400 text-3xl font-bold">👑</span>
            </div>
            <span className="text-amber-400 text-sm font-mono mt-1">{p1.score} pts</span>
          </div>
        )}

        {/* 3º lugar */}
        {p3 && (
          <div className="flex flex-col items-center">
            <span className="text-amber-700 text-sm font-medium mb-1 truncate max-w-[80px]">
              {p3.nickname}
            </span>
            <div className="w-20 h-12 bg-zinc-800/50 border border-zinc-700/50 rounded-t-lg flex items-center justify-center">
              <span className="text-amber-700 text-lg font-bold">3º</span>
            </div>
            <span className="text-zinc-600 text-xs font-mono mt-1">{p3.score} pts</span>
          </div>
        )}
      </div>

      {/* Empate */}
      {isTie && (
        <p className="text-zinc-400 text-sm mb-6">
          👏 Empate entre: {tiedPlayers.join(', ')}
        </p>
      )}

      {/* Placar completo */}
      <div className="w-full max-w-xs bg-zinc-900/40 border border-zinc-800/60 rounded-xl p-3 mb-6">
        {sorted.map((entry, i) => {
          const isMe = entry.playerId === myPlayerId;
          return (
            <div
              key={entry.playerId}
              className={`flex items-center justify-between px-3 py-1.5 rounded ${
                isMe ? 'bg-violet-900/15' : ''
              }`}
            >
              <span className={`text-sm ${isMe ? 'text-violet-300' : 'text-zinc-400'}`}>
                {i + 1}º {entry.nickname}
                {isMe && ' (você)'}
              </span>
              <span className="text-sm font-mono text-zinc-500">{entry.score} pts</span>
            </div>
          );
        })}
      </div>

      {/* Botão voltar */}
      <button
        onClick={() => router.push('/')}
        className="px-6 py-2.5 bg-violet-600 hover:bg-violet-500 text-white font-medium rounded-lg transition-all duration-200 active:scale-95"
      >
        Voltar ao Início
      </button>
    </div>
  );
}

'use client';

import { Player, GameScore } from '@/types/game';

interface PlacarProps {
  scores: GameScore[];
  players: Player[];
  myPlayerId: string | null;
  wordMasterId: string | null;
  currentRound: number;
  maxRounds: number;
}

export default function Placar({
  scores,
  players,
  myPlayerId,
  wordMasterId,
  currentRound,
  maxRounds,
}: PlacarProps) {
  // Ordenar por pontuação (maior primeiro)
  const sorted = [...scores].sort((a, b) => b.score - a.score);

  // Mapa de playerId → hasGuessedCorrectly
  const guessedMap = new Map(players.map((p) => [p.id, p.hasGuessedCorrectly]));

  return (
    <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-xl p-4">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-zinc-400 text-xs font-medium uppercase tracking-wider">
          Placar
        </h3>
        <span className="text-zinc-600 text-xs font-mono">
          Rodada {currentRound}/{maxRounds}
        </span>
      </div>

      {/* Lista de jogadores */}
      <div className="space-y-1.5">
        {sorted.map((entry, index) => {
          const isMe = entry.playerId === myPlayerId;
          const isMaster = entry.playerId === wordMasterId;
          const hasGuessed = guessedMap.get(entry.playerId) ?? false;

          return (
            <div
              key={entry.playerId}
              className={`flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
                isMe
                  ? 'bg-violet-900/20 border border-violet-800/30'
                  : 'bg-zinc-800/30 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                {/* Posição */}
                <span
                  className={`text-xs font-mono font-bold w-5 text-right ${
                    index === 0
                      ? 'text-amber-400'
                      : index === 1
                      ? 'text-zinc-300'
                      : index === 2
                      ? 'text-amber-700'
                      : 'text-zinc-600'
                  }`}
                >
                  {index + 1}º
                </span>

                {/* Nome */}
                <span
                  className={`text-sm truncate ${
                    isMe ? 'text-violet-300 font-medium' : 'text-zinc-300'
                  }`}
                >
                  {entry.nickname}
                  {isMe && <span className="text-zinc-600 font-normal"> (você)</span>}
                </span>

                {/* Badges */}
                <div className="flex items-center gap-1 shrink-0">
                  {isMaster && (
                    <span className="text-xs" title="Word Master">👑</span>
                  )}
                  {hasGuessed && (
                    <span className="text-xs" title="Acertou esta rodada">🟢</span>
                  )}
                </div>
              </div>

              {/* Pontuação */}
              <span
                className={`text-sm font-mono font-bold tabular-nums ${
                  isMe ? 'text-violet-400' : 'text-zinc-400'
                }`}
              >
                {entry.score}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

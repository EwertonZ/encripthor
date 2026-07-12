'use client';

import { useRouter } from 'next/navigation';
import { Socket } from 'socket.io-client';
import { GameState } from '@/hooks/useGame';
import Timer from './Timer';
import CampoPalavra from './CampoPalavra';
import LetrasEmbaralhadas from './LetrasEmbaralhadas';
import Placar from './Placar';
import ResultadoRodada from './ResultadoRodada';

interface GameBoardProps {
  roomId: string;
  socket: Socket;
  gameState: GameState;
  submitWord: (word: string) => void;
  makeGuess: (guess: string) => void;
}

export default function GameBoard({
  roomId,
  socket,
  gameState,
  submitWord,
  makeGuess,
}: GameBoardProps) {
  const router = useRouter();
  const {
    room,
    isWordMaster,
    wordMasterId,
    gamePhase,
    scrambledLetters,
    wordLength,
    timerRemaining,
    timerPhase,
    guessedCorrectly,
    scores,
    revealedWord,
    correctPlayers,
    winnerId,
    myPlayerId,
    wordTimeout,
    wrongFeedbackKey,
  } = gameState;

  const handleLeaveRoom = () => {
    socket.emit('leave_room', { roomId });
    router.push('/');
  };

  const players = room?.players || [];

  return (
    <div className="min-h-screen bg-[#0f0f1a] flex flex-col">
      {/* Header com botão sair */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800/60">
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

      {/* Timer no topo (sempre visível durante jogo) */}
      {(gamePhase === 'choosing_word' || gamePhase === 'guessing') && (
        <div className="px-4 pt-4 pb-2">
          <Timer remaining={timerRemaining} phase={timerPhase} />
        </div>
      )}

      {/* Conteúdo principal */}
      <div className="flex-1 flex flex-col lg:flex-row gap-4 p-4 max-w-6xl mx-auto w-full">
        {/* Coluna central — conteúdo do jogo */}
        <div className="flex-1 flex flex-col items-center justify-center">
          {/* FASE: ESCOLHA DA PALAVRA */}
          {gamePhase === 'choosing_word' && (
            <div className="w-full max-w-lg space-y-6">
              {isWordMaster ? (
                <>
                  <div className="text-center">
                    <p className="text-violet-400 text-lg font-bold mb-1">🎯 Você é o Word Master!</p>
                    <p className="text-zinc-500 text-sm">Digite uma palavra para os outros adivinharem</p>
                  </div>
                  <CampoPalavra
                    mode="write"
                    onSubmit={submitWord}
                    disabled={wordTimeout}
                    isWordMaster={isWordMaster}
                    wrongFeedbackKey={wrongFeedbackKey}
                  />
                </>
              ) : (
                <div className="text-center py-12">
                  <div className="animate-pulse">
                    <p className="text-zinc-400 text-lg mb-2">🕐 Aguardando palavra...</p>
                    <p className="text-zinc-600 text-sm">
                      O Word Master está escolhendo a palavra
                    </p>
                  </div>
                  {wordLength && (
                    <div className="flex items-center justify-center gap-1.5 mt-4">
                      {Array.from({ length: wordLength }).map((_, i) => (
                        <span
                          key={i}
                          className="w-3 h-3 bg-zinc-700 rounded-full animate-pulse"
                          style={{ animationDelay: `${i * 0.1}s` }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* FASE: ADIVINHAÇÃO */}
          {gamePhase === 'guessing' && (
            <div className="w-full max-w-lg space-y-6">
              {isWordMaster ? (
                <div className="text-center py-8">
                  <p className="text-violet-400 text-lg font-bold mb-1">🎯 Você é o Word Master!</p>
                  <p className="text-zinc-500 text-sm">Aguarde os palpites dos outros jogadores...</p>
                </div>
              ) : (
                <>
                  <div className="text-center">
                    <p className="text-zinc-400 text-sm font-medium uppercase tracking-wider mb-2">
                      Descubra a palavra!
                    </p>
                  </div>
                  <LetrasEmbaralhadas
                    letters={scrambledLetters}
                    wordLength={wordLength}
                  />
                  <CampoPalavra
                    mode="guess"
                    onSubmit={makeGuess}
                    disabled={guessedCorrectly}
                    wordLength={wordLength}
                    guessedCorrectly={guessedCorrectly}
                    isWordMaster={isWordMaster}
                    wrongFeedbackKey={wrongFeedbackKey}
                  />
                </>
              )}
            </div>
          )}

          {/* FASE: FIM DE RODADA / FIM DE JOGO */}
          {(gamePhase === 'round_end' || gamePhase === 'game_over') && revealedWord && (
            <div className="w-full max-w-lg">
              <ResultadoRodada
                word={revealedWord}
                correctPlayers={correctPlayers}
                players={players}
                scores={scores}
                isGameOver={gamePhase === 'game_over'}
                winnerId={winnerId}
                myPlayerId={myPlayerId}
              />
            </div>
          )}
        </div>

        {/* Coluna lateral — Placar (sempre visível durante jogo) */}
        {gamePhase !== 'waiting' && (
          <div className="w-full lg:w-64 shrink-0">
            <Placar
              scores={scores}
              players={players}
              myPlayerId={myPlayerId}
              wordMasterId={wordMasterId}
              currentRound={room?.currentRound || 1}
              maxRounds={room?.maxRounds || 5}
            />
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';
import { Player, Room, GameScore } from '@/types/game';
import { getRoomData } from '@/lib/store';

export interface GameState {
  room: Room | null;
  isLeader: boolean;
  myPlayerId: string | null;
  gamePhase: 'waiting' | 'choosing_word' | 'guessing' | 'round_end' | 'game_over';
  isWordMaster: boolean;
  scrambledLetters: string[];
  timerRemaining: number | null;
  timerPhase: 'choosing' | 'guessing' | null;
  wordLength: number | null;
  guessedCorrectly: boolean;
  scores: GameScore[];
  revealedWord: string | null;
  correctPlayers: string[];
  winnerId: string | null;
}

const initialState: GameState = {
  room: null,
  isLeader: false,
  myPlayerId: null,
  gamePhase: 'waiting',
  isWordMaster: false,
  scrambledLetters: [],
  timerRemaining: null,
  timerPhase: null,
  wordLength: null,
  guessedCorrectly: false,
  scores: [],
  revealedWord: null,
  correctPlayers: [],
  winnerId: null,
};

export function useGame(socket: Socket | null) {
  const [state, setState] = useState<GameState>(initialState);
  const restoredRef = useRef(false);

  useEffect(() => {
    if (!socket) return;

    // Restaurar dados da sala salvos no store (só na 1ª execução, mesmo com StrictMode)
    if (!restoredRef.current) {
      const savedData = getRoomData();
      if (savedData) {
        setState((prev) => ({
          ...prev,
          room: savedData.room,
          isLeader: savedData.isLeader,
          myPlayerId: socket.id ?? null,
          gamePhase: 'waiting' as const,
        }));
      }
      restoredRef.current = true;
    }

    const onRoomJoined = (data: { room: Room; isLeader: boolean }) => {
      setState((prev) => ({
        ...prev,
        room: data.room,
        isLeader: data.isLeader,
        myPlayerId: socket.id ?? null,
        gamePhase: 'waiting' as const,
      }));
    };

    const onPlayerJoined = (data: { player: Player }) => {
      setState((prev) => {
        if (!prev.room) return prev;
        return {
          ...prev,
          room: {
            ...prev.room,
            players: [...prev.room.players, data.player],
          },
        };
      });
    };

    const onPlayerLeft = (data: { playerId: string; newLeaderId: string | null }) => {
      setState((prev) => {
        if (!prev.room) return prev;
        return {
          ...prev,
          isLeader: prev.isLeader ? true : data.newLeaderId === socket.id ? true : prev.isLeader,
          room: {
            ...prev.room,
            leaderId: data.newLeaderId || prev.room.leaderId,
            players: prev.room.players.filter((p) => p.id !== data.playerId),
          },
        };
      });
    };

    const onPlayerReady = (data: { playerId: string; ready: boolean }) => {
      setState((prev) => {
        if (!prev.room) return prev;
        return {
          ...prev,
          room: {
            ...prev.room,
            players: prev.room.players.map((p) =>
              p.id === data.playerId ? { ...p, ready: data.ready } : p
            ),
          },
        };
      });
    };

    const onPlayerKicked = (data: { playerId: string }) => {
      if (data.playerId === socket.id) {
        setState(initialState);
      } else {
        setState((prev) => {
          if (!prev.room) return prev;
          return {
            ...prev,
            room: {
              ...prev.room,
              players: prev.room.players.filter((p) => p.id !== data.playerId),
            },
          };
        });
      }
    };

    const onGameStarting = () => {
      setState((prev) => ({
        ...prev,
        gamePhase: 'choosing_word',
      }));
    };

    const onWordMasterSelected = (data: { playerId: string }) => {
      setState((prev) => ({
        ...prev,
        isWordMaster: data.playerId === socket.id,
        gamePhase: 'choosing_word',
      }));
    };

    const onWordSubmitted = (data: { wordLength: number }) => {
      setState((prev) => ({
        ...prev,
        wordLength: data.wordLength,
      }));
    };

    const onWordScrambled = (data: { scrambledLetters: string[]; masterId: string }) => {
      setState((prev) => ({
        ...prev,
        scrambledLetters: data.scrambledLetters,
        gamePhase: 'guessing',
      }));
    };

    const onTimerTick = (data: { phase: 'choosing' | 'guessing'; remaining: number }) => {
      setState((prev) => ({
        ...prev,
        timerPhase: data.phase,
        timerRemaining: data.remaining,
      }));
    };

    const onGuessResult = (data: { playerId: string; correct: boolean }) => {
      if (data.playerId === socket.id && data.correct) {
        setState((prev) => ({ ...prev, guessedCorrectly: true }));
      }
    };

    const onRoundEnd = (data: { scores: GameScore[]; word: string; correctPlayers: string[] }) => {
      setState((prev) => ({
        ...prev,
        gamePhase: 'round_end',
        scores: data.scores,
        revealedWord: data.word,
        correctPlayers: data.correctPlayers,
        timerRemaining: null,
      }));
    };

    const onGameEnd = (data: { finalScores: GameScore[]; winnerId: string | null }) => {
      setState((prev) => ({
        ...prev,
        gamePhase: 'game_over',
        scores: data.finalScores,
        winnerId: data.winnerId,
        revealedWord: null,
      }));
    };

    const onError = () => {
      // Erros são tratados no componente
    };

    socket.on('room_joined', onRoomJoined);
    socket.on('player_joined', onPlayerJoined);
    socket.on('player_left', onPlayerLeft);
    socket.on('player_ready', onPlayerReady);
    socket.on('player_kicked', onPlayerKicked);
    socket.on('game_starting', onGameStarting);
    socket.on('word_master_selected', onWordMasterSelected);
    socket.on('word_submitted', onWordSubmitted);
    socket.on('word_scrambled', onWordScrambled);
    socket.on('timer_tick', onTimerTick);
    socket.on('guess_result', onGuessResult);
    socket.on('round_end', onRoundEnd);
    socket.on('game_end', onGameEnd);
    socket.on('error', onError);

    return () => {
      socket.off('room_joined', onRoomJoined);
      socket.off('player_joined', onPlayerJoined);
      socket.off('player_left', onPlayerLeft);
      socket.off('player_ready', onPlayerReady);
      socket.off('player_kicked', onPlayerKicked);
      socket.off('game_starting', onGameStarting);
      socket.off('word_master_selected', onWordMasterSelected);
      socket.off('word_submitted', onWordSubmitted);
      socket.off('word_scrambled', onWordScrambled);
      socket.off('timer_tick', onTimerTick);
      socket.off('guess_result', onGuessResult);
      socket.off('round_end', onRoundEnd);
      socket.off('game_end', onGameEnd);
      socket.off('error', onError);
    };
  }, [socket]);

  return state;
}

import { RoomData, clearRoomTimers } from './rooms';
import { Server } from 'socket.io';
import { scrambleWord, validateWord } from './scrambler';

export function selectWordMaster(room: RoomData, excludeId?: string): string | null {
  const candidates = Array.from(room.players.keys()).filter((id) => id !== excludeId);
  if (candidates.length === 0) return null;

  const randomIndex = Math.floor(Math.random() * candidates.length);
  return candidates[randomIndex];
}

export function startWordTimer(room: RoomData, io: Server): void {
  let remaining = 20;

  room.timers.wordTimer = setInterval(() => {
    remaining--;
    io.to(room.id).emit('timer_tick', { phase: 'choosing', remaining });

    if (remaining <= 0) {
      clearInterval(room.timers.wordTimer!);
      room.timers.wordTimer = null;
      handleWordTimeout(room, io);
    }
  }, 1000);
}

export function handleWordSubmission(
  room: RoomData,
  io: Server,
  socketId: string,
  word: string
): { success: boolean; error?: string } {
  if (socketId !== room.wordMaster) {
    return { success: false, error: 'Você não é o Word Master da vez' };
  }

  const validation = validateWord(word);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  if (room.timers.wordTimer) {
    clearInterval(room.timers.wordTimer);
    room.timers.wordTimer = null;
  }

  const cleanWord = word.trim().toUpperCase();
  room.currentWord = cleanWord;
  room.scrambledLetters = scrambleWord(cleanWord);

  io.to(room.id).emit('word_submitted', { wordLength: cleanWord.length });
  io.to(room.id).emit('word_scrambled', {
    scrambledLetters: room.scrambledLetters,
    masterId: socketId,
  });

  room.status = 'guessing';
  startGuessTimer(room, io);

  return { success: true };
}

export function handleWordTimeout(room: RoomData, io: Server): void {
  if (!room.wordMaster) return;

  io.to(room.id).emit('word_timeout', { playerId: room.wordMaster });

  const newMaster = selectWordMaster(room, room.wordMaster);
  if (!newMaster) {
    io.to(room.id).emit('error', { message: 'Não há jogadores suficientes' });
    return;
  }

  room.wordMaster = newMaster;
  io.to(room.id).emit('word_master_selected', { playerId: newMaster });
  startWordTimer(room, io);
}

export function startGuessTimer(room: RoomData, io: Server): void {
  let remaining = 60;

  room.timers.guessTimer = setInterval(() => {
    remaining--;
    io.to(room.id).emit('timer_tick', { phase: 'guessing', remaining });

    if (remaining <= 0) {
      clearInterval(room.timers.guessTimer!);
      room.timers.guessTimer = null;
      handleRoundEnd(room, io);
    }
  }, 1000);
}

export function handleGuess(
  room: RoomData,
  io: Server,
  socketId: string,
  guess: string
): { playerId: string; correct: boolean } | { error: string } {
  if (socketId === room.wordMaster) {
    return { error: 'Word Master não pode adivinhar a própria palavra' };
  }

  const player = room.players.get(socketId);
  if (!player) return { error: 'Jogador não encontrado' };
  if (player.hasGuessedCorrectly) {
    return { error: 'Você já acertou a palavra' };
  }

  const isCorrect = guess.trim().toUpperCase() === room.currentWord;
  if (isCorrect) {
    player.hasGuessedCorrectly = true;
    room.playersGuessedCorrectly.add(socketId);
  }

  return { playerId: socketId, correct: isCorrect };
}

export function handleRoundEnd(room: RoomData, io: Server): void {
  if (!room.wordMaster) return;

  const allPlayers = Array.from(room.players.values());
  const playersGuessedCorrectly = allPlayers.filter((p) => p.hasGuessedCorrectly);
  const playersWhoErrored = allPlayers.filter(
    (p) => p.id !== room.wordMaster && !p.hasGuessedCorrectly
  );

  const masterId = room.wordMaster;
  room.scores.set(masterId, (room.scores.get(masterId) || 0) + playersWhoErrored.length);

  playersGuessedCorrectly.forEach((p) => {
    room.scores.set(p.id, (room.scores.get(p.id) || 0) + 1);
  });

  const scores = allPlayers.map((p) => ({
    playerId: p.id,
    nickname: p.nickname,
    score: room.scores.get(p.id) || 0,
  }));

  const correctPlayerIds = playersGuessedCorrectly.map((p) => p.id);

  room.status = 'round_end';
  io.to(room.id).emit('round_end', {
    scores,
    word: room.currentWord,
    correctPlayers: correctPlayerIds,
  });

  const roomId = room.id;
  setTimeout(() => {
    if (!io.sockets.adapter.rooms.has(roomId)) return;
    if (room.currentRound >= room.maxRounds) {
      handleGameEnd(room, io);
    } else {
      startNewRound(room, io);
    }
  }, 5000);
}

export function startNewRound(room: RoomData, io: Server): void {
  room.currentRound++;
  room.wordMaster = null;
  room.currentWord = null;
  room.scrambledLetters = null;
  room.playersGuessedCorrectly = new Set();
  room.players.forEach((p) => {
    p.hasGuessedCorrectly = false;
  });
  room.status = 'choosing_word';

  const newMaster = selectWordMaster(room);
  room.wordMaster = newMaster;
  io.to(room.id).emit('word_master_selected', { playerId: newMaster });
  startWordTimer(room, io);
}

export function handleGameEnd(room: RoomData, io: Server): void {
  room.status = 'round_end';

  let maxScore = -1;
  let winnerId: string | null = null;
  for (const [playerId, score] of room.scores) {
    if (score > maxScore) {
      maxScore = score;
      winnerId = playerId;
    }
  }

  const finalScores = Array.from(room.players.values()).map((p) => ({
    playerId: p.id,
    nickname: p.nickname,
    score: room.scores.get(p.id) || 0,
  }));

  io.to(room.id).emit('game_end', { finalScores, winnerId });
}

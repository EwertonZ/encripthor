import { Server } from 'socket.io';
import { RoomData } from './rooms';
import { scrambleWord, validateWord } from './scrambler';

/**
 * Sorteia um Word Master aleatório, excluindo opcionalmente um jogador.
 */
export function selectWordMaster(room: RoomData, excludeId?: string): string | null {
  const candidates = Array.from(room.players.keys()).filter((id) => id !== excludeId);

  if (candidates.length === 0) return null;

  const randomIndex = Math.floor(Math.random() * candidates.length);
  return candidates[randomIndex];
}

/**
 * Inicia timer de 20s para o Word Master digitar a palavra.
 */
export function startWordTimer(room: RoomData, io: Server): void {
  let remaining = 20;

  room.timers.wordTimer = setInterval(() => {
    remaining--;
    io.to(room.id).emit('timer_tick', { phase: 'choosing', remaining });

    if (remaining <= 0) {
      if (room.timers.wordTimer) {
        clearInterval(room.timers.wordTimer);
        room.timers.wordTimer = null;
      }
      handleWordTimeout(room, io);
    }
  }, 1000);
}

/**
 * Processa o envio da palavra pelo Word Master.
 */
export function handleWordSubmission(
  room: RoomData,
  io: Server,
  socketId: string,
  word: string
): { success: boolean; error?: string } {
  // Só aceitar submissão durante a fase de escolha
  if (room.status !== 'choosing_word') {
    return { success: false, error: 'Não é o momento para enviar palavra' };
  }

  // Verificar se é o Word Master
  if (socketId !== room.wordMaster) {
    return { success: false, error: 'Você não é o Word Master da vez' };
  }

  // Validar palavra
  const validation = validateWord(word);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  // Limpar timer de digitação
  if (room.timers.wordTimer) {
    clearInterval(room.timers.wordTimer);
    room.timers.wordTimer = null;
  }

  // Guardar palavra e embaralhar
  const cleanWord = word.trim().toUpperCase();
  room.currentWord = cleanWord;
  room.scrambledLetters = scrambleWord(cleanWord);

  // Notificar: word_submitted (todos) + word_scrambled (todos)
  io.to(room.id).emit('word_submitted', { wordLength: cleanWord.length });
  io.to(room.id).emit('word_scrambled', {
    scrambledLetters: room.scrambledLetters,
    masterId: socketId,
  });

  // Iniciar fase de adivinhação
  room.status = 'guessing';
  startGuessTimer(room, io);

  return { success: true };
}

/**
 * Processa o timeout do Word Master (não enviou palavra a tempo).
 */
export function handleWordTimeout(room: RoomData, io: Server): void {
  io.to(room.id).emit('word_timeout', { playerId: room.wordMaster! });

  // Sortear novo Word Master (excluindo o que perdeu a vez)
  const newMaster = selectWordMaster(room, room.wordMaster!);
  if (!newMaster) {
    // Caso extremo: só 1 jogador na sala
    io.to(room.id).emit('error', { message: 'Não há jogadores suficientes' });
    return;
  }

  room.wordMaster = newMaster;
  io.to(room.id).emit('word_master_selected', { playerId: newMaster });
  startWordTimer(room, io);
}

/**
 * Inicia timer de 60s para adivinhação.
 */
export function startGuessTimer(room: RoomData, io: Server): void {
  let remaining = 60;

  room.timers.guessTimer = setInterval(() => {
    remaining--;
    io.to(room.id).emit('timer_tick', { phase: 'guessing', remaining });

    if (remaining <= 0) {
      if (room.timers.guessTimer) {
        clearInterval(room.timers.guessTimer);
        room.timers.guessTimer = null;
      }
      handleRoundEnd(room, io);
    }
  }, 1000);
}

/**
 * Processa um palpite de um jogador.
 */
export function handleGuess(
  room: RoomData,
  _io: Server,
  socketId: string,
  guess: string
): { playerId: string; correct: boolean } | { error: string } {
  // Word Master não pode palpitar
  if (socketId === room.wordMaster) {
    return { error: 'Word Master não pode adivinhar a própria palavra' };
  }

  // Verificar se já acertou
  const player = room.players.get(socketId);
  if (!player) return { error: 'Jogador não encontrado' };
  if (player.hasGuessedCorrectly) {
    return { error: 'Você já acertou a palavra' };
  }

  const isCorrect = guess.trim().toUpperCase() === room.currentWord;
  if (isCorrect) {
    player.hasGuessedCorrectly = true;
  }

  return { playerId: socketId, correct: isCorrect };
}

/**
 * Finaliza a rodada atual, calcula pontuação e decide próximo passo.
 */
export function handleRoundEnd(room: RoomData, io: Server): void {
  // Calcular pontuação
  const allPlayers = Array.from(room.players.values());
  const playersGuessedCorrectly = allPlayers.filter((p) => p.hasGuessedCorrectly);
  const playersWhoErrored = allPlayers.filter(
    (p) => p.id !== room.wordMaster && !p.hasGuessedCorrectly
  );

  // Word Master ganha 1 ponto para cada erro
  const masterId = room.wordMaster!;
  room.scores.set(masterId, (room.scores.get(masterId) || 0) + playersWhoErrored.length);

  // Quem acertou ganha 1 ponto
  playersGuessedCorrectly.forEach((p) => {
    room.scores.set(p.id, (room.scores.get(p.id) || 0) + 1);
  });

  // Montar scores para broadcast
  const scores = allPlayers.map((p) => ({
    playerId: p.id,
    nickname: p.nickname,
    score: room.scores.get(p.id) || 0,
  }));

  const correctPlayerIds = playersGuessedCorrectly.map((p) => p.id);

  io.to(room.id).emit('round_end', {
    scores,
    word: room.currentWord,
    correctPlayers: correctPlayerIds,
  });

  // Delay de 5s antes da próxima rodada
  setTimeout(() => {
    if (room.currentRound >= room.maxRounds) {
      handleGameEnd(room, io);
    } else {
      startNewRound(room, io);
    }
  }, 5000);
}

/**
 * Inicia uma nova rodada.
 */
export function startNewRound(room: RoomData, io: Server): void {
  room.currentRound++;
  room.wordMaster = null;
  room.currentWord = null;
  room.scrambledLetters = null;
  room.players.forEach((p) => {
    p.hasGuessedCorrectly = false;
  });
  room.status = 'choosing_word';

  // Sortear novo Word Master
  const newMaster = selectWordMaster(room);
  room.wordMaster = newMaster;
  io.to(room.id).emit('word_master_selected', { playerId: newMaster });
  startWordTimer(room, io);
}

/**
 * Persiste o resultado do jogo no banco de dados.
 */
async function persistGameResult(room: RoomData): Promise<void> {
  try {
    const { default: prisma } = await import('./prisma');

    const playerRecords = await Promise.all(
      Array.from(room.players.values()).map(async (p) => {
        return prisma.player.upsert({
          where: { id: p.id },
          update: { nickname: p.nickname, socketId: p.id },
          create: { id: p.id, nickname: p.nickname, socketId: p.id },
        });
      })
    );

    const game = await prisma.game.create({
      data: {
        roomId: room.id,
        status: 'FINISHED',
        maxRounds: room.maxRounds,
        endedAt: new Date(),
        players: {
          create: Array.from(room.players.values()).map((p) => ({
            playerId: p.id,
            score: room.scores.get(p.id) || 0,
          })),
        },
      },
    });

    console.log(`💾 Partida ${game.id} salva no banco`);
  } catch (error) {
    console.error('❌ Erro ao persistir partida:', error);
  }
}

/**
 * Finaliza o jogo e anuncia o vencedor.
 */
export function handleGameEnd(room: RoomData, io: Server): void {
  room.status = 'round_end';

  // Persistir resultado no banco (assíncrono, não bloqueia)
  persistGameResult(room);

  // Determinar vencedor
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

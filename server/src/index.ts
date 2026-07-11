import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import {
  getRooms,
  createRoomAndJoin,
  joinRoomById,
  leaveRoomAndElectLeader,
  toggleReadyStatus,
  validateStartGame,
  kickPlayerFromRoom,
  serializeRoom,
} from './rooms';
import {
  selectWordMaster,
  startWordTimer,
  handleWordSubmission,
  handleGuess,
  handleRoundEnd,
  handleWordTimeout,
} from './game';

const app = express();

// Aceitar qualquer origem (acesso local, ngrok, rede local)
app.use(cors({ origin: (_, callback) => callback(null, true) }));

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

const PORT = process.env.PORT || 3001;

// Rate limiting: último timestamp de palpite por socketId
const lastGuessTimes = new Map<string, number>();

io.on('connection', (socket) => {
  console.log(`🟢 Jogador conectado: ${socket.id}`);

  socket.on('create_room', ({ nickname }) => {
    if (!nickname || nickname.trim().length === 0) {
      socket.emit('error', { message: 'Nickname inválido' });
      return;
    }
    const { roomId, room } = createRoomAndJoin(socket.id, nickname.trim());
    socket.join(roomId);
    socket.emit('room_created', { roomId, room: serializeRoom(room) });
    console.log(`🏠 Sala ${roomId} criada por ${nickname}`);
  });

  socket.on('join_room', ({ roomId, nickname }) => {
    if (!nickname || nickname.trim().length === 0) {
      socket.emit('error', { message: 'Nickname inválido' });
      return;
    }
    const result = joinRoomById(roomId, socket.id, nickname.trim());
    if ('error' in result) {
      socket.emit('error', { message: result.error });
      return;
    }
    socket.join(roomId.toUpperCase());
    socket.emit('room_joined', {
      room: serializeRoom(result.room),
      isLeader: result.isLeader,
    });
    socket.to(roomId.toUpperCase()).emit('player_joined', {
      player: {
        id: socket.id,
        nickname: nickname.trim(),
        ready: false,
        hasGuessedCorrectly: false,
      },
    });
    console.log(`🚪 ${nickname} entrou na sala ${roomId}`);
  });

  socket.on('leave_room', ({ roomId }) => {
    const normalizedId = roomId.toUpperCase();
    const result = leaveRoomAndElectLeader(normalizedId, socket.id);
    socket.leave(normalizedId);
    socket.emit('room_left', {});
    socket.to(normalizedId).emit('player_left', {
      playerId: result.playerId,
      newLeaderId: result.newLeaderId,
    });
    console.log(`🚪 Jogador saiu da sala ${normalizedId}`);
  });

  socket.on('toggle_ready', ({ roomId }) => {
    const result = toggleReadyStatus(roomId, socket.id);
    if ('error' in result) {
      socket.emit('error', { message: result.error });
      return;
    }
    const normalizedId = roomId.toUpperCase();
    io.to(normalizedId).emit('player_ready', {
      playerId: result.playerId,
      ready: result.ready,
    });
  });

  socket.on('start_game', ({ roomId }) => {
    const result = validateStartGame(roomId, socket.id);
    if ('error' in result) {
      socket.emit('error', { message: result.error });
      return;
    }
    const normalizedId = roomId.toUpperCase();
    io.to(normalizedId).emit('game_starting', {});

    // Iniciar primeira rodada
    const room = getRooms().get(normalizedId);
    if (!room) return;
    const masterId = selectWordMaster(room);
    if (!masterId) {
      io.to(normalizedId).emit('error', { message: 'Erro ao iniciar jogo' });
      return;
    }
    room.wordMaster = masterId;
    io.to(normalizedId).emit('word_master_selected', { playerId: masterId });
    startWordTimer(room, io);
    console.log(`🎮 Jogo iniciando na sala ${normalizedId} — Word Master: ${masterId}`);
  });

  socket.on('submit_word', ({ roomId, word }) => {
    const normalizedId = roomId.toUpperCase();
    const room = getRooms().get(normalizedId);
    if (!room) {
      socket.emit('error', { message: 'Sala não encontrada' });
      return;
    }
    const result = handleWordSubmission(room, io, socket.id, word);
    if (!result.success) {
      socket.emit('error', { message: result.error! });
    }
  });

  socket.on('guess_word', ({ roomId, guess }) => {
    const normalizedId = roomId.toUpperCase();
    const room = getRooms().get(normalizedId);
    if (!room) {
      socket.emit('error', { message: 'Sala não encontrada' });
      return;
    }

    // Rate limiting: 1 palpite por segundo
    const now = Date.now();
    const lastGuess = lastGuessTimes.get(socket.id) || 0;
    if (now - lastGuess < 1000) {
      socket.emit('error', { message: 'Aguarde antes de tentar novamente' });
      return;
    }
    lastGuessTimes.set(socket.id, now);

    const result = handleGuess(room, io, socket.id, guess);
    if ('error' in result) {
      socket.emit('error', { message: result.error });
      return;
    }
    socket.emit('guess_result', { playerId: result.playerId, correct: result.correct });

    // Broadcast se alguém acertou
    if (result.correct) {
      io.to(normalizedId).emit('guess_correct', { playerId: result.playerId });
    }

    // Verificar se todos acertaram
    const allGuessed = Array.from(room.players.values())
      .filter((p) => p.id !== room.wordMaster)
      .every((p) => p.hasGuessedCorrectly);
    if (allGuessed) {
      // Todos acertaram! Pular para fim de rodada
      if (room.timers.guessTimer) {
        clearInterval(room.timers.guessTimer);
        room.timers.guessTimer = null;
      }
      handleRoundEnd(room, io);
    }
  });

  socket.on('kick_player', ({ roomId, playerId }) => {
    const result = kickPlayerFromRoom(roomId, socket.id, playerId);
    if ('error' in result) {
      socket.emit('error', { message: result.error });
      return;
    }
    const normalizedId = roomId.toUpperCase();
    io.to(normalizedId).emit('player_kicked', { playerId: result.targetId });
    const kickedSocket = io.sockets.sockets.get(result.targetId);
    kickedSocket?.leave(normalizedId);
    console.log(`👢 Jogador ${result.targetId} expulso da sala ${normalizedId}`);
  });

  socket.on('get_room_state', ({ roomId }) => {
    const normalizedId = roomId.toUpperCase();
    const room = getRooms().get(normalizedId);
    if (!room || !room.players.has(socket.id)) {
      socket.emit('error', { message: 'Sala não encontrada' });
      return;
    }
    const isLeader = socket.id === room.leaderId;
    socket.emit('room_joined', {
      room: serializeRoom(room),
      isLeader,
    });
    console.log(`🔄 ${socket.id} solicitou estado da sala ${normalizedId}`);
  });

  socket.on('disconnect', () => {
    // Limpar salas ao desconectar
    for (const [roomId, room] of getRooms()) {
      if (room.players.has(socket.id)) {
        // Se o Word Master desconectou durante digitação, sortear novo mestre
        if (socket.id === room.wordMaster && room.status === 'choosing_word') {
          handleWordTimeout(room, io);
        }

        const result = leaveRoomAndElectLeader(roomId, socket.id);
        io.to(roomId).emit('player_left', {
          playerId: result.playerId,
          newLeaderId: result.newLeaderId,
        });
        console.log(`🔴 ${socket.id} removido da sala ${roomId} por desconexão`);
      }
    }
    // Limpar rate limiting
    lastGuessTimes.delete(socket.id);
    console.log(`🔴 Jogador desconectado: ${socket.id}`);
  });
});

app.get('/health', (_, res) => {
  res.json({ status: 'ok' });
});

httpServer.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em :${PORT}`);
});

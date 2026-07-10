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

const app = express();
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:3000' }));

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
});

const PORT = process.env.PORT || 3001;

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
    console.log(`🎮 Jogo iniciando na sala ${normalizedId}`);
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

  socket.on('disconnect', () => {
    // Limpar salas ao desconectar
    for (const [roomId, room] of getRooms()) {
      if (room.players.has(socket.id)) {
        const result = leaveRoomAndElectLeader(roomId, socket.id);
        io.to(roomId).emit('player_left', {
          playerId: result.playerId,
          newLeaderId: result.newLeaderId,
        });
        console.log(`🔴 ${socket.id} removido da sala ${roomId} por desconexão`);
      }
    }
    console.log(`🔴 Jogador desconectado: ${socket.id}`);
  });
});

app.get('/health', (_, res) => {
  res.json({ status: 'ok' });
});

httpServer.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em :${PORT}`);
});

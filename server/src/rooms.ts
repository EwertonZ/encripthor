export interface PlayerData {
  id: string;
  nickname: string;
  ready: boolean;
  hasGuessedCorrectly: boolean;
}

export interface RoomData {
  id: string;
  leaderId: string;
  players: Map<string, PlayerData>;
  status: 'waiting' | 'choosing_word' | 'guessing' | 'round_end';
  currentRound: number;
  maxRounds: number;
  scores: Map<string, number>;
  wordMaster: string | null;
  currentWord: string | null;
  scrambledLetters: string[] | null;
  playersGuessedCorrectly: Set<string>;
  timers: {
    wordTimer: NodeJS.Timeout | null;
    guessTimer: NodeJS.Timeout | null;
  };
}

export function createPlayer(id: string, nickname: string): PlayerData {
  return {
    id,
    nickname,
    ready: false,
    hasGuessedCorrectly: false,
  };
}

export function createRoom(id: string, leaderId: string, nickname: string): RoomData {
  return {
    id,
    leaderId,
    players: new Map([[leaderId, createPlayer(leaderId, nickname)]]),
    status: 'waiting',
    currentRound: 1,
    maxRounds: 5,
    scores: new Map(),
    wordMaster: null,
    currentWord: null,
    scrambledLetters: null,
    playersGuessedCorrectly: new Set(),
    timers: { wordTimer: null, guessTimer: null },
  };
}

function generateRoomId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let id = '';
  for (let i = 0; i < 6; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

const rooms = new Map<string, RoomData>();

export function getRooms(): Map<string, RoomData> {
  return rooms;
}

export function getRoom(roomId: string): RoomData | undefined {
  return rooms.get(roomId.toUpperCase());
}

export function createRoomAndJoin(socketId: string, nickname: string): { roomId: string; room: RoomData } {
  let roomId: string;
  do {
    roomId = generateRoomId();
  } while (rooms.has(roomId));

  const room = createRoom(roomId, socketId, nickname);
  rooms.set(roomId, room);
  return { roomId, room };
}

export function joinRoomById(
  roomId: string,
  socketId: string,
  nickname: string
): { room: RoomData; isLeader: boolean } | { error: string } {
  const room = rooms.get(roomId.toUpperCase());
  if (!room) return { error: 'Sala não encontrada' };

  const player = createPlayer(socketId, nickname);
  room.players.set(socketId, player);
  return { room, isLeader: false };
}

export function toggleReadyStatus(roomId: string, socketId: string): { playerId: string; ready: boolean } | { error: string } {
  const room = rooms.get(roomId.toUpperCase());
  if (!room) return { error: 'Sala não encontrada' };
  const player = room.players.get(socketId);
  if (!player) return { error: 'Jogador não está na sala' };
  if (socketId === room.leaderId) return { error: 'Líder não pode alternar pronto' };

  player.ready = !player.ready;
  return { playerId: socketId, ready: player.ready };
}

export function validateStartGame(roomId: string, socketId: string): { success: true } | { error: string } {
  const room = rooms.get(roomId.toUpperCase());
  if (!room) return { error: 'Sala não encontrada' };
  if (socketId !== room.leaderId) return { error: 'Apenas o líder pode iniciar' };
  if (room.players.size < 2) return { error: 'Mínimo de 2 jogadores' };
  const allReady = Array.from(room.players.values())
    .filter((p) => p.id !== room.leaderId)
    .every((p) => p.ready);
  if (!allReady) return { error: 'Nem todos estão prontos' };

  room.status = 'choosing_word';
  return { success: true };
}

export function kickPlayerFromRoom(
  roomId: string,
  socketId: string,
  targetId: string
): { targetId: string } | { error: string } {
  const room = rooms.get(roomId.toUpperCase());
  if (!room) return { error: 'Sala não encontrada' };
  if (socketId !== room.leaderId) return { error: 'Apenas o líder pode expulsar' };
  if (!room.players.has(targetId)) return { error: 'Jogador não encontrado' };

  room.players.delete(targetId);
  room.scores.delete(targetId);
  return { targetId };
}

export function leaveRoomAndElectLeader(
  roomId: string,
  socketId: string
): { playerId: string; newLeaderId: string | null } {
  const room = rooms.get(roomId.toUpperCase());
  if (!room) return { playerId: socketId, newLeaderId: null };

  room.players.delete(socketId);
  room.scores.delete(socketId);

  let newLeaderId: string | null = null;
  if (socketId === room.leaderId && room.players.size > 0) {
    const firstPlayer = room.players.values().next().value;
    if (firstPlayer) {
      room.leaderId = firstPlayer.id;
      newLeaderId = firstPlayer.id;
    }
  }

  if (room.players.size === 0) {
    clearRoomTimers(room);
    rooms.delete(roomId);
  }

  return { playerId: socketId, newLeaderId };
}

export function clearRoomTimers(room: RoomData): void {
  if (room.timers.wordTimer) {
    clearInterval(room.timers.wordTimer);
    room.timers.wordTimer = null;
  }
  if (room.timers.guessTimer) {
    clearInterval(room.timers.guessTimer);
    room.timers.guessTimer = null;
  }
}

export function serializeRoom(room: RoomData) {
  return {
    id: room.id,
    leaderId: room.leaderId,
    status: room.status,
    currentRound: room.currentRound,
    maxRounds: room.maxRounds,
    players: Array.from(room.players.values()).map((p) => ({
      id: p.id,
      nickname: p.nickname,
      ready: p.ready,
      hasGuessedCorrectly: p.hasGuessedCorrectly,
    })),
  };
}

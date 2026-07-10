export interface Player {
  id: string;
  nickname: string;
  ready: boolean;
  hasGuessedCorrectly: boolean;
}

export interface Room {
  id: string;
  leaderId: string;
  players: Player[];
  status: 'waiting' | 'choosing_word' | 'guessing' | 'round_end';
  currentRound: number;
  maxRounds: number;
}

export interface GameScore {
  playerId: string;
  nickname: string;
  score: number;
}

// Eventos do cliente para o servidor
export interface ClientEvents {
  create_room: { nickname: string };
  join_room: { roomId: string; nickname: string };
  leave_room: { roomId: string };
  toggle_ready: { roomId: string };
  start_game: { roomId: string };
  kick_player: { roomId: string; playerId: string };
  submit_word: { roomId: string; word: string };
  guess_word: { roomId: string; guess: string };
}

// Eventos do servidor para o cliente
export interface ServerEvents {
  room_created: { roomId: string; room: Room };
  room_joined: { room: Room; isLeader: boolean };
  player_joined: { player: Player };
  player_left: { playerId: string; newLeaderId: string | null };
  player_kicked: { playerId: string };
  player_ready: { playerId: string; ready: boolean };
  game_starting: Record<string, never>;
  word_master_selected: { playerId: string };
  word_timeout: { playerId: string };
  word_submitted: { wordLength: number };
  word_scrambled: { scrambledLetters: string[]; masterId: string };
  timer_tick: { phase: 'choosing' | 'guessing'; remaining: number };
  guess_result: { playerId: string; correct: boolean };
  guess_correct: { playerId: string };
  round_end: { scores: GameScore[]; word: string; correctPlayers: string[] };
  game_end: { finalScores: GameScore[]; winnerId: string | null };
  error: { message: string };
  room_left: Record<string, never>;
}

# 🚪 Spec 03 — Sala de Espera

## Objetivo

Implementar a sala de espera onde:
- Líder pode iniciar o jogo (quando todos prontos)
- Líder pode expulsar jogadores
- Jogadores podem alternar "pronto"
- Qualquer um pode sair da sala
- Novo líder é eleito se o atual sair
- Ao iniciar, navega para a tela de jogo

---

## Arquivos Envolvidos

```
client/src/
├── app/
│   └── sala/
│       └── [roomId]/
│           └── page.tsx          # Página da sala
├── components/
│   └── SalaEspera.tsx            # Componente da sala de espera
├── hooks/
│   ├── useSocket.ts              # Hook para eventos Socket
│   └── useGame.ts                # Hook para estado do jogo
├── lib/
│   └── socket.ts                 # Conexão Socket (já criada)
└── types/
    └── game.ts                   # Tipos (já criados)
```

**Server (eventos em `src/index.ts` e `src/rooms.ts`):**
- `toggle_ready`
- `start_game`
- `kick_player`
- `leave_room`
- `player_ready`, `game_starting`, `player_left`, `player_kicked`

---

## Fluxo de Dados

### Pronto / Não Pronto

```
Jogador                         Servidor                    Líder
  │                               │                           │
  │ toggle_ready({roomId})        │                           │
  │ ────────────────────────────► │                           │
  │                               │ toggles player.ready      │
  │                               │                           │
  │ player_ready({playerId,ready})│                           │
  │ ◄──────────────────────────── │                           │
  │                               │ (broadcast para todos)    │
  │                               │ player_ready              │
  │                               │ ────────────────────────► │
```

### Iniciar Jogo (Líder)

```
Líder                           Servidor                    Todos
  │                               │                           │
  │ start_game({roomId})          │                           │
  │ ────────────────────────────► │                           │
  │                               │ Verifica:                 │
  │                               │ • é o líder?              │
  │                               │ • todos prontos?          │
  │                               │ • mínimo 2 jogadores?     │
  │                               │                           │
  │                               │ game_starting              │
  │                               │ ────────────────────────► │ (broadcast)
```

### Sair da Sala

```
Jogador                         Servidor                    Outros
  │                               │                           │
  │ leave_room({roomId})          │                           │
  │ ────────────────────────────► │                           │
  │                               │ Remove jogador            │
  │                               │ Se era líder → elege novo │
  │                               │                           │
  │                               │ player_left({playerId})   │
  │                               │ ────────────────────────► │ (broadcast)
  │                               │                           │
  │ socket.leave(roomId)          │                           │
```

---

## Tarefas Detalhadas

### Tarefa 3.1 — Eventos de Sala no Servidor

**Descrição:** Implementar os eventos `toggle_ready`, `start_game`, `kick_player`, `leave_room` e eleição de líder.

**Arquivo:** `server/src/rooms.ts`

**Passos:**
1. Função `toggleReady(roomId, socketId)`:
   ```typescript
   export function toggleReady(roomId: string, socketId: string): { playerId: string; ready: boolean } | { error: string } {
     const room = rooms.get(roomId);
     if (!room) return { error: 'Sala não encontrada' };
     const player = room.players.get(socketId);
     if (!player) return { error: 'Jogador não está na sala' };
     if (socketId === room.leaderId) return { error: 'Líder não pode alternar pronto' };
     player.ready = !player.ready;
     return { playerId: socketId, ready: player.ready };
   }
   ```
2. Função `startGame(roomId, socketId)`:
   ```typescript
   export function startGame(roomId: string, socketId: string): { success: true } | { error: string } {
     const room = rooms.get(roomId);
     if (!room) return { error: 'Sala não encontrada' };
     if (socketId !== room.leaderId) return { error: 'Apenas o líder pode iniciar' };
     if (Array.from(room.players.values()).length < 2) return { error: 'Mínimo de 2 jogadores' };
     const allReady = Array.from(room.players.values()).every(p => p.ready);
     if (!allReady) return { error: 'Nem todos estão prontos' };
     room.status = 'choosing_word';
     room.currentRound = 1;
     return { success: true };
   }
   ```
3. Função `kickPlayer(roomId, socketId, targetId)`:
   ```typescript
   export function kickPlayer(roomId: string, socketId: string, targetId: string): { targetId: string } | { error: string } {
     const room = rooms.get(roomId);
     if (!room) return { error: 'Sala não encontrada' };
     if (socketId !== room.leaderId) return { error: 'Apenas o líder pode expulsar' };
     if (!room.players.has(targetId)) return { error: 'Jogador não encontrado' };
     room.players.delete(targetId);
     room.scores.delete(targetId);
     return { targetId };
   }
   ```
4. Função `leaveRoom(roomId, socketId)` → `{ newLeaderId: string | null }`:
   ```typescript
   export function leaveRoom(roomId: string, socketId: string): { playerId: string; newLeaderId: string | null } {
     const room = rooms.get(roomId);
     if (!room) return { playerId: socketId, newLeaderId: null };
     room.players.delete(socketId);
     room.scores.delete(socketId);

     let newLeaderId: string | null = null;
     if (socketId === room.leaderId && room.players.size > 0) {
       // Eleger o jogador mais antigo (primeiro no Map)
       const firstPlayer = room.players.values().next().value;
       room.leaderId = firstPlayer.id;
       newLeaderId = firstPlayer.id;
     }

     if (room.players.size === 0) {
       rooms.delete(roomId); // limpar salas vazias
     }

     return { playerId: socketId, newLeaderId };
   }
   ```

**Critérios:**
- ✅ Líder não pode alternar pronto
- ✅ `startGame` valida: é líder, todos prontos, mínimo 2 jogadores
- ✅ Expulsar remove jogador da sala
- ✅ Sair da sala remove jogador e elege novo líder se necessário

---

### Tarefa 3.2 — Conectar Eventos no Servidor (index.ts)

**Descrição:** Registrar os handlers no servidor Socket.IO.

**Arquivo:** `server/src/index.ts`

**Passos:**
1. Adicionar listeners no `io.on('connection')`:

```typescript
socket.on('toggle_ready', ({ roomId }) => {
  const result = toggleReady(roomId, socket.id);
  if ('error' in result) {
    socket.emit('error', { message: result.error });
    return;
  }
  io.to(roomId).emit('player_ready', {
    playerId: result.playerId,
    ready: result.ready,
  });
});

socket.on('start_game', ({ roomId }) => {
  const result = startGame(roomId, socket.id);
  if ('error' in result) {
    socket.emit('error', { message: result.error });
    return;
  }
  io.to(roomId).emit('game_starting', {});
});

socket.on('kick_player', ({ roomId, playerId }) => {
  const result = kickPlayer(roomId, socket.id, playerId);
  if ('error' in result) {
    socket.emit('error', { message: result.error });
    return;
  }
  // Notificar o expulso e os demais
  io.to(roomId).emit('player_kicked', { playerId: result.targetId });
  const kickedSocket = io.sockets.sockets.get(result.targetId);
  kickedSocket?.leave(roomId);
});

socket.on('leave_room', ({ roomId }) => {
  const result = leaveRoom(roomId, socket.id);
  socket.leave(roomId);
  socket.emit('room_left', {});
  socket.to(roomId).emit('player_left', {
    playerId: result.playerId,
    newLeaderId: result.newLeaderId,
  });
});
```

**Critérios:**
- ✅ Todos os eventos registrados e funcionando
- ✅ Broadcasts corretos (para todos na sala / apenas para quem saiu)

---

### Tarefa 3.3 — Hook useSocket

**Descrição:** Hook customizado para gerenciar conexão e eventos Socket.

**Arquivo:** `client/src/hooks/useSocket.ts`

**Passos:**
1. Criar hook que gerencia o ciclo de vida do Socket:
   ```typescript
   import { useEffect, useRef } from 'react';
   import { Socket } from 'socket.io-client';
   import { connectSocket, disconnectSocket, getSocket } from '@/lib/socket';

   export function useSocket(roomId?: string) {
     const socketRef = useRef<Socket | null>(null);

     useEffect(() => {
       const socket = connectSocket();
       socketRef.current = socket;

       if (roomId) {
         socket.emit('join_room', { roomId, nickname });
       }

       return () => {
         if (roomId) {
           socket.emit('leave_room', { roomId });
         }
         // Não desconectar completamente se for navegação interna
       };
     }, [roomId]);

     return socketRef;
   }
   ```

**Critérios:**
- ✅ Hook retorna socket conectado
- ✅ Cleanup na desmontagem

---

### Tarefa 3.4 — Hook useGame

**Descrição:** Hook que gerencia o estado do jogo recebido via Socket.

**Arquivo:** `client/src/hooks/useGame.ts`

**Passos:**
1. Criar hook:
   ```typescript
   import { useState, useEffect, useCallback } from 'react';
   import { Socket } from 'socket.io-client';
   import { Player, Room, GameScore } from '@/types/game';

   interface GameState {
     room: Room | null;
     isLeader: boolean;
     players: Player[];
     myPlayerId: string | null;
     scores: GameScore[];
     gamePhase: 'waiting' | 'choosing_word' | 'guessing' | 'round_end' | 'game_over';
     isWordMaster: boolean;
     scrambledLetters: string[];
     timerRemaining: number | null;
     wordLength: number | null;
     guessedCorrectly: boolean;
   }

   export function useGame(socket: Socket | null, roomId: string | undefined) {
     const [state, setState] = useState<GameState>({
       room: null,
       isLeader: false,
       players: [],
       myPlayerId: null,
       scores: [],
       gamePhase: 'waiting',
       isWordMaster: false,
       scrambledLetters: [],
       timerRemaining: null,
       wordLength: null,
       guessedCorrectly: false,
     });

     // Registrar listeners...
     // Atualizar estado conforme eventos do servidor

     return state;
   }
   ```

**Critérios:**
- ✅ Estado atualizado a cada evento Socket
- ✅ Fácil de consumir nos componentes

---

### Tarefa 3.5 — Componente SalaEspera

**Descrição:** Implementar o lobby visual.

**Arquivo:** `client/src/components/SalaEspera.tsx`

**Passos:**
1. Props: `roomId: string`, `socket`, `gameState`
2. Layout:
   ```
   ┌────────────────────────────────┐
   │  🏠 Sair         Sala: ABC123  │
   │                                │
   │  ┌───────── Jogadores ───────┐ │
   │  │ 👑 Líder: João     ✅    │ │
   │  │ 👤 Maria          ✅    │ │
   │  │ 👤 Pedro          ❌    │ │
   │  │ 👤 Ana            ❌    │ │
   │  └────────────────────────────┘ │
   │                                │
   │  ┌──────────────────────────┐  │
   │  │    Iniciar Jogo          │  │ ← só líder vê
   │  └──────────────────────────┘  │
   │  ┌──────────────────────────┐  │
   │  │  ✅ Pronto / ❌ Não Pronto│  │ ← toggle
   │  └──────────────────────────┘  │
   │                                │
   │  Aguardando jogadores... (3/8) │
   └────────────────────────────────┘
   ```
3. Estados visuais:
   - **Líder vê:** botão "Iniciar Jogo" (verde se todos prontos, cinza se não)
   - **Líder vê:** ícone de "X" ao lado de cada jogador (para expulsar)
   - **Jogadores vêem:** toggle "Pronto / Não Pronto"
   - **Jogadores vêem:** lista de quem já está pronto (✅)
4. Comportamento:
   - Clique em "Sair" → emite `leave_room`, navega para `/`
   - Clique em "Pronto" → emite `toggle_ready`
   - Clique em "Iniciar Jogo" → emite `start_game`
   - Clique no "X" de um jogador → emite `kick_player`
   - Ao receber `game_starting` → navegar para `/sala/[roomId]` (mesma página, jogo começa)

**Critérios:**
- ✅ Lista de jogadores atualiza em tempo real
- ✅ Toggle "Pronto" funciona
- ✅ Líder vê botões de iniciar e expulsar
- ✅ Sair volta para tela inicial

---

### Tarefa 3.6 — Página da Sala

**Descrição:** Página que gerencia o estado da sala (espera → jogo).

**Arquivo:** `client/src/app/sala/[roomId]/page.tsx`

**Passos:**
1. Server component que recebe `roomId` dos params
2. Verificar se Socket está conectado
3. Renderizar `SalaEspera` ou `GameBoard` (dependendo da fase do jogo)
4. Lógica de transição:
   ```tsx
   export default function SalaPage({ params }: { params: { roomId: string } }) {
     const { roomId } = params;
     const socket = useSocket(roomId);
     const gameState = useGame(socket.current, roomId);

     if (!gameState.room) {
       return <div>Conectando...</div>;
     }

     if (gameState.gamePhase === 'waiting') {
       return <SalaEspera roomId={roomId} socket={socket.current!} gameState={gameState} />;
     }

     return <GameBoard roomId={roomId} socket={socket.current!} gameState={gameState} />;
   }
   ```

**Critérios:**
- ✅ Rota `/sala/[roomId]` funciona
- ✅ Transição suave de espera para jogo

---

## Casos de Borda

| Situação | Como Tratar |
|----------|-------------|
| Líder sai da sala | Elegir novo líder (jogador mais antigo) |
| Todos saem | Deletar sala do Map |
| Jogador tenta iniciar sem ser líder | Servidor bloqueia com erro |
| Iniciar com menos de 2 jogadores | Servidor retorna erro "Mínimo 2 jogadores" |
| Iniciar sem todos prontos | Botão desabilitado no cliente, servidor valida |
| Jogador expulso durante jogo | Tratar como `player_kicked`, redirecionar para `/` |
| Reconexão à sala | Cliente tenta re-entrar na sala (futuro) |

---

## Critérios de Aceitação

- ✅ Sala de espera mostra todos os jogadores em tempo real
- ✅ Toggle "Pronto" funciona para não-líderes
- ✅ Líder pode iniciar o jogo quando todos estão prontos
- ✅ Líder pode expulsar jogadores
- ✅ Sair da sala volta à tela inicial
- ✅ Novo líder é eleito automaticamente
- ✅ `game_starting` é broadcast para todos

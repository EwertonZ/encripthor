# 🏠 Spec 02 — Tela Inicial

## Objetivo

Implementar a tela inicial do jogo com:
- Campo para digitar apelido
- Botão "Criar Sala" (cria sala e redireciona)
- Separador "ou"
- Campo para digitar ID da sala + botão "Entrar na Sala" (só habilitado com texto)
- Mensagem de erro para ID inválido

---

## Arquivos Envolvidos

```
client/src/
├── app/
│   └── page.tsx                    # Página inicial (rota /)
├── components/
│   └── TelaInicial.tsx             # Componente principal da tela inicial
├── lib/
│   └── socket.ts                   # Conexão Socket.IO (completar)
└── types/
    └── game.ts                     # Tipos (já criado na spec 01)
```

**Server (eventos novos em `src/index.ts`):**
- `create_room`
- `join_room`
- `room_created`
- `room_joined`
- `error`

---

## Fluxo de Dados

### Criar Sala

```
Cliente                          Servidor
  │                                │
  │  create_room({nickname})       │
  │ ─────────────────────────────► │
  │                                │  Gera roomId (6 chars)
  │                                │  Cria Room com leader = socket.id
  │  room_created({roomId, room})  │
  │ ◄───────────────────────────── │
  │                                │
  │  router.push(`/sala/${roomId}`)│
  │ ──────────────────────────────►│ (navegação Next.js)
```

### Entrar em Sala

```
Cliente                          Servidor
  │                                │
  │  join_room({roomId, nickname}) │
  │ ─────────────────────────────► │
  │                                │  Verifica se room existe
  │       ┌── se não existe ──────►│
  │       │  error({message})      │
  │       │ ◄───────────────────── │
  │       │                        │
  │       └── se existe ──────────►│  Adiciona player na sala
  │  room_joined({room, isLeader}) │
  │ ◄───────────────────────────── │
  │  player_joined (broadcast)     │
  │ ◄───────────────────────────── │ (para todos na sala)
  │                                │
  │  router.push(`/sala/${roomId}`)│
```

---

## Tarefas Detalhadas

### Tarefa 2.1 — Gerenciamento de Salas no Servidor

**Descrição:** Implementar o sistema de criação e entrada em salas no servidor.

**Arquivo:** `server/src/rooms.ts`

**Passos:**
1. Criar estrutura de dados em memória:
   ```typescript
   interface RoomData {
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
     timers: { wordTimer: NodeJS.Timeout | null; guessTimer: NodeJS.Timeout | null };
   }

   interface PlayerData {
     id: string;
     nickname: string;
     ready: boolean;
     hasGuessedCorrectly: boolean;
   }
   ```
2. Criar `Map<string, RoomData>` para armazenar salas ativas
3. Função `generateRoomId()`:
   ```typescript
   function generateRoomId(): string {
     const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
     let id: string;
     do {
       id = '';
       for (let i = 0; i < 6; i++) {
         id += chars[Math.floor(Math.random() * chars.length)];
       }
     } while (rooms.has(id));
     return id;
   }
   ```
4. Função `createRoom(socketId, nickname)`:
   - Gera roomId único de 6 caracteres
   - Cria RoomData com leaderId = socketId
   - Adiciona o líder como primeiro Player
   - Retorna `{ roomId, room }`
5. Função `joinRoom(roomId, socketId, nickname)`:
   - Busca sala pelo ID (case-insensitive)
   - Se não existir → retorna `{ error: "Sala não encontrada" }`
   - Se existir → adiciona player, retorna `{ room, isLeader: false }`
6. Exportar funções e tipagens

**Critérios:**
- ✅ `generateRoomId()` não gera IDs duplicados
- ✅ `createRoom` retorna sala com leaderId correto
- ✅ `joinRoom` retorna erro para sala inexistente
- ✅ `joinRoom` adiciona jogador na sala

---

### Tarefa 2.2 — Eventos Socket.IO no Servidor

**Descrição:** Conectar os eventos `create_room` e `join_room` no servidor.

**Arquivo:** `server/src/index.ts`

**Passos:**
1. Importar funções de `rooms.ts`
2. No handler `io.on('connection')`, adicionar listeners:

```typescript
io.on('connection', (socket) => {
  socket.on('create_room', ({ nickname }) => {
    if (!nickname || nickname.trim().length === 0) {
      socket.emit('error', { message: 'Nickname inválido' });
      return;
    }
    const { roomId, room } = createRoom(socket.id, nickname.trim());
    socket.join(roomId);
    socket.emit('room_created', { roomId, room: serializeRoom(room) });
  });

  socket.on('join_room', ({ roomId, nickname }) => {
    if (!nickname || nickname.trim().length === 0) {
      socket.emit('error', { message: 'Nickname inválido' });
      return;
    }
    const result = joinRoom(roomId, socket.id, nickname.trim());
    if ('error' in result) {
      socket.emit('error', { message: result.error });
      return;
    }
    socket.join(roomId);
    socket.emit('room_joined', {
      room: serializeRoom(result.room),
      isLeader: result.isLeader,
    });
    // Broadcast para os outros na sala
    socket.to(roomId).emit('player_joined', {
      player: serializePlayer(result.room.players.get(socket.id)!),
    });
  });
});
```

3. Função auxiliar `serializeRoom(room)`:
   - Converte Maps e Sets em arrays/objetos planos para enviar via Socket
   ```typescript
   function serializeRoom(room: RoomData) {
     return {
       id: room.id,
       leaderId: room.leaderId,
       status: room.status,
       currentRound: room.currentRound,
       maxRounds: room.maxRounds,
       players: Array.from(room.players.values()).map(p => ({
         id: p.id,
         nickname: p.nickname,
         ready: p.ready,
         hasGuessedCorrectly: p.hasGuessedCorrectly,
       })),
     };
   }
   ```

**Critérios:**
- ✅ Evento `create_room` cria sala e emite `room_created`
- ✅ Evento `join_room` com ID válido emite `room_joined`
- ✅ Evento `join_room` com ID inválido emite `error`
- ✅ Broadcast `player_joined` é enviado aos outros na sala

---

### Tarefa 2.3 — Conexão Socket.IO no Cliente

**Descrição:** Configurar o cliente Socket.IO no Next.js.

**Arquivo:** `client/src/lib/socket.ts`

**Passos:**
1. Instalar dependências no client:
   ```bash
   npm install socket.io-client
   ```
2. Criar `lib/socket.ts`:
   ```typescript
   import { io, Socket } from 'socket.io-client';

   const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';

   let socket: Socket | null = null;

   export function getSocket(): Socket {
     if (!socket) {
       socket = io(SOCKET_URL, {
         autoConnect: false,
         transports: ['websocket', 'polling'],
       });
     }
     return socket;
   }

   export function connectSocket(): Socket {
     const s = getSocket();
     if (!s.connected) {
       s.connect();
     }
     return s;
   }

   export function disconnectSocket(): void {
     if (socket?.connected) {
       socket.disconnect();
     }
   }
   ```

**Critérios:**
- ✅ `connectSocket()` conecta ao servidor
- ✅ Socket é singleton (mesma instância para toda a app)

---

### Tarefa 2.4 — Componente TelaInicial

**Descrição:** Criar o componente visual da tela inicial com layout dividido.

**Arquivo:** `client/src/components/TelaInicial.tsx`

**Passos:**
1. Criar componente com o seguinte layout:
   ```
   ┌────────────────────────────────┐
   │      ╔══════════════╗          │
   │      ║  ENCRYPTHOR  ║          │
   │      ╚══════════════╝          │
   │                                │
   │   ┌──────┬──────────────┐      │
   │   │      │              │      │
   │   │ Nick │  Criar Sala  │      │
   │   │      │              │      │
   │   └──────┴──────────────┘      │
   │               ou               │
   │   ┌──────────┬──────────────┐  │
   │   │ ID Sala  │ Entrar Sala  │  │
   │   └──────────┴──────────────┘  │
   │                                │
   │   ⚠️ Sala não encontrada       │
   └────────────────────────────────┘
   ```
2. Estados do componente:
   - `nickname: string` — apelido do jogador
   - `roomIdInput: string` — ID da sala digitado
   - `loading: boolean` — loading durante operações
   - `error: string | null` — mensagem de erro
3. Layout detalhado:
   - Container centralizado (flex, min-h-screen)
   - Card/quadrado central com borda arredondada e sombra
   - Divisão vertical ao meio: esquerda (nickname) / direita (criar sala)
   - Abaixo da divisão: "ou" estilizado
   - Abaixo do "ou": campo ID + botão Entrar
   - Mensagem de erro aparece acima do botão Entrar (com animação)
4. Comportamento:
   - Nickname é obrigatório (validação ao clicar em qualquer botão)
   - Botão "Entrar na Sala" só fica habilitado se `roomIdInput` tiver ≥ 3 caracteres
   - Ao clicar "Criar Sala": emite `create_room`, navega para `/sala/[roomId]`
   - Ao clicar "Entrar": emite `join_room`, navega para `/sala/[roomId]`
   - Em caso de erro (`error` event), exibe mensagem na tela

**Critérios:**
- ✅ Layout dividido conforme especificação
- ✅ Botão "Entrar" desabilitado sem ID da sala
- ✅ Erro de sala inválida aparece na tela
- ✅ Loading state durante operações

---

### Tarefa 2.5 — Página Inicial (page.tsx)

**Descrição:** Conectar o componente TelaInicial à rota `/`.

**Arquivo:** `client/src/app/page.tsx`

**Passos:**
1. Renderizar o componente `TelaInicial`
2. Garantir que o layout base tenha fontes e cores corretas
3. O componente gerencia toda a lógica de conexão/navegação

```tsx
import TelaInicial from '@/components/TelaInicial';

export default function HomePage() {
  return <TelaInicial />;
}
```

**Critérios:**
- ✅ Rota `/` renderiza o componente TelaInicial
- ✅ Navegação para `/sala/[roomId]` funciona ao criar/entrar

---

## Casos de Borda

| Situação | Como Tratar |
|----------|-------------|
| Nickname vazio | Exibir erro "Digite um apelido" |
| Nickname > 20 chars | Limitar ou exibir erro |
| Sala cheia (8+) | Servidor retorna erro "Sala cheia" |
| Duas abas com mesmo nickname | Não validar (permite duplicatas) |
| Perda de conexão ao criar sala | Emitir `connect_error` e mostrar erro |
| ID da sala com caracteres especiais | Sanitizar: converter para maiúsculas, remover espaços |
| Clicar "Criar Sala" múltiplas vezes | Desabilitar botão após primeiro clique (loading state) |

---

## Critérios de Aceitação

- ✅ Tela inicial renderiza corretamente em `localhost:3000`
- ✅ É possível digitar nickname e criar sala
- ✅ É possível entrar em uma sala com ID válido
- ✅ Sala inválida mostra mensagem de erro
- ✅ Após criar/entrar, redireciona para `/sala/[roomId]`
- ✅ Botão "Entrar" só fica habilitado com texto no campo ID

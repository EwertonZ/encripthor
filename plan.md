# 🧩 Encrypthor — Plano de Desenvolvimento

## 1. Visão Geral

**Encrypthor** é um jogo web multiplayer em tempo real onde um jogador digita uma palavra, ela é embaralhada (letras espalhadas na tela), e os demais jogadores devem adivinhá-la. Quem acerta ganha ponto. Quem escreveu a palavra ganha 1 ponto para cada jogador que **não** acertou.

---

## 2. Stack Tecnológica

| Camada | Tecnologia | Justificativa |
|--------|-----------|---------------|
| **Frontend** | Next.js 14+ (App Router) | SSR, roteamento, dev experience |
| **Estilo** | Tailwind CSS | Rapidez, design responsivo, utilidades |
| **Tempo Real** | Socket.IO | Baixa latência, salas nativas, fallbacks |
| **Backend Socket** | Node.js + Express | Servidor dedicado para conexões WebSocket persistentes |
| **Database** | PostgreSQL | Robusto, relacional, ótimo com Docker |
| **ORM** | Prisma | Type-safe, migrations, ótima DX |
| **Containerização** | Docker + Docker Compose | Tudo rodando local com um comando |

### 🐳 Serviços no Docker Compose

```
┌─────────────────────────────────────────────────┐
│               docker-compose.yml                  │
│                                                   │
│  ┌──────────────┐   ┌──────────────┐             │
│  │   postgres   │   │  socket-server│             │
│  │   :5432      │   │  :3001       │             │
│  └──────┬───────┘   └──────┬───────┘             │
│         │                  │                      │
│         └──────────────────┘                      │
│                                                   │
│  ┌──────────────┐                                 │
│  │   nextjs      │  (dev: :3000, prod: :3000)     │
│  └──────────────┘                                 │
└─────────────────────────────────────────────────┘
```

---

## 3. Arquitetura do Sistema

```
                   Localhost
┌──────────────────────────────────────────────────┐
│                                                    │
│   ┌──────────────┐       ┌──────────────────┐      │
│   │  Next.js     │◄─────►│  Socket.IO Server│      │
│   │  :3000       │       │  Node.js :3001    │      │
│   │  (Vercel)    │       │                   │      │
│   └──────┬───────┘       │  • Salas          │      │
│          │               │  • Timers         │      │
│          │               │  • Game Loop      │      │
│          │               │  • Embaralhamento │      │
│          │               └────────┬──────────┘      │
│          │                        │                  │
│          ▼                        ▼                  │
│   ┌─────────────────────────────────────┐           │
│   │          PostgreSQL :5432            │           │
│   │  • Salas (histórico)                │           │
│   │  • Jogadores (registro)            │           │
│   │  • Partidas e pontuação            │           │
│   │  • Placar global                   │           │
│   └─────────────────────────────────────┘           │
└──────────────────────────────────────────────────┘
```

### Fluxo de Conexão

1. Usuário acessa `http://localhost:3000`
2. Next.js serve a página inicial
3. Ao criar/entrar em sala, Socket.IO conecta a `http://localhost:3001`
4. Todo estado do jogo ativo fica em memória no servidor Socket
5. Ao final da partida, dados são persistidos no PostgreSQL via Prisma

---

## 4. Estrutura de Diretórios

```
encripthor/
├── client/                              # Next.js (Docker)
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx                 # Tela inicial
│   │   │   └── sala/
│   │   │       └── [roomId]/
│   │   │           └── page.tsx         # Sala (espera + jogo)
│   │   ├── components/
│   │   │   ├── TelaInicial.tsx
│   │   │   ├── SalaEspera.tsx
│   │   │   ├── GameBoard.tsx
│   │   │   ├── LetrasEmbaralhadas.tsx
│   │   │   ├── CampoPalavra.tsx
│   │   │   ├── Timer.tsx
│   │   │   ├── Placar.tsx
│   │   │   └── ResultadoRodada.tsx
│   │   ├── hooks/
│   │   │   ├── useSocket.ts
│   │   │   └── useGame.ts
│   │   ├── lib/
│   │   │   └── socket.ts                # Conexão Socket.IO
│   │   └── types/
│   │       └── game.ts                  # Tipos TypeScript
│   ├── package.json
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   └── Dockerfile
│
├── server/                              # Servidor Socket.IO
│   ├── src/
│   │   ├── index.ts                     # Entrypoint Express + Socket
│   │   ├── rooms.ts                     # Gerenciamento de salas
│   │   ├── game.ts                      # Lógica do jogo
│   │   ├── scrambler.ts                 # Embaralhamento
│   │   └── prisma.ts                    # Conexão Prisma/PostgreSQL
│   ├── prisma/
│   │   └── schema.prisma
│   ├── package.json
│   ├── tsconfig.json
│   └── Dockerfile
│
├── docker-compose.yml
└── plan.md
├── specs/                             # Especificações detalhadas
│   ├── README.md
│   ├── 01-setup-projeto.md
│   ├── 02-tela-inicial.md
│   ├── 03-sala-espera.md
│   ├── 04-game-loop-server.md
│   ├── 05-jogo-ativo-cliente.md
│   └── 06-polimento-final.md
└── plan.md                              # Este arquivo
```

---

## 5. Modelo de Dados (Prisma / PostgreSQL)

```prisma
model Player {
  id        String    @id @default(cuid())
  nickname  String
  socketId  String?
  createdAt DateTime  @default(now())

  games     GamePlayer[]
}

model Game {
  id        String   @id @default(cuid())
  roomId    String
  status    GameStatus @default(WAITING)
  maxRounds Int      @default(5)
  createdAt DateTime @default(now())
  endedAt   DateTime?

  players   GamePlayer[]
  rounds    Round[]
}

model GamePlayer {
  id       String @id @default(cuid())
  gameId   String
  playerId String
  score    Int    @default(0)

  game   Game   @relation(fields: [gameId], references: [id])
  player Player @relation(fields: [playerId], references: [id])
}

model Round {
  id          String   @id @default(cuid())
  gameId      String
  roundNumber Int
  wordMasterId String
  word        String?    // Só preenchido após a rodada
  status      RoundStatus @default(CHOOSING)
  startedAt   DateTime   @default(now())
  endedAt     DateTime?

  game      Game          @relation(fields: [gameId], references: [id])
  guesses   Guess[]
  wordMaster Player       @relation(fields: [wordMasterId], references: [id])
}

model Guess {
  id       String   @id @default(cuid())
  roundId  String
  playerId String
  word     String
  correct  Boolean  @default(false)
  guessedAt DateTime @default(now())

  round  Round  @relation(fields: [roundId], references: [id])
  player Player @relation(fields: [playerId], references: [id])
}

enum GameStatus {
  WAITING
  PLAYING
  FINISHED
}

enum RoundStatus {
  CHOOSING
  GUESSING
  FINISHED
}
```

> **Nota:** Durante a partida, o estado do jogo fica em memória no servidor Socket para performance. O banco é usado apenas para:
> - Persistir resultados ao final de cada rodada
> - Placar global / histórico
> - Recuperação em caso de queda do servidor (futuro)

---

## 6. Eventos Socket.IO

### Cliente → Servidor

| Evento | Payload | Descrição |
|--------|---------|-----------|
| `join_room` | `{ roomId, nickname }` | Entrar em uma sala |
| `create_room` | `{ nickname }` | Criar nova sala |
| `leave_room` | `{ roomId }` | Sair da sala |
| `toggle_ready` | `{ roomId }` | Alternar "pronto" |
| `start_game` | `{ roomId }` | Líder inicia o jogo |
| `kick_player` | `{ roomId, playerId }` | Líder expulsa jogador |
| `submit_word` | `{ roomId, word }` | Jogador sorteado envia a palavra |
| `guess_word` | `{ roomId, guess }` | Tentativa de adivinhar |

### Servidor → Cliente

| Evento | Payload | Descrição |
|--------|---------|-----------|
| `room_joined` | `{ room, players, isLeader }` | Confirmação de entrada |
| `room_created` | `{ roomId, room }` | Sala criada com sucesso |
| `player_joined` | `{ player }` | Novo jogador entrou |
| `player_left` | `{ playerId }` | Jogador saiu |
| `player_kicked` | `{ playerId }` | Jogador expulso |
| `player_ready` | `{ playerId, ready }` | Status de pronto alterado |
| `game_starting` | `{ }` | Jogo vai começar |
| `word_master_selected` | `{ playerId }` | Quem vai escrever a palavra |
| `word_timeout` | `{ playerId }` | Tempo de digitação esgotado |
| `word_submitted` | `{ wordLength }` | Palavra recebida (não revela!) |
| `word_scrambled` | `{ scrambledLetters, masterId }` | Letras embaralhadas |
| `timer_tick` | `{ phase, remaining }` | Tick de timer a cada segundo |
| `guess_result` | `{ playerId, correct }` | Resultado da tentativa |
| `round_end` | `{ scores, word, correctPlayers }` | Fim da rodada |
| `game_end` | `{ finalScores, winnerId }` | Fim do jogo |
| `error` | `{ message }` | Erro (sala inválida, etc.) |

---

## 7. Estado do Jogo em Memória (Servidor)

```typescript
interface Room {
  id: string;
  leaderId: string;
  players: Map<string, Player>;
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

interface Player {
  id: string;
  nickname: string;
  ready: boolean;
  hasGuessedCorrectly: boolean;
}
```

---

## 8. Regras do Jogo (Detalhadas)

### Fluxo de Rodada

1. **Sorteio:** Um jogador (qualquer um, incluindo o líder) é sorteado como **Word Master**
2. **Digitação (20s):** O Word Master tem 20s para digitar uma palavra
   - Timer visível para todos
   - Se não digitar a tempo → perde a vez, novo sorteio
   - Se digitar → palavra é embaralhada
3. **Embaralhamento:** As letras da palavra são espalhadas aleatoriamente pela tela
   - Embaralhamento Fisher-Yates no servidor
   - Garantir que resultado seja ≠ da original
4. **Adivinhação (60s):** Todos (exceto o Word Master) tentam adivinhar
   - Campo de texto + Enter para tentar
   - Feedback imediato (verde/vermelho)
   - Se acertar → campo bloqueado, +1 ponto
5. **Fim da rodada:**
   - Word Master ganha 1 ponto para cada jogador que **não** acertou
   - Palavra é revelada para todos
   - Placar é exibido (5s)
   - Próxima rodada começa (novo sorteio)

### Pontuação

| Ação | Pontos |
|------|--------|
| Adivinhar a palavra corretamente | +1 |
| Ser o Word Master (por jogador que errou) | +1 por erro |

### Condições de Vitória

- Após N rodadas (configurável: 3, 5, 7), quem tiver mais pontos vence
- Em caso de empate, jogadores com maior pontuação compartilham a vitória

---

## 9. Componentes UI

### Tela Inicial (`/`)

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

### Sala de Espera (`/sala/[roomId]`)

```
┌────────────────────────────────┐
│  🏠 Sair         Sala: ABC123  │
│                                │
│  ┌───────── Jogadores ───────┐ │
│  │ 👑 Líder: João     ✅     │ │
│  │ 👤 Maria          ✅     │ │
│  │ 👤 Pedro          ❌     │ │
│  │ 👤 Ana            ❌     │ │
│  └────────────────────────────┘ │
│                                │
│  ┌──────────────────────────┐  │
│  │    Iniciar Jogo          │  │ ← só líder vê habilitado
│  └──────────────────────────┘  │
│  ┌──────────────────────────┐  │
│  │  ✅ Pronto / ❌ Não Pronto│  │ ← toggle
│  └──────────────────────────┘  │
│                                │
│  Aguardando jogadores... (3/8) │
└────────────────────────────────┘
```

### Jogo — Escolha da Palavra (Word Master)

```
┌────────────────────────────────┐
│  🏠 Sair    Rodada 2/5    ⏱️15s│
│                                │
│  Digite a palavra:             │
│  ┌──────────────────────────┐  │
│  │ [______________________] │  │
│  └──────────────────────────┘  │
│                                │
│  [   Confirmar Palavra   ]     │
│                                │
│  ⏰ Você tem 20 segundos!      │
└────────────────────────────────┘
```

### Jogo — Adivinhação

```
┌────────────────────────────────┐
│  🏠 Sair    Rodada 2/5    ⏱️40s│
│                                │
│      ┌──────────────────┐      │
│      │  Palavra Misteriosa │   │
│      │     A  F  S  I  R │   │
│      │     E  S  A  C  I │   │
│      └──────────────────┘      │
│                                │
│   Seu palpite:                 │
│   ┌──────────────────────┐     │
│   │ [______________]     │     │
│   └──────────────────────┘     │
│                                │
│   ┌────── Placar ──────────┐  │
│   │ João: 3 🟢             │  │
│   │ Maria: 2               │  │
│   │ Pedro: 1 🟢            │  │
│   │ Ana: 0                 │  │
│   └────────────────────────┘  │
└────────────────────────────────┘
```

### Fim de Rodada

```
┌────────────────────────────────┐
│        🎉 Fim da Rodada!       │
│                                │
│   A palavra era:  "SACRIFÍCIO" │
│                                │
│   ✅ João acertou!             │
│   ✅ Pedro acertou!            │
│                                │
│   Maria ganhou 1 ponto         │
│   (Word Master: 2 erraram)     │
│                                │
│   ┌────── Placar ──────────┐  │
│   │ João: 4                │  │
│   │ Maria: 3               │  │
│   │ Pedro: 1               │  │
│   │ Ana: 0                 │  │
│   └────────────────────────┘  │
│                                │
│   Próxima rodada em 5s...     │
└────────────────────────────────┘
```

---

## 10. Algoritmo de Embaralhamento

```typescript
function scrambleWord(word: string): string[] {
  const letters = word.split('');

  // Fisher-Yates Shuffle
  for (let i = letters.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [letters[i], letters[j]] = [letters[j], letters[i]];
  }

  // Garantir que não ficou igual à original
  if (letters.join('') === word) {
    return scrambleWord(word); // tenta de novo
  }

  return letters;
}
```

> **Importante:** O embaralhamento é feito **exclusivamente no servidor**. O cliente nunca recebe a palavra original.

---

## 11. Docker

### `docker-compose.yml`

```yaml
services:
  postgres:
    image: postgres:16-alpine
    container_name: encripthor-db
    environment:
      POSTGRES_USER: encripthor
      POSTGRES_PASSWORD: encripthor123
      POSTGRES_DB: encripthor
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  socket-server:
    build: ./server
    container_name: encripthor-server
    ports:
      - "3001:3001"
    environment:
      DATABASE_URL: postgresql://encripthor:encripthor123@postgres:5432/encripthor
      PORT: 3001
      CLIENT_URL: http://localhost:3000
    depends_on:
      - postgres

  nextjs:
    build: ./client
    container_name: encripthor-client
    ports:
      - "3000:3000"
    environment:
      NEXT_PUBLIC_SOCKET_URL: http://localhost:3001
    depends_on:
      - socket-server

volumes:
  pgdata:
```

### Dockerfile do Client (Next.js)

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3000
CMD ["npm", "run", "start"]
```

### Dockerfile do Server (Socket.IO)

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3001
CMD ["node", "dist/index.js"]
```

---

## 12. Plano de Implementação (Ordem)

### Fase 1 — Setup do Projeto
- [ ] 1.1 Criar monorepo com pastas `client/` e `server/`
- [ ] 1.2 Inicializar Next.js em `client/` (TypeScript + Tailwind)
- [ ] 1.3 Inicializar servidor Node + Express + Socket.IO em `server/`
- [ ] 1.4 Configurar Prisma com PostgreSQL (schema, migração)
- [ ] 1.5 Configurar Docker Compose (postgres, server, client)
- [ ] 1.6 Testar: `docker compose up` e tudo sobe

### Fase 2 — Tela Inicial
- [ ] 2.1 Componente `TelaInicial.tsx` com layout dividido
- [ ] 2.2 Campo de nickname + Criar Sala
- [ ] 2.3 Campo de ID da sala + Entrar (só habilita com texto)
- [ ] 2.4 Validação: sala inválida → mensagem de erro
- [ ] 2.5 Conexão Socket.IO no cliente

### Fase 3 — Sala de Espera
- [ ] 3.1 Servidor: gerenciamento de salas (criar, entrar, sair)
- [ ] 3.2 Componente `SalaEspera.tsx` com lista de jogadores
- [ ] 3.3 Toggle "Pronto" para não-líderes
- [ ] 3.4 Botão "Iniciar Jogo" (só líder, só quando todos prontos)
- [ ] 3.5 Expulsar jogadores (só líder)
- [ ] 3.6 Sair da sala (qualquer um) → volta à tela inicial
- [ ] 3.7 Eleger novo líder se o líder atual sair

### Fase 4 — Game Loop (Servidor)
- [ ] 4.1 Sorteio aleatório do Word Master
- [ ] 4.2 Timer de 20s para digitar palavra (broadcast a cada 1s)
- [ ] 4.3 Validação: palavra com mínimo de 3 letras
- [ ] 4.4 Timeout: se não digitar em 20s, sorteia novo mestre
- [ ] 4.5 Embaralhamento (Fisher-Yates no servidor)
- [ ] 4.6 Timer de 60s para adivinhação
- [ ] 4.7 Lógica de acerto: compara guess com palavra, ignora maiúsculas
- [ ] 4.8 Pontuação: +1 para quem acertou, +1 para mestre por erro
- [ ] 4.9 Fim de rodada → delay de 5s → próxima rodada
- [ ] 4.10 Fim de jogo → anúncio do vencedor

### Fase 5 — Jogo Ativo (Cliente)
- [ ] 5.1 Tela de escolha de palavra para o Word Master
- [ ] 5.2 `LetrasEmbaralhadas.tsx`: letras espalhadas na tela
- [ ] 5.3 `Timer.tsx`: barra de progresso circular ou linear
- [ ] 5.4 Campo de palpite + Enter (bloqueado após acertar)
- [ ] 5.5 Feedback visual de acerto/erro (verde/vermelho)
- [ ] 5.6 `Placar.tsx`: scores em tempo real
- [ ] 5.7 `ResultadoRodada.tsx`: palavra revelada + quem acertou
- [ ] 5.8 Tela de fim de jogo com pódio

### Fase 6 — Polimento & Docker
- [ ] 6.1 Animações CSS (letras flutuando com animação, transições suaves)
- [ ] 6.2 Responsividade (funciona no mobile)
- [ ] 6.3 Som de efeitos (acerto, erro, timer crítico)
- [ ] 6.4 Persistência no PostgreSQL via Prisma (salvar partidas)
- [ ] 6.5 Docker Compose otimizado (healthcheck, volumes)
- [ ] 6.6 README com instruções de uso

---

## 13. Considerações Técnicas Importantes

### Tratamento de Desconexão

- **Word Master desconecta durante digitação:** Sorteia novo mestre imediatamente
- **Líder desconecta:** Novo líder é eleito (jogador mais antigo na sala)
- **Jogador desconecta durante adivinhação:** Perde a rodada
- **Queda geral:** Estado em memória é perdido (aceitável para jogo local)
- Ao reconectar, jogador retorna para a sala (se ainda ativa)

### Segurança

- Embaralhamento **sempre no servidor**
- Palavra original **nunca** enviada a quem não é o Word Master
- Validação de líder: servidor verifica se socket é o leaderId
- Rate limiting: no máximo 1 palpite por segundo por jogador

### Timers

- Servidor é a única fonte da verdade para tempo
- Cliente apenas exibe o que recebe via `timer_tick`
- Ao expirar, servidor executa a ação automaticamente
- Usar `setInterval` no servidor com broadcast a cada 1s

### Código da Sala

- Gerar código alfanumérico de 6 caracteres (ex: `XF42K9`)
- Case-insensitive (maiúsculas/minúsculas)
- Garantir unicidade (verificar se já existe)

---

## 14. Comandos para Rodar

```bash
# Subir tudo
docker compose up

# Subir em background
docker compose up -d

# Ver logs
docker compose logs -f

# Recriar sem cache
docker compose build --no-cache && docker compose up

# Parar tudo
docker compose down

# Parar e apagar volumes (dados do banco)
docker compose down -v

# Rodar migrations do Prisma
docker compose exec socket-server npx prisma migrate dev
```

### Acessos

| Serviço | URL |
|---------|-----|
| Next.js (jogo) | http://localhost:3000 |
| Socket.IO server | http://localhost:3001 |
| PostgreSQL | localhost:5432 |

---

## 15. Possíveis Desafios

| Desafio | Solução |
|---------|---------|
| Hot-reload no Docker | Usar volumes bind mount no dev |
| Sincronia de timers | Servidor é autoridade; cliente só exibe |
| Reconexão de jogador | Salvar nickname em localStorage |
| Palavras ofensivas | Lista básica de bloqueio ou só confiar nos jogadores |
| Estado perdido ao reiniciar servidor | Banco persiste resultados das rodadas já finalizadas |
| Next.js + Socket.IO CORS | Configurar CORS no servidor Socket para `http://localhost:3000` |

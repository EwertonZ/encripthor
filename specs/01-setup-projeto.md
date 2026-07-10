# 🏗️ Spec 01 — Setup do Projeto

## Objetivo

Criar a estrutura base do projeto com Docker Compose orquestrando 3 serviços: PostgreSQL, servidor Socket.IO e cliente Next.js.

---

## Arquivos Envolvidos

```
encripthor/
├── client/
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx
│   │   ├── lib/
│   │   │   └── socket.ts
│   │   └── types/
│   │       └── game.ts
│   ├── public/
│   ├── package.json
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   ├── next.config.js
│   └── Dockerfile
├── server/
│   ├── src/
│   │   ├── index.ts
│   │   ├── rooms.ts
│   │   ├── game.ts
│   │   ├── scrambler.ts
│   │   └── prisma.ts
│   ├── prisma/
│   │   └── schema.prisma
│   ├── package.json
│   ├── tsconfig.json
│   └── Dockerfile
├── docker-compose.yml
├── .gitignore
└── package.json               # (opcional) scripts raiz
```

---

## Tarefas Detalhadas

### Tarefa 1.1 — Criar monorepo

**Descrição:** Inicializar a estrutura de pastas e git.

**Passos:**
1. Criar pasta raiz `encripthor/`
2. Inicializar git: `git init`
3. Criar `.gitignore` com:
   ```
   node_modules/
   .next/
   dist/
   .env
   *.log
   ```
4. Criar `package.json` raiz opcional com scripts:
   ```json
   {
     "name": "encripthor",
     "private": true,
     "scripts": {
       "dev": "docker compose up",
       "dev:build": "docker compose up --build",
       "down": "docker compose down"
     }
   }
   ```

**Critérios:**
- ✅ `git status` mostra repositório limpo
- ✅ Estrutura de pastas `client/` e `server/` criada

---

### Tarefa 1.2 — Inicializar Next.js (client)

**Descrição:** Criar projeto Next.js com App Router + TypeScript + Tailwind.

**Passos:**
1. Dentro de `client/`, executar:
   ```bash
   npx create-next-app@latest . --typescript --tailwind --app --src-dir
   ```
2. Configurar `next.config.js`:
   ```js
   /** @type {import('next').NextConfig} */
   const nextConfig = {
     output: 'standalone',  // necessário para Docker
   };
   module.exports = nextConfig;
   ```
3. Limpar arquivos padrão desnecessários
4. Criar `src/app/page.tsx` com conteúdo placeholder
5. Criar `src/lib/socket.ts` (vazio por enquanto)
6. Criar `src/types/game.ts` (vazio por enquanto)

**Critérios:**
- ✅ `npm run dev` sobe Next.js em `:3000`
- ✅ Página inicial renderiza sem erros

---

### Tarefa 1.3 — Inicializar servidor Socket.IO (server)

**Descrição:** Criar servidor Node.js com Express + Socket.IO + TypeScript.

**Passos:**
1. Inicializar `package.json`:
   ```bash
   npm init -y
   ```
2. Instalar dependências:
   ```bash
   npm install express socket.io cors @prisma/client
   npm install -D typescript ts-node-dev @types/express @types/node @types/cors prisma
   ```
3. Configurar `tsconfig.json`:
   ```json
   {
     "compilerOptions": {
       "target": "ES2020",
       "module": "commonjs",
       "lib": ["ES2020"],
       "outDir": "./dist",
       "rootDir": "./src",
       "strict": true,
       "esModuleInterop": true,
       "skipLibCheck": true,
       "forceConsistentCasingInFileNames": true,
       "resolveJsonModule": true
     },
     "include": ["src/**/*"],
     "exclude": ["node_modules", "dist"]
   }
   ```
4. Configurar scripts no `package.json`:
   ```json
   {
     "scripts": {
       "dev": "ts-node-dev --respawn src/index.ts",
       "build": "tsc",
       "start": "node dist/index.js"
     }
   }
   ```
5. Criar `src/index.ts` com servidor Express + Socket.IO básico:
   ```typescript
   import express from 'express';
   import { createServer } from 'http';
   import { Server } from 'socket.io';
   import cors from 'cors';

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

     socket.on('disconnect', () => {
       console.log(`🔴 Jogador desconectado: ${socket.id}`);
     });
   });

   app.get('/health', (_, res) => {
     res.json({ status: 'ok' });
   });

   httpServer.listen(PORT, () => {
     console.log(`🚀 Servidor rodando em :${PORT}`);
   });
   ```
6. Criar `src/rooms.ts`, `src/game.ts`, `src/scrambler.ts`, `src/prisma.ts` com exports vazios (serão preenchidos nas specs seguintes)

**Critérios:**
- ✅ Servidor sobe em `:3001`
- ✅ `GET /health` retorna `{ "status": "ok" }`
- ✅ Socket.IO aceita conexões

---

### Tarefa 1.4 — Configurar Prisma + PostgreSQL

**Descrição:** Setup do Prisma ORM com schema completo do banco de dados.

**Passos:**
1. No `server/`, iniciar Prisma:
   ```bash
   npx prisma init
   ```
2. Escrever `prisma/schema.prisma`:
   ```prisma
   generator client {
     provider = "prisma-client-js"
   }

   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }

   model Player {
     id        String    @id @default(cuid())
     nickname  String
     socketId  String?
     createdAt DateTime  @default(now())

     games     GamePlayer[]
     rounds    Round[]     @relation("WordMaster")
     guesses   Guess[]
   }

   model Game {
     id        String     @id @default(cuid())
     roomId    String
     status    GameStatus @default(WAITING)
     maxRounds Int        @default(5)
     createdAt DateTime   @default(now())
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

     @@unique([gameId, playerId])
   }

   model Round {
     id           String      @id @default(cuid())
     gameId       String
     roundNumber  Int
     wordMasterId String
     word         String?
     status       RoundStatus @default(CHOOSING)
     startedAt    DateTime    @default(now())
     endedAt      DateTime?

     game      Game    @relation(fields: [gameId], references: [id])
     guesses   Guess[]
     wordMaster Player @relation("WordMaster", fields: [wordMasterId], references: [id])
   }

   model Guess {
     id        String   @id @default(cuid())
     roundId   String
     playerId  String
     word      String
     correct   Boolean  @default(false)
     guessedAt DateTime @default(now())

     round  Round  @relation(fields: [roundId], references: [id])
     player Player @relation(fields: [playerId], references: [id])

     @@unique([roundId, playerId])
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
3. Criar `src/prisma.ts`:
   ```typescript
   import { PrismaClient } from '@prisma/client';
   const prisma = new PrismaClient();
   export default prisma;
   ```
4. Criar arquivo `.env` em `server/`:
   ```
   DATABASE_URL="postgresql://encripthor:encripthor123@localhost:5432/encripthor"
   PORT=3001
   CLIENT_URL=http://localhost:3000
   ```

**Critérios:**
- ✅ `npx prisma validate` retorna sem erros
- ✅ `npx prisma generate` gera o client

---

### Tarefa 1.5 — Configurar Docker Compose

**Descrição:** Criar `docker-compose.yml` e Dockerfiles.

**Passos:**
1. Criar `docker-compose.yml`:
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
       healthcheck:
         test: ["CMD-SHELL", "pg_isready -U encripthor"]
         interval: 5s
         timeout: 5s
         retries: 5

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
         postgres:
           condition: service_healthy

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

2. Criar `client/Dockerfile`:
   ```dockerfile
   FROM node:20-alpine AS builder
   WORKDIR /app
   COPY package*.json ./
   RUN npm ci
   COPY . .
   RUN npm run build

   FROM node:20-alpine AS runner
   WORKDIR /app
   COPY --from=builder /app/.next/standalone ./
   COPY --from=builder /app/.next/static ./.next/static
   COPY --from=builder /app/public ./public
   EXPOSE 3000
   CMD ["node", "server.js"]
   ```

3. Criar `server/Dockerfile`:
   ```dockerfile
   FROM node:20-alpine
   WORKDIR /app
   COPY package*.json ./
   RUN npm ci
   COPY . .
   RUN npx prisma generate && npm run build
   EXPOSE 3001
   CMD ["node", "dist/index.js"]
   ```

**Critérios:**
- ✅ `docker compose build` completa sem erros
- ✅ `docker compose up -d` sobe todos os serviços
- ✅ `curl localhost:3000` retorna página Next.js
- ✅ `curl localhost:3001/health` retorna `{"status":"ok"}`

---

### Tarefa 1.6 — Configurar tipos compartilhados

**Descrição:** Criar os tipos TypeScript que serão usados tanto pelo cliente quanto pelo servidor.

**Passos:**
1. Em `client/src/types/game.ts`:
   ```typescript
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
     player_left: { playerId: string };
     player_kicked: { playerId: string };
     player_ready: { playerId: string; ready: boolean };
     game_starting: Record<string, never>;
     word_master_selected: { playerId: string };
     word_timeout: { playerId: string };
     word_submitted: { wordLength: number };
     word_scrambled: { scrambledLetters: string[]; masterId: string };
     timer_tick: { phase: 'choosing' | 'guessing'; remaining: number };
     guess_result: { playerId: string; correct: boolean };
     round_end: { scores: GameScore[]; word: string; correctPlayers: string[] };
     game_end: { finalScores: GameScore[]; winnerId: string | null };
     error: { message: string };
   }
   ```

**Critérios:**
- ✅ Tipos exportados corretamente
- ✅ `npm run build` no client passa sem erros de tipo

---

## Casos de Borda

| Situação | Como Tratar |
|----------|-------------|
| Porta 3000/3001/5432 ocupada | Docker Compose lança erro claro; usuário altera portas no `.yml` |
| PostgreSQL não fica pronto a tempo | Usar `healthcheck` + `condition: service_healthy` no Docker |
| `npm ci` falha sem lockfile | Usar `npm install` como fallback no Dockerfile |
| Prisma sem migration | Rodar `prisma migrate dev` manualmente ou via script de setup |

---

## Critérios de Aceitação (Geral)

- ✅ `docker compose up --build` sobe os 3 serviços sem erro
- ✅ `localhost:3000` mostra página Next.js
- ✅ `localhost:3001/health` responde 200
- ✅ PostgreSQL aceita conexão em `localhost:5432` com user `encripthor`
- ✅ Prisma consegue rodar `migrate dev` e criar as tabelas
- ✅ Código compila sem erros de TypeScript

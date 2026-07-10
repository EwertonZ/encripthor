# ✨ Spec 06 — Polimento Final

## Objetivo

Adicionar os toques finais ao projeto:
- Animações CSS para melhorar a experiência
- Efeitos sonoros (opcional)
- Docker otimizado para desenvolvimento
- README com instruções completas
- Persistência no PostgreSQL via Prisma

---

## Arquivos Envolvidos

```
├── client/
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx          # Adicionar fontes / metadados
│   │   │   └── globals.css         # Animações CSS customizadas
│   │   ├── components/
│   │   │   └── LetrasEmbaralhadas.tsx  # Adicionar animações
│   │   └── lib/
│   │       └── sound.ts            # Gerenciamento de som
│   └── Dockerfile                  # Docker dev (hot-reload)
├── server/
│   ├── prisma/
│   │   └── schema.prisma           # Já criado
│   └── src/
│       └── index.ts                # Persistência ao fim do jogo
├── docker-compose.yml              # Perfil de dev + healthchecks
└── README.md                       # ★ Documentação final
```

---

## Tarefas Detalhadas

### Tarefa 6.1 — Animações CSS

**Descrição:** Adicionar animações para tornar o jogo mais dinâmico e divertido.

**Arquivo:** `client/src/app/globals.css`

**Passos:**
1. Animação de entrada das letras embaralhadas:
   ```css
   @keyframes letter-pop {
     0% {
       transform: scale(0) rotate(-45deg);
       opacity: 0;
     }
     60% {
       transform: scale(1.2) rotate(10deg);
       opacity: 1;
     }
     100% {
       transform: scale(1) rotate(0deg);
       opacity: 1;
     }
   }

   .letter-card {
     animation: letter-pop 0.5s ease-out forwards;
     animation-delay: calc(var(--index) * 0.1s);
   }
   ```
2. Animação de flutuação das letras (sutil):
   ```css
   @keyframes float {
     0%, 100% { transform: translateY(0px); }
     50% { transform: translateY(-8px); }
   }

   .letter-float {
     animation: float 3s ease-in-out infinite;
     animation-delay: calc(var(--index) * 0.2s);
   }
   ```
3. Animação de revelação da palavra (fim de rodada):
   ```css
   @keyframes reveal-word {
     0% {
       filter: blur(10px);
       opacity: 0;
       transform: scale(0.5);
     }
     100% {
       filter: blur(0);
       opacity: 1;
       transform: scale(1);
     }
   }

   .word-reveal {
     animation: reveal-word 0.8s ease-out forwards;
   }
   ```
4. Animação de pulso no timer crítico (< 5s):
   ```css
   @keyframes pulse-critical {
     0%, 100% { transform: scale(1); }
     50% { transform: scale(1.05); }
   }

   .timer-critical {
     animation: pulse-critical 0.5s ease-in-out infinite;
     color: #ef4444;
   }
   ```
5. Transição suave entre fases do jogo:
   ```css
   @keyframes fade-slide-in {
     0% {
       opacity: 0;
       transform: translateY(20px);
     }
     100% {
       opacity: 1;
       transform: translateY(0);
     }
   }

   .game-phase-enter {
     animation: fade-slide-in 0.4s ease-out;
   }
   ```
6. Confete/celebração no fim do jogo (opcional):
   ```css
   @keyframes confetti-fall {
     0% { transform: translateY(-100vh) rotate(0deg); }
     100% { transform: translateY(100vh) rotate(720deg); }
   }

   .confetti-piece {
     position: fixed;
     width: 10px;
     height: 10px;
     animation: confetti-fall 3s linear forwards;
   }
   ```

**Critérios:**
- ✅ Letras entram com animação escalonada
- ✅ Palavra é revelada com efeito de blur → nítido
- ✅ Timer crítico pulsa em vermelho
- ✅ Transições suaves entre fases

---

### Tarefa 6.2 — Efeitos Sonoros (Opcional)

**Descrição:** Adicionar sons para feedback de ações importantes.

**Arquivo:** `client/src/lib/sound.ts`

**Passos:**
1. Criar utilitário de som usando API Web Audio (sem dependências externas):
   ```typescript
   class SoundManager {
     private audioContext: AudioContext | null = null;

     private getContext(): AudioContext {
       if (!this.audioContext) {
         this.audioContext = new AudioContext();
       }
       return this.audioContext;
     }

     play(type: 'correct' | 'wrong' | 'tick' | 'timeout' | 'victory' | 'round_start'): void {
       const ctx = this.getContext();
       const oscillator = ctx.createOscillator();
       const gain = ctx.createGain();
       oscillator.connect(gain);
       gain.connect(ctx.destination);

       switch (type) {
         case 'correct':
           oscillator.frequency.setValueAtTime(523, ctx.currentTime); // C5
           oscillator.frequency.setValueAtTime(659, ctx.currentTime + 0.1); // E5
           oscillator.frequency.setValueAtTime(784, ctx.currentTime + 0.2); // G5
           gain.gain.setValueAtTime(0.3, ctx.currentTime);
           gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
           oscillator.start(ctx.currentTime);
           oscillator.stop(ctx.currentTime + 0.4);
           break;

         case 'wrong':
           oscillator.type = 'square';
           oscillator.frequency.setValueAtTime(200, ctx.currentTime);
           gain.gain.setValueAtTime(0.2, ctx.currentTime);
           gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
           oscillator.start(ctx.currentTime);
           oscillator.stop(ctx.currentTime + 0.3);
           break;

         case 'tick':
           oscillator.frequency.setValueAtTime(1000, ctx.currentTime);
           gain.gain.setValueAtTime(0.05, ctx.currentTime);
           gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);
           oscillator.start(ctx.currentTime);
           oscillator.stop(ctx.currentTime + 0.05);
           break;

         case 'timeout':
           oscillator.frequency.setValueAtTime(440, ctx.currentTime);
           gain.gain.setValueAtTime(0.3, ctx.currentTime);
           gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
           oscillator.start(ctx.currentTime);
           oscillator.stop(ctx.currentTime + 0.5);
           break;

         case 'victory':
           oscillator.frequency.setValueAtTime(523, ctx.currentTime);
           oscillator.frequency.setValueAtTime(659, ctx.currentTime + 0.15);
           oscillator.frequency.setValueAtTime(784, ctx.currentTime + 0.3);
           oscillator.frequency.setValueAtTime(1047, ctx.currentTime + 0.45);
           gain.gain.setValueAtTime(0.3, ctx.currentTime);
           gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.8);
           oscillator.start(ctx.currentTime);
           oscillator.stop(ctx.currentTime + 0.8);
           break;
       }
     }
   }

   export const soundManager = new SoundManager();
   ```
2. Integrar sons nos componentes:
   - `CampoPalavra` → `soundManager.play('correct')` / `soundManager.play('wrong')`
   - `Timer` → `soundManager.play('tick')` quando `remaining <= 5`
   - `GameBoard` → `soundManager.play('timeout')` no fim do timer
   - `ResultadoRodada` → `soundManager.play('victory')`
   - Ações de toque inicial: `soundManager.play('round_start')`

**Critérios:**
- ✅ Sons gerados via Web Audio API (sem arquivos externos)
- ✅ Feedback sonoro para acerto, erro, vitória
- ✅ Tick audível nos últimos 5 segundos

---

### Tarefa 6.3 — Docker otimizado para Desenvolvimento

**Descrição:** Melhorar a configuração Docker para desenvolvimento com hot-reload.

**Arquivo:** `docker-compose.yml`

**Passos:**
1. Adicionar perfil de desenvolvimento com volumes bind mount:
   ```yaml
   services:
     # ... postgres (inalterado) ...

     socket-server:
       build:
         context: ./server
         dockerfile: Dockerfile.dev
       container_name: encripthor-server
       ports:
         - "3001:3001"
       environment:
         DATABASE_URL: postgresql://encripthor:encripthor123@postgres:5432/encripthor
         PORT: 3001
         CLIENT_URL: http://localhost:3000
         NODE_ENV: development
       volumes:
         - ./server/src:/app/src       # hot-reload
         - ./server/prisma:/app/prisma  # migrations
       depends_on:
         postgres:
           condition: service_healthy

     nextjs:
       build:
         context: ./client
         dockerfile: Dockerfile.dev
       container_name: encripthor-client
       ports:
         - "3000:3000"
       environment:
         NEXT_PUBLIC_SOCKET_URL: http://localhost:3001
         NODE_ENV: development
       volumes:
         - ./client/src:/app/src       # hot-reload
       depends_on:
         - socket-server
   ```
2. Criar `server/Dockerfile.dev`:
   ```dockerfile
   FROM node:20-alpine
   WORKDIR /app
   COPY package*.json ./
   RUN npm install
   COPY prisma ./prisma
   RUN npx prisma generate
   EXPOSE 3001
   CMD ["npm", "run", "dev"]
   ```
3. Criar `client/Dockerfile.dev`:
   ```dockerfile
   FROM node:20-alpine
   WORKDIR /app
   COPY package*.json ./
   RUN npm install
   EXPOSE 3000
   CMD ["npm", "run", "dev"]
   ```
4. Adicionar healthchecks robustos:
   - PostgreSQL já tem (pg_isready)
   - Socket-server: `curl -f http://localhost:3001/health`
   - Next.js: `curl -f http://localhost:3000`

**Critérios:**
- ✅ `docker compose up` sobe com hot-reload
- ✅ Alterações no código refletem sem rebuild
- ✅ Serviços sobem na ordem correta

---

### Tarefa 6.4 — Persistência no PostgreSQL

**Descrição:** Salvar dados da partida ao final do jogo usando Prisma.

**Arquivo:** `server/src/index.ts` (e `game.ts`)

**Passos:**
1. Ao final do jogo (`handleGameEnd`), persistir dados:
   ```typescript
   import prisma from './prisma';

   async function persistGameResult(room: RoomData): Promise<void> {
     try {
       // Criar ou reutilizar Players
       const playerRecords = await Promise.all(
         Array.from(room.players.values()).map(async (p) => {
           return prisma.player.upsert({
             where: { id: p.id },
             update: { nickname: p.nickname, socketId: p.id },
             create: { id: p.id, nickname: p.nickname, socketId: p.id },
           });
         })
       );

       // Criar Game
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
   ```
2. Chamar `persistGameResult(room)` dentro de `handleGameEnd`
3. Como o Player.id é o socket.id (que muda a cada conexão), ajustar:
   - Usar um `playerId` persistente (gerado na primeira conexão e salvo em cookie/localStorage)
   - Ou simplificar: criar Player com socket.id e aceitar duplicatas

**Critérios:**
- ✅ Ao final de cada jogo, dados são salvos no PostgreSQL
- ✅ Erro de banco não quebra o jogo (try/catch)

---

### Tarefa 6.5 — Responsividade

**Descrição:** Garantir que o jogo funcione bem em dispositivos móveis.

**Passos:**
1. Ajustar componentes para mobile:
   - Tela Inicial: layout empilhado (stacked) em telas < 768px
   - Sala de Espera: lista de jogadores ocupa largura total
   - GameBoard: placar vai para baixo do conteúdo principal
   - LetrasEmbaralhadas: letras menores em mobile
2. Usar Tailwind breakpoints:
   ```tsx
   // Exemplo: layout responsivo na tela inicial
   <div className="flex flex-col md:flex-row gap-4">
     {/* conteúdo */}
   </div>
   ```
3. Testar em resoluções: 375px (iPhone), 768px (iPad), 1024px+

**Critérios:**
- ✅ Layout não quebra em 375px de largura
- ✅ Inputs e botões têm tamanho adequado para toque (≥ 44px)
- ✅ Rolagem vertical funciona quando necessário

---

### Tarefa 6.6 — README

**Descrição:** Documentação completa do projeto.

**Arquivo:** `README.md`

**Conteúdo sugerido:**
```markdown
# 🧩 Encrypthor

Jogo multiplayer onde uma palavra é embaralhada e os jogadores devem adivinhar!

## 🎮 Como Jogar

1. Digite seu apelido
2. Crie uma sala ou entre em uma existente
3. Aguarde os jogadores ficarem prontos
4. O líder inicia o jogo
5. Um jogador é sorteado para escrever a palavra
6. A palavra é embaralhada e aparece na tela
7. Os demais jogadores tentam adivinhar
8. Quem acerta ganha ponto, o escritor ganha ponto por cada erro

## 🐳 Como Rodar

```bash
# Subir tudo (desenvolvimento com hot-reload)
docker compose up

# Build e subir (produção)
docker compose -f docker-compose.yml -f docker-compose.prod.yml up --build
```

### Acessos

| Serviço | URL |
|---------|-----|
| Jogo | http://localhost:3000 |
| Socket.IO | http://localhost:3001 |
| PostgreSQL | localhost:5432 |

### Comandos Úteis

```bash
# Ver logs
docker compose logs -f

# Rodar migrations
docker compose exec socket-server npx prisma migrate dev

# Parar tudo
docker compose down

# Parar e limpar banco
docker compose down -v
```

## 🛠️ Stack

- **Frontend:** Next.js 14, TypeScript, Tailwind CSS
- **Backend:** Node.js, Express, Socket.IO
- **Banco:** PostgreSQL + Prisma ORM
- **Infra:** Docker Compose

## 📐 Regras

- **Escrita:** 20 segundos para digitar a palavra
- **Adivinhação:** 60 segundos para os jogadores tentarem
- **Pontuação:** +1 para quem acerta, +1 para o escritor por erro
- **Rodadas:** 5 rodadas por partida (configurável)

## 📁 Estrutura

```
encripthor/
├── client/      → Next.js App Router
├── server/      → Express + Socket.IO + Prisma
└── specs/       → Especificações técnicas detalhadas
```
```

**Critérios:**
- ✅ README completo com instruções de instalação e uso
- ✅ Comandos Docker documentados
- ✅ Regras do jogo explicadas

---

## Casos de Borda

| Situação | Como Tratar |
|----------|-------------|
| Web Audio não suportado | Try/catch, jogo funciona sem som |
| Mobile com largura < 320px | `overflow-x-hidden` + scroll |
| Animações em dispositivos lentos | `prefers-reduced-motion: reduce` desativa animações |
| Prisma connection timeout | Retry com backoff exponencial |

---

## Critérios de Aceitação (Geral)

- ✅ Animações suaves em todos os componentes
- ✅ Efeitos sonoros funcionais (opcional, sem quebrar sem áudio)
- ✅ Docker compose dev com hot-reload
- ✅ Dados persistidos no PostgreSQL ao final do jogo
- ✅ Responsivo em mobile e desktop
- ✅ README completo e funcional
- ✅ `docker compose up` é o único comando necessário para rodar

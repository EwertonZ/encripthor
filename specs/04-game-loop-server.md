# 🎮 Spec 04 — Game Loop (Servidor)

## Objetivo

Implementar toda a lógica do jogo no servidor:
- Sorteio do Word Master
- Timer de 20s para digitar a palavra
- Validação e embaralhamento da palavra
- Timer de 60s para adivinhação
- Lógica de palpites e pontuação
- Fim de rodada e fim de jogo

---

## Arquivos Envolvidos

```
server/src/
├── index.ts              # Handlers dos eventos Socket (adicionar novos)
├── rooms.ts              # Estado das salas (já criado)
├── game.ts               # ★ Lógica do jogo (NOVO)
└── scrambler.ts          # ★ Embaralhamento (NOVO)
```

**Arquivos cliente afetados (spec 05):**
- `GameBoard.tsx`, `Timer.tsx`, `LetrasEmbaralhadas.tsx`, `CampoPalavra.tsx`, etc.

---

## Fluxo do Jogo (Servidor)

```
INÍCIO (status: waiting)
  │
  ▼
SORTEAR WORD MASTER (status: choosing_word)
  │
  ├─ Timer de 20s inicia
  │
  ├─ submit_word({word}) ──────────────────────────────►
  │   │  Validar palavra (mín 3 chars)
  │   │  Embaralhar (scrambler.ts)
  │   │  word_submitted({wordLength})  → broadcast (exceto mestre)
  │   │  word_scrambled({letters, masterId}) → broadcast
  │   │
  │   ▼
  │  INICIAR ADIVINHAÇÃO (status: guessing)
  │   │  Timer de 60s inicia
  │   │
  │   ├─ guess_word({guess}) ──────────────────────────►
  │   │   │  Comparar guess com currentWord
  │   │   │  Se acertar: marcar, emitir guess_result({correct: true})
  │   │   │  Se errar: emitir guess_result({correct: false})
  │   │   │  (Se todos acertarem → pular para FIM)
  │   │   ▼
  │   │  (continua até timer acabar)
  │   │
  │   └─ Timer de 60s EXPIRA ──────────────────────────►
  │
  └─ Timer de 20s EXPIRA (sem palavra enviada)
      │  word_timeout({playerId}) → broadcast
      │  Sortear NOVO Word Master (recomeça)
      ▼

  CALCULAR PONTUAÇÃO (status: round_end)
  │  Word Master: +1 para cada jogador que errou
  │  Quem acertou: +1
  │
  ▼
  FIM DE RODADA
  │  round_end({scores, word, correctPlayers}) → broadcast
  │  Delay de 5 segundos
  │
  ├─ Ainda há rodadas? ──────────► SIM → Sortear novo Word Master
  │
  └─ Não há mais rodadas ──────────► FIM DE JOGO
      game_end({finalScores, winnerId}) → broadcast
```

---

## Tarefas Detalhadas

### Tarefa 4.1 — Algoritmo de Embaralhamento

**Descrição:** Implementar o embaralhamento Fisher-Yates no servidor.

**Arquivo:** `server/src/scrambler.ts`

**Passos:**
1. Criar função `scrambleWord(word: string): string[]`:
   ```typescript
   /**
    * Embaralha as letras de uma palavra usando Fisher-Yates.
    * Garante que o resultado seja diferente da palavra original.
    */
   export function scrambleWord(word: string): string[] {
     if (word.length <= 1) return word.split('');

     const letters = word.toUpperCase().split('');

     // Fisher-Yates Shuffle (O(n))
     for (let i = letters.length - 1; i > 0; i--) {
       const j = Math.floor(Math.random() * (i + 1));
       [letters[i], letters[j]] = [letters[j], letters[i]];
     }

     // Garantir que não ficou igual à original
     if (letters.join('') === word.toUpperCase()) {
       return scrambleWord(word); // recursão (raro)
     }

     return letters;
   }

   /**
    * Valida se a palavra atende aos requisitos mínimos.
    */
   export function validateWord(word: string): { valid: boolean; error?: string } {
     const trimmed = word.trim();
     if (trimmed.length < 3) {
       return { valid: false, error: 'A palavra deve ter pelo menos 3 letras' };
     }
     if (trimmed.length > 20) {
       return { valid: false, error: 'A palavra deve ter no máximo 20 letras' };
     }
     if (!/^[A-Za-zÀ-ÿ]+$/.test(trimmed)) {
       return { valid: false, error: 'A palavra deve conter apenas letras' };
     }
     return { valid: true };
   }
   ```

**Critérios:**
- ✅ `scrambleWord("casa")` retorna array com 4 letras, nunca igual a `["c","a","s","a"]`
- ✅ `validateWord` rejeita palavras com menos de 3 caracteres
- ✅ `validateWord` rejeita palavras com números ou símbolos
- ✅ Funções são puras (sem side effects)

---

### Tarefa 4.2 — Lógica do Jogo (game.ts)

**Descrição:** Implementar o core do game loop no servidor.

**Arquivo:** `server/src/game.ts`

**Passos:**
1. Função `selectWordMaster(room: RoomData, excludeId?: string): string | null`:
   ```typescript
   import { RoomData } from './rooms';

   /**
    * Sorteia um Word Master aleatório, excluindo opcionalmente um jogador.
    */
   export function selectWordMaster(room: RoomData, excludeId?: string): string | null {
     const candidates = Array.from(room.players.keys())
       .filter(id => id !== excludeId);

     if (candidates.length === 0) return null;

     const randomIndex = Math.floor(Math.random() * candidates.length);
     return candidates[randomIndex];
   }
   ```
2. Função `startWordTimer(room: RoomData, io: Server, socket: Socket)`:
   ```typescript
   import { Server, Socket } from 'socket.io';

   /**
    * Inicia timer de 20s para o Word Master digitar a palavra.
    */
   export function startWordTimer(room: RoomData, io: Server): void {
     let remaining = 20;

     room.timers.wordTimer = setInterval(() => {
       remaining--;
       io.to(room.id).emit('timer_tick', { phase: 'choosing', remaining });

       if (remaining <= 0) {
         clearInterval(room.timers.wordTimer!);
         room.timers.wordTimer = null;
         handleWordTimeout(room, io);
       }
     }, 1000);
   }
   ```
3. Função `handleWordSubmission(room, io, socketId, word)`:
   ```typescript
   export function handleWordSubmission(
     room: RoomData,
     io: Server,
     socketId: string,
     word: string
   ): { success: boolean; error?: string } {
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
   ```
4. Função `handleWordTimeout(room, io)`:
   ```typescript
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
   ```
5. Função `startGuessTimer(room, io)`:
   ```typescript
   export function startGuessTimer(room: RoomData, io: Server): void {
     let remaining = 60;

     room.timers.guessTimer = setInterval(() => {
       remaining--;
       io.to(room.id).emit('timer_tick', { phase: 'guessing', remaining });

       if (remaining <= 0) {
         clearInterval(room.timers.guessTimer!);
         room.timers.guessTimer = null;
         handleRoundEnd(room, io);
       }
     }, 1000);
   }
   ```
6. Função `handleGuess(room, io, socketId, guess)`:
   ```typescript
   export function handleGuess(
     room: RoomData,
     io: Server,
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
   ```
7. Função `handleRoundEnd(room, io)`:
   ```typescript
   export function handleRoundEnd(room: RoomData, io: Server): void {
     // Calcular pontuação
     const allPlayers = Array.from(room.players.values());
     const playersGuessedCorrectly = allPlayers.filter(p => p.hasGuessedCorrectly);
     const playersWhoErrored = allPlayers.filter(
       p => p.id !== room.wordMaster && !p.hasGuessedCorrectly
     );

     // Word Master ganha 1 ponto para cada erro
     const masterId = room.wordMaster!;
     room.scores.set(masterId, (room.scores.get(masterId) || 0) + playersWhoErrored.length);

     // Quem acertou ganha 1 ponto
     playersGuessedCorrectly.forEach(p => {
       room.scores.set(p.id, (room.scores.get(p.id) || 0) + 1);
     });

     // Montar scores para broadcast
     const scores = allPlayers.map(p => ({
       playerId: p.id,
       nickname: p.nickname,
       score: room.scores.get(p.id) || 0,
     }));

     const correctPlayerIds = playersGuessedCorrectly.map(p => p.id);

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
   ```
8. Função `startNewRound(room, io)`:
   ```typescript
   export function startNewRound(room: RoomData, io: Server): void {
     room.currentRound++;
     room.wordMaster = null;
     room.currentWord = null;
     room.scrambledLetters = null;
     room.players.forEach(p => { p.hasGuessedCorrectly = false; });
     room.status = 'choosing_word';

     // Sortear novo Word Master
     const newMaster = selectWordMaster(room);
     room.wordMaster = newMaster;
     io.to(room.id).emit('word_master_selected', { playerId: newMaster });
     startWordTimer(room, io);
   }
   ```
9. Função `handleGameEnd(room, io)`:
   ```typescript
   export function handleGameEnd(room: RoomData, io: Server): void {
     room.status = 'round_end';

     // Determinar vencedor
     let maxScore = -1;
     let winnerId: string | null = null;
     for (const [playerId, score] of room.scores) {
       if (score > maxScore) {
         maxScore = score;
         winnerId = playerId;
       }
     }

     const finalScores = Array.from(room.players.values()).map(p => ({
       playerId: p.id,
       nickname: p.nickname,
       score: room.scores.get(p.id) || 0,
     }));

     io.to(room.id).emit('game_end', { finalScores, winnerId });
   }
   ```

**Critérios:**
- ✅ `selectWordMaster` nunca retorna o jogador excluído
- ✅ Timer de 20s emite `timer_tick` a cada segundo
- ✅ `handleWordSubmission` valida, embaralha e inicia adivinhação
- ✅ `handleWordTimeout` sorteia novo mestre
- ✅ `handleGuess` compara ignorando maiúsculas/minúsculas
- ✅ `handleRoundEnd` calcula pontuação corretamente
- ✅ `startNewRound` incrementa rodada e reseta estado
- ✅ `handleGameEnd` determina vencedor

---

### Tarefa 4.3 — Conectar Game Loop no Servidor (index.ts)

**Descrição:** Registrar os eventos do game loop no servidor Socket.IO.

**Arquivo:** `server/src/index.ts`

**Passos:**
1. Adicionar imports de `game.ts`
2. No listener `game_starting`, após validar, iniciar o jogo:
   ```typescript
   socket.on('start_game', ({ roomId }) => {
     const result = startGame(roomId, socket.id);
     if ('error' in result) {
       socket.emit('error', { message: result.error });
       return;
     }
     io.to(roomId).emit('game_starting', {});

     // Iniciar primeira rodada
     const room = rooms.get(roomId)!;
     const masterId = selectWordMaster(room);
     if (!masterId) {
       io.to(roomId).emit('error', { message: 'Erro ao iniciar jogo' });
       return;
     }
     room.wordMaster = masterId;
     io.to(roomId).emit('word_master_selected', { playerId: masterId });
     startWordTimer(room, io);
   });
   ```
3. Handler `submit_word`:
   ```typescript
   socket.on('submit_word', ({ roomId, word }) => {
     const room = rooms.get(roomId);
     if (!room) {
       socket.emit('error', { message: 'Sala não encontrada' });
       return;
     }
     const result = handleWordSubmission(room, io, socket.id, word);
     if (!result.success) {
       socket.emit('error', { message: result.error! });
     }
   });
   ```
4. Handler `guess_word`:
   ```typescript
   socket.on('guess_word', ({ roomId, guess }) => {
     const room = rooms.get(roomId);
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
       io.to(roomId).emit('guess_correct', { playerId: result.playerId });
     }

     // Verificar se todos acertaram
     const allGuessed = Array.from(room.players.values())
       .filter(p => p.id !== room.wordMaster)
       .every(p => p.hasGuessedCorrectly);
     if (allGuessed) {
       // Todos acertaram! Pular para fim de rodada
       if (room.timers.guessTimer) {
         clearInterval(room.timers.guessTimer);
         room.timers.guessTimer = null;
       }
       handleRoundEnd(room, io);
     }
   });
   ```
5. Adicionar `Map<string, number>` para rate limiting:
   ```typescript
   const lastGuessTimes = new Map<string, number>();
   ```

**Critérios:**
- ✅ Eventos registrados e funcionando
- ✅ Rate limiting implementado
- ✅ Todos acertaram → pula para fim de rodada

---

## Casos de Borda

| Situação | Como Tratar |
|----------|-------------|
| Word Master desconecta durante digitação | `socket.on('disconnect')` detecta e chama `handleWordTimeout` |
| Todos os jogadores acertam antes do timer | Pular para `handleRoundEnd` imediatamente |
| Palavra com acentos / ç | `toUpperCase()` normaliza; `À-ÿ` no regex permite acentos |
| Apenas 1 jogador na sala | `selectWordMaster` retorna null → erro |
| Jogador tenta enviar palpite após acertar | Servidor rejeita com "Você já acertou" |
| Word Master tenta palpitar | Servidor rejeita com "Word Master não pode adivinhar" |
| Servidor cai no meio do jogo | Estado em memória perdido (aceitável) |

---

## Critérios de Aceitação

- ✅ Word Master é sorteado aleatoriamente
- ✅ Timer de 20s funciona e expira corretamente
- ✅ Palavra é validada (mín 3 letras, só letras)
- ✅ Embaralhamento Fisher-Yates no servidor
- ✅ Timer de 60s para adivinhação
- ✅ Palpite é comparado case-insensitive
- ✅ Pontuação: +1 para acertador, +1 para mestre por erro
- ✅ Fim de rodada com delay de 5s
- ✅ Fim de jogo com anúncio do vencedor
- ✅ Rate limiting de 1 palpite/segundo

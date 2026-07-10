# 🧩 Encrypthor — Plano de Desenvolvimento

## 1. Visão Geral

**Encrypthor** é um jogo web multiplayer em tempo real onde um jogador digita uma palavra, ela é embaralhada (letras espalhadas na tela), e os demais jogadores devem adivinhá-la. Quem acerta ganha ponto. Quem escreveu a palavra ganha 1 ponto para cada jogador que **não** acertou.

---

## 2. Stack Tecnológica

| Camada | Tecnologia | Justificativa |
|--------|-----------|---------------|
| **Frontend** | Next.js 14+ (App Router) | SSR, roteamento, deploy fácil na Vercel |
| **Estilo** | Tailwind CSS | Rapidez, design responsivo, utilidades |
| **Tempo Real** | Socket.IO | Baixa latência, fallbacks automáticos, salas nativas |
| **Backend Socket** | Node.js + Express (servidor separado) | Estado do jogo em memória, conexões persistentes |
| **Database** | **Turso** (SQLite serverless edge) | SQLite compatível com Vercel via Turso, ou SQLite puro se o servidor Socket for um VPS |
| **Deploy Front** | Vercel | Gratuito, integração Next.js nativa |
| **Deploy Socket** | Railway / Fly.io / Render | Suporte a WebSockets persistentes |

### 💡 Por que servidor Socket separado?

Vercel usa serverless functions (stateless, ephemeral) — não mantêm conexões WebSocket abertas. O jogo precisa de estado em tempo real (timers, turnos, pontuação imediata). Um servidor Node.js dedicado com Socket.IO gerencia:

- Salas e sessões dos jogadores
- Timers de 20s (digitação) e 60s (adivinhação)
- Estado do jogo em memória (rápido)
- Persistência opcional no Turso (placar, histórico)

### 💡 Sobre SQLite na Vercel

A Vercel **não suporta SQLite tradicional** (sistema de arquivos read-only em produção). Soluções:

| Solução | Prós | Contras |
|---------|------|---------|
| **Turso** | SQLite edge, HTTP query, free tier generoso | Precisa de conta, latência de rede |
| **BetterSQLite3 + servidor próprio** | SQLite real, zero custo extra | Não roda na Vercel |
| **Vercel Postgres / Neon** | Ótimo, mas não é SQLite | Foge do requisito |

**Recomendação:** Use **Turso** para leaderboards e histórico. O estado do jogo ativo fica 100% em memória no servidor Socket.

---

## 3. Arquitetura do Sistema

```
┌─────────────────────┐       ┌──────────────────────────────┐
│   Cliente (Browser) │◄─────►│  Servidor Socket.IO          │
│   Next.js + Socket  │       │  Node.js + Express           │
│   (Vercel)          │       │  (Railway / Fly.io)          │
└─────────────────────┘       │                              │
                              │  • Salas (Map<string, Room>)  │
                              │  • Timers (setInterval)      │
                              │  • Game Loop                 │
                              │  • Embaralhamento            │
                              └──────────┬───────────────────┘
                                         │
                                         ▼
                              ┌──────────────────────┐
                              │   Turso (SQLite)      │
                              │   • Placar global     │
                              │   • Histórico opcional│
                              └──────────────────────┘
```

### Fluxo de Conexão

1. Usuário acessa `encrypthor.vercel.app`
2. Next.js serve a página inicial (SSR)
3. Ao entrar/sair de sala, navega via Next.js Router
4. Socket.IO conecta ao servidor remoto ao entrar na sala
5. Todo estado do jogo vem via eventos Socket

---

## 4. Estrutura de Diretórios

```
encripthor/
├── client/                          # Next.js (Vercel)
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx             # Tela inicial
│   │   │   ├── sala/
│   │   │   │   └── [roomId]/
│   │   │   │       └── page.tsx     # Página da sala
│   │   │   └── game/
│   │   │       └── [roomId]/
│   │   │           └── page.tsx     # Tela do jogo ativo
│   │   ├── components/
│   │   │   ├── TelaInicial.tsx
│   │   │   ├── SalaEspera.tsx
│   │   │   ├── GameBoard.tsx
│   │   │   ├── LetrasEmbaralhadas.tsx
│   │   │   ├── CampoPalavra.tsx
│   │   │   ├── Timer.tsx
│   │   │   ├── Placar.tsx
│   │   │   └── ChatBox.tsx
│   │   ├── hooks/
│   │   │   ├── useSocket.ts
│   │   │   └── useGame.ts
│   │   ├── lib/
│   │   │   └── socket.ts            # Conexão Socket.IO
│   │   └── types/
│   │       └── game.ts              # Tipos TypeScript
│   ├── tailwind.config.ts
│   └── package.json
│
├── server/                          # Servidor Socket.IO
│   ├── src/
│   │   ├── index.ts                 # Entrypoint Express + Socket
│   │   ├── rooms.ts                 # Gerenciamento de salas
│   │   ├── game.ts                  # Lógica do jogo
│   │   ├── scrambler.ts             # Embaralhamento
│   │   └── db.ts                    # Conexão Turso (opcional)
│   └── package.json
│
└── plan.md                          # Este arquivo
```

---

## 5. Eventos Socket.IO

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
| `guess_result` | `{ playerId, correct }` | Resultado da tentativa |
| `guess_correct` | `{ playerId }` | Alguém acertou (anúncio) |
| `round_end` | `{ scores, word, correctPlayers }` | Fim da rodada |
| `game_end` | `{ finalScores }` | Fim do jogo |
| `error` | `{ message }` | Erro (sala inválida, etc.) |

---

## 6. Estado do Jogo (Servidor — em memória)

```typescript
interface Room {
  id: string;                     // Código único de 6 caracteres
  leaderId: string;               // Socket ID do líder
  players: Map<string, Player>;   // Socket ID → Player
  status: 'waiting' | 'choosing_word' | 'guessing' | 'round_end';
  currentRound: number;
  maxRounds: number;              // Ex: 3 ou 5
  scores: Map<string, number>;    // Socket ID → pontos
  wordMaster: string | null;      // Socket ID do escritor atual
  currentWord: string | null;     // Palavra atual (oculta dos jogadores)
  scrambledLetters: string[] | null;
  guessTimer: NodeJS.Timer | null;
  wordTimer: NodeJS.Timer | null;
}

interface Player {
  id: string;                     // Socket ID
  nickname: string;
  ready: boolean;
  hasGuessedCorrectly: boolean;
}
```

---

## 7. Regras do Jogo (Detalhadas)

### Fluxo de Rodada

1. **Sorteio:** Um jogador (qualquer um, incluindo o líder) é sorteado como **Word Master**
2. **Digitação (20s):** O Word Master tem 20s para digitar uma palavra
   - Se não digitar a tempo → perde a vez, novo sorteio
   - Se digitar → palavra é embaralhada
3. **Embaralhamento:** As letras da palavra são espalhadas aleatoriamente pela tela
4. **Adivinhação (60s):** Todos (exceto o Word Master) tentam adivinhar
   - Campo de texto + Enter para tentar
   - Se acertar → campo bloqueado, +1 ponto
5. **Fim da rodada:**
   - Word Master ganha 1 ponto para cada jogador que **não** acertou
   - Placar é exibido
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

## 8. Componentes UI

### Tela Inicial

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
│   [Erro: Sala não encontrada]  │
└────────────────────────────────┘
```

### Sala de Espera

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
│  [   Iniciar Jogo   ]  (líder) │
│  [  Pronto / Não Pronto  ]     │
│         (jogadores)            │
└────────────────────────────────┘
```

### Jogo Ativo

```
┌────────────────────────────────┐
│  🏠 Sair    Rodada 2/5    ⏱️45s│
│                                │
│      Palavra Embaralhada       │
│   ┌────────────────────────┐   │
│   │  A  F  S  I  R  E  S  │   │
│   └────────────────────────┘   │
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

---

## 9. Algoritmo de Embaralhamento

- Receber a palavra (ex: "abacaxi")
- Separar em array de letras: `['a','b','a','c','a','x','i']`
- Embaralhar com Fisher-Yates shuffle
- Garantir que o resultado seja **diferente** da palavra original
- Se por acaso for igual, re-embaralhar
- Enviar array embaralhado para o cliente
- **Importante:** O cliente renderiza cada letra como um elemento draggable/animado espalhado pela área de jogo

---

## 10. Plano de Implementação (Ordem)

### Fase 1 — Setup do Projeto
- [ ] 1.1 Inicializar Next.js com TypeScript e Tailwind
- [ ] 1.2 Inicializar servidor Node + Express + Socket.IO
- [ ] 1.3 Configurar Turso (schema de leaderboards)
- [ ] 1.4 Configurar variáveis de ambiente

### Fase 2 — Tela Inicial
- [ ] 2.1 Layout visual com campo de nickname, criar sala, entrar sala
- [ ] 2.2 Validação de nickname (não vazio)
- [ ] 2.3 Integrar Socket.IO: `create_room` + `join_room`
- [ ] 2.4 Tratamento de erros (sala inválida)

### Fase 3 — Sala de Espera
- [ ] 3.1 Lista de jogadores com status de pronto
- [ ] 3.2 Botão "Pronto" (toggle) para não-líderes
- [ ] 3.3 Botão "Iniciar Jogo" (só para o líder)
- [ ] 3.4 Expulsar jogadores (só líder)
- [ ] 3.5 Sair da sala (qualquer um)
- [ ] 3.6 Estado visual: quando todos prontos, líder pode iniciar

### Fase 4 — Game Loop (Servidor)
- [ ] 4.1 Sorteio do Word Master
- [ ] 4.2 Timer de 20s para digitar palavra
- [ ] 4.3 Validação da palavra (mín. 3 letras?)
- [ ] 4.4 Embaralhamento seguro (servidor)
- [ ] 4.5 Timer de 60s para adivinhação
- [ ] 4.6 Lógica de pontuação (acertou + master)
- [ ] 4.7 Fim de rodada → início da próxima
- [ ] 4.8 Fim de jogo → placar final

### Fase 5 — Jogo Ativo (Cliente)
- [ ] 5.1 Tela de "escolha a palavra" para o Word Master
- [ ] 5.2 Animação de letras embaralhadas na tela
- [ ] 5.3 Campo de palpite + Enter
- [ ] 5.4 Timer visual (20s / 60s)
- [ ] 5.5 Placar durante o jogo
- [ ] 5.6 Tela de fim de rodada (palavra revelada, quem acertou)
- [ ] 5.7 Tela de fim de jogo (vencedor)

### Fase 6 — Polimento
- [ ] 6.1 Animações CSS (transições, hover, letras flutuando)
- [ ] 6.2 Responsividade (mobile OK)
- [ ] 6.3 Som de efeitos (acerto, erro, timer)
- [ ] 6.4 Persistência opcional no Turso
- [ ] 6.5 Testes end-to-end
- [ ] 6.6 Deploy

---

## 11. Considerações Técnicas Importantes

### Tratamento de Desconexão

- Se o Word Master desconectar durante a digitação → sorteia novo mestre
- Se o líder desconectar → novo líder é eleito (o jogador mais antigo na sala)
- Se um jogador desconectar durante a adivinhação → ele simplesmente perde a rodada
- Ao reconectar, o jogador volta para a sala (se ainda ativa)

### Segurança

- O embaralhamento **deve ser feito no servidor**, nunca no cliente
- A palavra original **nunca é enviada** para os clientes adivinhadores
- Validação de líder: o servidor verifica se o socket é o leaderId da sala
- Rate limiting: máximo de palpites por segundo para evitar flood

### Timer

- Usar `setInterval` no servidor a cada 1s para broadcast do tempo restante
- O cliente exibe o timer recebido do servidor (fonte da verdade)
- Ao expirar, o servidor executa a ação automaticamente

### Código da Sala

- Gerar código alfanumérico de 6 caracteres (ex: `ABC123`)
- Case-insensitive na hora de entrar

---

## 12. Possíveis Desafios

| Desafio | Solução |
|---------|---------|
| WebSocket na Vercel | Servidor Socket separado (Railway/Fly.io) |
| Estado do jogo em memória | Aceitável para jogos curtos (< 1h) |
| Sincronia de timers | Servidor é autoridade; cliente só exibe |
| Reconexão de jogador | Salvar userId em cookie/localStorage |
| Palavras ofensivas | Validação com lista básica ou API externa |
| Latência de rede | Socket.IO com fallback a polling |

---

## 13. Próximos Passos

1. **Setup inicial** — Next.js + servidor Socket
2. **Tela inicial funcional** — criar/entrar em salas
3. **Sala de espera** — prontidão e início do jogo
4. **Game loop básico** — palavra → embaralhar → adivinhar
5. **UI completa** — animações, timer, placar
6. **Deploy** — Vercel + Railway/Fly.io

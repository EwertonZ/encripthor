# 🎯 Spec 05 — Jogo Ativo (Cliente)

## Objetivo

Implementar a interface do jogo no cliente:
- Tela de escolha de palavra (Word Master)
- Visualização das letras embaralhadas
- Campo de palpite com Enter
- Timer visual (20s / 60s)
- Placar em tempo real
- Resultado da rodada
- Tela de fim de jogo

---

## Arquivos Envolvidos

```
client/src/
├── components/
│   ├── GameBoard.tsx              # ★ Container principal do jogo
│   ├── CampoPalavra.tsx           # ★ Campo para escrever/adivinhar
│   ├── LetrasEmbaralhadas.tsx     # ★ Letras espalhadas na tela
│   ├── Timer.tsx                  # ★ Barra de progresso circular/linear
│   ├── Placar.tsx                 # ★ Pontuação em tempo real
│   └── ResultadoRodada.tsx        # ★ Fim de rodada / fim de jogo
├── hooks/
│   ├── useSocket.ts               # Hook Socket (já criado)
│   └── useGame.ts                 # Hook do jogo (criado parcialmente)
└── types/
    └── game.ts                    # Tipos (já criados)
```

---

## Tarefas Detalhadas

### Tarefa 5.1 — Refinar Hook useGame

**Descrição:** Completar o hook `useGame` com todos os eventos do jogo.

**Arquivo:** `client/src/hooks/useGame.ts`

**Passos:**
1. Estados completos:
   ```typescript
   export interface GameState {
     // Sala
     roomId: string | null;
     players: Player[];
     myPlayerId: string | null;
     isLeader: boolean;

     // Fase do jogo
     gamePhase: 'waiting' | 'choosing_word' | 'guessing' | 'round_end' | 'game_over';

     // Word Master
     isWordMaster: boolean;
     wordMasterId: string | null;

     // Palavra
     scrambledLetters: string[];
     wordLength: number | null;
     revealedWord: string | null;

     // Timer
     timerPhase: 'choosing' | 'guessing' | null;
     timerRemaining: number | null;

     // Palpite
     guessedCorrectly: boolean;

     // Placar
     scores: GameScore[];

     // Resultado
     correctPlayers: string[];
     winnerId: string | null;
   }
   ```
2. Registrar todos os listeners Socket:
   - `word_master_selected` → setar `isWordMaster`, `wordMasterId`, `gamePhase: 'choosing_word'`
   - `word_timeout` → notificar que o mestre perdeu a vez
   - `word_submitted` → setar `wordLength`
   - `word_scrambled` → setar `scrambledLetters`, `gamePhase: 'guessing'`
   - `timer_tick` → setar `timerPhase`, `timerRemaining`
   - `guess_result` → feedback visual (acertou/errou)
   - `guess_correct` → marcar alguém acertou
   - `round_end` → setar `gamePhase: 'round_end'`, `revealedWord`, `correctPlayers`, `scores`
   - `game_end` → setar `gamePhase: 'game_over'`, `scores`, `winnerId`
   - `error` → exibir toast/mensagem
3. Funções auxiliares para emitir eventos:
   - `submitWord(word: string)`
   - `makeGuess(guess: string)`
4. Cleanup de listeners ao desmontar

**Critérios:**
- ✅ Hook exporta `GameState` completo
- ✅ Todos os eventos do servidor são escutados
- ✅ Estado é atualizado corretamente a cada evento

---

### Tarefa 5.2 — Componente Timer

**Descrição:** Timer visual com barra de progresso.

**Arquivo:** `client/src/components/Timer.tsx`

**Passos:**
1. Props:
   ```typescript
   interface TimerProps {
     remaining: number | null;   // segundos restantes
     total: number;              // total de segundos (20 ou 60)
     phase: 'choosing' | 'guessing' | null;
   }
   ```
2. Renderização:
   - Barra de progresso linear no topo da tela (largura total)
   - Cor muda conforme tempo:
     - Verde (> 50% do tempo)
     - Amarelo (25% ~ 50%)
     - Vermelho (< 25%)
   - Número centralizado com os segundos restantes
   - Texto indicando fase: "Escolha da palavra" ou "Adivinhação"
3. Comportamento:
   - Animação suave de transição na largura da barra (CSS transition)
   - Se `remaining <= 5`, texto pisca ou treme
   - Se `remaining` for null, não renderizar

**Critérios:**
- ✅ Barra de progresso diminui conforme o tempo
- ✅ Cores mudam conforme o tempo restante
- ✅ Animação suave

---

### Tarefa 5.3 — Componente CampoPalavra

**Descrição:** Campo de texto para digitar ou adivinhar palavra.

**Arquivo:** `client/src/components/CampoPalavra.tsx`

**Passos:**
1. Props:
   ```typescript
   interface CampoPalavraProps {
     mode: 'write' | 'guess';
     onSubmit: (word: string) => void;
     disabled?: boolean;
     wordLength?: number | null;
     guessedCorrectly?: boolean;
     isWordMaster: boolean;
   }
   ```
2. Modo "write" (Word Master):
   - Input de texto focado automaticamente
   - Placeholder: "Digite a palavra para os outros adivinharem..."
   - Botão "Confirmar Palavra" ou Enter para enviar
   - Validação: mínimo 3 letras
   - Se `disabled`, mostrar mensagem "Você perdeu a vez!"
3. Modo "guess" (demais jogadores):
   - Input de texto com placeholder: "Qual é a palavra?"
   - Enter para enviar palpite
   - Se `guessedCorrectly === true`:
     - Input desabilitado
     - Mensagem verde: "✅ Você acertou!"
   - Se `disabled` por tempo esgotado:
     - Input desabilitado
     - Mensagem: "⏰ Tempo esgotado!"
4. Feedback visual:
   - Brief flash verde no input ao acertar (antes de desabilitar)
   - Brief flash vermelho ao errar (input limpo após 500ms)

**Critérios:**
- ✅ Modo "write" para Word Master, modo "guess" para outros
- ✅ Enter funciona para ambos os modos
- ✅ Input desabilita após acertar ou tempo esgotar
- ✅ Feedback visual de acerto/erro

---

### Tarefa 5.4 — Componente LetrasEmbaralhadas

**Descrição:** Exibir as letras embaralhadas espalhadas na tela.

**Arquivo:** `client/src/components/LetrasEmbaralhadas.tsx`

**Passos:**
1. Props:
   ```typescript
   interface LetrasEmbaralhadasProps {
     letters: string[];
     wordLength: number | null;
   }
   ```
2. Renderização:
   - Container central com as letras espalhadas
   - Cada letra em um "card" estilizado (fundo escuro, borda arredondada, sombra)
   - Letras posicionadas aleatoriamente dentro do container (com alguma organização para não ficar ilegível)
   - Layout responsivo: grade variável dependendo do número de letras
   - Pequena rotação aleatória em cada letra para dar sensação de "espalhadas"
3. Animação:
   - Letras entram com animação de fade-in + scale (CSS keyframes)
   - Pequena flutuação contínua (float animation) sutil
4. Se `wordLength` for definido mas `letters` vazio:
   - Mostrar placeholders (traços) no número de letras

**Critérios:**
- ✅ Letras são exibidas em cards com estilo
- ✅ Disposição visual agradável (não amontoada)
- ✅ Animação de entrada suave

---

### Tarefa 5.5 — Componente Placar

**Descrição:** Placar em tempo real com pontuação dos jogadores.

**Arquivo:** `client/src/components/Placar.tsx`

**Passos:**
1. Props:
   ```typescript
   interface PlacarProps {
     scores: GameScore[];
     players: Player[];
     myPlayerId: string | null;
     wordMasterId: string | null;
     currentRound: number;
     maxRounds: number;
   }
   ```
2. Renderização:
   - Lista vertical de jogadores ordenada por pontuação (maior primeiro)
   - Cada linha: posição → nickname → pontos
   - Jogador atual em destaque (negrito ou cor diferente)
   - Word Master com badge 👑
   - Indicador visual de quem acertou a rodada atual (🟢)
3. Info de rodada no topo: "Rodada 3/5"

**Critérios:**
- ✅ Placar ordenado por pontuação
- ✅ Jogador atual destacado
- ✅ Badge no Word Master

---

### Tarefa 5.6 — Componente ResultadoRodada

**Descrição:** Tela exibida ao fim de cada rodada.

**Arquivo:** `client/src/components/ResultadoRodada.tsx`

**Passos:**
1. Props:
   ```typescript
   interface ResultadoRodadaProps {
     word: string;
     correctPlayers: string[];
     players: Player[];
     scores: GameScore[];
     isGameOver: boolean;
     winnerId: string | null;
     myPlayerId: string | null;
   }
   ```
2. Tela de fim de rodada:
   - "🎉 Fim da Rodada!" como título
   - "A palavra era: **PALAVRA**" (grande, com animação de revelação)
   - Lista de quem acertou (com ✅)
   - Pontuação atualizada
   - "Próxima rodada em 5s..." com contagem regressiva
3. Tela de fim de jogo:
   - "🏆 Fim de Jogo!" como título
   - Pódio: 1º, 2º, 3º lugares com destaque
   - Placar final completo
   - Botão "Voltar ao Início" (navega para `/`)
   - Se houve empate: mostrar "👏 Empate entre: Jogador1, Jogador2"

**Critérios:**
- ✅ Palavra é revelada com animação
- ✅ Lista de acertadores visível
- ✅ Contagem regressiva de 5s
- ✅ Pódio no fim do jogo
- ✅ Botão voltar ao início

---

### Tarefa 5.7 — Componente GameBoard

**Descrição:** Container principal que orquestra os subcomponentes do jogo.

**Arquivo:** `client/src/components/GameBoard.tsx`

**Passos:**
1. Props:
   ```typescript
   interface GameBoardProps {
     roomId: string;
     socket: Socket;
     gameState: GameState;
   }
   ```
2. Lógica de renderização condicional baseada em `gameState.gamePhase`:
   ```
   gamePhase = 'choosing_word' ─────────────────────────────────┐
     ├─ isWordMaster = true  → CampoPalavra (mode=write)      │
     │                        + Timer (20s)                    │
     │                        + "Digite a palavra!"            │
     ├─ isWordMaster = false → "🕐 Aguardando palavra..."      │
     │                        + Timer (20s)                    │
     │                        + wordLength placeholders        │
     └─────────────────────────────────────────────────────────┘
   
   gamePhase = 'guessing' ─────────────────────────────────────┐
     ├─ isWordMaster = true  → "🎯 Você é o Word Master!"     │
     │                        Aguarde os palpites...           │
     ├─ isWordMaster = false → LetrasEmbaralhadas              │
     │                        + CampoPalavra (mode=guess)      │
     └─────────────────────────────────────────────────────────┘
                           + Timer (60s)
                           + Placar (sempre visível)
   
   gamePhase = 'round_end' ────────────────────────────────────┐
     └─ ResultadoRodada (isGameOver = false)                   │
   
   gamePhase = 'game_over' ────────────────────────────────────┐
     └─ ResultadoRodada (isGameOver = true)                    │
   ```
3. Layout geral:
   - Timer no topo (componente `Timer`)
   - Conteúdo central (variável conforme fase)
   - Placar na lateral direita (ou abaixo no mobile)
4. Botão "Sair" no canto superior esquerdo → emite `leave_room`, navega para `/`

**Critérios:**
- ✅ Renderização correta para cada fase do jogo
- ✅ Transição suave entre fases
- ✅ Timer sempre visível durante jogo
- ✅ Placar sempre visível durante jogo

---

## Tarefa 5.8 — Atualizar Página da Sala

**Descrição:** A página `/sala/[roomId]` agora gerencia a transição entre sala de espera e jogo.

**Arquivo:** `client/src/app/sala/[roomId]/page.tsx`

**Passos:**
1. Verificar fase do jogo:
   ```tsx
   'use client';
   import { useParams } from 'next/navigation';
   import { useSocket } from '@/hooks/useSocket';
   import { useGame } from '@/hooks/useGame';
   import SalaEspera from '@/components/SalaEspera';
   import GameBoard from '@/components/GameBoard';

   export default function SalaPage() {
     const params = useParams();
     const roomId = params.roomId as string;
     const socket = useSocket(roomId);
     const gameState = useGame(socket.current, roomId);

     if (!gameState.roomId) {
       return (
         <div className="min-h-screen flex items-center justify-center">
           <div className="animate-pulse text-2xl">Conectando...</div>
         </div>
       );
     }

     if (gameState.gamePhase === 'waiting') {
       return <SalaEspera roomId={roomId} socket={socket.current!} gameState={gameState} />;
     }

     return <GameBoard roomId={roomId} socket={socket.current!} gameState={gameState} />;
   }
   ```

**Critérios:**
- ✅ Página renderiza SalaEspera ou GameBoard conforme fase
- ✅ Loading state enquanto conecta

---

## Casos de Borda

| Situação | Como Tratar |
|----------|-------------|
| Word Master vê letras embaralhadas | Esconder: mostrar "Você é o Word Master" |
| Jogador tenta enviar palpite vazio | Validar no cliente antes de enviar |
| Palpite com espaços extras | `trim()` antes de enviar |
| Jogador desconecta durante jogo | Socket desconecta, mas página continua |
| Timer chega a 0 | Campo desabilita, mensagem de tempo esgotado |
| Múltiplos cliques em "Confirmar" | Desabilitar botão após primeiro clique |

---

## Critérios de Aceitação

- ✅ Word Master vê campo para digitar a palavra com timer de 20s
- ✅ Demais jogadores veem "Aguardando palavra..." durante escolha
- ✅ Letras embaralhadas aparecem na tela com animação
- ✅ Campo de palpite funciona com Enter
- ✅ Feedback visual de acerto (verde) e erro (vermelho)
- ✅ Timer visual com barra de progresso e cores
- ✅ Placar em tempo real atualizado
- ✅ Tela de fim de rodada com palavra revelada
- ✅ Tela de fim de jogo com pódio
- ✅ Botão sair funciona em todas as telas

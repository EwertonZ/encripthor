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

## 📐 Regras

| Regra | Valor |
|-------|-------|
| ⏱ Escrita | 20 segundos para digitar a palavra |
| ⏱ Adivinhação | 60 segundos para os jogadores tentarem |
| 🏆 Pontuação | +1 para quem acerta, +1 para o escritor por erro |
| 🔄 Rodadas | 5 rodadas por partida |
| 👥 Jogadores | Mínimo 2 por sala |

## 🐳 Como Rodar

### Produção

```bash
# Subir tudo
docker compose up -d

# Acessar em:
#   http://localhost:3000
```

### Desenvolvimento (com hot-reload)

```bash
# Subir com perfil de desenvolvimento
docker compose --profile dev up

# Alterações no código refletem automaticamente (sem rebuild!)
```

### Comandos Úteis

```bash
# Ver logs
docker compose logs -f

# Rodar migrations (se necessário)
docker compose exec socket-server npx prisma migrate dev

# Parar tudo
docker compose down

# Parar e limpar banco
docker compose down -v
```

## 🌐 Acessar de outros dispositivos

### Rede local

Outro dispositivo na mesma rede Wi-Fi pode acessar pelo IP da máquina:
```
http://192.168.0.60:3000
```

### Internet (ngrok)

```bash
# 1. Configure seu token (grátis em ngrok.com)
ngrok config add-authtoken SEU_TOKEN

# 2. Inicie os túneis
bash start-ngrok.sh

# 3. No navegador, configure a URL do socket via console (F12):
localStorage.setItem('socketUrl', 'https://SUBDOMINIO_SOCKET.ngrok.io')

# 4. Recarregue a página e compartilhe o link web!
```

## 🛠️ Stack

| Camada | Tecnologia |
|--------|-----------|
| **Frontend** | Next.js 15, TypeScript, Tailwind CSS |
| **Backend** | Node.js, Express, Socket.IO |
| **Banco** | PostgreSQL + Prisma ORM |
| **Infra** | Docker Compose |

## 📁 Estrutura

```
encripthor/
├── client/          → Next.js (App Router)
│   ├── src/
│   │   ├── app/     → Páginas e layout
│   │   ├── components/ → Componentes React
│   │   ├── hooks/   → Custom hooks (Socket, Game)
│   │   └── lib/     → Utilitários (Socket, Store, Sound)
│   └── Dockerfile   → Build de produção
├── server/          → Express + Socket.IO + Prisma
│   ├── src/
│   │   ├── game.ts      → Lógica do jogo
│   │   ├── rooms.ts     → Gerenciamento de salas
│   │   ├── scrambler.ts → Embaralhamento de palavras
│   │   └── prisma.ts    → Cliente Prisma
│   └── prisma/
│       └── schema.prisma → Schema do banco
├── specs/           → Especificações técnicas detalhadas
├── docker-compose.yml  → Orquestração Docker
└── start-ngrok.sh   → Script para túneis ngrok
```

## 🧑‍💻 Desenvolvimento

```bash
# Clonar
git clone https://github.com/EwertonZ/encripthor.git
cd encripthor

# Rodar em desenvolvimento
docker compose --profile dev up

# Ou rodar localmente sem Docker:
# Terminal 1:
cd server && npm install && npx prisma generate && npm run dev

# Terminal 2:
cd client && npm install && npm run dev
```

## 📄 Licença

MIT

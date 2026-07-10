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

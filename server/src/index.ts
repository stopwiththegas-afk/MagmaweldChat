import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import http from 'http';

import { startTelegramBot } from './bot.js';
import authRouter from './routes/auth.js';
import chatsRouter from './routes/chats.js';
import messagesRouter from './routes/messages.js';
import usersRouter from './routes/users.js';
import { setupSocket } from './socket/index.js';

const app = express();
const httpServer = http.createServer(app);

app.use(cors());
app.use(express.json());

app.use('/auth', authRouter);
app.use('/chats', chatsRouter);
app.use('/chats/:chatId/messages', messagesRouter);
app.use('/users', usersRouter);

app.get('/health', (_req, res) => res.json({ ok: true }));

setupSocket(httpServer);

const PORT = Number(process.env.PORT) || 3000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  startTelegramBot();
});

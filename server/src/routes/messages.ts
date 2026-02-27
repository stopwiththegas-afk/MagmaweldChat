import { Router } from 'express';

import { prisma } from '../lib/prisma.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';

const router = Router({ mergeParams: true });

router.use(requireAuth);

/** GET /chats/:chatId/messages — paginated message history */
router.get('/', async (req: AuthRequest, res) => {
  const { chatId } = req.params;
  const limit = Math.min(Number(req.query.limit) || 50, 100);
  const before = req.query.before as string | undefined;

  const participant = await prisma.chatParticipant.findUnique({
    where: { chatId_userId: { chatId, userId: req.userId! } },
  });
  if (!participant) { res.status(403).json({ error: 'Forbidden' }); return; }

  const messages = await prisma.message.findMany({
    where: { chatId, ...(before ? { createdAt: { lt: new Date(before) } } : {}) },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: { sender: { select: { id: true, username: true, displayName: true, avatar: true } } },
  });

  res.json({
    messages: messages.reverse().map((m) => ({
      id: m.id,
      chatId: m.chatId,
      text: m.text,
      senderId: m.senderId,
      senderName: m.sender.displayName,
      senderUsername: m.sender.username,
      senderAvatar: m.sender.avatar ?? null,
      timestamp: m.createdAt.toISOString(),
      isOwn: m.senderId === req.userId,
    })),
  });
});

/** POST /chats/:chatId/messages — send a message (REST fallback, primary path is Socket.io) */
router.post('/', async (req: AuthRequest, res) => {
  const { chatId } = req.params;
  const { text } = req.body as { text?: string };
  if (!text?.trim()) { res.status(400).json({ error: 'err_empty_message' }); return; }

  const participant = await prisma.chatParticipant.findUnique({
    where: { chatId_userId: { chatId, userId: req.userId! } },
  });
  if (!participant) { res.status(403).json({ error: 'Forbidden' }); return; }

  const message = await prisma.message.create({
    data: { chatId, senderId: req.userId!, text: text.trim() },
    include: { sender: { select: { id: true, username: true, displayName: true, avatar: true } } },
  });

  await prisma.chat.update({ where: { id: chatId }, data: { updatedAt: new Date() } });

  const payload = {
    id: message.id,
    chatId: message.chatId,
    text: message.text,
    senderId: message.senderId,
    senderName: message.sender.displayName,
    senderUsername: message.sender.username,
    senderAvatar: message.sender.avatar ?? null,
    timestamp: message.createdAt.toISOString(),
    isOwn: true,
  };

  res.status(201).json({ message: payload });
});

export default router;

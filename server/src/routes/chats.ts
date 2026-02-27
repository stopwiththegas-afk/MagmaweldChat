import { Router } from 'express';

import { prisma } from '../lib/prisma.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

/** GET /chats — list all chats for the current user */
router.get('/', async (req: AuthRequest, res) => {
  const participations = await prisma.chatParticipant.findMany({
    where: { userId: req.userId },
    include: {
      chat: {
        include: {
          participants: { include: { user: { select: { id: true, username: true, displayName: true, avatar: true } } } },
          messages: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
      },
    },
  });

  const chats = participations.map(({ chat }) => {
    const other = chat.participants.find((p) => p.userId !== req.userId);
    const lastMsg = chat.messages[0];
    return {
      id: chat.id,
      name: other?.user.displayName ?? 'Чат',
      username: other?.user.username ?? '',
      avatar: other?.user.avatar ?? null,
      lastMessage: lastMsg?.text ?? '',
      timestamp: lastMsg?.createdAt.toISOString() ?? chat.createdAt.toISOString(),
      unreadCount: 0,
    };
  });

  res.json({ chats });
});

/** POST /chats — open or create a direct chat with another user by username */
router.post('/', async (req: AuthRequest, res) => {
  const { username } = req.body as { username?: string };
  if (!username) { res.status(400).json({ error: 'err_missing_fields' }); return; }

  const cleanUsername = username.startsWith('@') ? username.slice(1) : username;
  const target = await prisma.user.findUnique({ where: { username: cleanUsername } });
  if (!target) { res.status(404).json({ error: 'err_user_not_found' }); return; }
  if (target.id === req.userId) { res.status(400).json({ error: 'err_self_chat' }); return; }

  const existing = await prisma.chat.findFirst({
    where: {
      participants: { every: { userId: { in: [req.userId!, target.id] } } },
      AND: [
        { participants: { some: { userId: req.userId } } },
        { participants: { some: { userId: target.id } } },
      ],
    },
    include: { participants: true },
  });

  if (existing && existing.participants.length === 2) {
    res.json({ chatId: existing.id });
    return;
  }

  const chat = await prisma.chat.create({
    data: {
      participants: {
        create: [{ userId: req.userId! }, { userId: target.id }],
      },
    },
  });

  res.status(201).json({ chatId: chat.id });
});

export default router;

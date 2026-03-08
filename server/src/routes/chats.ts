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
      otherUserId: other?.user.id ?? null,
      avatar: other?.user.avatar ?? null,
      lastMessage: lastMsg?.text ?? '',
      timestamp: lastMsg?.createdAt.toISOString() ?? chat.createdAt.toISOString(),
      unreadCount: 0,
    };
  });

  res.json({ chats });
});

/** GET /chats/:chatId — chat info (blocked status in both directions) */
router.get('/:chatId', async (req: AuthRequest, res) => {
  const chatId = req.params.chatId as string;
  const participant = await prisma.chatParticipant.findUnique({
    where: { chatId_userId: { chatId, userId: req.userId! } },
    include: { chat: { include: { participants: true } } },
  });
  if (!participant) { res.status(403).json({ error: 'Forbidden' }); return; }
  const other = participant.chat.participants.find((p) => p.userId !== req.userId);
  const blockedByOther = other
    ? !!(await prisma.blockedUser.findUnique({
        where: { blockerId_blockedId: { blockerId: other.userId, blockedId: req.userId! } },
      }))
    : false;
  const haveBlockedOther = other
    ? !!(await prisma.blockedUser.findUnique({
        where: { blockerId_blockedId: { blockerId: req.userId!, blockedId: other.userId } },
      }))
    : false;
  res.json({ chatId, blockedByOther, haveBlockedOther });
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

/** DELETE /chats/:chatId — delete chat (only if participant) */
router.delete('/:chatId', async (req: AuthRequest, res) => {
  const chatId = req.params.chatId as string;
  const participant = await prisma.chatParticipant.findUnique({
    where: { chatId_userId: { chatId, userId: req.userId! } },
  });
  if (!participant) { res.status(403).json({ error: 'Forbidden' }); return; }

  await prisma.chat.delete({ where: { id: chatId } });
  res.status(204).send();
});

/** POST /chats/:chatId/block — block the other participant (neither can send in this chat until unblock) */
router.post('/:chatId/block', async (req: AuthRequest, res) => {
  const chatId = req.params.chatId as string;
  const participant = await prisma.chatParticipant.findUnique({
    where: { chatId_userId: { chatId, userId: req.userId! } },
    include: { chat: { include: { participants: true } } },
  });
  if (!participant) { res.status(403).json({ error: 'Forbidden' }); return; }

  const other = participant.chat.participants.find((p) => p.userId !== req.userId);
  if (!other) { res.status(400).json({ error: 'err_no_other_participant' }); return; }

  await prisma.blockedUser.upsert({
    where: { blockerId_blockedId: { blockerId: req.userId!, blockedId: other.userId } },
    create: { blockerId: req.userId!, blockedId: other.userId },
    update: {},
  });
  res.status(204).send();
});

/** DELETE /chats/:chatId/block — unblock the other participant */
router.delete('/:chatId/block', async (req: AuthRequest, res) => {
  const chatId = req.params.chatId as string;
  const participant = await prisma.chatParticipant.findUnique({
    where: { chatId_userId: { chatId, userId: req.userId! } },
    include: { chat: { include: { participants: true } } },
  });
  if (!participant) { res.status(403).json({ error: 'Forbidden' }); return; }

  const other = participant.chat.participants.find((p) => p.userId !== req.userId);
  if (!other) { res.status(400).json({ error: 'err_no_other_participant' }); return; }

  await prisma.blockedUser.deleteMany({
    where: { blockerId: req.userId!, blockedId: other.userId },
  });
  res.status(204).send();
});

export default router;

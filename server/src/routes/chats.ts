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
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            include: { sender: { select: { displayName: true } } },
          },
        },
      },
    },
  });

  const chats = participations.map(({ chat }) => {
    const isGroup = chat.name != null;
    const other = chat.participants.find((p) => p.userId !== req.userId);
    const lastMsg = chat.messages[0];
    const lastMessageText = lastMsg?.text ?? '';
    return {
      id: chat.id,
      isGroup: !!isGroup,
      name: isGroup ? (chat.name ?? 'Группа') : (other?.user.displayName ?? 'Чат'),
      username: isGroup ? '' : (other?.user.username ?? ''),
      otherUserId: isGroup ? null : (other?.user.id ?? null),
      avatar: isGroup ? (chat.avatar ?? null) : (other?.user.avatar ?? null),
      lastMessage: lastMessageText,
      ...(isGroup && lastMsg && (lastMsg as { sender?: { displayName: string } }).sender && {
        lastMessageSenderName: (lastMsg as { sender: { displayName: string } }).sender.displayName,
      }),
      timestamp: lastMsg?.createdAt.toISOString() ?? chat.createdAt.toISOString(),
      unreadCount: 0,
      ...(isGroup && { participantCount: chat.participants.length }),
    };
  });

  res.json({ chats });
});

/** GET /chats/:chatId — chat info (blocked status for 1-1; for groups: isGroup, name, avatar, adminId) */
router.get('/:chatId', async (req: AuthRequest, res) => {
  const chatId = req.params.chatId as string;
  const participant = await prisma.chatParticipant.findUnique({
    where: { chatId_userId: { chatId, userId: req.userId! } },
    include: { chat: { include: { participants: { include: { user: { select: { id: true, username: true, displayName: true, avatar: true } } } }, admin: { select: { id: true, username: true, displayName: true, avatar: true } } } } },
  });
  if (!participant) { res.status(403).json({ error: 'Forbidden' }); return; }
  const chat = participant.chat;
  const isGroup = chat.name != null;
  const other = chat.participants.find((p) => p.userId !== req.userId);
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
  const payload: Record<string, unknown> = { chatId, blockedByOther, haveBlockedOther };
  if (isGroup) {
    payload.isGroup = true;
    payload.name = chat.name;
    payload.avatar = chat.avatar;
    payload.adminId = chat.adminId ?? null;
    payload.createdAt = chat.createdAt.toISOString();
    payload.participants = chat.participants.map((p) => ({
      id: p.user.id,
      username: p.user.username,
      displayName: p.user.displayName,
      avatar: p.user.avatar,
    }));
    payload.admin = chat.admin ? { id: chat.admin.id, username: chat.admin.username, displayName: chat.admin.displayName, avatar: chat.admin.avatar } : null;
  }
  res.json(payload);
});

/** POST /chats — open/create 1-1 chat by username, OR create group (name + participantIds) */
router.post('/', async (req: AuthRequest, res) => {
  const body = req.body as { username?: string; name?: string; avatar?: string; participantIds?: string[] };

  if (body.name != null && Array.isArray(body.participantIds)) {
    const name = String(body.name).trim() || 'Группа';
    const participantIds = [...new Set(body.participantIds)] as string[];
    if (!participantIds.every((id) => typeof id === 'string' && id.length > 0)) {
      res.status(400).json({ error: 'err_invalid_participants' });
      return;
    }
    if (participantIds.includes(req.userId!)) { res.status(400).json({ error: 'err_self_in_participants' }); return; }
    const totalMembers = 1 + participantIds.length;
    if (totalMembers < 3) { res.status(400).json({ error: 'err_group_min_3' }); return; }

    const users = await prisma.user.findMany({ where: { id: { in: participantIds } }, select: { id: true } });
    const foundIds = new Set(users.map((u) => u.id));
    const missing = participantIds.filter((id) => !foundIds.has(id));
    if (missing.length > 0) { res.status(404).json({ error: 'err_user_not_found' }); return; }

    const chat = await prisma.chat.create({
      data: {
        name,
        avatar: body.avatar && String(body.avatar).trim() ? String(body.avatar).trim() : undefined,
        adminId: req.userId!,
        participants: {
          create: [
            { userId: req.userId! },
            ...participantIds.map((userId) => ({ userId })),
          ],
        },
      },
    });
    res.status(201).json({ chatId: chat.id });
    return;
  }

  const { username } = body;
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

/** PATCH /chats/:chatId — update group name and/or avatar (admin only) */
router.patch('/:chatId', async (req: AuthRequest, res) => {
  const chatId = req.params.chatId as string;
  const body = req.body as { name?: string; avatar?: string | null };
  const participant = await prisma.chatParticipant.findUnique({
    where: { chatId_userId: { chatId, userId: req.userId! } },
    include: { chat: true },
  });
  if (!participant) { res.status(403).json({ error: 'Forbidden' }); return; }
  if (participant.chat.name == null) { res.status(400).json({ error: 'err_not_a_group' }); return; }
  if (participant.chat.adminId !== req.userId) { res.status(403).json({ error: 'err_only_admin_can_edit_group' }); return; }

  const data: { name?: string; avatar?: string | null } = {};
  if (body.name !== undefined) {
    const name = String(body.name).trim() || 'Группа';
    data.name = name;
  }
  if (body.avatar !== undefined) {
    if (body.avatar === null || body.avatar === '') {
      data.avatar = null;
    } else {
      const avatar = String(body.avatar).trim();
      if (avatar.length > 2048) { res.status(400).json({ error: 'err_invalid_avatar' }); return; }
      try { new URL(avatar); } catch { res.status(400).json({ error: 'err_invalid_avatar' }); return; }
      data.avatar = avatar;
    }
  }
  if (Object.keys(data).length === 0) { res.status(400).json({ error: 'err_missing_fields' }); return; }

  await prisma.chat.update({ where: { id: chatId }, data });
  res.json({ ok: true });
});

/** POST /chats/:chatId/leave — leave a group (only for group chats) */
router.post('/:chatId/leave', async (req: AuthRequest, res) => {
  const chatId = req.params.chatId as string;
  const participant = await prisma.chatParticipant.findUnique({
    where: { chatId_userId: { chatId, userId: req.userId! } },
    include: { chat: true },
  });
  if (!participant) { res.status(403).json({ error: 'Forbidden' }); return; }
  if (participant.chat.name == null) { res.status(400).json({ error: 'err_not_a_group' }); return; }
  await prisma.chatParticipant.delete({
    where: { chatId_userId: { chatId, userId: req.userId! } },
  });
  const remaining = await prisma.chatParticipant.count({ where: { chatId } });
  if (remaining === 0) {
    await prisma.chat.delete({ where: { id: chatId } });
  } else if (remaining <= 2) {
    await prisma.chat.update({
      where: { id: chatId },
      data: { name: null, avatar: null, adminId: null },
    });
  }
  res.status(204).send();
});

/** POST /chats/:chatId/participants — add participants to group (admin only) */
router.post('/:chatId/participants', async (req: AuthRequest, res) => {
  const chatId = req.params.chatId as string;
  const body = req.body as { participantIds?: string[] };
  const participantIds = Array.isArray(body.participantIds) ? [...new Set(body.participantIds)] as string[] : [];
  if (!participantIds.every((id) => typeof id === 'string' && id.length > 0)) {
    res.status(400).json({ error: 'err_invalid_participants' });
    return;
  }
  const participant = await prisma.chatParticipant.findUnique({
    where: { chatId_userId: { chatId, userId: req.userId! } },
    include: { chat: true },
  });
  if (!participant) { res.status(403).json({ error: 'Forbidden' }); return; }
  if (participant.chat.name == null) { res.status(400).json({ error: 'err_not_a_group' }); return; }
  if (participant.chat.adminId !== req.userId) { res.status(403).json({ error: 'err_only_admin_can_add' }); return; }
  if (participantIds.includes(req.userId!)) { res.status(400).json({ error: 'err_self_in_participants' }); return; }

  const existing = await prisma.chatParticipant.findMany({
    where: { chatId, userId: { in: participantIds } },
    select: { userId: true },
  });
  const existingIds = new Set(existing.map((p) => p.userId));
  const toAdd = participantIds.filter((id) => !existingIds.has(id));
  if (toAdd.length === 0) { res.status(204).send(); return; }

  const users = await prisma.user.findMany({ where: { id: { in: toAdd } }, select: { id: true } });
  const foundIds = new Set(users.map((u) => u.id));
  const missing = toAdd.filter((id) => !foundIds.has(id));
  if (missing.length > 0) { res.status(404).json({ error: 'err_user_not_found' }); return; }

  await prisma.chatParticipant.createMany({
    data: toAdd.map((userId) => ({ chatId, userId })),
    skipDuplicates: true,
  });
  res.status(204).send();
});

/** DELETE /chats/:chatId/participants/:userId — remove participant from group (admin only, cannot remove self) */
router.delete('/:chatId/participants/:userId', async (req: AuthRequest, res) => {
  const chatId = req.params.chatId as string;
  const targetUserId = req.params.userId as string;
  if (targetUserId === req.userId) { res.status(400).json({ error: 'err_use_leave_to_leave' }); return; }
  const participant = await prisma.chatParticipant.findUnique({
    where: { chatId_userId: { chatId, userId: req.userId! } },
    include: { chat: true },
  });
  if (!participant) { res.status(403).json({ error: 'Forbidden' }); return; }
  if (participant.chat.name == null) { res.status(400).json({ error: 'err_not_a_group' }); return; }
  if (participant.chat.adminId !== req.userId) { res.status(403).json({ error: 'err_only_admin_can_remove' }); return; }

  await prisma.chatParticipant.deleteMany({
    where: { chatId, userId: targetUserId },
  });
  const remaining = await prisma.chatParticipant.count({ where: { chatId } });
  if (remaining === 0) {
    await prisma.chat.delete({ where: { id: chatId } });
  } else if (remaining <= 2) {
    await prisma.chat.update({
      where: { id: chatId },
      data: { name: null, avatar: null, adminId: null },
    });
  }
  res.status(204).send();
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

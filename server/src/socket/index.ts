import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import { Server, Socket } from 'socket.io';

import { prisma } from '../lib/prisma.js';

const MESSAGE_TEXT_MAX = 2000;

interface SocketData {
  userId: string;
}

export function setupSocket(httpServer: HttpServer): void {
  const io = new Server(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
  });

  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth.token as string | undefined;
    if (!token) { next(new Error('Unauthorized')); return; }
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET as string) as { userId: string };
      (socket.data as SocketData).userId = payload.userId;
      next();
    } catch {
      next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const { userId } = socket.data as SocketData;

    /** Client subscribes to a chat room */
    socket.on('join_chat', (chatId: string) => {
      socket.join(`chat:${chatId}`);
    });

    socket.on('leave_chat', (chatId: string) => {
      socket.leave(`chat:${chatId}`);
    });

    /** Client sends a message */
    socket.on('send_message', async (data: { chatId: string; text: string }, ack) => {
      try {
        const { chatId, text } = data;
        if (!text?.trim()) { ack?.({ error: 'err_empty_message' }); return; }
        const trimmedText = text.trim();
        if (trimmedText.length > MESSAGE_TEXT_MAX) {
          ack?.({ error: 'err_message_too_long' });
          return;
        }

        const participant = await prisma.chatParticipant.findUnique({
          where: { chatId_userId: { chatId, userId } },
          include: { chat: { select: { name: true, _count: { select: { participants: true } } } } },
        });
        if (!participant) { ack?.({ error: 'Forbidden' }); return; }

        const participantCount = participant.chat._count.participants;
        const isGroup = participant.chat.name != null || participantCount >= 3;
        if (!isGroup) {
          const otherParticipants = await prisma.chatParticipant.findMany({
            where: { chatId, userId: { not: userId } },
            select: { userId: true },
          });
          const blocked = await prisma.blockedUser.findFirst({
            where: {
              blockedId: userId,
              blockerId: { in: otherParticipants.map((p) => p.userId) },
            },
          });
          if (blocked) { ack?.({ error: 'err_blocked' }); return; }

          const iBlockedOther = await prisma.blockedUser.findFirst({
            where: {
              blockerId: userId,
              blockedId: { in: otherParticipants.map((p) => p.userId) },
            },
          });
          if (iBlockedOther) { ack?.({ error: 'err_blocked' }); return; }
        }

        const message = await prisma.message.create({
          data: { chatId, senderId: userId, text: trimmedText },
          include: { sender: { select: { id: true, username: true, displayName: true, avatar: true } } },
        });

        await prisma.chat.update({ where: { id: chatId }, data: { updatedAt: new Date() } });

        const payload = {
          id: message.id,
          chatId: message.chatId,
          text: message.text,
          senderId: message.senderId,
          senderName: message.sender?.displayName ?? null,
          senderUsername: message.sender?.username ?? null,
          senderAvatar: message.sender?.avatar ?? null,
          timestamp: message.createdAt.toISOString(),
        };

        io.to(`chat:${chatId}`).emit('new_message', payload);
        ack?.({ ok: true, message: payload });
      } catch (err) {
        ack?.({ error: 'Internal error' });
      }
    });
  });
}

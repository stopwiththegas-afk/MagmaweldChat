import { Router } from 'express';
import jwt from 'jsonwebtoken';

import { prisma } from '../lib/prisma.js';
import { AuthRequest, requireAuth } from '../middleware/auth.js';

const router = Router();

const MOCK_CODE = '1234';
const CODE_TTL_MS = 10 * 60 * 1000; // 10 minutes

function signToken(userId: string): string {
  return jwt.sign({ userId }, process.env.JWT_SECRET as string, {
    expiresIn: (process.env.JWT_EXPIRES_IN ?? '30d') as jwt.SignOptions['expiresIn'],
  });
}

/** POST /auth/send-code — request an SMS verification code */
router.post('/send-code', async (req, res) => {
  const { phone } = req.body as { phone?: string };
  if (!phone || !/^\+7\d{10}$/.test(phone)) {
    res.status(400).json({ error: 'err_invalid_phone' });
    return;
  }

  await prisma.phoneVerification.create({
    data: {
      phone,
      code: MOCK_CODE,
      expiresAt: new Date(Date.now() + CODE_TTL_MS),
    },
  });

  // TODO: integrate real SMS provider here (e.g. Firebase, SMSC.ru)
  res.json({ ok: true });
});

/** POST /auth/verify-code — verify the code and return session status */
router.post('/verify-code', async (req, res) => {
  const { phone, code } = req.body as { phone?: string; code?: string };
  if (!phone || !code) {
    res.status(400).json({ error: 'err_missing_fields' });
    return;
  }

  const verification = await prisma.phoneVerification.findFirst({
    where: { phone, code, used: false, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
  });

  if (!verification) {
    res.status(400).json({ error: 'err_wrong_code' });
    return;
  }

  await prisma.phoneVerification.update({ where: { id: verification.id }, data: { used: true } });

  const existing = await prisma.user.findUnique({ where: { phone } });
  if (existing) {
    const token = signToken(existing.id);
    res.json({ status: 'existing', token, user: serializeUser(existing) });
    return;
  }

  res.json({ status: 'new', phone });
});

/** POST /auth/register — create account after code verification */
router.post('/register', async (req, res) => {
  const { phone, username, displayName } = req.body as {
    phone?: string;
    username?: string;
    displayName?: string;
  };

  if (!phone || !username || !displayName) {
    res.status(400).json({ error: 'err_missing_fields' });
    return;
  }

  const cleanUsername = username.startsWith('@') ? username.slice(1) : username;

  const taken = await prisma.user.findUnique({ where: { username: cleanUsername } });
  if (taken) {
    res.status(409).json({ error: 'err_username_taken' });
    return;
  }

  const phoneExists = await prisma.user.findUnique({ where: { phone } });
  if (phoneExists) {
    res.status(409).json({ error: 'err_phone_taken' });
    return;
  }

  const ip = (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim()
    ?? req.socket.remoteAddress
    ?? '';

  const user = await prisma.user.create({
    data: { phone, username: cleanUsername, displayName: displayName.trim(), ip },
  });

  const token = signToken(user.id);
  res.status(201).json({ token, user: serializeUser(user) });
});

/** GET /auth/me — return current user */
router.get('/me', requireAuth, async (req: AuthRequest, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!user) { res.status(404).json({ error: 'Not found' }); return; }
  res.json({ user: serializeUser(user) });
});

/** PATCH /auth/me — update profile */
router.patch('/me', requireAuth, async (req: AuthRequest, res) => {
  const { displayName, avatar } = req.body as { displayName?: string; avatar?: string };
  const data: Record<string, string> = {};
  if (displayName) data.displayName = displayName.trim();
  if (avatar !== undefined) data.avatar = avatar;

  const user = await prisma.user.update({ where: { id: req.userId }, data });
  res.json({ user: serializeUser(user) });
});

function serializeUser(u: {
  id: string; phone: string; username: string; displayName: string;
  role: string; ip: string; avatar: string | null; createdAt: Date;
}) {
  return {
    id: u.id,
    phone: u.phone,
    username: u.username,
    displayName: u.displayName,
    role: u.role.toLowerCase() as 'user' | 'admin',
    ip: u.ip,
    avatar: u.avatar ?? undefined,
    createdAt: u.createdAt.toISOString(),
  };
}

export default router;

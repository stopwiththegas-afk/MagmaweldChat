import { Request, Response, Router } from 'express';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';

import { sendAdminNotification } from '../bot.js';
import { getDailyCode } from '../lib/dailyCode.js';
import { prisma } from '../lib/prisma.js';
import { AuthRequest, requireAuth } from '../middleware/auth.js';

const router = Router();
const CODE_TTL_MS = 10 * 60 * 1000; // 10 minutes

const USERNAME_MIN = 3;
const USERNAME_MAX = 30;
const USERNAME_REGEX = /^[a-zA-Z0-9_]+$/;
const DISPLAYNAME_MIN = 1;
const DISPLAYNAME_MAX = 50;
const CODE_REGEX = /^\d{4}$/;
const AVATAR_MAX_LEN = 2048;
const PHONE_REGEX = /^\+7\d{10}$/;

const sendCodeLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 3,
  handler: (_req: Request, res: Response) => res.status(429).json({ error: 'err_rate_limit' }),
  standardHeaders: true,
  legacyHeaders: false,
});

function signToken(userId: string): string {
  return jwt.sign({ userId }, process.env.JWT_SECRET as string, {
    expiresIn: (process.env.JWT_EXPIRES_IN ?? '30d') as jwt.SignOptions['expiresIn'],
  });
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** POST /auth/send-code — request an SMS verification code */
router.post('/send-code', sendCodeLimiter, async (req, res) => {
  const { phone } = req.body as { phone?: string };
  if (!phone || !PHONE_REGEX.test(phone)) {
    res.status(400).json({ error: 'err_invalid_phone' });
    return;
  }

  const code = await getDailyCode();
  await prisma.phoneVerification.create({
    data: {
      phone,
      code,
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
  if (!PHONE_REGEX.test(phone)) {
    res.status(400).json({ error: 'err_invalid_phone' });
    return;
  }
  if (!CODE_REGEX.test(code)) {
    res.status(400).json({ error: 'err_wrong_code' });
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
  if (!PHONE_REGEX.test(phone)) {
    res.status(400).json({ error: 'err_invalid_phone' });
    return;
  }

  const cleanUsername = username.startsWith('@') ? username.slice(1) : username;
  if (cleanUsername.length < USERNAME_MIN || cleanUsername.length > USERNAME_MAX) {
    res.status(400).json({ error: 'err_invalid_username' });
    return;
  }
  if (!USERNAME_REGEX.test(cleanUsername)) {
    res.status(400).json({ error: 'err_invalid_username' });
    return;
  }

  const trimmedDisplayName = displayName.trim();
  if (trimmedDisplayName.length < DISPLAYNAME_MIN || trimmedDisplayName.length > DISPLAYNAME_MAX) {
    res.status(400).json({ error: 'err_invalid_displayname' });
    return;
  }

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
    data: { phone, username: cleanUsername, displayName: trimmedDisplayName, ip },
  });

  sendAdminNotification(
    `🆕 <b>Новая регистрация</b>\n` +
    `Пользователь: <b>${escapeHtml(trimmedDisplayName)}</b>\n` +
    `@${escapeHtml(cleanUsername)}\n` +
    `Телефон: ${escapeHtml(phone)}\n` +
    `IP: ${escapeHtml(ip || '—')}`,
  ).catch(() => {});

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
  if (displayName !== undefined) {
    const trimmed = displayName.trim();
    if (trimmed.length < DISPLAYNAME_MIN || trimmed.length > DISPLAYNAME_MAX) {
      res.status(400).json({ error: 'err_invalid_displayname' });
      return;
    }
    data.displayName = trimmed;
  }
  if (avatar !== undefined) {
    if (typeof avatar !== 'string' || avatar.length > AVATAR_MAX_LEN) {
      res.status(400).json({ error: 'err_invalid_avatar' });
      return;
    }
    try {
      new URL(avatar);
    } catch {
      res.status(400).json({ error: 'err_invalid_avatar' });
      return;
    }
    data.avatar = avatar;
  }

  if (Object.keys(data).length === 0) {
    res.status(400).json({ error: 'err_missing_fields' });
    return;
  }

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

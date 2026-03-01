import { Router } from 'express';

import { prisma } from '../lib/prisma.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

/** Нормализация фрагмента номера для поиска: 893 → +793, 7931 → +7931 */
function normalizePhoneQuery(q: string): string {
  const digits = q.replace(/\D/g, '');
  if (digits.startsWith('8') && digits.length >= 2) return '+7' + digits.slice(1);
  if (digits.startsWith('7') && digits.length >= 2) return '+' + digits;
  return q;
}

/** GET /users/search?q=... — find users by phone, displayName or username */
router.get('/search', async (req: AuthRequest, res) => {
  const raw = (req.query.q as string) ?? '';
  const q = raw.replace(/^@/, '').trim();
  const isPhoneLike = /^[\d+\s\-()]+$/.test(q);
  const minLen = isPhoneLike ? 1 : 2;
  if (q.length < minLen) { res.status(400).json({ error: 'err_query_too_short' }); return; }

  const phoneSearch = isPhoneLike ? normalizePhoneQuery(q) : q;

  const users = await prisma.user.findMany({
    where: {
      NOT: { id: req.userId },
      OR: [
        { username: { contains: q, mode: 'insensitive' } },
        { displayName: { contains: q, mode: 'insensitive' } },
        { phone: { contains: phoneSearch } },
      ],
    },
    take: 20,
    select: { id: true, username: true, displayName: true, avatar: true },
  });

  res.json({ users });
});

/** GET /users/:id — get public profile of a user (for profile page) */
router.get('/:id', async (req: AuthRequest, res) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  if (!id || id === 'search') return res.status(404).json({ error: 'not_found' });

  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, username: true, displayName: true, avatar: true, phone: true, createdAt: true },
  });

  if (!user) return res.status(404).json({ error: 'err_user_not_found' });

  res.json({
    user: {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      avatar: user.avatar,
      phone: user.phone,
      createdAt: user.createdAt.toISOString(),
    },
  });
});

export default router;

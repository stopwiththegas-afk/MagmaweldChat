import { Router } from 'express';

import { prisma } from '../lib/prisma.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

/** GET /users/search?q=... — find users by phone, displayName or username */
router.get('/search', async (req: AuthRequest, res) => {
  const q = ((req.query.q as string) ?? '').replace(/^@/, '').trim();
  if (q.length < 2) { res.status(400).json({ error: 'err_query_too_short' }); return; }

  const users = await prisma.user.findMany({
    where: {
      NOT: { id: req.userId },
      OR: [
        { username: { contains: q, mode: 'insensitive' } },
        { displayName: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q } },
      ],
    },
    take: 20,
    select: { id: true, username: true, displayName: true, avatar: true },
  });

  res.json({ users });
});

/** GET /users/:id — get public profile of a user (for profile page) */
router.get('/:id', async (req: AuthRequest, res) => {
  const { id } = req.params;
  if (id === 'search') return res.status(404).json({ error: 'not_found' });

  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, username: true, displayName: true, avatar: true, createdAt: true },
  });

  if (!user) return res.status(404).json({ error: 'err_user_not_found' });

  res.json({
    user: {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      avatar: user.avatar,
      createdAt: user.createdAt.toISOString(),
    },
  });
});

export default router;

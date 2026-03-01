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

export default router;

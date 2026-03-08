require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
const phone = '+79319711678'; // 89319711678 → +7 931 971 16 78
p.user.updateMany({ where: { phone }, data: { role: 'ADMIN' } })
  .then((r) => { console.log('Updated', r.count, 'user(s) to ADMIN'); })
  .finally(() => p.$disconnect());

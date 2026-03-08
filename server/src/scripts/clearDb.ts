/**
 * Очистка всей базы данных (все пользователи, чаты, сообщения, верификации, коды).
 * Запуск: npm run db:clear
 * Для подтверждения: CONFIRM_CLEAR_DB=1 npm run db:clear
 */
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });

import { prisma } from '../lib/prisma.js';

async function main() {
  if (process.env.CONFIRM_CLEAR_DB !== '1') {
    console.error('Для очистки БД выполните: CONFIRM_CLEAR_DB=1 npm run db:clear');
    process.exit(1);
  }

  console.log('Удаление сообщений...');
  const m = await prisma.message.deleteMany({});
  console.log('  удалено сообщений:', m.count);

  console.log('Удаление участников чатов...');
  const cp = await prisma.chatParticipant.deleteMany({});
  console.log('  удалено записей:', cp.count);

  console.log('Удаление чатов...');
  const c = await prisma.chat.deleteMany({});
  console.log('  удалено чатов:', c.count);

  console.log('Удаление верификаций телефонов...');
  const pv = await prisma.phoneVerification.deleteMany({});
  console.log('  удалено записей:', pv.count);

  console.log('Удаление пользователей...');
  const u = await prisma.user.deleteMany({});
  console.log('  удалено пользователей:', u.count);

  console.log('Удаление ежедневных кодов...');
  const dc = await prisma.dailyCode.deleteMany({});
  console.log('  удалено записей:', dc.count);

  console.log('Готово. База данных очищена.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

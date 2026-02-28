const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const users = await p.user.findMany({ select: { id: true, phone: true, displayName: true, username: true, role: true, createdAt: false } });
  const chats = await p.chat.findMany();
  const messages = await p.message.findMany({ take: 20, orderBy: { createdAt: 'desc' } });

  console.log('\n=== USERS (' + users.length + ') ===');
  users.forEach(u => console.log(JSON.stringify(u)));

  console.log('\n=== CHATS (' + chats.length + ') ===');
  chats.forEach(c => console.log(JSON.stringify(c)));

  console.log('\n=== MESSAGES (last 20) (' + messages.length + ') ===');
  messages.forEach(m => console.log(JSON.stringify(m)));
}

main().finally(() => p.$disconnect());

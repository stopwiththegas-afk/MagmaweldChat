import { prisma } from './prisma.js';

export async function getDailyCode(): Promise<string> {
  const today = new Date().toISOString().slice(0, 10); // "2025-03-08"

  const existing = await prisma.dailyCode.findUnique({
    where: { date: today },
  });

  if (existing) return existing.code;

  const code = String(1000 + Math.floor(Math.random() * 9000)); // 1000-9999
  await prisma.dailyCode.create({
    data: { date: today, code },
  });
  return code;
}

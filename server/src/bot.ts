import { writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

import { Telegraf } from 'telegraf';

import { buildDocxBuffer, buildPdfBuffer, type DbExportData } from './lib/dbExport.js';
import { getDailyCode } from './lib/dailyCode.js';
import { prisma } from './lib/prisma.js';

let botInstance: Telegraf | null = null;

/** Send a message to the admin (e.g. on new registration). No-op if bot or TELEGRAM_ADMIN_CHAT_ID not set. */
export async function sendAdminNotification(message: string): Promise<void> {
  const chatId = process.env.TELEGRAM_ADMIN_CHAT_ID;
  if (!chatId) {
    console.warn('sendAdminNotification: TELEGRAM_ADMIN_CHAT_ID not set, skip');
    return;
  }
  if (!botInstance) {
    console.warn('sendAdminNotification: bot not ready, skip');
    return;
  }
  try {
    await botInstance.telegram.sendMessage(chatId, message, { parse_mode: 'HTML' });
    console.log('Admin notification sent to chat', chatId);
  } catch (err) {
    console.error('Telegram sendAdminNotification error:', err);
  }
}

export function startTelegramBot(): void {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.warn('TELEGRAM_BOT_TOKEN not set, Telegram bot disabled');
    return;
  }

  console.log('Telegram bot starting...');
  const bot = new Telegraf(token);
  botInstance = bot;

  const adminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID;
  if (adminChatId) {
    console.log('Admin registration notifications: enabled (TELEGRAM_ADMIN_CHAT_ID set)');
  } else {
    console.warn('Admin registration notifications: disabled (TELEGRAM_ADMIN_CHAT_ID not set in .env)');
  }

  const handleCodeRequest = async (ctx: { reply: (text: string) => Promise<unknown> }) => {
    try {
      const code = await getDailyCode();
      await ctx.reply(`${code}`);
    } catch (err) {
      console.error('Bot getDailyCode error:', err);
      await ctx.reply('Ошибка при получении кода. Попробуйте позже.');
    }
  };

  bot.command('code', handleCodeRequest);

  const adminUsername = process.env.TELEGRAM_ADMIN_USERNAME ?? 'calmjesper';
  bot.command('admin', (ctx) => ctx.reply(`https://t.me/${adminUsername}`));

  const healthUrl =
    process.env.SERVER_HEALTH_URL ?? `http://localhost:${process.env.PORT ?? 3000}/health`;
  bot.command('status', async (ctx) => {
    try {
      const res = await fetch(healthUrl);
      const ok = res.ok;
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean };
      if (ok || data.ok) {
        await ctx.reply('✅ Сервер работает');
      } else {
        await ctx.reply(`⚠️ Сервер отвечает с ошибкой: ${res.status}`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Неизвестная ошибка';
      await ctx.reply(`❌ Сервер недоступен: ${msg}`);
    }
  });

  // /db [json|pdf|doc] — выгрузка БД (только для админа)
  bot.command('db', async (ctx) => {
    const adminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID;
    if (!adminChatId || String(ctx.chat?.id) !== adminChatId) {
      await ctx.reply('⛔ Команда только для администратора.');
      return;
    }
    const arg = ctx.message.text.split(/\s+/)[1]?.toLowerCase() ?? 'json';
    const format = arg === 'pdf' || arg === 'doc' ? arg : 'json';
    try {
      await ctx.reply(`Формирую выгрузку (${format})...`);
      const [users, dailyCodes, phoneVerifications, chats, participants, messages] = await Promise.all([
        prisma.user.findMany({ orderBy: { createdAt: 'asc' } }),
        prisma.dailyCode.findMany({ orderBy: { date: 'desc' } }),
        prisma.phoneVerification.findMany({ orderBy: { createdAt: 'desc' }, take: 500 }),
        prisma.chat.findMany({ orderBy: { createdAt: 'asc' } }),
        prisma.chatParticipant.findMany(),
        prisma.message.findMany({ orderBy: { createdAt: 'asc' } }),
      ]);
      const exportData: DbExportData = {
        exportedAt: new Date().toISOString(),
        users,
        dailyCodes,
        phoneVerifications,
        chats,
        participants,
        messages,
      };
      const dateStr = new Date().toISOString().slice(0, 10);
      const baseName = `magmaweld-db-${dateStr}`;
      let filename: string;
      let filepath: string;
      if (format === 'pdf') {
        const buf = await buildPdfBuffer(exportData);
        filename = `${baseName}.pdf`;
        filepath = join(tmpdir(), filename);
        writeFileSync(filepath, buf);
        await ctx.replyWithDocument({ source: filepath, filename });
      } else if (format === 'doc') {
        const buf = await buildDocxBuffer(exportData);
        filename = `${baseName}.docx`;
        filepath = join(tmpdir(), filename);
        writeFileSync(filepath, buf);
        await ctx.replyWithDocument({ source: filepath, filename });
      } else {
        filename = `${baseName}.json`;
        filepath = join(tmpdir(), filename);
        writeFileSync(filepath, JSON.stringify(exportData, null, 2), 'utf8');
        await ctx.replyWithDocument({ source: filepath, filename });
      }
      unlinkSync(filepath);
    } catch (err) {
      console.error('Bot /db error:', err);
      await ctx.reply('Ошибка при выгрузке: ' + (err instanceof Error ? err.message : 'неизвестно'));
    }
  });

  // dropPendingUpdates so no old webhook blocks polling
  bot.launch({ dropPendingUpdates: true })
    .then(() => bot.telegram.getMe())
    .then((me) => {
      console.log('Telegram bot started as @' + (me.username ?? me.id));
    })
    .catch((err: unknown) => {
      console.error('Telegram bot launch error:', err);
      if (err && typeof (err as { response?: { body?: unknown } }).response !== 'undefined') {
        console.error('Telegram API response:', (err as { response: { body?: unknown } }).response?.body);
      }
    });
}

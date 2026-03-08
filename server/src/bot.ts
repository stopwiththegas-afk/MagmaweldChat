import { Telegraf } from 'telegraf';

import { getDailyCode } from './lib/dailyCode.js';

let botInstance: Telegraf | null = null;

/** Send a message to the admin (e.g. on new registration). No-op if bot or TELEGRAM_ADMIN_CHAT_ID not set. */
export async function sendAdminNotification(message: string): Promise<void> {
  const chatId = process.env.TELEGRAM_ADMIN_CHAT_ID;
  if (!chatId || !botInstance) return;
  try {
    await botInstance.telegram.sendMessage(chatId, message, { parse_mode: 'HTML' });
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

import { Telegraf } from 'telegraf';

import { getDailyCode } from './lib/dailyCode.js';

export function startTelegramBot(): void {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.warn('TELEGRAM_BOT_TOKEN not set, Telegram bot disabled');
    return;
  }

  const bot = new Telegraf(token);

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

  bot.launch().then(() => {
    console.log('Telegram bot started');
  }).catch((err) => {
    console.error('Telegram bot launch error:', err);
  });
}

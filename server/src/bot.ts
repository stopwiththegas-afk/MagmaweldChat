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
      await ctx.reply(`Сегодняшний код: ${code}`);
    } catch (err) {
      console.error('Bot getDailyCode error:', err);
      await ctx.reply('Ошибка при получении кода. Попробуйте позже.');
    }
  };

  bot.command('code', handleCodeRequest);
  bot.command('код', handleCodeRequest);
  bot.hears(/^код$/i, handleCodeRequest);
  bot.hears(/^code$/i, handleCodeRequest);

  bot.launch().then(() => {
    console.log('Telegram bot started');
  }).catch((err) => {
    console.error('Telegram bot launch error:', err);
  });
}

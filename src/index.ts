import { Bot } from 'grammy';
import { config } from './config.js';
import { ownerOnly } from './core/access.js';
import { logger } from './core/logger.js';
import type { Service } from './core/service.js';
import { FlightsService } from './services/flights/index.js';

async function main(): Promise<void> {
  const bot = new Bot(config.botToken);

  // Жёсткая привязка к одной группе: из любой другой группы бот выходит,
  // ничего там не обрабатывая. Срабатывает и при добавлении (my_chat_member),
  // и на первом же сообщении.
  bot.use(async (ctx, next) => {
    const chat = ctx.chat;
    if (chat && (chat.type === 'group' || chat.type === 'supergroup') && chat.id !== config.groupChatId) {
      try {
        await ctx.leaveChat();
        logger.info(`left foreign group ${chat.id}`);
      } catch (err) {
        logger.warn(`failed to leave foreign group ${chat.id}: ${err}`);
      }
      return;
    }
    await next();
  });

  // Временная команда для получения своего id. Работает только в личке и
  // никого не выдаёт — отвечает только тому, кто её вызвал. После того как
  // ADMIN_USER_ID прописан в .env, эту команду можно убрать.
  bot.command('whoami', (ctx) => {
    if (ctx.chat?.type !== 'private') return;
    return ctx.reply(`Твой Telegram ID: <code>${ctx.from?.id}</code>`, { parse_mode: 'HTML' });
  });

  bot.command('start', ownerOnly((ctx) => ctx.reply('Бот запущен. /help — список команд.')));
  bot.command(
    'help',
    ownerOnly((ctx) =>
      ctx.reply(
        [
          'Команды:',
          '/flights — внеплановый поиск авиабилетов',
          '/lastflights — последние совпадения из кэша',
        ].join('\n'),
      ),
    ),
  );

  const services: Service[] = [new FlightsService(bot)];
  for (const service of services) service.register(bot);

  bot.catch((err) => logger.error(`bot error: ${err.error}`));

  await bot.init();
  logger.info(`bot @${bot.botInfo.username} initialized`);

  for (const service of services) await service.start();

  const shutdown = async (signal: string) => {
    logger.info(`received ${signal}, shutting down`);
    for (const service of services) await service.stop();
    await bot.stop();
    process.exit(0);
  };
  process.once('SIGINT', () => void shutdown('SIGINT'));
  process.once('SIGTERM', () => void shutdown('SIGTERM'));

  await bot.start({ drop_pending_updates: true });
}

main().catch((err) => {
  logger.error(`fatal: ${err}`);
  process.exit(1);
});

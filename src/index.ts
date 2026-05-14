import { Bot } from 'grammy';
import { config } from './config.js';
import { logger } from './core/logger.js';
import type { Service } from './core/service.js';
import { FlightsService } from './services/flights/index.js';

async function main(): Promise<void> {
  const bot = new Bot(config.botToken);

  bot.command('start', (ctx) => ctx.reply('Бот запущен. /help — список команд.'));
  bot.command('help', (ctx) =>
    ctx.reply(
      [
        'Команды:',
        '/flights — внеплановый поиск авиабилетов',
        '/lastflights — последние совпадения из кэша',
      ].join('\n'),
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

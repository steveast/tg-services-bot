import type { Bot, Context } from 'grammy';
import { config } from '../../config.js';
import { allowedChatOnly } from '../../core/access.js';
import { logger } from '../../core/logger.js';
import type { Service } from '../../core/service.js';
import { searchFlights } from './aviasales.js';
import { buildLatestBlock, buildMessages, chunkMessages, type ScoredOffer } from './formatter.js';
import { getLatestOffers, recordOffer } from './repository.js';
import { subscriptions } from './subscriptions.js';

const LATEST_PER_SUB = 3;

// Сколько самых дешёвых офферов показывать на подписку.
const MATCHES_PER_SUB = 3;

const BETWEEN_MESSAGES_MS = 1200;

export class FlightsService implements Service {
  readonly name = 'flights';
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(private readonly bot: Bot) {}

  register(bot: Bot): void {
    bot.command(
      'flights',
      allowedChatOnly(async (ctx) => {
        await ctx.reply('Запускаю внеплановый поиск авиабилетов…');
        try {
          await this.runOnce();
          await this.replyLatest(ctx);
        } catch (err) {
          logger.error(`flights manual run failed: ${err}`);
        }
      }),
    );

    bot.command('lastflights', allowedChatOnly((ctx) => this.replyLatest(ctx)));
  }

  // Показывает вызывающему текущий топ по каждой подписке из БД.
  // Используется и для /lastflights, и как ответ на ручной /flights —
  // чтобы ручной запуск всегда что-то выводил, даже когда новых офферов нет
  // (авто-пуш в группу шлёт только изменения, тут — полная картина).
  private async replyLatest(ctx: Context): Promise<void> {
    const blocks = subscriptions.map((sub) => {
      const records = getLatestOffers(sub.id, sub.maxPrice, LATEST_PER_SUB);
      const offers = records.map((r) => r.offer);
      const lastSeenAt = records[0]?.lastSeenAt ?? null;
      return buildLatestBlock(sub, offers, lastSeenAt);
    });
    const messages = chunkMessages(blocks);
    for (const text of messages) {
      await ctx.reply(text, {
        parse_mode: 'HTML',
        link_preview_options: { is_disabled: true },
      });
    }
  }

  start(): void {
    this.runOnce().catch((err) => logger.error(`flights initial run failed: ${err}`));
    const intervalMs = config.flightsIntervalMin * 60 * 1000;
    this.timer = setInterval(() => {
      this.runOnce().catch((err) => logger.error(`flights scheduled run failed: ${err}`));
    }, intervalMs);
    logger.info(`flights: schedule every ${config.flightsIntervalMin} min, ${subscriptions.length} subscription(s)`);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
  }

  private async runOnce(): Promise<void> {
    if (this.running) {
      logger.warn('flights: previous run still in progress, skipping');
      return;
    }
    this.running = true;
    try {
      for (const sub of subscriptions) {
        try {
          const offers = (await searchFlights(sub)).slice(0, MATCHES_PER_SUB);
          const scored: ScoredOffer[] = [];
          for (const offer of offers) {
            const outcome = recordOffer(sub.id, offer);
            if (outcome.status === 'unchanged') continue;
            scored.push({ offer, status: outcome.status, previousPrice: outcome.previousPrice });
          }
          if (scored.length === 0) {
            logger.info(`flights[${sub.id}]: matched ${offers.length}, nothing to push`);
            continue;
          }
          const messages = buildMessages(sub, scored);
          let sent = 0;
          for (const text of messages) {
            try {
              await this.bot.api.sendMessage(config.groupChatId, text, {
                parse_mode: 'HTML',
                link_preview_options: { is_disabled: true },
              });
              sent += 1;
              await sleep(BETWEEN_MESSAGES_MS);
            } catch (err) {
              logger.error(`flights[${sub.id}] sendMessage failed: ${err}`);
            }
          }
          logger.info(
            `flights[${sub.id}]: matched ${offers.length}, ${scored.length} updates in ${sent}/${messages.length} msg`,
          );
        } catch (err) {
          logger.error(`flights[${sub.id}]: ${err}`);
        }
      }
    } finally {
      this.running = false;
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

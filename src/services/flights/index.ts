import type { Bot } from 'grammy';
import { config } from '../../config.js';
import { logger } from '../../core/logger.js';
import type { Service } from '../../core/service.js';
import { searchFlights } from './aviasales.js';
import { buildLatestBlock, buildMessages, chunkMessages, type ScoredOffer } from './formatter.js';
import { getLatestOffers, recordOffer } from './repository.js';
import { subscriptions } from './subscriptions.js';

const LATEST_PER_SUB = 3;

const BETWEEN_MESSAGES_MS = 1200;

export class FlightsService implements Service {
  readonly name = 'flights';
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(private readonly bot: Bot) {}

  register(bot: Bot): void {
    bot.command('flights', async (ctx) => {
      await ctx.reply('Запускаю внеплановый поиск авиабилетов.');
      this.runOnce().catch((err) => logger.error(`flights manual run failed: ${err}`));
    });

    bot.command('lastflights', async (ctx) => {
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
    });
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
      // Сначала обычные подписки, затем связочные (gatedBy) — чтобы к моменту
      // их проверки уже знать, нашёлся ли матч по целевым городам.
      const ordered = [...subscriptions].sort(
        (a, b) => Number(Boolean(a.gatedBy)) - Number(Boolean(b.gatedBy)),
      );
      const matched = new Set<string>();
      for (const sub of ordered) {
        try {
          if (sub.gatedBy && !sub.gatedBy.some((id) => matched.has(id))) {
            logger.info(`flights[${sub.id}]: gated, no target match this run, skipping`);
            continue;
          }
          const offers = await searchFlights(sub);
          if (offers.length > 0) matched.add(sub.id);
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

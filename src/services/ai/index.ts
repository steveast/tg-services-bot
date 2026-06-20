import { randomUUID } from 'node:crypto';
import type { Bot, Context } from 'grammy';
import { config } from '../../config.js';
import { logger } from '../../core/logger.js';
import type { Service } from '../../core/service.js';
import { isNoConversationError, runClaude } from './claude.js';
import { clearSession, getSessionId, setSessionId } from './sessions.js';

// Telegram режет сообщения длиннее 4096 символов — бьём ответ на части по границе строк.
const TG_LIMIT = 4000;

// AI отвечает только владельцу в личке и в семейной группе. Больше нигде.
function isAllowedForAi(ctx: Context): boolean {
  if (ctx.chat?.type === 'private') return ctx.from?.id === config.adminUserId;
  return ctx.chat?.id === config.groupChatId;
}

export class AiService implements Service {
  readonly name = 'ai';

  constructor(private readonly bot: Bot) {}

  register(bot: Bot): void {
    // /ask <вопрос> — работает и в личке владельца, и в семейной группе.
    bot.command('ask', async (ctx) => {
      if (!isAllowedForAi(ctx)) return;
      const prompt = (ctx.match ?? '').trim();
      if (!prompt) {
        await ctx.reply('Использование: /ask <вопрос>');
        return;
      }
      await this.respond(ctx, prompt);
    });

    // /reset — забыть контекст и начать новый диалог в этом чате.
    bot.command('reset', async (ctx) => {
      if (!isAllowedForAi(ctx)) return;
      if (ctx.chat) clearSession(ctx.chat.id);
      await ctx.reply('Контекст очищен — начинаем новый диалог.');
    });

    // Сообщение, начинающееся с «ии», = запрос к Claude (и в группе, и в личке).
    // Кроме того, в личке владельца на ИИ идёт любое не-командное сообщение.
    bot.on('message:text', async (ctx, next) => {
      const text = ctx.message.text;
      if (text.startsWith('/')) return next();
      if (!isAllowedForAi(ctx)) return next();

      const viaPrefix = stripAiPrefix(text);
      if (viaPrefix !== null) {
        if (!viaPrefix) {
          await ctx.reply('Спроси что-нибудь после «ии» 🙂');
          return;
        }
        await this.respond(ctx, viaPrefix);
        return;
      }

      // Без префикса «ии» свободный чат работает только в личке владельца;
      // в группе нужен /ask или префикс «ии».
      if (ctx.chat?.type === 'private') await this.respond(ctx, text);
    });
  }

  start(): void {}
  stop(): void {}

  private async respond(ctx: Context, prompt: string): Promise<void> {
    const chatId = ctx.chat?.id;
    if (chatId === undefined) return;

    // В группе подписываем, кто спрашивает — модель видит, с кем общается.
    const message =
      ctx.chat?.type === 'private' ? prompt : `${ctx.from?.first_name ?? 'Пользователь'}: ${prompt}`;

    try {
      void ctx.replyWithChatAction('typing').catch(() => undefined);
      const answer = await this.ask(chatId, message);
      for (const chunk of splitForTelegram(answer)) {
        await ctx.reply(chunk, { link_preview_options: { is_disabled: true } });
      }
    } catch (err) {
      logger.error(`ai respond failed: ${err}`);
      await ctx.reply('Не получилось получить ответ от Claude 😕');
    }
  }

  // Продолжаем сессию чата, если она есть; если её потеряли — создаём новую.
  private async ask(chatId: number, prompt: string): Promise<string> {
    const existing = getSessionId(chatId);
    if (existing) {
      try {
        return await runClaude(prompt, { sessionId: existing, resume: true });
      } catch (err) {
        if (!isNoConversationError(err)) throw err;
        logger.warn(`ai: session ${existing} lost for chat ${chatId}, starting new`);
      }
    }
    const sessionId = randomUUID();
    const answer = await runClaude(prompt, { sessionId, resume: false });
    setSessionId(chatId, sessionId);
    return answer;
  }
}

// «ии вопрос», «ИИ, вопрос», «ии: вопрос» → «вопрос». Просто «ии» → ''. Иначе null.
function stripAiPrefix(text: string): string | null {
  const m = /^\s*ии[\s,:.!?—-]+(.+)$/is.exec(text);
  if (m) return (m[1] ?? '').trim();
  if (/^\s*ии\s*$/i.test(text)) return '';
  return null;
}

function splitForTelegram(text: string, limit = TG_LIMIT): string[] {
  if (text.length <= limit) return [text];
  const chunks: string[] = [];
  let rest = text;
  while (rest.length > limit) {
    let cut = rest.lastIndexOf('\n', limit);
    if (cut < limit / 2) cut = limit; // нет удобного переноса — режем жёстко
    chunks.push(rest.slice(0, cut));
    rest = rest.slice(cut).replace(/^\n/, '');
  }
  if (rest) chunks.push(rest);
  return chunks;
}

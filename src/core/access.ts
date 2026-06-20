import type { Context } from 'grammy';
import { config } from '../config.js';

// Команда разрешена только владельцу и только в личной переписке с ботом.
// В группах (включая семейную) и от любого другого пользователя — false.
export function isOwnerPrivate(ctx: Context): boolean {
  return ctx.chat?.type === 'private' && ctx.from?.id === config.adminUserId;
}

// Оборачивает обработчик команды: молча игнорирует всех, кроме владельца в личке.
export function ownerOnly(
  handler: (ctx: Context) => unknown | Promise<unknown>,
): (ctx: Context) => Promise<void> {
  return async (ctx) => {
    if (!isOwnerPrivate(ctx)) return;
    await handler(ctx);
  };
}

// Чат, где боту вообще разрешено работать: владелец в личке ИЛИ семейная группа.
export function isAllowedChat(ctx: Context): boolean {
  if (ctx.chat?.type === 'private') return ctx.from?.id === config.adminUserId;
  return ctx.chat?.id === config.groupChatId;
}

// Оборачивает обработчик: отвечает владельцу в личке и любому в семейной группе.
export function allowedChatOnly(
  handler: (ctx: Context) => unknown | Promise<unknown>,
): (ctx: Context) => Promise<void> {
  return async (ctx) => {
    if (!isAllowedChat(ctx)) return;
    await handler(ctx);
  };
}

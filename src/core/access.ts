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

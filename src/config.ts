import 'dotenv/config';

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

// Поиск авиабилетов выключен: тема стала неактуальна (2026-08). Код сервиса
// оставлен целиком — чтобы вернуть, достаточно FLIGHTS_ENABLED=1 в .env
// (и валидного TRAVELPAYOUTS_TOKEN).
const flightsEnabled = process.env.FLIGHTS_ENABLED === '1';

export const config = {
  botToken: required('BOT_TOKEN'),
  flightsEnabled,
  // Обязателен только при включённом поиске — иначе бот не должен падать на старте
  // из-за токена к сервису, которым не пользуется.
  travelpayoutsToken: flightsEnabled ? required('TRAVELPAYOUTS_TOKEN') : (process.env.TRAVELPAYOUTS_TOKEN ?? ''),
  groupChatId: Number(required('GROUP_CHAT_ID')),
  // Telegram user id владельца — команды отвечают только ему и только в личке.
  // Пока не задан, на команды отвечает лишь /whoami (чтобы этот id узнать).
  adminUserId: process.env.ADMIN_USER_ID ? Number(process.env.ADMIN_USER_ID) : undefined,
  // Путь к Claude Code CLI для AI-чата. На проде бинарь не в PATH под PM2 — зовём по абсолютному пути.
  claudeCliPath: process.env.CLAUDE_CLI ?? '/home/ms/.local/bin/claude',
  flightsIntervalMin: Number(process.env.FLIGHTS_INTERVAL_MIN ?? '240'),
  dbPath: process.env.DB_PATH ?? 'data/bot.db',
};

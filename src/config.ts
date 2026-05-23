import 'dotenv/config';

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

export const config = {
  botToken: required('BOT_TOKEN'),
  travelpayoutsToken: required('TRAVELPAYOUTS_TOKEN'),
  groupChatId: Number(required('GROUP_CHAT_ID')),
  flightsIntervalMin: Number(process.env.FLIGHTS_INTERVAL_MIN ?? '240'),
  dbPath: process.env.DB_PATH ?? 'data/bot.db',
};

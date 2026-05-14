import type { Bot } from 'grammy';

export interface Service {
  name: string;
  register(bot: Bot): void;
  start(): Promise<void> | void;
  stop(): Promise<void> | void;
}

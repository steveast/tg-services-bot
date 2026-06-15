import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { config } from '../config.js';

mkdirSync(dirname(config.dbPath), { recursive: true });

export const db = new DatabaseSync(config.dbPath);
db.exec('PRAGMA journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS flight_offers (
    subscription_id TEXT NOT NULL,
    origin TEXT NOT NULL,
    origin_airport TEXT,
    destination TEXT NOT NULL,
    departure_at TEXT NOT NULL,
    airline TEXT NOT NULL,
    flight_number TEXT NOT NULL,
    transfers INTEGER NOT NULL,
    price INTEGER NOT NULL,
    link TEXT NOT NULL,
    first_seen_at INTEGER NOT NULL,
    last_seen_at INTEGER NOT NULL,
    PRIMARY KEY (subscription_id, departure_at, airline, flight_number)
  );
`);

// Миграция для БД, созданных до появления origin_airport.
const cols = db.prepare('PRAGMA table_info(flight_offers)').all() as Array<{ name: string }>;
if (!cols.some((c) => c.name === 'origin_airport')) {
  db.exec('ALTER TABLE flight_offers ADD COLUMN origin_airport TEXT');
}

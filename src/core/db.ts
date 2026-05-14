import { DatabaseSync } from 'node:sqlite';
import { config } from '../config.js';

export const db = new DatabaseSync(config.dbPath);
db.exec('PRAGMA journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS flight_offers (
    subscription_id TEXT NOT NULL,
    origin TEXT NOT NULL,
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

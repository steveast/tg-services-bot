import { db } from '../../core/db.js';
import type { FlightOffer } from './types.js';

export type OfferStatus = 'new' | 'price_drop' | 'unchanged';

export interface OfferOutcome {
  status: OfferStatus;
  previousPrice?: number;
}

const selectStmt = db.prepare(`
  SELECT price FROM flight_offers
  WHERE subscription_id = ? AND departure_at = ? AND airline = ? AND flight_number = ?
`);

const upsertStmt = db.prepare(`
  INSERT INTO flight_offers
    (subscription_id, origin, destination, departure_at, airline, flight_number, transfers, price, link, first_seen_at, last_seen_at)
  VALUES
    (@subscription_id, @origin, @destination, @departure_at, @airline, @flight_number, @transfers, @price, @link, @now, @now)
  ON CONFLICT(subscription_id, departure_at, airline, flight_number) DO UPDATE SET
    price = excluded.price,
    transfers = excluded.transfers,
    link = excluded.link,
    last_seen_at = excluded.last_seen_at
`);

const latestSeenStmt = db.prepare(`
  SELECT MAX(last_seen_at) AS max_seen FROM flight_offers WHERE subscription_id = ?
`);

const latestOffersStmt = db.prepare(`
  SELECT origin, destination, departure_at, airline, flight_number, transfers, price, link, last_seen_at
  FROM flight_offers
  WHERE subscription_id = ? AND last_seen_at >= ? AND price <= ?
  ORDER BY price ASC
  LIMIT ?
`);

export interface LatestOffer {
  offer: FlightOffer;
  lastSeenAt: number;
}

export function getLatestOffers(subscriptionId: string, maxPrice: number, limit: number): LatestOffer[] {
  const row = latestSeenStmt.get(subscriptionId) as { max_seen: number | null } | undefined;
  const maxSeen = row?.max_seen;
  if (!maxSeen) return [];
  const windowStart = maxSeen - 5 * 60 * 1000;
  const rows = latestOffersStmt.all(subscriptionId, windowStart, maxPrice, limit) as Array<{
    origin: string;
    destination: string;
    departure_at: string;
    airline: string;
    flight_number: string;
    transfers: number;
    price: number;
    link: string;
    last_seen_at: number;
  }>;
  return rows.map((r) => ({
    offer: {
      origin: r.origin,
      destination: r.destination,
      price: r.price,
      airline: r.airline,
      flightNumber: r.flight_number,
      departureAt: r.departure_at,
      transfers: r.transfers,
      link: r.link,
    },
    lastSeenAt: r.last_seen_at,
  }));
}

export function recordOffer(subscriptionId: string, offer: FlightOffer): OfferOutcome {
  const existing = selectStmt.get(subscriptionId, offer.departureAt, offer.airline, offer.flightNumber) as
    | { price: number }
    | undefined;
  const now = Date.now();
  upsertStmt.run({
    subscription_id: subscriptionId,
    origin: offer.origin,
    destination: offer.destination,
    departure_at: offer.departureAt,
    airline: offer.airline,
    flight_number: offer.flightNumber,
    transfers: offer.transfers,
    price: offer.price,
    link: offer.link,
    now,
  });
  if (!existing) return { status: 'new' };
  if (offer.price < existing.price) return { status: 'price_drop', previousPrice: existing.price };
  return { status: 'unchanged' };
}

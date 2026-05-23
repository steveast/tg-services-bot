import { config } from '../../config.js';
import { logger } from '../../core/logger.js';
import type { FlightOffer, FlightSubscription } from './types.js';

const BASE_URL = 'https://api.travelpayouts.com/aviasales/v3/prices_for_dates';
const SEARCH_WINDOW_DAYS = 14;

interface ApiOffer {
  origin: string;
  destination: string;
  origin_airport: string;
  destination_airport: string;
  price: number;
  airline: string;
  flight_number: string;
  departure_at: string;
  return_at?: string;
  transfers: number;
  duration: number;
  link: string;
}

interface ApiResponse {
  success: boolean;
  data: ApiOffer[];
  error?: string;
}

export async function searchFlights(sub: FlightSubscription): Promise<FlightOffer[]> {
  const today = startOfDay(new Date());
  const cutoff = new Date(today);
  cutoff.setDate(cutoff.getDate() + SEARCH_WINDOW_DAYS);

  const months = monthsBetween(today, cutoff);
  const collected: FlightOffer[] = [];

  for (const month of months) {
    const url = new URL(BASE_URL);
    url.searchParams.set('origin', sub.origin);
    url.searchParams.set('destination', sub.destination);
    url.searchParams.set('departure_at', month);
    url.searchParams.set('currency', sub.currency);
    url.searchParams.set('sorting', 'price');
    url.searchParams.set('direct', sub.directOnly ? 'true' : 'false');
    url.searchParams.set('limit', '1000');

    let body: ApiResponse;
    try {
      const res = await fetch(url, {
        headers: { 'X-Access-Token': config.travelpayoutsToken },
      });
      if (!res.ok) {
        logger.error(`aviasales ${res.status} for ${sub.id} ${month}: ${await res.text()}`);
        continue;
      }
      body = (await res.json()) as ApiResponse;
    } catch (err) {
      logger.error(`aviasales fetch failed for ${sub.id} ${month}: ${err}`);
      continue;
    }

    if (!body.success) {
      logger.error(`aviasales error for ${sub.id} ${month}: ${body.error ?? 'unknown'}`);
      continue;
    }

    for (const item of body.data) {
      collected.push({
        origin: item.origin,
        destination: item.destination,
        price: item.price,
        airline: item.airline,
        flightNumber: item.flight_number,
        departureAt: item.departure_at,
        transfers: item.transfers,
        link: `https://www.aviasales.ru${item.link}`,
      });
    }
  }

  return collected
    .filter((offer) => {
      const dep = new Date(offer.departureAt);
      return dep >= today && dep <= cutoff && offer.price <= sub.maxPrice;
    })
    .sort((a, b) => a.price - b.price)
    .slice(0, 1);
}

function startOfDay(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  return out;
}

function monthsBetween(start: Date, end: Date): string[] {
  const months = new Set<string>();
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  while (cursor <= end) {
    const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`;
    months.add(key);
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return [...months];
}

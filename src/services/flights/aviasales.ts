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
  const { fromStr, toStr } = departureWindow(sub);

  const months = monthsBetween(fromStr, toStr);
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
        originAirport: item.origin_airport,
        destination: item.destination,
        destinationAirport: item.destination_airport,
        price: item.price,
        airline: item.airline,
        flightNumber: item.flight_number,
        departureAt: item.departure_at,
        transfers: item.transfers,
        duration: item.duration,
        link: `https://www.aviasales.ru${item.link}`,
      });
    }
  }

  return collected
    .filter((offer) => {
      // departureAt: "2026-08-15T11:00:00+03:00" — сравниваем по дате вылета
      // (первые 10 символов), лексикографически, чтобы не зависеть от TZ сервера.
      const depDate = offer.departureAt.slice(0, 10);
      return depDate >= fromStr && depDate <= toStr && offer.price <= sub.maxPrice;
    })
    .sort((a, b) => a.price - b.price);
}

// Границы окна вылета (ISO YYYY-MM-DD, включительно). Если у подписки заданы
// departFrom/departTo — берём их; иначе катящееся окно SEARCH_WINDOW_DAYS от сегодня.
function departureWindow(sub: FlightSubscription): { fromStr: string; toStr: string } {
  if (sub.departFrom && sub.departTo) {
    return { fromStr: sub.departFrom, toStr: sub.departTo };
  }
  const today = startOfDay(new Date());
  const cutoff = new Date(today);
  cutoff.setDate(cutoff.getDate() + SEARCH_WINDOW_DAYS);
  return { fromStr: toISODate(today), toStr: toISODate(cutoff) };
}

function startOfDay(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  return out;
}

function toISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Список месяцев YYYY-MM, покрывающих диапазон [fromStr, toStr] включительно.
// Парсим год/месяц из строк напрямую — без Date, чтобы не зависеть от TZ.
function monthsBetween(fromStr: string, toStr: string): string[] {
  const months: string[] = [];
  let y = Number(fromStr.slice(0, 4));
  let m = Number(fromStr.slice(5, 7));
  const endY = Number(toStr.slice(0, 4));
  const endM = Number(toStr.slice(5, 7));
  while (y < endY || (y === endY && m <= endM)) {
    months.push(`${y}-${String(m).padStart(2, '0')}`);
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return months;
}

import type { FlightOffer, FlightSubscription, PassengerGroup } from './types.js';

const MAX_MESSAGE_CHARS = 3500;

export interface ScoredOffer {
  offer: FlightOffer;
  status: 'new' | 'price_drop';
  previousPrice?: number;
}

export function buildMessages(sub: FlightSubscription, scored: ScoredOffer[]): string[] {
  if (scored.length === 0) return [];

  const currency = sub.currency.toUpperCase();
  const seats = totalSeats(sub.passengers);
  const dest = sub.destinationLabel ?? sub.destination;
  const headerBase = [
    `<b>${sub.origin} → ${dest}</b> — ${scored.length} ${pluralOffers(scored.length)}`,
    `${describePassengers(sub.passengers)}, оценка × ${seats}`,
    `Лимит: до ${sub.maxPrice} ${currency} / билет, ${describeTransfers(sub)}`,
  ].join('\n');

  const lines = scored.map((s) => renderLine(s, currency, seats));

  const messages: string[] = [];
  let current = headerBase;
  let part = 1;

  for (const line of lines) {
    const candidate = current + '\n\n' + line;
    if (candidate.length > MAX_MESSAGE_CHARS) {
      messages.push(current);
      part += 1;
      current = `${headerBase} (часть ${part})\n\n${line}`;
    } else {
      current = candidate;
    }
  }
  messages.push(current);
  return messages;
}

export function buildLatestBlock(
  sub: FlightSubscription,
  offers: FlightOffer[],
  lastSeenAt: number | null,
): string {
  const currency = sub.currency.toUpperCase();
  const seats = totalSeats(sub.passengers);
  const seen = lastSeenAt
    ? new Date(lastSeenAt).toLocaleString('ru-RU', {
        dateStyle: 'short',
        timeStyle: 'short',
        timeZone: 'Europe/Moscow',
      })
    : null;
  const dest = sub.destinationLabel ?? sub.destination;
  const header = [
    `<b>${sub.origin} → ${dest}</b> — лимит до ${formatPrice(sub.maxPrice)} ${currency} / билет`,
    seen ? `последний скан: ${seen} MSK` : null,
  ]
    .filter(Boolean)
    .join('\n');
  if (offers.length === 0) return `${header}\n  нет совпадений`;
  const lines = offers.map((offer) => {
    const total = formatPrice(offer.price * seats);
    const price = formatPrice(offer.price);
    const date = formatDepartureDate(offer.departureAt);
    const time = formatDepartureTime(offer.departureAt);
    const transfers = offer.transfers === 0 ? 'прямой' : `${offer.transfers} пересад.`;
    const route = formatRoute(offer);
    return [
      `• <b>≈ ${total} ${currency}</b> — ${date} ${time} MSK, ${route}, ${offer.airline} ${offer.flightNumber}, ${transfers}`,
      `  ${price} ${currency}/билет — <a href="${offer.link}">открыть</a>`,
    ].join('\n');
  });
  return `${header}\n${lines.join('\n')}`;
}

export function chunkMessages(parts: string[], maxChars = MAX_MESSAGE_CHARS): string[] {
  const messages: string[] = [];
  let current = '';
  for (const part of parts) {
    const candidate = current ? current + '\n\n' + part : part;
    if (candidate.length > maxChars && current) {
      messages.push(current);
      current = part;
    } else {
      current = candidate;
    }
  }
  if (current) messages.push(current);
  return messages;
}

function renderLine(scored: ScoredOffer, currency: string, seats: number): string {
  const { offer, status, previousPrice } = scored;
  const price = formatPrice(offer.price);
  const total = formatPrice(offer.price * seats);
  const date = formatDepartureDate(offer.departureAt);
  const time = formatDepartureTime(offer.departureAt);
  const transfers = offer.transfers === 0 ? 'прямой' : `${offer.transfers} пересад.`;
  const route = formatRoute(offer);

  const totalPrefix = status === 'price_drop' && previousPrice
    ? `↓ <b>≈ ${total} ${currency}</b> (было ≈ ${formatPrice(previousPrice * seats)})`
    : `<b>≈ ${total} ${currency}</b>`;
  const perTicket = status === 'price_drop' && previousPrice
    ? `${price} ${currency}/билет (было ${formatPrice(previousPrice)})`
    : `${price} ${currency}/билет`;

  return [
    `• ${totalPrefix} — ${date} ${time} MSK, ${route}, ${offer.airline} ${offer.flightNumber}, ${transfers}`,
    `  ${perTicket} — <a href="${offer.link}">открыть</a>`,
  ].join('\n');
}

// Маршрут оффера аэропортами — «SVO → HFE». Для страны-направления показывает
// конкретный город прилёта (у страны он меняется от оффера к офферу).
function formatRoute(offer: FlightOffer): string {
  const from = offer.originAirport || offer.origin;
  const to = offer.destinationAirport || offer.destination;
  return `${from} → ${to}`;
}

function totalSeats(p: PassengerGroup): number {
  return p.adults + p.children.length;
}

function describePassengers(p: PassengerGroup): string {
  const parts: string[] = [];
  if (p.adults > 0) parts.push(`${p.adults} взр.`);
  if (p.children.length > 0) parts.push(`${p.children.length} реб. (${p.children.join(', ')} лет)`);
  return parts.join(' + ');
}

function describeTransfers(sub: FlightSubscription): string {
  if (sub.directOnly || sub.maxTransfers === 0) return 'только прямые';
  if (sub.maxTransfers === undefined) return 'прямые и с пересадками';
  if (sub.maxTransfers === 1) return 'прямые или с 1 пересадкой';
  return `прямые или до ${sub.maxTransfers} пересадок`;
}

function pluralOffers(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 14) return 'предложений';
  if (mod10 === 1) return 'предложение';
  if (mod10 >= 2 && mod10 <= 4) return 'предложения';
  return 'предложений';
}

function formatPrice(n: number): string {
  return new Intl.NumberFormat('ru-RU').format(n);
}

function formatDepartureDate(departureAt: string): string {
  // departureAt: "2026-06-15T11:00:00+03:00" — дата в локальной зоне вылета (MSK).
  // Парсим напрямую из строки, чтобы не зависеть от TZ сервера.
  const dateOnly = departureAt.slice(0, 10);
  const d = new Date(`${dateOnly}T12:00:00Z`);
  return d.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: 'short',
    weekday: 'short',
    timeZone: 'UTC',
  });
}

function formatDepartureTime(departureAt: string): string {
  // Часы:минуты из ISO-строки — это локальное время вылета (MSK).
  return departureAt.slice(11, 16);
}

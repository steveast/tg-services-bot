export interface PassengerGroup {
  adults: number;
  children: number[]; // ages in years
}

export interface FlightSubscription {
  id: string;
  origin: string;
  destination: string;
  maxPrice: number;
  passengers: PassengerGroup;
  currency: string;
  directOnly?: boolean;
  // Окно вылета целевого рейса (ISO YYYY-MM-DD, включительно). Если оба заданы —
  // ищем только в этом диапазоне; иначе катящееся окно от сегодняшнего дня.
  departFrom?: string;
  departTo?: string;
  // Фидер-связка: при пуше оффера по этой подписке приложить билеты
  // feeder.origin → origin (как долететь к вылету), стыкуя аэропорт прилёта
  // фидера с аэропортом вылета целевого рейса. Не самостоятельная подписка —
  // ищется только в момент пуша, в БД не пишется.
  feeder?: { origin: string };
}

export interface FlightOffer {
  origin: string;
  originAirport: string;
  destination: string;
  destinationAirport: string;
  price: number;
  airline: string;
  flightNumber: string;
  departureAt: string;
  transfers: number;
  duration: number; // время в пути, минуты — для расчёта прилёта при стыковке
  link: string;
}

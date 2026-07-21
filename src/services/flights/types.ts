export interface PassengerGroup {
  adults: number;
  children: number[]; // ages in years
}

export interface FlightSubscription {
  id: string;
  origin: string;
  // Направление: IATA-код города/аэропорта (CXR, BKK) ИЛИ код страны (CN) —
  // для страны API вернёт офферы в любой её город, отсортированные по цене.
  destination: string;
  // Человекочитаемое имя направления для заголовков (например «Китай» для CN).
  // Если не задано — показываем сам код destination.
  destinationLabel?: string;
  maxPrice: number;
  passengers: PassengerGroup;
  currency: string;
  directOnly?: boolean;
  // Максимум пересадок в маршруте (0 = только прямые). У API нет такого
  // параметра — фильтруется по offer.transfers на нашей стороне. Не влияет,
  // если directOnly: true (тогда API уже вернул только прямые).
  maxTransfers?: number;
  // Окно вылета целевого рейса (ISO YYYY-MM-DD, включительно). Если оба заданы —
  // ищем только в этом диапазоне; иначе катящееся окно от сегодняшнего дня.
  departFrom?: string;
  departTo?: string;
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

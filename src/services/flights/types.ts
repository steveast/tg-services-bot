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
  // Связочная подписка: пушится только если в этом же прогоне нашёлся матч
  // хотя бы по одной из перечисленных подписок (целевые города). Без триггера
  // не выводится вообще — чтобы стыковочный сегмент не спамил сам по себе.
  gatedBy?: string[];
}

export interface FlightOffer {
  origin: string;
  originAirport: string;
  destination: string;
  price: number;
  airline: string;
  flightNumber: string;
  departureAt: string;
  transfers: number;
  link: string;
}

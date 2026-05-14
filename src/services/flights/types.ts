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
}

export interface FlightOffer {
  origin: string;
  destination: string;
  price: number;
  airline: string;
  flightNumber: string;
  departureAt: string;
  transfers: number;
  link: string;
}

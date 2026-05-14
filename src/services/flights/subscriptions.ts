import type { FlightSubscription } from './types.js';

// maxPrice — максимальная цена за один билет в указанной валюте.
// Итог по passengers (взрослые + дети) считается в форматтере.
const family = { adults: 2, children: [8, 5] };

export const subscriptions: FlightSubscription[] = [
  {
    id: 'mow-nha-trang',
    origin: 'MOW',
    destination: 'CXR',
    maxPrice: 20000,
    passengers: family,
    currency: 'rub',
    directOnly: true,
  },
  {
    id: 'mow-da-nang',
    origin: 'MOW',
    destination: 'DAD',
    maxPrice: 20000,
    passengers: family,
    currency: 'rub',
    directOnly: true,
  },
  {
    id: 'mow-bangkok',
    origin: 'MOW',
    destination: 'BKK',
    maxPrice: 20000,
    passengers: family,
    currency: 'rub',
    directOnly: true,
  },
  {
    id: 'mow-tbilisi',
    origin: 'MOW',
    destination: 'TBS',
    maxPrice: 20000,
    passengers: family,
    currency: 'rub',
    directOnly: true,
  },
  {
    id: 'mow-antalya',
    origin: 'MOW',
    destination: 'AYT',
    maxPrice: 20000,
    passengers: family,
    currency: 'rub',
    directOnly: true,
  },
  {
    id: 'izhevsk-mow',
    origin: 'IJK',
    destination: 'MOW',
    maxPrice: 5000,
    passengers: family,
    currency: 'rub',
    directOnly: true,
  },
];

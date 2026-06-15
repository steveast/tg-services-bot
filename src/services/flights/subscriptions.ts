import type { FlightSubscription } from './types.js';

// maxPrice — максимальная цена за один билет в указанной валюте.
// Итог по passengers (взрослые + дети) считается в форматтере.
const family = { adults: 2, children: [8, 5] };

export const subscriptions: FlightSubscription[] = [
  {
    id: 'mow-nha-trang',
    origin: 'MOW',
    destination: 'CXR',
    maxPrice: 25000,
    passengers: family,
    currency: 'rub',
    directOnly: true,
    feeder: { origin: 'IJK' },
  },
  {
    id: 'mow-bangkok',
    origin: 'MOW',
    destination: 'BKK',
    maxPrice: 25000,
    passengers: family,
    currency: 'rub',
    directOnly: true,
    feeder: { origin: 'IJK' },
  },
];

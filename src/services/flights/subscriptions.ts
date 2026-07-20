import type { FlightSubscription, PassengerGroup } from './types.js';

// maxPrice — максимальная цена за один билет в указанной валюте.
// Итог по passengers считается в форматтере.
const passenger: PassengerGroup = { adults: 1, children: [] };

// Окно вылета: весь август и сентябрь 2026 (включительно).
const departFrom = '2026-08-01';
const departTo = '2026-09-30';

export const subscriptions: FlightSubscription[] = [
  {
    id: 'mow-nha-trang',
    origin: 'MOW',
    destination: 'CXR',
    maxPrice: 45000,
    passengers: passenger,
    currency: 'rub',
    directOnly: false,
    maxTransfers: 1,
    departFrom,
    departTo,
    feeder: { origin: 'IJK' },
  },
  {
    id: 'mow-bangkok',
    origin: 'MOW',
    destination: 'BKK',
    maxPrice: 45000,
    passengers: passenger,
    currency: 'rub',
    directOnly: false,
    maxTransfers: 1,
    departFrom,
    departTo,
    feeder: { origin: 'IJK' },
  },
];

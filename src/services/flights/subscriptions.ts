import type { FlightSubscription, PassengerGroup } from './types.js';

// maxPrice — максимальная цена за один билет в указанной валюте.
// Итог по passengers считается в форматтере.
const passenger: PassengerGroup = { adults: 1, children: [] };

// Окно вылета: весь август и сентябрь 2026 (включительно).
const departFrom = '2026-08-01';
const departTo = '2026-09-30';

// Южная Америка: прямых рейсов из Москвы не существует — API с direct=true
// отдаёт ноль офферов по AR/UY/PY, минимум в маршруте 2 пересадки. Поэтому у
// этих подписок свой лимит пересадок и свой потолок цены (дно рынка на окно
// август–сентябрь 2026 — 69–75k за билет); Нячанг остаётся только на прямых.
const southAmericaMaxPrice = 100000;
const southAmericaMaxTransfers = 2;

export const subscriptions: FlightSubscription[] = [
  {
    id: 'mow-nha-trang',
    origin: 'MOW',
    destination: 'CXR',
    country: 'VN',
    maxPrice: 45000,
    passengers: passenger,
    currency: 'rub',
    directOnly: true,
    departFrom,
    departTo,
  },
  {
    id: 'mow-argentina',
    origin: 'MOW',
    destination: 'AR',
    destinationLabel: 'Аргентина',
    country: 'AR',
    maxPrice: southAmericaMaxPrice,
    passengers: passenger,
    currency: 'rub',
    maxTransfers: southAmericaMaxTransfers,
    departFrom,
    departTo,
  },
  {
    id: 'mow-uruguay',
    origin: 'MOW',
    destination: 'UY',
    destinationLabel: 'Уругвай',
    country: 'UY',
    maxPrice: southAmericaMaxPrice,
    passengers: passenger,
    currency: 'rub',
    maxTransfers: southAmericaMaxTransfers,
    departFrom,
    departTo,
  },
  {
    id: 'mow-paraguay',
    origin: 'MOW',
    destination: 'PY',
    destinationLabel: 'Парагвай',
    country: 'PY',
    maxPrice: southAmericaMaxPrice,
    passengers: passenger,
    currency: 'rub',
    maxTransfers: southAmericaMaxTransfers,
    departFrom,
    departTo,
  },
];

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
    country: 'VN',
    maxPrice: 45000,
    passengers: passenger,
    currency: 'rub',
    directOnly: false,
    maxTransfers: 1,
    departFrom,
    departTo,
  },
  {
    id: 'mow-bangkok',
    origin: 'MOW',
    destination: 'BKK',
    country: 'TH',
    maxPrice: 45000,
    passengers: passenger,
    currency: 'rub',
    directOnly: false,
    maxTransfers: 1,
    departFrom,
    departTo,
  },
  {
    // Код страны CN — API вернёт билеты в любой город Китая, топ по цене.
    // Только прямые: цель — долететь до Китая, а стыковка внутри страны
    // (например через Пекин по пути в Гуанчжоу) бессмысленна — в Пекине уже Китай.
    id: 'mow-china',
    origin: 'MOW',
    destination: 'CN',
    destinationLabel: 'Китай',
    country: 'CN',
    maxPrice: 45000,
    passengers: passenger,
    currency: 'rub',
    directOnly: true,
    // Аллоулист вместо всей CN: URC (Урумчи, Синьцзян) почти всегда самый
    // дешёвый вариант и вытеснял из топ-3 всё остальное, а это другой регион
    // (3000+ км от Пекина). Ограничиваем Северным Китаем + Гуанчжоу.
    includeDestinationAirports: ['PEK', 'PKX', 'TSN', 'TAO', 'SJW', 'TYN', 'DLC', 'TNA', 'HET', 'CAN'],
    departFrom,
    departTo,
  },
];

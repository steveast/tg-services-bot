import type { FlightSubscription, PassengerGroup } from './types.js';

// maxPrice — максимальная цена за один билет в указанной валюте.
// Итог по passengers считается в форматтере.
const passenger: PassengerGroup = { adults: 1, children: [] };

// Окно вылета: весь август и сентябрь 2026 (включительно).
const departFrom = '2026-08-01';
const departTo = '2026-09-30';

// Южная Америка: прямых рейсов из Москвы не существует — API с direct=true
// отдаёт ноль офферов, минимум в маршруте 2 пересадки. Поэтому у этих подписок
// свой лимит пересадок и свой потолок цены; Нячанг остаётся только на прямых.
//
// Цель — попасть на континент, а не в конкретную страну: дальше добираемся
// местными рейсами. Смысл в том, что после отсечения визовых стыковок (см.
// visa.ts) прямой поиск по большинству стран даёт ноль, а через точку входа
// получается и дешевле, и вообще возможно. Замеры на окно авг–сен 2026:
//
//   вход        безвизовых  от           локальное плечо
//   AEP/EZE  →  9 шт        70 523 ₽     AEP→MVD 10 777 ₽, AEP→ASU 9 691 ₽ (прямые)
//   GRU      →  2 шт        79 601 ₽     GRU→ASU 16 270 ₽, GRU→SCL 10 940 ₽
//   MVD      →  1 шт       114 571 ₽     —
//   ASU/SCL/LIM/BOG/UIO → безвизовых нет ни за какие деньги
//
// То есть Буэнос-Айрес + местный рейс покрывает Уругвай за ~81k против 114.5k
// прямым поиском и Парагвай за ~80k против «невозможно». Дешёвые офферы в AR
// садятся именно в AEP — региональный аэропорт, откуда локальные плечи прямые.
// Подписки на UY/PY остаются сторожами: сейчас молчат, но выстрелят, если
// появится безвизовый роутинг через Стамбул, Доху или Дубай.
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
    id: 'mow-brazil',
    origin: 'MOW',
    destination: 'BR',
    destinationLabel: 'Бразилия',
    country: 'BR',
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

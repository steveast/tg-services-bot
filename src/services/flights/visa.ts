// Пересадки без визы для паспорта РФ.
//
// Место стыковки v3/prices_for_dates отдельным полем не отдаёт — только число
// пересадок. Но цепочка аэропортов закодирована в link, в параметре t=:
//   t=QR<ts><ts><duration>SVODOHGRUEZE_<hash>_<price>  →  SVO → DOH → GRU → EZE
// Формат внутренний и недокументированный, поэтому любое сомнение = отказ
// (fail-closed): лучше промолчать, чем прислать вариант, куда нужна виза.
//
// Почему аллоулист по безвизовому ВЪЕЗДУ, а не по «стерильному транзиту»:
// у Шенгена airside-транзит для РФ формально разрешён (кроме Испании с
// 12.07.2025, Франции и Чехии), но требует единого билета одним бронированием,
// сквозного багажа, одного аэропорта и отсутствия лоукостера на любом плече.
// Дешёвые офферы из выдачи — ровно наоборот: сборки из разных билетов, часто с
// Победой (DP) и со сменой аэропорта. Багаж на такой стыковке надо получить и
// зарегистрировать заново, то есть войти в страну. Поэтому засчитываем только
// те точки, где въезд безвизовый сам по себе.
//
// Виза по прилёте (Египет, Эфиопия, Индонезия) — это виза, в список не входит.

const VISA_FREE_TRANSIT = new Set([
  // Турция — 60 дней без визы
  'IST', 'SAW', 'ESB', 'AYT', 'ADB', 'DLM',
  // Катар — 90 дней
  'DOH',
  // ОАЭ — 90 дней
  'DXB', 'DWC', 'AUH', 'SHJ',
  // Закавказье и Средняя Азия
  'EVN', 'TBS', 'KUT', 'BUS', 'GYD', 'ALA', 'NQZ', 'TAS', 'SKD', 'FRU', 'OSS', 'MSQ',
  // Балканы вне Шенгена
  'BEG', 'INI', 'TGD', 'TIV', 'TIA', 'SKP', 'SJJ',
  // Южная Америка — вся целевая часть безвизовая для РФ
  'GRU', 'GIG', 'CNF', 'BSB', 'EZE', 'AEP', 'COR', 'MVD', 'ASU', 'SCL', 'LIM',
  'BOG', 'MDE', 'CTG', 'UIO', 'GYE',
  // Карибы
  'HAV', 'VRA', 'PUJ', 'SDQ',
  // Марокко
  'CMN', 'RAK', 'TNG',
  // Юго-Восточная Азия
  'BKK', 'HKT', 'SGN', 'HAN', 'KUL',
  // Прочее безвизовое
  'TLV', 'JNB', 'CPT',
  // Внутренние стыковки по России
  'SVO', 'DME', 'VKO', 'ZIA', 'LED', 'AER', 'KZN', 'OVB', 'SVX',
]);

interface RouteOffer {
  originAirport: string;
  destinationAirport: string;
  transfers: number;
  link: string;
}

export interface VisaVerdict {
  ok: boolean;
  // Точки стыковки, если маршрут удалось разобрать (для вывода в сообщении).
  via?: string[];
  // Почему отказано: 'unparsed' — link не разобрался, 'visa' — нужна виза.
  reason?: 'unparsed' | 'visa';
  // Аэропорты, из-за которых отказ, — их логируем, чтобы расширять аллоулист.
  blockedBy?: string[];
}

// Цепочка аэропортов из link. Возвращает null, если разобрать не удалось.
// Внимание: цепочка длиннее transfers + 2, когда в маршруте есть переезд между
// аэропортами по земле (SAW→IST, BGY→LIN) — такие плечи не считаются
// пересадкой между рейсами, но точкой на карте являются, поэтому нужны нам.
export function routeFromLink(link: string): string[] | null {
  const raw = /[?&]t=([^&]+)/.exec(link)?.[1];
  if (!raw) return null;
  const token = raw.split('_')[0];
  if (!token) return null;
  const chain = /([A-Z]{3,})$/.exec(token)?.[1];
  if (!chain || chain.length % 3 !== 0) return null;
  const codes = chain.match(/.{3}/g);
  return codes && codes.length >= 2 ? codes : null;
}

// Точки стыковки (всё между началом и концом). Концы сверяем с полями оффера —
// это защита от того, что в t= поменяется формат и мы начнём резать по мусору.
export function transitAirports(offer: RouteOffer): string[] | null {
  const chain = routeFromLink(offer.link);
  if (!chain) return null;
  if (chain[0] !== offer.originAirport) return null;
  if (chain[chain.length - 1] !== offer.destinationAirport) return null;
  return chain.slice(1, -1);
}

export function checkVisaFree(offer: RouteOffer): VisaVerdict {
  if (offer.transfers === 0) return { ok: true, via: [] };
  const via = transitAirports(offer);
  if (!via) return { ok: false, reason: 'unparsed' };
  const blockedBy = via.filter((code) => !VISA_FREE_TRANSIT.has(code));
  if (blockedBy.length > 0) return { ok: false, via, reason: 'visa', blockedBy };
  return { ok: true, via };
}

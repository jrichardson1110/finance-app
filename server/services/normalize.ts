import type { PricePoint, Quote } from '../../shared/schemas.ts';
import type { ProviderHistory, ProviderQuote } from '../providers/MarketDataProvider.ts';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Prices must be finite and > 0; zero would also break percentage rebasing downstream. */
function isUsablePrice(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

/**
 * Returns a complete Quote, or undefined when the vendor data is too incomplete to trust.
 * Change values fall back to being derived from price and previous close.
 */
export function normalizeQuote(raw: ProviderQuote): Quote | undefined {
  const { currency, price, previousClose } = raw;
  if (!currency || !isUsablePrice(price) || !isUsablePrice(previousClose)) return undefined;

  const change = raw.change ?? price - previousClose;
  const changePercent = raw.changePercent ?? (change / previousClose) * 100;
  if (!Number.isFinite(change) || !Number.isFinite(changePercent)) return undefined;

  return { symbol: raw.symbol.toUpperCase(), currency, price, previousClose, change, changePercent };
}

/**
 * Drops bars without a usable price, removes duplicate timestamps (last one wins),
 * sorts ascending and, when requested, keeps only the most recent trading session.
 */
export function normalizeBars(history: ProviderHistory, latestSessionOnly: boolean): PricePoint[] {
  const closeByTime = new Map<number, number>();
  for (const bar of history.bars) {
    const t = bar.date.getTime();
    if (Number.isFinite(t) && isUsablePrice(bar.close)) closeByTime.set(t, bar.close);
  }

  const points = [...closeByTime]
    .map(([t, close]) => ({ t, close }))
    .sort((a, b) => a.t - b.t);

  const last = points.at(-1);
  if (!latestSessionOnly || !last) return points;

  // Exchange-local calendar day, so a session is not split by the UTC date boundary.
  const offsetMs = history.gmtOffsetSeconds * 1000;
  const localDay = (t: number) => Math.floor((t + offsetMs) / DAY_MS);
  const sessionDay = localDay(last.t);
  return points.filter((p) => localDay(p.t) === sessionDay);
}

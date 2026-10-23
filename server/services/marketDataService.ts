import type { PriceSeries, Quote, TimeWindow } from '../../shared/schemas.ts';
import type { TtlCache } from '../cache.ts';
import { MarketDataError } from '../errors.ts';
import type { MarketDataProvider } from '../providers/MarketDataProvider.ts';
import { normalizeBars, normalizeQuote } from './normalize.ts';
import { QUOTE_TTL_MS, WINDOW_SPECS } from './windowSpecs.ts';

export interface MarketDataService {
  getQuotes(symbols: readonly string[]): Promise<Quote[]>;
  getHistory(symbol: string, window: TimeWindow): Promise<PriceSeries>;
}

interface Dependencies {
  provider: MarketDataProvider;
  cache: TtlCache;
  now?: () => number;
}

/**
 * Turns vendor data into the normalized shapes the UI consumes.
 * Owns window definitions, cleaning and caching; knows nothing about HTTP or a specific vendor.
 */
export function createMarketDataService({ provider, cache, now = Date.now }: Dependencies): MarketDataService {
  return {
    async getQuotes(symbols) {
      const unique = [...new Set(symbols.map((s) => s.toUpperCase()))];
      // Sorted copy so the same set of symbols shares one cache entry regardless of order.
      const sorted = [...unique].sort();

      const quotes = await cache.getOrLoad(`quotes:${sorted.join(',')}`, QUOTE_TTL_MS, async () => {
        const raw = await provider.getQuotes(sorted);
        if (raw.length === 0) throw new MarketDataError('SYMBOL_NOT_FOUND', 'No quotes found.');

        const normalized = raw.flatMap((r) => normalizeQuote(r) ?? []);
        if (normalized.length === 0) throw new MarketDataError('UPSTREAM_UNAVAILABLE', 'No usable quote data.');
        return normalized;
      });

      // Return quotes in the caller's requested order so the UI can rely on it.
      const order = new Map(unique.map((s, i) => [s, i]));
      return [...quotes].sort((a, b) => (order.get(a.symbol) ?? 0) - (order.get(b.symbol) ?? 0));
    },

    async getHistory(symbol, window) {
      const upper = symbol.toUpperCase();
      const spec = WINDOW_SPECS[window];

      return cache.getOrLoad(`history:${upper}:${window}`, spec.ttlMs, async () => {
        const to = new Date(now());
        const from = new Date(to.getTime() - spec.lookbackMs);
        const history = await provider.getHistory(upper, { from, to, interval: spec.interval });

        const points = normalizeBars(history, spec.latestSessionOnly);
        if (points.length === 0) throw new MarketDataError('UPSTREAM_UNAVAILABLE', 'No usable price history.');
        return { symbol: upper, window, points };
      });
    },
  };
}

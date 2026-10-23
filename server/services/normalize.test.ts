import { describe, expect, it } from 'vitest';
import type { ProviderHistory } from '../providers/MarketDataProvider.ts';
import { normalizeBars, normalizeQuote } from './normalize.ts';

const bar = (iso: string, close: number | null) => ({ date: new Date(iso), close });
const history = (bars: ProviderHistory['bars'], gmtOffsetSeconds = 0): ProviderHistory => ({
  symbol: 'IBM',
  currency: 'USD',
  gmtOffsetSeconds,
  bars,
});

describe('normalizeQuote', () => {
  it('passes through a complete quote and upper-cases the symbol', () => {
    expect(
      normalizeQuote({ symbol: 'ibm', currency: 'USD', price: 110, previousClose: 100, change: 10, changePercent: 10 }),
    ).toEqual({ symbol: 'IBM', currency: 'USD', price: 110, previousClose: 100, change: 10, changePercent: 10 });
  });

  it('derives change and percent when the vendor omits them', () => {
    const quote = normalizeQuote({ symbol: 'IBM', currency: 'USD', price: 90, previousClose: 100 });
    expect(quote?.change).toBe(-10);
    expect(quote?.changePercent).toBeCloseTo(-10);
  });

  it.each([
    ['missing price', { symbol: 'IBM', currency: 'USD', previousClose: 100 }],
    ['missing previous close', { symbol: 'IBM', currency: 'USD', price: 100 }],
    ['zero previous close', { symbol: 'IBM', currency: 'USD', price: 100, previousClose: 0 }],
    ['missing currency', { symbol: 'IBM', price: 100, previousClose: 100 }],
    ['NaN price', { symbol: 'IBM', currency: 'USD', price: Number.NaN, previousClose: 100 }],
  ])('rejects incomplete data: %s', (_name, raw) => {
    expect(normalizeQuote(raw)).toBeUndefined();
  });
});

describe('normalizeBars', () => {
  it('drops null, zero and negative closes', () => {
    const points = normalizeBars(
      history([bar('2026-01-05T15:00:00Z', 100), bar('2026-01-05T16:00:00Z', null), bar('2026-01-05T17:00:00Z', 0)]),
      false,
    );
    expect(points).toHaveLength(1);
  });

  it('sorts ascending and de-duplicates timestamps keeping the last value', () => {
    const points = normalizeBars(
      history([bar('2026-01-05T16:00:00Z', 3), bar('2026-01-05T15:00:00Z', 1), bar('2026-01-05T16:00:00Z', 2)]),
      false,
    );
    expect(points.map((p) => p.close)).toEqual([1, 2]);
  });

  it('keeps only the latest exchange-local session when requested', () => {
    // Friday and Monday sessions (New York, UTC-5): Monday's bars must be the only survivors.
    const points = normalizeBars(
      history(
        [
          bar('2026-01-02T15:00:00Z', 10),
          bar('2026-01-02T20:55:00Z', 11),
          bar('2026-01-05T14:30:00Z', 20),
          bar('2026-01-05T20:55:00Z', 21),
        ],
        -5 * 3600,
      ),
      true,
    );
    expect(points.map((p) => p.close)).toEqual([20, 21]);
  });

  it('uses exchange-local days so a late session is not split at the UTC date boundary', () => {
    // 23:30 UTC and 01:00 UTC next day are the same local day in Sydney (UTC+11).
    const points = normalizeBars(
      history([bar('2026-01-05T23:30:00Z', 1), bar('2026-01-06T01:00:00Z', 2)], 11 * 3600),
      true,
    );
    expect(points.map((p) => p.close)).toEqual([1, 2]);
  });

  it('returns an empty array when nothing is usable', () => {
    expect(normalizeBars(history([]), true)).toEqual([]);
  });
});

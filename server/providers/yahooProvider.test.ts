import { describe, expect, it, vi } from 'vitest';
import { MarketDataError } from '../errors.ts';
import { createYahooProvider, mapYahooError, type YahooClientLike } from './yahooProvider.ts';

const client = (overrides: Partial<YahooClientLike>): YahooClientLike => ({
  quote: vi.fn().mockResolvedValue([]),
  chart: vi.fn().mockResolvedValue({ meta: {}, quotes: [] }),
  ...overrides,
});

describe('mapYahooError', () => {
  it('maps HTTP 429 to RATE_LIMITED', () => {
    expect(mapYahooError(Object.assign(new Error('x'), { code: 429 })).code).toBe('RATE_LIMITED');
  });

  it('maps 404 and "No data found" to SYMBOL_NOT_FOUND', () => {
    expect(mapYahooError(Object.assign(new Error('x'), { code: 404 })).code).toBe('SYMBOL_NOT_FOUND');
    expect(mapYahooError(new Error('No data found, symbol may be delisted')).code).toBe('SYMBOL_NOT_FOUND');
  });

  it('maps anything else to UPSTREAM_UNAVAILABLE and keeps the cause for logging', () => {
    const cause = new Error('socket hang up');
    const mapped = mapYahooError(cause);
    expect(mapped.code).toBe('UPSTREAM_UNAVAILABLE');
    expect(mapped.cause).toBe(cause);
  });

  it('passes existing MarketDataErrors through', () => {
    const original = new MarketDataError('BAD_REQUEST', 'x');
    expect(mapYahooError(original)).toBe(original);
  });
});

describe('createYahooProvider', () => {
  it('maps Yahoo quote fields onto vendor-neutral quotes and skips entries without a symbol', async () => {
    const provider = createYahooProvider(
      client({
        quote: vi.fn().mockResolvedValue([
          {
            symbol: 'IBM',
            currency: 'USD',
            regularMarketPrice: 250,
            regularMarketPreviousClose: 245,
            regularMarketChange: 5,
            regularMarketChangePercent: 2.04,
          },
          { currency: 'USD' },
        ]),
      }),
    );
    expect(await provider.getQuotes(['IBM'])).toEqual([
      { symbol: 'IBM', currency: 'USD', price: 250, previousClose: 245, change: 5, changePercent: 2.04 },
    ]);
  });

  it('maps chart bars, keeps null closes for the service to drop, and reads the exchange offset', async () => {
    const date = new Date('2026-01-05T15:00:00Z');
    const provider = createYahooProvider(
      client({
        chart: vi.fn().mockResolvedValue({
          meta: { symbol: 'IBM', currency: 'USD', gmtoffset: -18000 },
          quotes: [
            { date, close: 100 },
            { date: new Date('2026-01-05T15:05:00Z'), close: null },
            { date: 'not a date', close: 5 },
          ],
        }),
      }),
    );
    const history = await provider.getHistory('IBM', { from: date, to: date, interval: '5m' });
    expect(history.gmtOffsetSeconds).toBe(-18000);
    expect(history.currency).toBe('USD');
    expect(history.bars).toHaveLength(2);
    expect(history.bars[1]?.close).toBeNull();
  });

  it('translates thrown vendor errors', async () => {
    const provider = createYahooProvider(
      client({ chart: vi.fn().mockRejectedValue(Object.assign(new Error('nope'), { code: 404 })) }),
    );
    await expect(
      provider.getHistory('ZZZZ', { from: new Date(), to: new Date(), interval: '1d' }),
    ).rejects.toMatchObject({ code: 'SYMBOL_NOT_FOUND' });
  });

  it('rejects a malformed quote response', async () => {
    const provider = createYahooProvider(client({ quote: vi.fn().mockResolvedValue({ not: 'an array' }) }));
    await expect(provider.getQuotes(['IBM'])).rejects.toMatchObject({ code: 'UPSTREAM_UNAVAILABLE' });
  });
});

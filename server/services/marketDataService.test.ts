import { describe, expect, it, vi } from 'vitest';
import { createTtlCache } from '../cache.ts';
import type { MarketDataProvider, ProviderHistory } from '../providers/MarketDataProvider.ts';
import { createMarketDataService } from './marketDataService.ts';

const NOW = Date.UTC(2026, 0, 5, 21, 0, 0);

const history = (bars: ProviderHistory['bars']): ProviderHistory => ({
  symbol: 'IBM',
  currency: 'USD',
  gmtOffsetSeconds: -5 * 3600,
  bars,
});

function setup(overrides: Partial<MarketDataProvider> = {}) {
  const provider: MarketDataProvider = {
    getQuotes: vi.fn().mockResolvedValue([]),
    getHistory: vi.fn().mockResolvedValue(history([])),
    ...overrides,
  };
  const service = createMarketDataService({ provider, cache: createTtlCache(() => NOW), now: () => NOW });
  return { provider, service };
}

describe('getQuotes', () => {
  it('returns normalized quotes in the requested order and drops unusable ones', async () => {
    const { service } = setup({
      getQuotes: vi.fn().mockResolvedValue([
        { symbol: 'MSFT', currency: 'USD', price: 400, previousClose: 390 },
        { symbol: 'IBM', currency: 'USD', price: 250, previousClose: 240 },
        { symbol: 'BAD', currency: 'USD' },
      ]),
    });
    const quotes = await service.getQuotes(['IBM', 'MSFT', 'BAD']);
    expect(quotes.map((q) => q.symbol)).toEqual(['IBM', 'MSFT']);
    expect(quotes[0]?.change).toBe(10);
  });

  it('upper-cases and de-duplicates symbols and shares a cache entry across orderings', async () => {
    const getQuotes = vi.fn().mockResolvedValue([{ symbol: 'IBM', currency: 'USD', price: 2, previousClose: 1 }]);
    const { service } = setup({ getQuotes });
    await service.getQuotes(['ibm', 'IBM']);
    await service.getQuotes(['IBM']);
    expect(getQuotes).toHaveBeenCalledTimes(1);
    expect(getQuotes).toHaveBeenCalledWith(['IBM']);
  });

  it('fails with SYMBOL_NOT_FOUND when the vendor returns nothing', async () => {
    const { service } = setup();
    await expect(service.getQuotes(['ZZZZ'])).rejects.toMatchObject({ code: 'SYMBOL_NOT_FOUND' });
  });

  it('fails with UPSTREAM_UNAVAILABLE when nothing is usable', async () => {
    const { service } = setup({ getQuotes: vi.fn().mockResolvedValue([{ symbol: 'IBM' }]) });
    await expect(service.getQuotes(['IBM'])).rejects.toMatchObject({ code: 'UPSTREAM_UNAVAILABLE' });
  });
});

describe('getHistory', () => {
  const week = history([
    { date: new Date('2026-01-02T15:00:00Z'), close: 10 },
    { date: new Date('2026-01-05T15:00:00Z'), close: 20 },
  ]);

  it.each([
    ['day', '5m', 7],
    ['week', '1h', 7],
    ['quarter', '1d', 90],
  ] as const)('requests the %s window as %s bars over %i days', async (window, interval, days) => {
    const getHistory = vi.fn().mockResolvedValue(week);
    const { service } = setup({ getHistory });
    await service.getHistory('ibm', window);
    const [symbol, request] = getHistory.mock.calls[0]!;
    expect(symbol).toBe('IBM');
    expect(request.interval).toBe(interval);
    expect(request.to.getTime()).toBe(NOW);
    expect(request.to.getTime() - request.from.getTime()).toBe(days * 24 * 60 * 60 * 1000);
  });

  it('keeps only the latest session for the day window but the full range for the week window', async () => {
    const { service } = setup({ getHistory: vi.fn().mockResolvedValue(week) });
    expect((await service.getHistory('IBM', 'day')).points.map((p) => p.close)).toEqual([20]);
    expect((await service.getHistory('IBM', 'week')).points.map((p) => p.close)).toEqual([10, 20]);
  });

  it('fails with UPSTREAM_UNAVAILABLE when no usable bars remain', async () => {
    const { service } = setup({
      getHistory: vi.fn().mockResolvedValue(history([{ date: new Date(NOW), close: null }])),
    });
    await expect(service.getHistory('IBM', 'week')).rejects.toMatchObject({ code: 'UPSTREAM_UNAVAILABLE' });
  });
});

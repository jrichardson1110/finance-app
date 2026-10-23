import { describe, expect, it, vi } from 'vitest';
import { FinanceServiceError } from './FinanceService';
import { resolveDataMode } from './index';
import { createHttpFinanceService } from './httpFinanceService';

const quote = { symbol: 'IBM', currency: 'USD', price: 2, previousClose: 1, change: 1, changePercent: 100 };

const json = (body: unknown, status = 200) =>
  Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }));

describe('createHttpFinanceService', () => {
  it('requests quotes with the symbol list and returns validated data', async () => {
    const fetchFn = vi.fn().mockImplementation(() => json({ quotes: [quote] }));
    const service = createHttpFinanceService({ fetchFn });
    expect(await service.getQuotes(['IBM', 'MSFT'])).toEqual([quote]);
    expect(fetchFn.mock.calls[0]![0]).toBe('/api/quotes?symbols=IBM%2CMSFT');
  });

  it('requests history with symbol and window', async () => {
    const series = { symbol: 'IBM', window: 'quarter', points: [{ t: 1, close: 2 }] };
    const fetchFn = vi.fn().mockImplementation(() => json(series));
    const service = createHttpFinanceService({ fetchFn });
    expect(await service.getHistory('IBM', 'quarter')).toEqual(series);
    expect(fetchFn.mock.calls[0]![0]).toBe('/api/history?symbol=IBM&window=quarter');
  });

  it('maps SYMBOL_NOT_FOUND responses to a typed error', async () => {
    const fetchFn = vi
      .fn()
      .mockImplementation(() => json({ error: { code: 'SYMBOL_NOT_FOUND', message: 'No data was found.' } }, 404));
    await expect(createHttpFinanceService({ fetchFn }).getHistory('ZZZZ', 'day')).rejects.toMatchObject({
      name: 'FinanceServiceError',
      code: 'SYMBOL_NOT_FOUND',
    });
  });

  it('maps other API errors and unparseable error bodies to UPSTREAM_UNAVAILABLE', async () => {
    const rateLimited = vi
      .fn()
      .mockImplementation(() => json({ error: { code: 'RATE_LIMITED', message: 'Too many requests.' } }, 429));
    await expect(createHttpFinanceService({ fetchFn: rateLimited }).getQuotes(['IBM'])).rejects.toMatchObject({
      code: 'UPSTREAM_UNAVAILABLE',
    });

    const garbage = vi.fn().mockImplementation(() => json({ surprise: true }, 500));
    await expect(createHttpFinanceService({ fetchFn: garbage }).getQuotes(['IBM'])).rejects.toMatchObject({
      code: 'UPSTREAM_UNAVAILABLE',
    });
  });

  it('rejects responses that break the contract', async () => {
    const fetchFn = vi.fn().mockImplementation(() => json({ quotes: [{ symbol: 'IBM' }] }));
    await expect(createHttpFinanceService({ fetchFn }).getQuotes(['IBM'])).rejects.toBeInstanceOf(
      FinanceServiceError,
    );
  });

  it('reports network failures as UPSTREAM_UNAVAILABLE', async () => {
    const fetchFn = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(createHttpFinanceService({ fetchFn }).getQuotes(['IBM'])).rejects.toMatchObject({
      code: 'UPSTREAM_UNAVAILABLE',
    });
  });

  it('re-throws caller aborts untouched', async () => {
    const controller = new AbortController();
    controller.abort();
    const abortError = new DOMException('Aborted', 'AbortError');
    const fetchFn = vi.fn().mockRejectedValue(abortError);
    await expect(createHttpFinanceService({ fetchFn }).getQuotes(['IBM'], controller.signal)).rejects.toBe(
      abortError,
    );
  });
});

describe('resolveDataMode', () => {
  it('defaults to live and only switches to fixture on an exact match', () => {
    expect(resolveDataMode(undefined)).toBe('live');
    expect(resolveDataMode('true')).toBe('live');
    expect(resolveDataMode('fixture')).toBe('fixture');
  });
});

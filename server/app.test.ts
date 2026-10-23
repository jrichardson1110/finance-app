import type { AddressInfo } from 'node:net';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PriceSeriesSchema, QuotesResponseSchema } from '../shared/schemas.ts';
import { createApp } from './app.ts';
import { MarketDataError } from './errors.ts';
import type { MarketDataService } from './services/marketDataService.ts';

const series = { symbol: 'IBM', window: 'week' as const, points: [{ t: 1, close: 2 }] };
const quote = { symbol: 'IBM', currency: 'USD', price: 2, previousClose: 1, change: 1, changePercent: 100 };

let close: (() => Promise<void>) | undefined;

async function start(overrides: Partial<MarketDataService> = {}, rateLimitPerMinute?: number) {
  const service: MarketDataService = {
    getQuotes: vi.fn().mockResolvedValue([quote]),
    getHistory: vi.fn().mockResolvedValue(series),
    ...overrides,
  };
  const server = createApp({ service, rateLimitPerMinute }).listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => server.once('listening', resolve));
  close = () => new Promise<void>((resolve) => server.close(() => resolve()));
  const { port } = server.address() as AddressInfo;
  const get = (path: string) => fetch(`http://127.0.0.1:${port}${path}`);
  return { service, get };
}

afterEach(async () => {
  vi.restoreAllMocks();
  await close?.();
  close = undefined;
});

describe('GET /api/quotes', () => {
  it('returns a contract-valid response and normalizes the symbol list', async () => {
    const { service, get } = await start();
    const response = await get('/api/quotes?symbols=ibm,%20msft');
    expect(response.status).toBe(200);
    expect(QuotesResponseSchema.safeParse(await response.json()).success).toBe(true);
    expect(service.getQuotes).toHaveBeenCalledWith(['IBM', 'MSFT']);
  });

  it.each([
    ['missing symbols', '/api/quotes'],
    ['empty symbol', '/api/quotes?symbols=IBM,,MSFT'],
    ['invalid characters', '/api/quotes?symbols=IBM;DROP'],
    ['too many symbols', `/api/quotes?symbols=${Array.from({ length: 11 }, (_, i) => `S${i}`).join(',')}`],
  ])('rejects %s with 400 and does not call the service', async (_name, path) => {
    const { service, get } = await start();
    const response = await get(path);
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: { code: 'BAD_REQUEST', message: 'The request was invalid.' },
    });
    expect(service.getQuotes).not.toHaveBeenCalled();
  });
});

describe('GET /api/history', () => {
  it('returns a contract-valid series', async () => {
    const { service, get } = await start();
    const response = await get('/api/history?symbol=ibm&window=week');
    expect(response.status).toBe(200);
    expect(PriceSeriesSchema.safeParse(await response.json()).success).toBe(true);
    expect(service.getHistory).toHaveBeenCalledWith('IBM', 'week');
  });

  it.each(['/api/history?symbol=IBM', '/api/history?symbol=IBM&window=year', '/api/history?window=day'])(
    'rejects invalid parameters: %s',
    async (path) => {
      const { get } = await start();
      expect((await get(path)).status).toBe(400);
    },
  );
});

describe('error handling', () => {
  it.each([
    ['SYMBOL_NOT_FOUND', 404],
    ['RATE_LIMITED', 429],
    ['UPSTREAM_UNAVAILABLE', 502],
  ] as const)('maps %s to HTTP %i with a generic message', async (code, status) => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { get } = await start({
      getHistory: vi.fn().mockRejectedValue(new MarketDataError(code, 'secret upstream detail')),
    });
    const response = await get('/api/history?symbol=IBM&window=day');
    expect(response.status).toBe(status);
    const text = await response.text();
    expect(text).not.toContain('secret upstream detail');
    expect(JSON.parse(text).error.code).toBe(code);
  });

  it('hides unexpected error details from clients but logs them', async () => {
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { get } = await start({ getQuotes: vi.fn().mockRejectedValue(new Error('db password is hunter2')) });
    const response = await get('/api/quotes?symbols=IBM');
    expect(response.status).toBe(500);
    expect(await response.text()).not.toContain('hunter2');
    expect(logged).toHaveBeenCalledOnce();
  });

  it('returns a JSON 400 for unknown API paths', async () => {
    const { get } = await start();
    const response = await get('/api/nope');
    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe('BAD_REQUEST');
  });

  it('rate limits excess requests', async () => {
    const { get } = await start({}, 2);
    await get('/api/quotes?symbols=IBM');
    await get('/api/quotes?symbols=IBM');
    const response = await get('/api/quotes?symbols=IBM');
    expect(response.status).toBe(429);
    expect((await response.json()).error.code).toBe('RATE_LIMITED');
  });

  it('sends security headers and does not advertise Express', async () => {
    const { get } = await start();
    const response = await get('/api/quotes?symbols=IBM');
    expect(response.headers.get('x-powered-by')).toBeNull();
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
  });
});

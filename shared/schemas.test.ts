import { describe, expect, it } from 'vitest';
import {
  ErrorResponseSchema,
  MAX_SYMBOLS_PER_REQUEST,
  PriceSeriesSchema,
  QuotesResponseSchema,
  SymbolSchema,
  TimeWindowSchema,
} from './schemas.ts';

describe('SymbolSchema', () => {
  it('trims and upper-cases valid tickers', () => {
    expect(SymbolSchema.parse(' ibm ')).toBe('IBM');
    expect(SymbolSchema.parse('brk-b')).toBe('BRK-B');
    expect(SymbolSchema.parse('sap.de')).toBe('SAP.DE');
  });

  it.each(['', 'TOOLONGSYMBOL', 'IB M', 'IBM;DROP', '<script>', 'IBM/../x'])('rejects %j', (input) => {
    expect(SymbolSchema.safeParse(input).success).toBe(false);
  });

  it('exposes a sane per-request symbol cap', () => {
    expect(MAX_SYMBOLS_PER_REQUEST).toBeGreaterThan(0);
  });
});

describe('TimeWindowSchema', () => {
  it('accepts only the supported windows', () => {
    for (const w of ['day', 'week', 'quarter']) expect(TimeWindowSchema.safeParse(w).success).toBe(true);
    for (const w of ['month', 'DAY', '', undefined]) expect(TimeWindowSchema.safeParse(w).success).toBe(false);
  });
});

describe('PriceSeriesSchema', () => {
  const valid = { symbol: 'IBM', window: 'day', points: [{ t: 1, close: 10.5 }] };

  it('accepts a well-formed series, including an empty one', () => {
    expect(PriceSeriesSchema.safeParse(valid).success).toBe(true);
    expect(PriceSeriesSchema.safeParse({ ...valid, points: [] }).success).toBe(true);
  });

  it('rejects malformed points and unknown windows', () => {
    expect(PriceSeriesSchema.safeParse({ ...valid, points: [{ t: 1, close: '10' }] }).success).toBe(false);
    expect(PriceSeriesSchema.safeParse({ ...valid, points: [{ t: 1, close: Number.NaN }] }).success).toBe(false);
    expect(PriceSeriesSchema.safeParse({ ...valid, points: [{ close: 1 }] }).success).toBe(false);
    expect(PriceSeriesSchema.safeParse({ ...valid, window: 'year' }).success).toBe(false);
  });
});

describe('QuotesResponseSchema', () => {
  const quote = { symbol: 'IBM', currency: 'USD', price: 250, previousClose: 245, change: 5, changePercent: 2.04 };

  it('accepts complete quotes', () => {
    expect(QuotesResponseSchema.safeParse({ quotes: [quote] }).success).toBe(true);
  });

  it('rejects quotes with missing or non-numeric fields', () => {
    const missing = { symbol: quote.symbol, currency: quote.currency, previousClose: 245, change: 5, changePercent: 2.04 };
    expect(QuotesResponseSchema.safeParse({ quotes: [missing] }).success).toBe(false);
    expect(QuotesResponseSchema.safeParse({ quotes: [{ ...quote, price: '250' }] }).success).toBe(false);
    expect(QuotesResponseSchema.safeParse({}).success).toBe(false);
  });
});

describe('ErrorResponseSchema', () => {
  it('accepts known error codes and rejects unknown ones', () => {
    expect(ErrorResponseSchema.safeParse({ error: { code: 'RATE_LIMITED', message: 'slow down' } }).success).toBe(true);
    expect(ErrorResponseSchema.safeParse({ error: { code: 'KABOOM', message: 'x' } }).success).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';
import { COMPANIES, MAX_TRACKED_COMPANIES } from '../config/companies';
import { FinanceServiceError } from './FinanceService';
import { createFixtureFinanceService } from './fixtureFinanceService';

const NOW = Date.UTC(2026, 0, 15, 20, 0, 0);
const service = createFixtureFinanceService({ now: () => NOW });

describe('company registry', () => {
  it('tracks IBM plus at most four competitors', () => {
    expect(COMPANIES[0]?.symbol).toBe('IBM');
    expect(COMPANIES.length).toBeLessThanOrEqual(MAX_TRACKED_COMPANIES);
  });
});

describe('fixtureFinanceService', () => {
  it('returns deterministic history ending at the anchor time', async () => {
    const a = await service.getHistory('IBM', 'week');
    const b = await service.getHistory('IBM', 'week');
    expect(a).toEqual(b);
    expect(a.points.at(-1)?.t).toBe(NOW);
    expect(a.points.every((p) => p.close > 0)).toBe(true);
  });

  it('returns more points for the day window than the quarter window cadence implies', async () => {
    const [day, quarter] = await Promise.all([
      service.getHistory('MSFT', 'day'),
      service.getHistory('MSFT', 'quarter'),
    ]);
    expect(day.points.length).toBeGreaterThan(0);
    expect(quarter.points.length).toBeGreaterThan(0);
    expect(day.points[1]!.t - day.points[0]!.t).toBeLessThan(quarter.points[1]!.t - quarter.points[0]!.t);
  });

  it('returns a quote per requested symbol with consistent change values', async () => {
    const quotes = await service.getQuotes(['IBM', 'ORCL']);
    expect(quotes.map((q) => q.symbol)).toEqual(['IBM', 'ORCL']);
    for (const q of quotes) {
      expect(q.change).toBeCloseTo(q.price - q.previousClose, 2);
    }
  });

  it('rejects unknown symbols with a typed error', async () => {
    await expect(service.getHistory('NOPE', 'day')).rejects.toBeInstanceOf(FinanceServiceError);
    await expect(service.getQuotes(['NOPE'])).rejects.toMatchObject({ code: 'SYMBOL_NOT_FOUND' });
  });
});

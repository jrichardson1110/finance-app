import { COMPANIES } from '../config/companies';
import { FinanceServiceError, type FinanceService } from './FinanceService';
import type { PricePoint, PriceSeries, Quote, TimeWindow } from '../types';

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;

interface WindowShape {
  points: number;
  stepMs: number;
  /** Per-step volatility of the synthetic random walk. */
  volatility: number;
}

const SHAPES: Record<TimeWindow, WindowShape> = {
  day: { points: 78, stepMs: 5 * MINUTE_MS, volatility: 0.0015 },
  week: { points: 35, stepMs: HOUR_MS, volatility: 0.004 },
  quarter: { points: 63, stepMs: DAY_MS, volatility: 0.011 },
};

const BASE_PRICES: Record<string, number> = {
  IBM: 235,
  MSFT: 480,
  ORCL: 210,
  SAP: 260,
  CRM: 270,
};

/** Small deterministic PRNG (mulberry32) so fixtures are stable across runs. */
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSymbol(symbol: string): number {
  let h = 2166136261;
  for (const ch of symbol) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}

function assertKnown(symbol: string): number {
  const base = BASE_PRICES[symbol];
  if (base === undefined) {
    throw new FinanceServiceError('SYMBOL_NOT_FOUND', `Unknown symbol: ${symbol}`);
  }
  return base;
}

function buildPoints(symbol: string, window: TimeWindow, now: number): PricePoint[] {
  const base = assertKnown(symbol);
  const { points, stepMs, volatility } = SHAPES[window];
  const rand = mulberry32(hashSymbol(`${symbol}:${window}`));
  const result: PricePoint[] = [];
  let price = base;
  for (let i = 0; i < points; i += 1) {
    price *= 1 + (rand() - 0.5) * 2 * volatility;
    result.push({ t: now - (points - 1 - i) * stepMs, close: Number(price.toFixed(2)) });
  }
  return result;
}

export interface FixtureOptions {
  /** Anchor time for generated series; defaults to Date.now(). Inject for tests. */
  now?: () => number;
}

/** Deterministic offline provider used for demos, local dev and tests. */
export function createFixtureFinanceService(options: FixtureOptions = {}): FinanceService {
  const now = options.now ?? Date.now;

  return {
    async getHistory(symbol, window) {
      const series: PriceSeries = { symbol, window, points: buildPoints(symbol, window, now()) };
      return series;
    },

    async getQuotes(symbols) {
      return symbols.map((symbol): Quote => {
        const points = buildPoints(symbol, 'day', now());
        const last = points[points.length - 1]!.close;
        const previousClose = Number((BASE_PRICES[symbol]! * 0.998).toFixed(2));
        const change = Number((last - previousClose).toFixed(2));
        return {
          symbol,
          currency: 'USD',
          price: last,
          previousClose,
          change,
          changePercent: (change / previousClose) * 100,
        };
      });
    },
  };
}

/** Symbols the fixture provider can serve; useful for sanity checks in tests. */
export const FIXTURE_SYMBOLS: readonly string[] = COMPANIES.map((c) => c.symbol);

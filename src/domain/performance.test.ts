import { describe, expect, it } from 'vitest';
import {
  buildComparisonRows,
  buildPerformanceRows,
  percentChange,
  rankByChange,
  rankOf,
  rebaseToHundred,
  windowChangePercent,
} from './performance';
import type { PriceSeries } from '../types';

const series = (symbol: string, closes: number[], start = 1000): PriceSeries => ({
  symbol,
  window: 'week',
  points: closes.map((close, i) => ({ t: start + i * 10, close })),
});

describe('percentChange', () => {
  it('computes signed percentage change', () => {
    expect(percentChange(100, 110)).toBeCloseTo(10);
    expect(percentChange(200, 150)).toBeCloseTo(-25);
  });
});

describe('rebaseToHundred', () => {
  it('sets the first point to 100 and scales the rest', () => {
    const rebased = rebaseToHundred(series('X', [50, 55, 45]).points).map((p) => p.close);
    expect(rebased[0]).toBe(100);
    expect(rebased[1]).toBeCloseTo(110);
    expect(rebased[2]).toBeCloseTo(90);
  });

  it('returns an empty array for no data', () => {
    expect(rebaseToHundred([])).toEqual([]);
  });
});

describe('windowChangePercent', () => {
  it('uses first and last points', () => {
    expect(windowChangePercent(series('X', [100, 90, 120]))).toBeCloseTo(20);
  });

  it('is undefined with fewer than two points', () => {
    expect(windowChangePercent(series('X', [100]))).toBeUndefined();
    expect(windowChangePercent(series('X', []))).toBeUndefined();
  });
});

describe('buildComparisonRows', () => {
  it('merges series by timestamp on a rebased scale', () => {
    const rows = buildComparisonRows([series('A', [10, 20]), series('B', [200, 100])]);
    expect(rows).toEqual([
      { t: 1000, A: 100, B: 100 },
      { t: 1010, A: 200, B: 50 },
    ]);
  });

  it('keeps rows sorted and tolerates series with different timestamps', () => {
    const rows = buildComparisonRows([series('A', [10, 11], 1000), series('B', [5, 6], 1005)]);
    expect(rows.map((r) => r.t)).toEqual([1000, 1005, 1010, 1015]);
    expect(rows[1]).toEqual({ t: 1005, B: 100 });
  });
});

describe('rankByChange', () => {
  it('orders best first without mutating the input', () => {
    const input = [
      { symbol: 'A', changePercent: -1 },
      { symbol: 'B', changePercent: 5 },
      { symbol: 'C', changePercent: 2 },
    ];
    expect(rankByChange(input).map((r) => r.symbol)).toEqual(['B', 'C', 'A']);
    expect(input.map((r) => r.symbol)).toEqual(['A', 'B', 'C']);
  });

  it('breaks ties alphabetically so the order is stable', () => {
    const ranked = rankByChange([
      { symbol: 'Z', changePercent: 1 },
      { symbol: 'M', changePercent: 1 },
    ]);
    expect(ranked.map((r) => r.symbol)).toEqual(['M', 'Z']);
  });
});

describe('rankOf', () => {
  const ranked = [
    { symbol: 'B', changePercent: 5 },
    { symbol: 'A', changePercent: 1 },
  ];

  it('is 1-based', () => {
    expect(rankOf(ranked, 'B')).toBe(1);
    expect(rankOf(ranked, 'A')).toBe(2);
  });

  it('is undefined for a symbol that is not ranked', () => {
    expect(rankOf(ranked, 'Q')).toBeUndefined();
  });
});

describe('buildPerformanceRows', () => {
  it('computes start, end, range and change, ranked best first', () => {
    const rows = buildPerformanceRows([series('A', [100, 80, 90]), series('B', [50, 60, 75])]);
    expect(rows.map((r) => r.symbol)).toEqual(['B', 'A']);
    expect(rows[0]).toMatchObject({ symbol: 'B', start: 50, end: 75, low: 50, high: 75 });
    expect(rows[0]?.changePercent).toBeCloseTo(50);
    expect(rows[1]).toMatchObject({ symbol: 'A', start: 100, end: 90, low: 80, high: 100 });
    expect(rows[1]?.changePercent).toBeCloseTo(-10);
  });

  it('omits series with too little data instead of inventing a change', () => {
    const rows = buildPerformanceRows([series('A', [100]), series('B', []), series('C', [10, 11])]);
    expect(rows.map((r) => r.symbol)).toEqual(['C']);
  });
});

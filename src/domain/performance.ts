import type { PricePoint, PriceSeries } from '../types';

/** A chart row: `t` is the timestamp, every other key is a symbol's rebased value. */
export type ComparisonRow = Record<string, number>;

export function percentChange(from: number, to: number): number {
  return ((to - from) / from) * 100;
}

/** Rebases a series so its first point equals 100. */
export function rebaseToHundred(points: readonly PricePoint[]): PricePoint[] {
  const base = points[0]?.close;
  if (base === undefined) return [];
  return points.map((p) => ({ t: p.t, close: (p.close / base) * 100 }));
}

/** Percent change from first to last point, or undefined if there is not enough data. */
export function windowChangePercent(series: PriceSeries): number | undefined {
  const first = series.points[0];
  const last = series.points[series.points.length - 1];
  if (!first || !last || series.points.length < 2) return undefined;
  return percentChange(first.close, last.close);
}

/**
 * Merges several series into timestamp-keyed rows of rebased values so companies
 * with different price levels (and slightly different timestamps) share one axis.
 */
export function buildComparisonRows(seriesList: readonly PriceSeries[]): ComparisonRow[] {
  const rows = new Map<number, ComparisonRow>();
  for (const series of seriesList) {
    for (const point of rebaseToHundred(series.points)) {
      const row = rows.get(point.t) ?? { t: point.t };
      row[series.symbol] = point.close;
      rows.set(point.t, row);
    }
  }
  return [...rows.values()].sort((a, b) => a.t - b.t);
}

/** The one number every view ranks companies by. */
export interface RankedChange {
  symbol: string;
  changePercent: number;
}

export interface PerformanceRow extends RankedChange {
  start: number;
  end: number;
  high: number;
  low: number;
}

/** Best first. Ties break alphabetically so the order is stable between renders. */
export function rankByChange<T extends RankedChange>(rows: readonly T[]): T[] {
  return [...rows].sort((a, b) => b.changePercent - a.changePercent || a.symbol.localeCompare(b.symbol));
}

/** 1-based position of a symbol in an already ranked list, or undefined if it is absent. */
export function rankOf(rankedRows: readonly RankedChange[], symbol: string): number | undefined {
  const index = rankedRows.findIndex((row) => row.symbol === symbol);
  return index === -1 ? undefined : index + 1;
}

/** One ranked row per series that has enough data to measure a change. */
export function buildPerformanceRows(seriesList: readonly PriceSeries[]): PerformanceRow[] {
  const rows = seriesList.flatMap((series): PerformanceRow[] => {
    const changePercent = windowChangePercent(series);
    const first = series.points[0];
    const last = series.points[series.points.length - 1];
    if (changePercent === undefined || !first || !last) return [];
    const closes = series.points.map((p) => p.close);
    return [
      {
        symbol: series.symbol,
        changePercent,
        start: first.close,
        end: last.close,
        high: Math.max(...closes),
        low: Math.min(...closes),
      },
    ];
  });
  return rankByChange(rows);
}

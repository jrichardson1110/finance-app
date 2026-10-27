import { useHistories } from './useHistories';
import type { TimeWindow } from '../types';
import type { WindowSeries } from './useWindowSeries';

/**
 * Loads price history for a single user-provided symbol.
 * Returns a WindowSeries-compatible object so callers can feed it straight into
 * ChartCard and ComparisonLineChart without extra mapping.
 *
 * When symbol is null (nothing entered yet) every field reflects a clean idle state:
 * no loading, no error, no series data.
 */
export function useUserSymbolSeries(symbol: string | null, window: TimeWindow): WindowSeries {
  // Always call useHistories with a stable shape — pass an empty array when there is no symbol
  // so hook call count never changes between renders (Rules of Hooks).
  const symbols = symbol ? [symbol] : [];
  const histories = useHistories(symbols, window);

  if (symbol === null) {
    return { series: [], failedSymbols: [], isLoading: false, allFailed: false, refetch: () => {} };
  }

  const failed = histories[0]?.isError ? [symbol] : [];
  return {
    series: histories.flatMap((h) => (h.data ? [h.data] : [])),
    failedSymbols: failed,
    isLoading: histories[0]?.isPending ?? false,
    allFailed: failed.length === 1,
    refetch: () => histories.forEach((h) => void h.refetch()),
  };
}

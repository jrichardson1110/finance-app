import { FinanceServiceError } from '../services/FinanceService';
import type { PriceSeries, TimeWindow } from '../types';
import { useHistories } from './useHistories';

export interface SymbolSeries {
  series: PriceSeries | undefined;
  isLoading: boolean;
  isError: boolean;
  /** Populated only when the service returned a typed error code. */
  errorCode: FinanceServiceError['code'] | undefined;
  refetch: () => void;
}

/**
 * Loads price history for a single user-supplied symbol.
 * Returns an idle/empty shape when `symbol` is empty so callers can
 * unconditionally read the result without null-checks.
 */
export function useSymbolSeries(symbol: string, window: TimeWindow): SymbolSeries {
  // useHistories must always be called with a stable array shape; we pass a
  // one-element array when active and an empty one when idle so hook call-count
  // never changes between renders.
  const histories = useHistories(symbol ? [symbol] : [], window);
  const query = histories[0];

  if (!symbol || !query) {
    return { series: undefined, isLoading: false, isError: false, errorCode: undefined, refetch: () => {} };
  }

  const errorCode =
    query.error instanceof FinanceServiceError ? query.error.code : undefined;

  return {
    series: query.data,
    isLoading: query.isPending,
    isError: query.isError,
    errorCode,
    refetch: () => void query.refetch(),
  };
}

import { useHistories } from './useHistories';
import { FinanceServiceError } from '../services/FinanceService';
import type { PriceSeries, TimeWindow } from '../types';

export interface SymbolSeries {
  data: PriceSeries | null;
  isLoading: boolean;
  isError: boolean;
  /** Typed error code when the request failed, undefined otherwise. */
  errorCode: FinanceServiceError['code'] | undefined;
  refetch: () => void;
}

/**
 * Loads one time window for a single user-supplied symbol.
 * When symbol is null no request is made and the hook returns an idle state.
 */
export function useSymbolSeries(symbol: string | null, window: TimeWindow): SymbolSeries {
  // useHistories accepts an empty array safely — TanStack Query runs zero queries.
  const histories = useHistories(symbol ? [symbol] : [], window);
  const result = histories[0];

  if (!symbol || !result) {
    return { data: null, isLoading: false, isError: false, errorCode: undefined, refetch: () => {} };
  }

  const errorCode =
    result.isError && result.error instanceof FinanceServiceError ? result.error.code : undefined;

  return {
    data: result.data ?? null,
    isLoading: result.isPending,
    isError: result.isError,
    errorCode,
    refetch: () => void result.refetch(),
  };
}

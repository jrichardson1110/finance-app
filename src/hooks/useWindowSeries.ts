import { useHistories } from './useHistories';
import { SYMBOLS } from '../config/companies';
import type { PriceSeries, TimeWindow } from '../types';

export interface WindowSeries {
  /** Series that loaded, in company-registry order. */
  series: PriceSeries[];
  failedSymbols: string[];
  isLoading: boolean;
  /** True only when every company failed, so there is nothing to show. */
  allFailed: boolean;
  refetch: () => void;
}

/** Loads one time window for every tracked company and summarises the outcome for a view. */
export function useWindowSeries(window: TimeWindow): WindowSeries {
  const histories = useHistories(SYMBOLS, window);
  const failedSymbols = SYMBOLS.filter((_, i) => histories[i]?.isError);

  return {
    series: histories.flatMap((h) => (h.data ? [h.data] : [])),
    failedSymbols,
    isLoading: histories.some((h) => h.isPending),
    allFailed: failedSymbols.length === SYMBOLS.length,
    refetch: () => histories.forEach((h) => void h.refetch()),
  };
}

/** Names the companies whose history failed, or undefined when nothing needs flagging. */
export function unavailableFootnote(data: WindowSeries): string | undefined {
  if (data.failedSymbols.length === 0 || data.allFailed) return undefined;
  return `Data unavailable for: ${data.failedSymbols.join(', ')}`;
}

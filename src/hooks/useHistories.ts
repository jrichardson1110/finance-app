import { useQueries } from '@tanstack/react-query';
import { WINDOW_CONFIG } from '../config/windows';
import { useFinanceService } from '../services/FinanceServiceContext';
import type { TimeWindow } from '../types';

/**
 * One query per symbol so a single failing company degrades only its own data.
 * Results are returned in the same order as `symbols`.
 */
export function useHistories(symbols: readonly string[], window: TimeWindow) {
  const service = useFinanceService();
  return useQueries({
    queries: symbols.map((symbol) => ({
      queryKey: ['history', symbol, window],
      queryFn: ({ signal }: { signal: AbortSignal }) => service.getHistory(symbol, window, signal),
      staleTime: WINDOW_CONFIG[window].staleTimeMs,
    })),
  });
}

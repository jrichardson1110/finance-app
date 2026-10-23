import { useQuery } from '@tanstack/react-query';
import { useFinanceService } from '../services/FinanceServiceContext';

const QUOTE_STALE_MS = 60_000;

export function useQuotes(symbols: readonly string[]) {
  const service = useFinanceService();
  return useQuery({
    queryKey: ['quotes', ...symbols],
    queryFn: ({ signal }) => service.getQuotes(symbols, signal),
    staleTime: QUOTE_STALE_MS,
  });
}

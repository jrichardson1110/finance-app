import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { FinanceServiceProvider } from '../services/FinanceServiceContext';
import { createFixtureFinanceService } from '../services/fixtureFinanceService';
import { useUserSymbolSeries } from './useUserSymbolSeries';

function makeWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const service = createFixtureFinanceService();
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <FinanceServiceProvider service={service}>{children}</FinanceServiceProvider>
      </QueryClientProvider>
    );
  };
}

describe('useUserSymbolSeries', () => {
  it('returns an idle state when symbol is null', () => {
    const { result } = renderHook(() => useUserSymbolSeries(null, 'week'), { wrapper: makeWrapper() });
    expect(result.current.isLoading).toBe(false);
    expect(result.current.allFailed).toBe(false);
    expect(result.current.series).toHaveLength(0);
    expect(result.current.failedSymbols).toHaveLength(0);
  });

  it('returns a series once the query resolves for a known symbol', async () => {
    const { result } = renderHook(() => useUserSymbolSeries('IBM', 'week'), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.series).toHaveLength(1);
    expect(result.current.series[0]?.symbol).toBe('IBM');
    expect(result.current.allFailed).toBe(false);
    expect(result.current.failedSymbols).toHaveLength(0);
  });

  it('sets allFailed and failedSymbols when the symbol is not found', async () => {
    const { result } = renderHook(() => useUserSymbolSeries('FAKE', 'day'), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.allFailed).toBe(true);
    expect(result.current.failedSymbols).toEqual(['FAKE']);
    expect(result.current.series).toHaveLength(0);
  });

  it('transitions from idle to loading when symbol changes from null to a value', async () => {
    let symbol: string | null = null;
    const { result, rerender } = renderHook(() => useUserSymbolSeries(symbol, 'quarter'), {
      wrapper: makeWrapper(),
    });

    // Idle initially
    expect(result.current.isLoading).toBe(false);
    expect(result.current.series).toHaveLength(0);

    // Provide a symbol
    symbol = 'MSFT';
    rerender();

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.series).toHaveLength(1);
    expect(result.current.series[0]?.symbol).toBe('MSFT');
  });
});

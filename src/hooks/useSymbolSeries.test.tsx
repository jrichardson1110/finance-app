import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { FinanceServiceError } from '../services/FinanceService';
import { FinanceServiceProvider } from '../services/FinanceServiceContext';
import { createFixtureFinanceService } from '../services/fixtureFinanceService';
import { useSymbolSeries } from './useSymbolSeries';

function makeWrapper(retries = 0) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: retries } } });
  const service = createFixtureFinanceService();

  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>
        <FinanceServiceProvider service={service}>{children}</FinanceServiceProvider>
      </QueryClientProvider>
    );
  };
}

describe('useSymbolSeries', () => {
  it('returns idle shape when symbol is empty', () => {
    const { result } = renderHook(() => useSymbolSeries('', 'day'), {
      wrapper: makeWrapper(),
    });
    expect(result.current.series).toBeUndefined();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isError).toBe(false);
    expect(result.current.errorCode).toBeUndefined();
  });

  it('loads history for a known symbol', async () => {
    const { result } = renderHook(() => useSymbolSeries('IBM', 'week'), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.series?.symbol).toBe('IBM');
    expect(result.current.isError).toBe(false);
  });

  it('surfaces SYMBOL_NOT_FOUND for an unknown symbol', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: 0 } } });
    const service = createFixtureFinanceService();

    function Wrapper({ children }: { children: ReactNode }) {
      return (
        <QueryClientProvider client={client}>
          <FinanceServiceProvider service={service}>{children}</FinanceServiceProvider>
        </QueryClientProvider>
      );
    }

    const { result } = renderHook(() => useSymbolSeries('NOPE', 'day'), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.errorCode).toBe('SYMBOL_NOT_FOUND');
    expect(result.current.series).toBeUndefined();
  });

  it('surfaces UPSTREAM_UNAVAILABLE from a generic service error', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: 0 } } });
    const base = createFixtureFinanceService();
    const service = {
      ...base,
      getHistory: () =>
        Promise.reject(new FinanceServiceError('UPSTREAM_UNAVAILABLE', 'down')),
    };

    function Wrapper({ children }: { children: ReactNode }) {
      return (
        <QueryClientProvider client={client}>
          <FinanceServiceProvider service={service}>{children}</FinanceServiceProvider>
        </QueryClientProvider>
      );
    }

    const { result } = renderHook(() => useSymbolSeries('IBM', 'day'), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.errorCode).toBe('UPSTREAM_UNAVAILABLE');
  });
});

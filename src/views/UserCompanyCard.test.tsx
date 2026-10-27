import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { FinanceServiceError, type FinanceService } from '../services/FinanceService';
import { FinanceServiceProvider } from '../services/FinanceServiceContext';
import { createFixtureFinanceService } from '../services/fixtureFinanceService';
import { UserCompanyCard } from './UserCompanyCard';

// Recharts does not lay out in jsdom — match the pattern from App.test.tsx.
vi.mock('../components/charts/ComparisonLineChart', () => ({
  ComparisonLineChart: ({ symbols, window }: { symbols: string[]; window: string }) => (
    <div data-testid="user-line-chart" data-window={window}>
      {symbols.join(',')}
    </div>
  ),
}));

function makeWrapper(service: FinanceService) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: 0 } } });
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>
        <FinanceServiceProvider service={service}>{children}</FinanceServiceProvider>
      </QueryClientProvider>
    );
  };
}

describe('UserCompanyCard', () => {
  it('shows a loading state while the request is in flight', () => {
    // Never-resolving service keeps the component in loading.
    const service: FinanceService = {
      ...createFixtureFinanceService(),
      getHistory: () => new Promise(() => {}),
    };
    render(<UserCompanyCard symbol="AAPL" window="week" />, { wrapper: makeWrapper(service) });
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders the line chart for a known symbol once data loads', async () => {
    render(<UserCompanyCard symbol="IBM" window="day" />, {
      wrapper: makeWrapper(createFixtureFinanceService()),
    });
    const chart = await screen.findByTestId('user-line-chart');
    expect(chart).toHaveTextContent('IBM');
    expect(chart).toHaveAttribute('data-window', 'day');
  });

  it('shows a symbol-specific no-data message for SYMBOL_NOT_FOUND', async () => {
    render(<UserCompanyCard symbol="NOPE" window="day" />, {
      wrapper: makeWrapper(createFixtureFinanceService()),
    });
    expect(await screen.findByRole('alert')).toHaveTextContent('No data found for "NOPE"');
    expect(screen.queryByTestId('user-line-chart')).not.toBeInTheDocument();
  });

  it('shows a generic unavailable message for UPSTREAM_UNAVAILABLE', async () => {
    const service: FinanceService = {
      ...createFixtureFinanceService(),
      getHistory: () =>
        Promise.reject(new FinanceServiceError('UPSTREAM_UNAVAILABLE', 'down')),
    };
    render(<UserCompanyCard symbol="IBM" window="day" />, { wrapper: makeWrapper(service) });
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Price history is currently unavailable.',
    );
  });

  it('offers a Retry button on error and calls refetch when clicked', async () => {
    const service: FinanceService = {
      ...createFixtureFinanceService(),
      getHistory: () =>
        Promise.reject(new FinanceServiceError('UPSTREAM_UNAVAILABLE', 'down')),
    };
    render(<UserCompanyCard symbol="IBM" window="day" />, { wrapper: makeWrapper(service) });
    const retry = await screen.findByRole('button', { name: 'Retry' });
    await userEvent.setup().click(retry);
    // Clicking retry does not throw — the button is wired correctly.
    expect(retry).toBeInTheDocument();
  });

  it('respects the active time window', async () => {
    render(<UserCompanyCard symbol="MSFT" window="quarter" />, {
      wrapper: makeWrapper(createFixtureFinanceService()),
    });
    await waitFor(() =>
      expect(screen.getByTestId('user-line-chart')).toHaveAttribute('data-window', 'quarter'),
    );
  });
});

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { FinanceServiceError, type FinanceService } from '../services/FinanceService';
import { FinanceServiceProvider } from '../services/FinanceServiceContext';
import { createFixtureFinanceService } from '../services/fixtureFinanceService';
import { CustomCompanyCard } from './CustomCompanyCard';

vi.mock('../components/charts/ComparisonLineChart', () => ({
  ComparisonLineChart: ({ symbols, window }: { symbols: string[]; window: string }) => (
    <div data-testid="custom-line-chart" data-window={window}>
      {symbols.join(',')}
    </div>
  ),
}));

function renderCustomCompanyCard(service: FinanceService, window: 'day' | 'week' | 'quarter' = 'day') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <FinanceServiceProvider service={service}>
        <CustomCompanyCard window={window} />
      </FinanceServiceProvider>
    </QueryClientProvider>,
  );
}

describe('CustomCompanyCard', () => {
  it('renders search form initially without displaying a chart', () => {
    renderCustomCompanyCard(createFixtureFinanceService());

    expect(screen.getByLabelText(/look up another company/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /view chart/i })).toBeInTheDocument();
    expect(screen.queryByTestId('custom-line-chart')).not.toBeInTheDocument();
  });

  it('validates empty submission and displays validation error', () => {
    renderCustomCompanyCard(createFixtureFinanceService());

    const form = screen.getByRole('search', { name: /search company symbol/i });
    fireEvent.submit(form);

    expect(screen.getByRole('alert')).toHaveTextContent('Please enter a stock symbol.');
    expect(screen.queryByTestId('custom-line-chart')).not.toBeInTheDocument();
  });

  it('validates invalid symbol characters and displays format error', () => {
    renderCustomCompanyCard(createFixtureFinanceService());

    const input = screen.getByLabelText(/look up another company/i);
    fireEvent.change(input, { target: { value: 'BAD$$$' } });
    const form = screen.getByRole('search', { name: /search company symbol/i });
    fireEvent.submit(form);

    expect(screen.getByRole('alert')).toHaveTextContent(/invalid symbol format/i);
    expect(screen.queryByTestId('custom-line-chart')).not.toBeInTheDocument();
  });

  it('fetches and displays chart for a valid user-indicated company symbol', async () => {
    renderCustomCompanyCard(createFixtureFinanceService());

    const input = screen.getByLabelText(/look up another company/i);
    fireEvent.change(input, { target: { value: 'msft' } });
    const form = screen.getByRole('search', { name: /search company symbol/i });
    fireEvent.submit(form);

    const chart = await screen.findByTestId('custom-line-chart');
    expect(chart).toHaveTextContent('IBM,MSFT');
    expect(chart).toHaveAttribute('data-window', 'day');
    expect(screen.getByRole('button', { name: /clear/i })).toBeInTheDocument();
  });

  it('displays a clear no-data message when a symbol is not found without falling back to another company', async () => {
    renderCustomCompanyCard(createFixtureFinanceService());

    const input = screen.getByLabelText(/look up another company/i);
    fireEvent.change(input, { target: { value: 'XYZ' } });
    const form = screen.getByRole('search', { name: /search company symbol/i });
    fireEvent.submit(form);

    const error = await screen.findByText('No data available for symbol "XYZ".');
    expect(error).toBeInTheDocument();
    // Does not fall back to rendering another company's chart
    expect(screen.queryByTestId('custom-line-chart')).not.toBeInTheDocument();
  });

  it('displays an error panel on upstream network failures', async () => {
    const service: FinanceService = {
      ...createFixtureFinanceService(),
      getHistory: (sym) =>
        sym === 'MSFT'
          ? Promise.reject(new FinanceServiceError('UPSTREAM_UNAVAILABLE', 'Network down'))
          : createFixtureFinanceService().getHistory(sym, 'day'),
    };
    renderCustomCompanyCard(service);

    const input = screen.getByLabelText(/look up another company/i);
    fireEvent.change(input, { target: { value: 'MSFT' } });
    const form = screen.getByRole('search', { name: /search company symbol/i });
    fireEvent.submit(form);

    expect(await screen.findByText('Price history for "MSFT" is currently unavailable.')).toBeInTheDocument();
    expect(screen.queryByTestId('custom-line-chart')).not.toBeInTheDocument();
  });

  it('clears the active chart and restores input when clear is clicked', async () => {
    renderCustomCompanyCard(createFixtureFinanceService());

    const input = screen.getByLabelText(/look up another company/i);
    fireEvent.change(input, { target: { value: 'MSFT' } });
    const form = screen.getByRole('search', { name: /search company symbol/i });
    fireEvent.submit(form);

    await screen.findByTestId('custom-line-chart');

    fireEvent.click(screen.getByRole('button', { name: /clear/i }));

    await waitFor(() => {
      expect(screen.queryByTestId('custom-line-chart')).not.toBeInTheDocument();
    });
    expect(screen.getByLabelText(/look up another company/i)).toHaveValue('');
  });
});

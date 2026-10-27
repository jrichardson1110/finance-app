import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { App } from '../App';
import { FinanceServiceError, type FinanceService } from '../services/FinanceService';
import { createFixtureFinanceService } from '../services/fixtureFinanceService';

// Mirror the same mocking pattern used throughout App.test.tsx so that the lazy-loaded
// charting library is not a variable in these tests.
vi.mock('../components/charts/ComparisonLineChart', () => ({
  ComparisonLineChart: ({ symbols }: { symbols: string[] }) => (
    <div data-testid="line-chart">{symbols.join(',')}</div>
  ),
}));

vi.mock('../components/charts/ChangeBarChart', () => ({
  ChangeBarChart: ({ data }: { data: { label: string }[] }) => (
    <div data-testid="bar-chart">{data.map((d) => d.label).join(',')}</div>
  ),
}));

describe('UserCompanyCard — via DashboardPage', () => {
  async function submitSymbol(symbol: string) {
    const user = userEvent.setup();
    const input = screen.getByLabelText('Ticker symbol');
    await user.type(input, symbol);
    await user.click(screen.getByRole('button', { name: 'Show chart' }));
  }

  it('renders nothing beyond the search form before a symbol is entered', () => {
    render(<App service={createFixtureFinanceService()} />);
    expect(screen.getByLabelText('Ticker symbol')).toBeInTheDocument();
    // No user chart card yet
    expect(screen.queryByRole('region', { name: /IBM: price trend/i })).not.toBeInTheDocument();
  });

  it('shows a loading state then renders the chart for a known symbol', async () => {
    render(<App service={createFixtureFinanceService()} />);
    await submitSymbol('IBM');

    // Chart section heading appears
    expect(await screen.findByRole('region', { name: 'IBM: price trend' })).toBeInTheDocument();

    // The line chart renders with the user-supplied symbol
    await waitFor(() => {
      const charts = screen.getAllByTestId('line-chart');
      const userChart = charts.find((el) => el.textContent === 'IBM');
      expect(userChart).toBeDefined();
    });
  });

  it('shows a symbol-not-found error and a retry button for an unknown ticker', async () => {
    render(<App service={createFixtureFinanceService()} />);
    await submitSymbol('UNKN');

    expect(
      await screen.findByText(/"UNKN" was not found\. Check the ticker and try again\./, {}, { timeout: 5000 }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('shows a generic unavailable error for upstream failures', async () => {
    const base = createFixtureFinanceService();
    const service: FinanceService = {
      ...base,
      getHistory: (symbol, window, signal) =>
        symbol === 'NVDA'
          ? Promise.reject(new FinanceServiceError('UPSTREAM_UNAVAILABLE', 'down'))
          : base.getHistory(symbol, window, signal),
    };
    render(<App service={service} />);
    await submitSymbol('NVDA');

    expect(
      await screen.findByText('Price history is currently unavailable.', {}, { timeout: 5000 }),
    ).toBeInTheDocument();
  });

  it('updates the user chart when the time window changes', async () => {
    const user = userEvent.setup();
    render(<App service={createFixtureFinanceService()} />);
    await submitSymbol('IBM');

    // Wait for chart to appear in day window
    await screen.findByRole('region', { name: 'IBM: price trend' });

    // Switch to week view
    await user.click(screen.getByRole('button', { name: 'Last 7 days' }));

    // The user chart section should still be present
    expect(screen.getByRole('region', { name: 'IBM: price trend' })).toBeInTheDocument();
  });

  it('does not affect the existing IBM comparison charts', async () => {
    render(<App service={createFixtureFinanceService()} />);
    await submitSymbol('IBM');

    // The main comparison line chart (with all 5 symbols) must still be present
    await waitFor(() => {
      const charts = screen.getAllByTestId('line-chart');
      const mainChart = charts.find((el) => el.textContent?.includes('MSFT'));
      expect(mainChart).toBeDefined();
    });
  });
});

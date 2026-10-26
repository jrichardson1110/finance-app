import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { App } from './App';
import { COMPANIES } from './config/companies';
import { FinanceServiceError, type FinanceService } from './services/FinanceService';
import { createFixtureFinanceService } from './services/fixtureFinanceService';

// Recharts does not lay out in jsdom, so assert the props passed to the chart adapters instead.
vi.mock('./components/charts/ComparisonLineChart', () => ({
  ComparisonLineChart: ({ symbols, window }: { symbols: string[]; window: string }) => (
    <div data-testid="line-chart" data-window={window}>
      {symbols.join(',')}
    </div>
  ),
}));

vi.mock('./components/charts/ChangeBarChart', () => ({
  ChangeBarChart: ({ data }: { data: { label: string; changePercent: number; isFocus: boolean }[] }) => (
    <div data-testid="bar-chart">{data.map((d) => `${d.label}${d.isFocus ? '*' : ''}`).join(',')}</div>
  ),
}));

const ALL_SYMBOLS = COMPANIES.map((c) => c.symbol).join(',');

function failingFor(symbol: string): FinanceService {
  const base = createFixtureFinanceService();
  return {
    ...base,
    getHistory: (s, window, signal) =>
      s === symbol
        ? Promise.reject(new FinanceServiceError('UPSTREAM_UNAVAILABLE', 'down'))
        : base.getHistory(s, window, signal),
  };
}

describe('Day view (default)', () => {
  it('shows a summary card per company with IBM highlighted, plus the change bars and session trend', async () => {
    render(<App service={createFixtureFinanceService()} />);

    for (const company of COMPANIES) {
      expect(screen.getByRole('article', { name: `${company.name} summary` })).toBeInTheDocument();
    }
    expect(screen.getByRole('article', { name: 'IBM summary' })).toHaveClass('quote-card--focus');
    expect(screen.getByRole('button', { name: 'Current day' })).toHaveAttribute('aria-pressed', 'true');

    const line = await screen.findByTestId('line-chart');
    expect(line).toHaveAttribute('data-window', 'day');
    expect(line).toHaveTextContent(ALL_SYMBOLS);

    const bars = await screen.findByTestId('bar-chart');
    expect(bars).toHaveTextContent('IBM*');
    expect(bars).toHaveTextContent('Microsoft');
  });

  it('keeps the other companies when one fails to load', async () => {
    render(<App service={failingFor('SAP')} />);

    // Both the bar chart card and the trend card report the missing company.
    const footnotes = await screen.findAllByText('Data unavailable for: SAP', {}, { timeout: 5000 });
    expect(footnotes).toHaveLength(2);
    expect(screen.getByTestId('line-chart')).not.toHaveTextContent('SAP');
    expect(screen.getByTestId('bar-chart')).not.toHaveTextContent('SAP');
  });

  it('shows an error instead of charts when all history requests fail', async () => {
    const base = createFixtureFinanceService();
    const service: FinanceService = {
      ...base,
      getHistory: () => Promise.reject(new FinanceServiceError('UPSTREAM_UNAVAILABLE', 'down')),
    };
    render(<App service={service} />);

    expect((await screen.findAllByText('Price history is currently unavailable.', {}, { timeout: 5000 })).length).toBeGreaterThan(0);
    expect(screen.queryByTestId('line-chart')).not.toBeInTheDocument();
    expect(screen.queryByTestId('bar-chart')).not.toBeInTheDocument();
  });

  it('tells the user when quotes fail but still shows the charts', async () => {
    const base = createFixtureFinanceService();
    const service: FinanceService = {
      ...base,
      getQuotes: () => Promise.reject(new FinanceServiceError('UPSTREAM_UNAVAILABLE', 'down')),
    };
    render(<App service={service} />);

    expect(await screen.findByText('Quotes are currently unavailable.', {}, { timeout: 5000 })).toBeInTheDocument();
    expect(await screen.findByTestId('line-chart')).toBeInTheDocument();
    expect(screen.getAllByText('Quote unavailable')).toHaveLength(COMPANIES.length);
  });
});

describe('Last 7 days view', () => {
  it('shows highlights, the trend chart and a ranked table', async () => {
    const user = userEvent.setup();
    render(<App service={createFixtureFinanceService()} />);

    await user.click(screen.getByRole('button', { name: 'Last 7 days' }));

    expect(await screen.findByRole('region', { name: 'Last 7 days highlights' })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId('line-chart')).toHaveAttribute('data-window', 'week'));
    expect(screen.getByRole('table', { name: 'Last 7 days, ranked by change' })).toBeInTheDocument();
    expect(screen.getAllByRole('row')).toHaveLength(COMPANIES.length + 1);
    expect(screen.queryByTestId('bar-chart')).not.toBeInTheDocument();
  });

  it('leaves out a company with no history from the ranking instead of inventing a row', async () => {
    const user = userEvent.setup();
    render(<App service={failingFor('ORCL')} />);

    await user.click(screen.getByRole('button', { name: 'Last 7 days' }));

    const table = await screen.findByRole('table', {}, { timeout: 5000 });
    await waitFor(() => expect(within(table).queryByText('Oracle')).not.toBeInTheDocument());
    expect(within(table).getAllByRole('row')).toHaveLength(COMPANIES.length);
  });
});

describe('Last quarter view', () => {
  it('shows highlights, change bars, the trend chart and a ranked table', async () => {
    const user = userEvent.setup();
    render(<App service={createFixtureFinanceService()} />);

    await user.click(screen.getByRole('button', { name: 'Last quarter' }));

    expect(await screen.findByRole('region', { name: 'Last quarter highlights' })).toBeInTheDocument();
    expect(await screen.findByTestId('bar-chart')).toHaveTextContent('IBM*');
    await waitFor(() => expect(screen.getByTestId('line-chart')).toHaveAttribute('data-window', 'quarter'));
    expect(screen.getByRole('table', { name: 'Last quarter, ranked by change' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Last quarter' })).toHaveAttribute('aria-pressed', 'true');
  });
});

describe('User-selected company lookup', () => {
  it('allows looking up a custom company and rendering its comparison chart without affecting existing dashboards', async () => {
    render(<App service={createFixtureFinanceService()} />);

    // Existing dashboard is rendered as expected
    expect(screen.getByRole('article', { name: 'IBM summary' })).toBeInTheDocument();

    const input = screen.getByLabelText(/look up another company/i);
    fireEvent.change(input, { target: { value: 'MSFT' } });
    const form = screen.getByRole('search', { name: /search company symbol/i });
    fireEvent.submit(form);

    await waitFor(() => {
      const charts = screen.getAllByTestId('line-chart');
      expect(charts).toHaveLength(2);
      expect(charts[1]).toHaveTextContent('IBM,MSFT');
    }, { timeout: 5000 });

    // Existing competitor cards remain unchanged
    for (const company of COMPANIES) {
      expect(screen.getByRole('article', { name: `${company.name} summary` })).toBeInTheDocument();
    }
  });

  it('displays a clear error when an unknown symbol is queried and does not fall back to competitor data', async () => {
    render(<App service={createFixtureFinanceService()} />);

    const input = screen.getByLabelText(/look up another company/i);
    fireEvent.change(input, { target: { value: 'UNKNOWN' } });
    const form = screen.getByRole('search', { name: /search company symbol/i });
    fireEvent.submit(form);

    expect(await screen.findByText('No data available for symbol "UNKNOWN".', {}, { timeout: 5000 })).toBeInTheDocument();

    // Only the default line chart exists; no fallback custom chart is rendered
    expect(screen.getAllByTestId('line-chart')).toHaveLength(1);
  });
});

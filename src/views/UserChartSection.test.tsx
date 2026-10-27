import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { FinanceServiceError, type FinanceService } from '../services/FinanceService';
import { FinanceServiceProvider } from '../services/FinanceServiceContext';
import { createFixtureFinanceService } from '../services/fixtureFinanceService';
import { UserChartSection } from './UserChartSection';

// Avoid loading recharts in jsdom — assert props instead.
vi.mock('../components/charts/ComparisonLineChart', () => ({
  ComparisonLineChart: ({ symbols }: { symbols: string[] }) => (
    <div data-testid="user-line-chart">{symbols.join(',')}</div>
  ),
}));

function makeWrapper(service: FinanceService = createFixtureFinanceService()) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <FinanceServiceProvider service={service}>{children}</FinanceServiceProvider>
      </QueryClientProvider>
    );
  };
}

function renderSection(
  props: { selectedSymbol?: string | null; onSymbolChange?: (s: string | null) => void } = {},
  service?: FinanceService,
) {
  const onSymbolChange = props.onSymbolChange ?? vi.fn();
  render(
    <UserChartSection
      window="week"
      selectedSymbol={props.selectedSymbol ?? null}
      onSymbolChange={onSymbolChange}
    />,
    { wrapper: makeWrapper(service) },
  );
  return { onSymbolChange };
}

describe('UserChartSection — form', () => {
  it('renders the section heading, label, input and submit button', () => {
    renderSection();
    expect(screen.getByRole('region', { name: 'Look up a company' })).toBeInTheDocument();
    expect(screen.getByLabelText('Ticker symbol')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Show chart' })).toBeInTheDocument();
  });

  it('does not render a Clear button when no symbol is selected', () => {
    renderSection({ selectedSymbol: null });
    expect(screen.queryByRole('button', { name: 'Clear' })).not.toBeInTheDocument();
  });

  it('shows a Clear button when a symbol is selected', () => {
    renderSection({ selectedSymbol: 'IBM' });
    expect(screen.getByRole('button', { name: 'Clear' })).toBeInTheDocument();
  });
});

describe('UserChartSection — validation', () => {
  it('shows an inline error and does not call onSymbolChange for an empty submission', async () => {
    const { onSymbolChange } = renderSection();
    await userEvent.setup().click(screen.getByRole('button', { name: 'Show chart' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Enter a ticker symbol');
    expect(onSymbolChange).not.toHaveBeenCalled();
  });

  it('normalises the symbol to uppercase and calls onSymbolChange', async () => {
    const { onSymbolChange } = renderSection();
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('Ticker symbol'), 'nvda');
    await user.click(screen.getByRole('button', { name: 'Show chart' }));
    expect(onSymbolChange).toHaveBeenCalledExactlyOnceWith('NVDA');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('calls onSymbolChange(null) when Clear is clicked', async () => {
    const { onSymbolChange } = renderSection({ selectedSymbol: 'IBM' });
    await userEvent.setup().click(screen.getByRole('button', { name: 'Clear' }));
    expect(onSymbolChange).toHaveBeenCalledExactlyOnceWith(null);
  });
});

describe('UserChartSection — chart rendering', () => {
  it('does not render a chart when no symbol is selected', () => {
    renderSection({ selectedSymbol: null });
    expect(screen.queryByTestId('user-line-chart')).not.toBeInTheDocument();
  });

  it('renders a line chart for a known symbol once data loads', async () => {
    renderSection({ selectedSymbol: 'IBM' });
    await waitFor(() => expect(screen.getByTestId('user-line-chart')).toBeInTheDocument());
    expect(screen.getByTestId('user-line-chart')).toHaveTextContent('IBM');
  });

  it('shows a no-data error message and no chart for an unknown symbol', async () => {
    const badService: FinanceService = {
      ...createFixtureFinanceService(),
      getHistory: () =>
        Promise.reject(new FinanceServiceError('SYMBOL_NOT_FOUND', 'Unknown symbol: FAKE')),
    };
    renderSection({ selectedSymbol: 'FAKE' }, badService);

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('No data available for "FAKE"'),
    );
    expect(screen.queryByTestId('user-line-chart')).not.toBeInTheDocument();
  });
});

describe('UserChartSection — existing dashboard isolation', () => {
  it('renders without affecting any COMPANIES-based data — only the lookup section is present', () => {
    renderSection({ selectedSymbol: null });
    // The section only owns its own region; it does not render quote cards or highlights.
    expect(screen.queryByRole('article')).not.toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});

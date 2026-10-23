import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { PerformanceRow } from '../../domain/performance';
import { Highlights } from './Highlights';
import { PerformanceTable } from './PerformanceTable';
import { QuoteCard } from './QuoteCard';

const row = (symbol: string, changePercent: number): PerformanceRow => ({
  symbol,
  changePercent,
  start: 100,
  end: 100 + changePercent,
  high: 120,
  low: 80,
});

// Ranked best first, as the views supply them.
const rows = [row('MSFT', 5), row('IBM', 1.5), row('ORCL', -3)];

describe('Highlights', () => {
  it('names the top and weakest performers and the focus company rank', () => {
    render(<Highlights rows={rows} focusSymbol="IBM" currency="USD" windowLabel="Last 7 days" />);
    const region = screen.getByRole('region', { name: 'Last 7 days highlights' });
    expect(within(region).getByText('Microsoft')).toBeInTheDocument();
    expect(within(region).getByText('+5.00%')).toBeInTheDocument();
    expect(within(region).getByText('Oracle')).toBeInTheDocument();
    expect(within(region).getByText('−3.00%')).toBeInTheDocument();
    expect(within(region).getByText('2 of 3')).toBeInTheDocument();
  });

  it('shows a neutral message instead of a rank when the focus company has no data', () => {
    render(<Highlights rows={[row('MSFT', 5), row('ORCL', -3)]} focusSymbol="IBM" currency="USD" windowLabel="Last quarter" />);
    expect(screen.getByText('No data')).toBeInTheDocument();
    expect(screen.queryByText(/of 2/)).not.toBeInTheDocument();
  });

  it('does not repeat a single company as both top and weakest', () => {
    render(<Highlights rows={[row('IBM', 2)]} focusSymbol="IBM" currency="USD" windowLabel="Last quarter" />);
    expect(screen.getAllByText('IBM')).toHaveLength(1);
    expect(screen.getByText('No data')).toBeInTheDocument();
  });
});

describe('PerformanceTable', () => {
  it('lists companies in the supplied rank order with signed changes', () => {
    render(<PerformanceTable rows={rows} focusSymbol="IBM" currency="USD" caption="Ranked" />);
    const body = screen.getAllByRole('row').slice(1);
    expect(body).toHaveLength(3);
    expect(within(body[0]!).getByText('Microsoft')).toBeInTheDocument();
    expect(within(body[2]!).getByText('−3.00%')).toBeInTheDocument();
    expect(screen.getByRole('table', { name: 'Ranked' })).toBeInTheDocument();
  });

  it('marks the focus company row', () => {
    render(<PerformanceTable rows={rows} focusSymbol="IBM" currency="USD" caption="Ranked" />);
    const ibmRow = screen.getByRole('rowheader', { name: /IBM/ }).closest('tr');
    expect(ibmRow).toHaveClass('is-focus');
  });
});

describe('QuoteCard', () => {
  const quote = { symbol: 'IBM', currency: 'USD', price: 250, previousClose: 245, change: 5, changePercent: 2.04 };

  it('shows price and today change, and omits the window line when no window label is given', () => {
    render(<QuoteCard name="IBM" symbol="IBM" quote={quote} />);
    expect(screen.getByText('$250.00')).toBeInTheDocument();
    expect(screen.getByText('Today +2.04%')).toBeInTheDocument();
    expect(screen.queryByText(/Last/)).not.toBeInTheDocument();
  });

  it('flags the focus company and handles a missing quote', () => {
    render(<QuoteCard name="IBM" symbol="IBM" isFocus />);
    expect(screen.getByRole('article', { name: 'IBM summary' })).toHaveClass('quote-card--focus');
    expect(screen.getByText('Quote unavailable')).toBeInTheDocument();
  });
});

import { QuoteCard } from '../components/cards/QuoteCard';
import { ErrorPanel } from '../components/feedback/ErrorPanel';
import { COMPANIES, FOCUS_SYMBOL } from '../config/companies';
import type { WindowSeries } from '../hooks/useWindowSeries';
import { buildPerformanceRows } from '../domain/performance';
import type { Quote } from '../types';
import { ChangeBarCard } from './ChangeBarCard';
import { RelativePerformanceCard } from './RelativePerformanceCard';

interface DayViewProps {
  quotes: { data?: Quote[]; isError: boolean; refetch: () => void };
  data: WindowSeries;
}

/** Current day market summary: today's price and move per company, then how the session unfolded. */
export function DayView({ quotes, data }: DayViewProps) {
  const quoteBySymbol = new Map((quotes.data ?? []).map((q) => [q.symbol, q]));
  const rows = buildPerformanceRows(data.series);

  return (
    <>
      {quotes.isError ? (
        <ErrorPanel message="Quotes are currently unavailable." onRetry={quotes.refetch} />
      ) : null}

      <div className="quote-grid">
        {COMPANIES.map((company) => (
          <QuoteCard
            key={company.symbol}
            name={company.name}
            symbol={company.symbol}
            quote={quoteBySymbol.get(company.symbol)}
            isFocus={company.symbol === FOCUS_SYMBOL}
          />
        ))}
      </div>

      <div className="view-grid">
        <ChangeBarCard
          title="Change since the session open"
          description="First to latest regular-session price. On weekends or holidays this shows the last trading session."
          rows={rows}
          data={data}
        />
        <RelativePerformanceCard
          window="day"
          data={data}
          title="Session trend"
          description="5-minute intervals. Each series is rebased to 100 at the open."
        />
      </div>
    </>
  );
}

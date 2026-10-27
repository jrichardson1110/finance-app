import { lazy, Suspense } from 'react';
import { ChartCard } from '../components/charts/ChartCard';
import { LoadingBlock } from '../components/feedback/LoadingBlock';
import { WINDOW_CONFIG } from '../config/windows';
import { buildComparisonRows } from '../domain/performance';
import type { SymbolSeries } from '../hooks/useSymbolSeries';
import type { TimeWindow } from '../types';

// Reuse the same lazy-loaded chart the rest of the dashboard uses.
const ComparisonLineChart = lazy(() =>
  import('../components/charts/ComparisonLineChart').then((m) => ({ default: m.ComparisonLineChart })),
);

interface UserCompanyCardProps {
  symbol: string;
  data: SymbolSeries;
  window: TimeWindow;
}

/**
 * Renders a single-company relative-performance chart for a user-supplied ticker.
 * Covers four states: loading, symbol-not-found, general error, and success.
 */
export function UserCompanyCard({ symbol, data, window }: UserCompanyCardProps) {
  const title = `${symbol}: price trend`;
  const description = `${WINDOW_CONFIG[window].label}. Rebased to 100 at the start of the window.`;

  const errorMessage =
    data.isError
      ? data.errorCode === 'SYMBOL_NOT_FOUND'
        ? `"${symbol}" was not found. Check the ticker and try again.`
        : 'Price history is currently unavailable.'
      : undefined;

  const rows = data.data ? buildComparisonRows([data.data]) : [];
  const ariaLabel = `${title} over ${WINDOW_CONFIG[window].label.toLowerCase()}`;

  return (
    <ChartCard
      title={title}
      description={description}
      isLoading={data.isLoading}
      errorMessage={errorMessage}
      onRetry={data.isError ? data.refetch : undefined}
    >
      <Suspense fallback={<LoadingBlock label="Loading chart…" />}>
        <ComparisonLineChart rows={rows} symbols={[symbol]} window={window} ariaLabel={ariaLabel} />
      </Suspense>
    </ChartCard>
  );
}

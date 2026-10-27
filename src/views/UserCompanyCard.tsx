import { lazy, Suspense } from 'react';
import { ChartCard } from '../components/charts/ChartCard';
import { LoadingBlock } from '../components/feedback/LoadingBlock';
import { WINDOW_CONFIG } from '../config/windows';
import { buildComparisonRows } from '../domain/performance';
import { useSymbolSeries } from '../hooks/useSymbolSeries';
import type { TimeWindow } from '../types';

// Lazy-load the charting library so it stays in its own chunk, matching the
// pattern used by RelativePerformanceCard and ChangeBarCard.
const ComparisonLineChart = lazy(() =>
  import('../components/charts/ComparisonLineChart').then((m) => ({ default: m.ComparisonLineChart })),
);

interface UserCompanyCardProps {
  symbol: string;
  window: TimeWindow;
}

/**
 * Fetches and displays a single-company trend chart for a user-supplied symbol.
 * Renders nothing when `symbol` is empty, so the parent can mount it
 * unconditionally once a symbol has been entered.
 */
export function UserCompanyCard({ symbol, window }: UserCompanyCardProps) {
  const data = useSymbolSeries(symbol, window);

  const windowLabel = WINDOW_CONFIG[window].label.toLowerCase();
  const title = `${symbol}: relative performance`;
  const description = `${WINDOW_CONFIG[window].description}. Rebased to 100 at the start of the window.`;

  const chartContent = data.series ? (
    <Suspense fallback={<LoadingBlock label="Loading chart…" />}>
      <ComparisonLineChart
        rows={buildComparisonRows([data.series])}
        symbols={[symbol]}
        window={window}
        ariaLabel={`${title} over ${windowLabel}`}
      />
    </Suspense>
  ) : null;

  return (
    <ChartCard
      title={title}
      description={description}
      isLoading={data.isLoading}
      errorMessage={
        data.isError
          ? data.errorCode === 'SYMBOL_NOT_FOUND'
            ? `No data found for "${symbol}".`
            : 'Price history is currently unavailable.'
          : undefined
      }
      onRetry={data.isError ? data.refetch : undefined}
    >
      {chartContent}
    </ChartCard>
  );
}

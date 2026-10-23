import { lazy, Suspense } from 'react';
import { ChartCard } from '../components/charts/ChartCard';
import { LoadingBlock } from '../components/feedback/LoadingBlock';
import { companyName } from '../config/companies';
import { WINDOW_CONFIG } from '../config/windows';
import { buildComparisonRows } from '../domain/performance';
import { unavailableFootnote, type WindowSeries } from '../hooks/useWindowSeries';
import type { TimeWindow } from '../types';

// Lazy so the charting library lands in its own chunk rather than the main bundle.
const ComparisonLineChart = lazy(() =>
  import('../components/charts/ComparisonLineChart').then((m) => ({ default: m.ComparisonLineChart })),
);

interface RelativePerformanceCardProps {
  window: TimeWindow;
  data: WindowSeries;
  title: string;
  description: string;
}

/** Line chart of every company rebased to 100, with the shared loading, error and partial-failure handling. */
export function RelativePerformanceCard({ window, data, title, description }: RelativePerformanceCardProps) {
  const symbols = data.series.map((s) => s.symbol);
  return (
    <ChartCard
      title={title}
      description={description}
      isLoading={data.isLoading}
      errorMessage={data.allFailed ? 'Price history is currently unavailable.' : undefined}
      onRetry={data.refetch}
      footnote={unavailableFootnote(data)}
    >
      <Suspense fallback={<LoadingBlock label="Loading chart…" />}>
        <ComparisonLineChart
          rows={buildComparisonRows(data.series)}
          symbols={symbols}
          window={window}
          ariaLabel={`${title}: ${symbols.map(companyName).join(', ')} over ${WINDOW_CONFIG[window].label.toLowerCase()}`}
        />
      </Suspense>
    </ChartCard>
  );
}


import { lazy, Suspense } from 'react';
import { ChartCard } from '../components/charts/ChartCard';
import type { ChangeBarDatum } from '../components/charts/ChangeBarChart';
import { LoadingBlock } from '../components/feedback/LoadingBlock';
import { FOCUS_SYMBOL, companyName } from '../config/companies';
import type { PerformanceRow } from '../domain/performance';
import { unavailableFootnote, type WindowSeries } from '../hooks/useWindowSeries';

const ChangeBarChart = lazy(() =>
  import('../components/charts/ChangeBarChart').then((m) => ({ default: m.ChangeBarChart })),
);

interface ChangeBarCardProps {
  title: string;
  description: string;
  rows: readonly PerformanceRow[];
  data: WindowSeries;
}

/** Bar chart of percent change per company for the loaded window. */
export function ChangeBarCard({ title, description, rows, data }: ChangeBarCardProps) {
  const chartData: ChangeBarDatum[] = rows.map((row) => ({
    label: companyName(row.symbol),
    changePercent: row.changePercent,
    isFocus: row.symbol === FOCUS_SYMBOL,
  }));

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
        <ChangeBarChart
          data={chartData}
          ariaLabel={`${title}: ${rows.map((r) => `${companyName(r.symbol)} ${r.changePercent.toFixed(2)} percent`).join(', ')}`}
        />
      </Suspense>
    </ChartCard>
  );
}

import { Highlights } from '../components/cards/Highlights';
import { PerformanceTable } from '../components/cards/PerformanceTable';
import { FOCUS_SYMBOL } from '../config/companies';
import { WINDOW_CONFIG } from '../config/windows';
import { buildPerformanceRows } from '../domain/performance';
import type { WindowSeries } from '../hooks/useWindowSeries';
import { RelativePerformanceCard } from './RelativePerformanceCard';

interface WeekViewProps {
  data: WindowSeries;
  currency: string;
}

/** Last 7 days trend comparison: who led, how IBM ranked, and the trend lines side by side. */
export function WeekView({ data, currency }: WeekViewProps) {
  const rows = buildPerformanceRows(data.series);
  const { label } = WINDOW_CONFIG.week;

  return (
    <>
      <Highlights rows={rows} focusSymbol={FOCUS_SYMBOL} currency={currency} windowLabel={label} />
      <RelativePerformanceCard
        window="week"
        data={data}
        title="Last 7 days: relative performance"
        description="Hourly intervals. Each series is rebased to 100 at the start of the window."
      />
      <PerformanceTable rows={rows} focusSymbol={FOCUS_SYMBOL} currency={currency} caption="Last 7 days, ranked by change" />
    </>
  );
}

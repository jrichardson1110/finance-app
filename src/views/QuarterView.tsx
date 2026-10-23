import { Highlights } from '../components/cards/Highlights';
import { PerformanceTable } from '../components/cards/PerformanceTable';
import { FOCUS_SYMBOL } from '../config/companies';
import { WINDOW_CONFIG } from '../config/windows';
import { buildPerformanceRows } from '../domain/performance';
import type { WindowSeries } from '../hooks/useWindowSeries';
import { ChangeBarCard } from './ChangeBarCard';
import { RelativePerformanceCard } from './RelativePerformanceCard';

interface QuarterViewProps {
  data: WindowSeries;
  currency: string;
}

/** Last quarter comparison: the headline ranking first, then the path each company took to get there. */
export function QuarterView({ data, currency }: QuarterViewProps) {
  const rows = buildPerformanceRows(data.series);
  const { label } = WINDOW_CONFIG.quarter;

  return (
    <>
      <Highlights rows={rows} focusSymbol={FOCUS_SYMBOL} currency={currency} windowLabel={label} />
      <div className="view-grid">
        <ChangeBarCard
          title="Quarter change by company"
          description="Daily closes over a trailing ~90 days, first to latest."
          rows={rows}
          data={data}
        />
        <RelativePerformanceCard
          window="quarter"
          data={data}
          title="Quarter trend"
          description="Daily closes. Each series is rebased to 100 at the start of the quarter."
        />
      </div>
      <PerformanceTable rows={rows} focusSymbol={FOCUS_SYMBOL} currency={currency} caption="Last quarter, ranked by change" />
    </>
  );
}

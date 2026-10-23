import { companyName } from '../../config/companies';
import { formatCurrency, formatPercent } from '../../domain/format';
import type { PerformanceRow } from '../../domain/performance';

interface HighlightsProps {
  /** Ranked best-first. */
  rows: readonly PerformanceRow[];
  focusSymbol: string;
  currency: string;
  windowLabel: string;
}

function tone(value: number): 'up' | 'down' | 'flat' {
  return value === 0 ? 'flat' : value > 0 ? 'up' : 'down';
}

/** Three plain-language answers: who led, who lagged, and how the focus company ranked. */
export function Highlights({ rows, focusSymbol, currency, windowLabel }: HighlightsProps) {
  const best = rows[0];
  const worst = rows.length > 1 ? rows[rows.length - 1] : undefined;
  const focusIndex = rows.findIndex((r) => r.symbol === focusSymbol);
  const focus = focusIndex === -1 ? undefined : rows[focusIndex];

  return (
    <section className="highlights" aria-label={`${windowLabel} highlights`}>
      <div className="highlight">
        <p className="highlight__label">Top performer</p>
        {best ? (
          <>
            <p className="highlight__value">{companyName(best.symbol)}</p>
            <p className={`highlight__detail change--${tone(best.changePercent)}`}>{formatPercent(best.changePercent)}</p>
          </>
        ) : (
          <p className="highlight__detail">No data</p>
        )}
      </div>
      <div className="highlight">
        <p className="highlight__label">Weakest performer</p>
        {worst ? (
          <>
            <p className="highlight__value">{companyName(worst.symbol)}</p>
            <p className={`highlight__detail change--${tone(worst.changePercent)}`}>
              {formatPercent(worst.changePercent)}
            </p>
          </>
        ) : (
          <p className="highlight__detail">No data</p>
        )}
      </div>
      <div className="highlight">
        <p className="highlight__label">{companyName(focusSymbol)} rank</p>
        {focus ? (
          <>
            <p className="highlight__value">
              {focusIndex + 1} of {rows.length}
            </p>
            <p className="highlight__detail">
              {formatCurrency(focus.start, currency)} → {formatCurrency(focus.end, currency)}
            </p>
          </>
        ) : (
          <p className="highlight__detail">No data</p>
        )}
      </div>
    </section>
  );
}

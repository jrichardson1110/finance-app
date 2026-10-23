import { companyName } from '../../config/companies';
import { formatCurrency, formatPercent } from '../../domain/format';
import type { PerformanceRow } from '../../domain/performance';

interface PerformanceTableProps {
  /** Ranked best-first. */
  rows: readonly PerformanceRow[];
  focusSymbol: string;
  currency: string;
  caption: string;
}

function tone(value: number): 'up' | 'down' | 'flat' {
  return value === 0 ? 'flat' : value > 0 ? 'up' : 'down';
}

/** Ranked comparison. Doubles as the accessible text alternative to the charts. */
export function PerformanceTable({ rows, focusSymbol, currency, caption }: PerformanceTableProps) {
  return (
    <table className="performance-table">
      <caption>{caption}</caption>
      <thead>
        <tr>
          <th scope="col">Rank</th>
          <th scope="col">Company</th>
          <th scope="col" className="num">
            Start
          </th>
          <th scope="col" className="num">
            Latest
          </th>
          <th scope="col" className="num">
            Low
          </th>
          <th scope="col" className="num">
            High
          </th>
          <th scope="col" className="num">
            Change
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index) => (
          <tr key={row.symbol} className={row.symbol === focusSymbol ? 'is-focus' : undefined}>
            <td>{index + 1}</td>
            <th scope="row">
              {companyName(row.symbol)} <span className="symbol">{row.symbol}</span>
            </th>
            <td className="num">{formatCurrency(row.start, currency)}</td>
            <td className="num">{formatCurrency(row.end, currency)}</td>
            <td className="num">{formatCurrency(row.low, currency)}</td>
            <td className="num">{formatCurrency(row.high, currency)}</td>
            <td className={`num change--${tone(row.changePercent)}`}>{formatPercent(row.changePercent)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatTimestamp } from '../../domain/format';
import type { ComparisonRow } from '../../domain/performance';
import type { TimeWindow } from '../../types';

interface ComparisonLineChartProps {
  rows: readonly ComparisonRow[];
  symbols: readonly string[];
  window: TimeWindow;
  /** Text alternative announced by assistive technology. */
  ariaLabel: string;
}

// Colour-blind-safe palette paired with dash patterns so series differ by more than colour.
const SERIES_STYLES = [
  { color: '#0f62fe', dash: undefined },
  { color: '#da1e28', dash: '6 3' },
  { color: '#198038', dash: '2 3' },
  { color: '#8a3ffc', dash: '10 4 2 4' },
  { color: '#b28600', dash: '1 4' },
] as const;

/**
 * The only module that imports the charting library. Swap the library here
 * without touching cards, pages or hooks.
 */
export function ComparisonLineChart({ rows, symbols, window, ariaLabel }: ComparisonLineChartProps) {
  return (
    <div className="comparison-chart" role="img" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={rows as ComparisonRow[]} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="t"
            type="number"
            scale="time"
            domain={['dataMin', 'dataMax']}
            tickFormatter={(t: number) => formatTimestamp(t, window)}
          />
          <YAxis domain={['auto', 'auto']} tickFormatter={(v: number) => v.toFixed(0)} width={44} />
          <Tooltip
            labelFormatter={(t) => formatTimestamp(Number(t), window)}
            formatter={(value) => (typeof value === 'number' ? value.toFixed(1) : String(value))}
          />
          <Legend />
          {symbols.map((symbol, index) => {
            const style = SERIES_STYLES[index % SERIES_STYLES.length]!;
            return (
              <Line
                key={symbol}
                type="monotone"
                dataKey={symbol}
                stroke={style.color}
                strokeDasharray={style.dash}
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
                connectNulls
              />
            );
          })}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

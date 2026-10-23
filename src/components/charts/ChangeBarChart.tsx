import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Rectangle,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { BarShapeProps } from 'recharts';
import { formatPercent } from '../../domain/format';

export interface ChangeBarDatum {
  label: string;
  changePercent: number;
  isFocus: boolean;
}

interface ChangeBarChartProps {
  data: readonly ChangeBarDatum[];
  ariaLabel: string;
}

// Colour is paired with the sign of the label and the axis position, so meaning never relies on colour alone.
const UP = '#198038';
const DOWN = '#da1e28';
const FOCUS_OUTLINE = '#161616';

function renderBar(props: BarShapeProps) {
  const datum = props.payload as ChangeBarDatum | undefined;
  const value = datum?.changePercent ?? 0;
  return (
    <Rectangle
      {...props}
      fill={value >= 0 ? UP : DOWN}
      stroke={datum?.isFocus ? FOCUS_OUTLINE : 'none'}
      strokeWidth={datum?.isFocus ? 2 : 0}
    />
  );
}

/**
 * Axis range with headroom beyond the largest bar (so value labels never touch the axis labels)
 * and an explicit tick at zero, rounded to the nearest 0.5 so ticks read cleanly.
 */
export function axisScale(values: readonly number[]): { domain: [number, number]; ticks: number[] } {
  const bound = Math.max(0.5, Math.ceil(Math.max(0, ...values.map(Math.abs)) * 1.3 * 2) / 2);
  const lo = values.some((v) => v < 0) ? -bound : 0;
  const hi = values.some((v) => v > 0) ? bound : 0;
  const ticks = [...new Set([lo, lo / 2, 0, hi / 2, hi])].sort((a, b) => a - b);
  return { domain: [lo, hi], ticks };
}

/** Bar chart of percent change per company; bars above zero are gains, below zero are losses. */
export function ChangeBarChart({ data, ariaLabel }: ChangeBarChartProps) {
  const { domain, ticks } = axisScale(data.map((d) => d.changePercent));
  return (
    <div className="change-chart" role="img" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data as ChangeBarDatum[]} margin={{ top: 24, right: 16, bottom: 8, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" />
          <YAxis domain={domain} ticks={ticks} tickFormatter={(v: number) => `${v.toFixed(1)}%`} width={56} />
          <Tooltip formatter={(value) => (typeof value === 'number' ? formatPercent(value) : String(value))} />
          <ReferenceLine y={0} stroke="#525252" />
          <Bar dataKey="changePercent" name="Change" shape={renderBar} isAnimationActive={false}>
            <LabelList
              dataKey="changePercent"
              position="top"
              formatter={(value) => (typeof value === 'number' ? formatPercent(value) : '')}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

import type { TimeWindow } from '../types';

interface WindowConfig {
  label: string;
  description: string;
  /** How long fetched data is considered fresh by the query cache. */
  staleTimeMs: number;
}

export const TIME_WINDOWS: readonly TimeWindow[] = ['day', 'week', 'quarter'];

export const WINDOW_CONFIG: Record<TimeWindow, WindowConfig> = {
  day: { label: 'Current day', description: 'Intraday, 5-minute intervals', staleTimeMs: 60_000 },
  week: { label: 'Last 7 days', description: 'Hourly intervals', staleTimeMs: 5 * 60_000 },
  quarter: { label: 'Last quarter', description: 'Daily closes, trailing ~90 days', staleTimeMs: 30 * 60_000 },
};

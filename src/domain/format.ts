import type { TimeWindow } from '../types';

export function formatCurrency(value: number, currency: string): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value);
}

/** Signed percentage, e.g. "+1.23%". Non-finite values render as an em dash. */
export function formatPercent(value: number | undefined): string {
  if (value === undefined || !Number.isFinite(value)) return '—';
  const sign = value > 0 ? '+' : value < 0 ? '−' : '';
  return `${sign}${Math.abs(value).toFixed(2)}%`;
}

const TIMESTAMP_FORMATS: Record<TimeWindow, Intl.DateTimeFormatOptions> = {
  day: { hour: '2-digit', minute: '2-digit' },
  week: { weekday: 'short', hour: 'numeric' },
  quarter: { month: 'short', day: 'numeric' },
};

export function formatTimestamp(t: number, window: TimeWindow): string {
  return new Intl.DateTimeFormat('en-US', TIMESTAMP_FORMATS[window]).format(new Date(t));
}

/** e.g. "Thu, Oct 22" in the viewer's time zone. */
export function formatSessionDate(t: number): string {
  return new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).format(new Date(t));
}

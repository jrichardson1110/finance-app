import type { TimeWindow } from '../../shared/schemas.ts';
import type { BarInterval } from '../providers/MarketDataProvider.ts';

const DAY_MS = 24 * 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;

export interface WindowSpec {
  /** How far back to request bars. */
  lookbackMs: number;
  interval: BarInterval;
  /** How long a fetched series may be served from cache. */
  ttlMs: number;
  /**
   * Keep only the most recent trading session. The request reaches back several days so a
   * weekend, holiday or pre-open morning still resolves to the last session that traded.
   */
  latestSessionOnly: boolean;
}

/** Single place that defines what each dashboard time window means upstream. */
export const WINDOW_SPECS: Record<TimeWindow, WindowSpec> = {
  day: { lookbackMs: 7 * DAY_MS, interval: '5m', ttlMs: MINUTE_MS, latestSessionOnly: true },
  week: { lookbackMs: 7 * DAY_MS, interval: '1h', ttlMs: 5 * MINUTE_MS, latestSessionOnly: false },
  // "Last quarter" is a trailing ~90 days, not the previous calendar quarter.
  quarter: { lookbackMs: 90 * DAY_MS, interval: '1d', ttlMs: 30 * MINUTE_MS, latestSessionOnly: false },
};

export const QUOTE_TTL_MS = 30 * 1000;

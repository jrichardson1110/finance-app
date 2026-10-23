import type { PriceSeries, Quote, TimeWindow } from '../../shared/schemas.ts';

export type { PriceSeries, Quote, TimeWindow };

/**
 * Contract between the UI and any market data source.
 * Implementations: httpFinanceService (live data via the local proxy server) and
 * fixtureFinanceService (offline/demo/tests).
 */
export interface FinanceService {
  getQuotes(symbols: readonly string[], signal?: AbortSignal): Promise<Quote[]>;
  getHistory(symbol: string, window: TimeWindow, signal?: AbortSignal): Promise<PriceSeries>;
}

/** Raised for failures the UI can show to users without leaking internals. */
export class FinanceServiceError extends Error {
  readonly code: 'SYMBOL_NOT_FOUND' | 'UPSTREAM_UNAVAILABLE';

  constructor(code: FinanceServiceError['code'], message: string) {
    super(message);
    this.name = 'FinanceServiceError';
    this.code = code;
  }
}

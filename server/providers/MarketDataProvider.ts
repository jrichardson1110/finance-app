/**
 * Boundary between the service layer and a market data vendor.
 * Providers return vendor-neutral shapes and throw MarketDataError for failures.
 * Cleaning, window logic and caching live in the service, not here, so a second
 * vendor only has to implement these two methods.
 */

export type BarInterval = '5m' | '1h' | '1d';

/** Fields are optional because vendors may omit them; the service decides what is usable. */
export interface ProviderQuote {
  symbol: string;
  currency?: string;
  price?: number;
  previousClose?: number;
  change?: number;
  changePercent?: number;
}

export interface BarRequest {
  from: Date;
  to: Date;
  interval: BarInterval;
}

export interface ProviderBar {
  date: Date;
  /** Null when the vendor has a timestamp but no price (common for illiquid intervals). */
  close: number | null;
}

export interface ProviderHistory {
  symbol: string;
  currency: string;
  /** Exchange UTC offset in seconds; used to find trading-session boundaries. */
  gmtOffsetSeconds: number;
  bars: ProviderBar[];
}

export interface MarketDataProvider {
  /** Symbols the vendor does not recognise are simply absent from the result. */
  getQuotes(symbols: readonly string[]): Promise<ProviderQuote[]>;
  getHistory(symbol: string, request: BarRequest): Promise<ProviderHistory>;
}

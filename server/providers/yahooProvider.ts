import YahooFinance from 'yahoo-finance2';
import { MarketDataError } from '../errors.ts';
import type {
  BarInterval,
  BarRequest,
  MarketDataProvider,
  ProviderBar,
  ProviderHistory,
  ProviderQuote,
} from './MarketDataProvider.ts';

const REQUEST_TIMEOUT_MS = 10_000;

/** The narrow slice of yahoo-finance2 this provider needs; tests inject a fake. */
export interface YahooClientLike {
  quote(symbols: string[]): Promise<unknown>;
  chart(symbol: string, options: { from: Date; to: Date; interval: BarInterval }): Promise<unknown>;
}

function createDefaultClient(): YahooClientLike {
  const yahoo = new YahooFinance({ suppressNotices: ['yahooSurvey'] });
  // validateResult:false so a new/changed Yahoo field cannot fail a whole request;
  // the service validates the fields it uses instead.
  const moduleOptions = () => ({
    validateResult: false as const,
    fetchOptions: { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) },
  });
  return {
    quote: (symbols) => yahoo.quote(symbols, {}, moduleOptions()),
    // Regular session only, so history agrees with regularMarketPrice and the quote's day change.
    chart: (symbol, { from, to, interval }) =>
      yahoo.chart(
        symbol,
        { period1: from, period2: to, interval, includePrePost: false, return: 'array' },
        moduleOptions(),
      ),
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
}

function asNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

/**
 * Maps whatever yahoo-finance2 or fetch throws onto a stable code.
 * Yahoo reports unknown symbols as a 404 or a "No data found" message.
 */
export function mapYahooError(error: unknown): MarketDataError {
  if (error instanceof MarketDataError) return error;

  const record = asRecord(error);
  const status = asNumber(record.code);
  const message = error instanceof Error ? error.message : '';

  if (status === 429) return new MarketDataError('RATE_LIMITED', 'Upstream rate limit reached.', { cause: error });
  if (status === 404 || /no data found|not found/i.test(message)) {
    return new MarketDataError('SYMBOL_NOT_FOUND', 'Symbol not found upstream.', { cause: error });
  }
  return new MarketDataError('UPSTREAM_UNAVAILABLE', 'Upstream request failed.', { cause: error });
}

export function createYahooProvider(client: YahooClientLike = createDefaultClient()): MarketDataProvider {
  return {
    async getQuotes(symbols): Promise<ProviderQuote[]> {
      let raw: unknown;
      try {
        raw = await client.quote([...symbols]);
      } catch (error) {
        throw mapYahooError(error);
      }
      if (!Array.isArray(raw)) {
        throw new MarketDataError('UPSTREAM_UNAVAILABLE', 'Unexpected quote response.');
      }
      return raw.flatMap((item): ProviderQuote[] => {
        const q = asRecord(item);
        const symbol = asString(q.symbol);
        if (!symbol) return [];
        return [
          {
            symbol,
            currency: asString(q.currency),
            price: asNumber(q.regularMarketPrice),
            previousClose: asNumber(q.regularMarketPreviousClose),
            change: asNumber(q.regularMarketChange),
            changePercent: asNumber(q.regularMarketChangePercent),
          },
        ];
      });
    },

    async getHistory(symbol, request: BarRequest): Promise<ProviderHistory> {
      let raw: unknown;
      try {
        raw = await client.chart(symbol, request);
      } catch (error) {
        throw mapYahooError(error);
      }
      const result = asRecord(raw);
      const meta = asRecord(result.meta);
      const quotes = result.quotes;
      if (!Array.isArray(quotes)) {
        throw new MarketDataError('UPSTREAM_UNAVAILABLE', 'Unexpected chart response.');
      }
      const bars = quotes.flatMap((item): ProviderBar[] => {
        const bar = asRecord(item);
        const date = new Date(bar.date as string | number | Date);
        if (Number.isNaN(date.getTime())) return [];
        return [{ date, close: asNumber(bar.close) ?? null }];
      });
      return {
        symbol: asString(meta.symbol) ?? symbol,
        currency: asString(meta.currency) ?? 'USD',
        gmtOffsetSeconds: asNumber(meta.gmtoffset) ?? 0,
        bars,
      };
    },
  };
}

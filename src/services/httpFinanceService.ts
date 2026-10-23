import {
  ErrorResponseSchema,
  PriceSeriesSchema,
  QuotesResponseSchema,
  type ErrorCode,
  type PriceSeries,
  type Quote,
  type TimeWindow,
} from '../../shared/schemas.ts';
import { FinanceServiceError, type FinanceService } from './FinanceService';

const REQUEST_TIMEOUT_MS = 15_000;

interface HttpOptions {
  /** Defaults to same-origin `/api`, which the Vite dev server proxies to the local server. */
  baseUrl?: string;
  fetchFn?: typeof fetch;
}

function toServiceCode(code: ErrorCode): FinanceServiceError['code'] {
  return code === 'SYMBOL_NOT_FOUND' ? 'SYMBOL_NOT_FOUND' : 'UPSTREAM_UNAVAILABLE';
}

/** Talks to the local proxy server and validates every response against the shared contract. */
export function createHttpFinanceService({ baseUrl = '/api', fetchFn }: HttpOptions = {}): FinanceService {
  async function getJson(path: string, params: Record<string, string>, signal?: AbortSignal): Promise<unknown> {
    const doFetch = fetchFn ?? fetch;
    const url = `${baseUrl}${path}?${new URLSearchParams(params).toString()}`;
    const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
    const combined = signal ? AbortSignal.any([signal, timeout]) : timeout;

    let response: Response;
    try {
      response = await doFetch(url, { signal: combined, headers: { Accept: 'application/json' } });
    } catch (error) {
      // Re-throw caller aborts untouched so query cancellation is not reported as an outage.
      if (signal?.aborted) throw error;
      throw new FinanceServiceError('UPSTREAM_UNAVAILABLE', 'Could not reach the market data server.');
    }

    let body: unknown;
    try {
      body = await response.json();
    } catch {
      throw new FinanceServiceError('UPSTREAM_UNAVAILABLE', 'The market data server sent an unreadable response.');
    }

    if (!response.ok) {
      const parsed = ErrorResponseSchema.safeParse(body);
      const code = parsed.success ? toServiceCode(parsed.data.error.code) : 'UPSTREAM_UNAVAILABLE';
      throw new FinanceServiceError(code, parsed.success ? parsed.data.error.message : 'Request failed.');
    }
    return body;
  }

  return {
    async getQuotes(symbols, signal): Promise<Quote[]> {
      const body = await getJson('/quotes', { symbols: symbols.join(',') }, signal);
      const parsed = QuotesResponseSchema.safeParse(body);
      if (!parsed.success) {
        throw new FinanceServiceError('UPSTREAM_UNAVAILABLE', 'The market data server sent unexpected data.');
      }
      return parsed.data.quotes;
    },

    async getHistory(symbol, window: TimeWindow, signal): Promise<PriceSeries> {
      const body = await getJson('/history', { symbol, window }, signal);
      const parsed = PriceSeriesSchema.safeParse(body);
      if (!parsed.success) {
        throw new FinanceServiceError('UPSTREAM_UNAVAILABLE', 'The market data server sent unexpected data.');
      }
      return parsed.data;
    },
  };
}

import type { ErrorCode } from '../shared/schemas.ts';

/** A failure with a stable code. Messages are safe to show to API clients. */
export class MarketDataError extends Error {
  readonly code: ErrorCode;

  constructor(code: ErrorCode, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'MarketDataError';
    this.code = code;
  }
}

export const HTTP_STATUS_BY_CODE: Record<ErrorCode, number> = {
  BAD_REQUEST: 400,
  SYMBOL_NOT_FOUND: 404,
  RATE_LIMITED: 429,
  UPSTREAM_UNAVAILABLE: 502,
  INTERNAL_ERROR: 500,
};

/** Generic client-facing text. Upstream details and stack traces stay in server logs. */
export const PUBLIC_MESSAGE_BY_CODE: Record<ErrorCode, string> = {
  BAD_REQUEST: 'The request was invalid.',
  SYMBOL_NOT_FOUND: 'No data was found for that symbol.',
  RATE_LIMITED: 'Too many requests. Please try again shortly.',
  UPSTREAM_UNAVAILABLE: 'Market data is currently unavailable.',
  INTERNAL_ERROR: 'An unexpected error occurred.',
};

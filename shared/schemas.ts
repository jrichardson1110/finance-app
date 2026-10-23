import { z } from 'zod';

/**
 * API contract shared by the server (which builds these responses) and the
 * client (which validates them). Change a shape here and both sides must follow.
 */

export const TIME_WINDOWS = ['day', 'week', 'quarter'] as const;
export const TimeWindowSchema = z.enum(TIME_WINDOWS);
export type TimeWindow = z.infer<typeof TimeWindowSchema>;

/** Tickers such as IBM, BRK-B or SAP.DE. Upper-case only; inputs are upper-cased before matching. */
export const SYMBOL_PATTERN = /^[A-Z0-9.-]{1,10}$/;
export const MAX_SYMBOLS_PER_REQUEST = 10;
export const SymbolSchema = z.string().trim().toUpperCase().regex(SYMBOL_PATTERN);

export const QuoteSchema = z.object({
  symbol: z.string(),
  currency: z.string(),
  price: z.number(),
  previousClose: z.number(),
  change: z.number(),
  changePercent: z.number(),
});
export type Quote = z.infer<typeof QuoteSchema>;

export const PricePointSchema = z.object({
  /** Epoch milliseconds. */
  t: z.number(),
  close: z.number(),
});
export type PricePoint = z.infer<typeof PricePointSchema>;

export const PriceSeriesSchema = z.object({
  symbol: z.string(),
  window: TimeWindowSchema,
  points: z.array(PricePointSchema),
});
export type PriceSeries = z.infer<typeof PriceSeriesSchema>;

export const QuotesResponseSchema = z.object({ quotes: z.array(QuoteSchema) });
export type QuotesResponse = z.infer<typeof QuotesResponseSchema>;

export const ERROR_CODES = [
  'BAD_REQUEST',
  'SYMBOL_NOT_FOUND',
  'RATE_LIMITED',
  'UPSTREAM_UNAVAILABLE',
  'INTERNAL_ERROR',
] as const;
export const ErrorCodeSchema = z.enum(ERROR_CODES);
export type ErrorCode = z.infer<typeof ErrorCodeSchema>;

export const ErrorResponseSchema = z.object({
  error: z.object({ code: ErrorCodeSchema, message: z.string() }),
});
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;

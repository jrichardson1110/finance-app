// Domain types come from the shared API contract so client and server cannot drift.
export { SYMBOL_PATTERN } from '../shared/schemas.ts';
export type { PricePoint, PriceSeries, Quote, TimeWindow } from '../shared/schemas.ts';

/** A tracked company. */
export interface Company {
  symbol: string;
  name: string;
}

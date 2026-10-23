import type { Company } from '../types';

export const MAX_TRACKED_COMPANIES = 5;

/** The company the dashboard is about; peers are compared against it. */
export const FOCUS_SYMBOL = 'IBM';

/** IBM plus up to four competitors. Add or swap companies here only. */
export const COMPANIES: readonly Company[] = [
  { symbol: 'IBM', name: 'IBM' },
  { symbol: 'MSFT', name: 'Microsoft' },
  { symbol: 'ORCL', name: 'Oracle' },
  { symbol: 'SAP', name: 'SAP' },
  { symbol: 'CRM', name: 'Salesforce' },
];

export const SYMBOLS: readonly string[] = COMPANIES.map((c) => c.symbol);

export function companyName(symbol: string): string {
  return COMPANIES.find((c) => c.symbol === symbol)?.name ?? symbol;
}

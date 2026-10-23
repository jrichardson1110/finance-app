import { describe, expect, it } from 'vitest';
import { formatCurrency, formatPercent, formatSessionDate, formatTimestamp } from './format';

describe('formatPercent', () => {
  it('adds an explicit sign and two decimals', () => {
    expect(formatPercent(1.234)).toBe('+1.23%');
    expect(formatPercent(-0.5)).toBe('−0.50%');
    expect(formatPercent(0)).toBe('0.00%');
  });

  it('renders a dash for missing or non-finite values', () => {
    expect(formatPercent(undefined)).toBe('—');
    expect(formatPercent(Number.NaN)).toBe('—');
    expect(formatPercent(Number.POSITIVE_INFINITY)).toBe('—');
  });
});

describe('formatCurrency', () => {
  it('formats using the quote currency', () => {
    expect(formatCurrency(1234.5, 'USD')).toBe('$1,234.50');
    expect(formatCurrency(0, 'USD')).toBe('$0.00');
    expect(formatCurrency(10, 'EUR')).toBe('€10.00');
  });

  it('throws on an invalid currency code rather than silently mis-formatting', () => {
    expect(() => formatCurrency(1, 'NOPE!')).toThrow(RangeError);
  });
});

// Noon UTC keeps the calendar day stable in nearly every time zone.
const NOON_UTC = Date.UTC(2024, 2, 13, 12, 0, 0);

describe('formatTimestamp', () => {
  it('uses a time-of-day format for the day window', () => {
    expect(formatTimestamp(NOON_UTC, 'day')).toMatch(/^\d{2}:\d{2}\s?(AM|PM)$/);
  });

  it('includes the weekday for the week window', () => {
    expect(formatTimestamp(NOON_UTC, 'week')).toMatch(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\b/);
  });

  it('uses month and day for the quarter window', () => {
    expect(formatTimestamp(NOON_UTC, 'quarter')).toMatch(/^Mar 1[2-4]$/);
  });
});

describe('formatSessionDate', () => {
  it('shows weekday, month and day', () => {
    expect(formatSessionDate(NOON_UTC)).toMatch(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun), Mar 1[2-4]$/);
  });
});

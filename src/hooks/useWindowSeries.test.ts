import { describe, expect, it } from 'vitest';
import { unavailableFootnote, type WindowSeries } from './useWindowSeries';

const data = (failedSymbols: string[], allFailed = false): WindowSeries => ({
  series: [],
  failedSymbols,
  isLoading: false,
  allFailed,
  refetch: () => {},
});

describe('unavailableFootnote', () => {
  it('is undefined when every company loaded', () => {
    expect(unavailableFootnote(data([]))).toBeUndefined();
  });

  it('names each company that failed', () => {
    expect(unavailableFootnote(data(['SAP', 'ORCL']))).toBe('Data unavailable for: SAP, ORCL');
  });

  it('is undefined when everything failed, because the view shows a full error instead', () => {
    expect(unavailableFootnote(data(['SAP', 'ORCL'], true))).toBeUndefined();
  });
});

import { createFixtureFinanceService } from './fixtureFinanceService';
import { createHttpFinanceService } from './httpFinanceService';
import type { FinanceService } from './FinanceService';

export type DataMode = 'live' | 'fixture';

/** Live data is the default; set VITE_DATA_MODE=fixture for offline/demo data. */
export function resolveDataMode(value: string | undefined): DataMode {
  return value === 'fixture' ? 'fixture' : 'live';
}

/** Single place that decides which data source the app uses. */
export function createFinanceService(mode: DataMode = resolveDataMode(import.meta.env.VITE_DATA_MODE)): FinanceService {
  return mode === 'fixture' ? createFixtureFinanceService() : createHttpFinanceService();
}

export type { FinanceService } from './FinanceService';
export { FinanceServiceError } from './FinanceService';

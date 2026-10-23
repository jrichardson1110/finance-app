import { createContext, useContext, type ReactNode } from 'react';
import type { FinanceService } from './FinanceService';

const FinanceServiceContext = createContext<FinanceService | null>(null);

interface ProviderProps {
  service: FinanceService;
  children: ReactNode;
}

/** Injects the data source so components never construct or import a concrete provider. */
export function FinanceServiceProvider({ service, children }: ProviderProps) {
  return <FinanceServiceContext.Provider value={service}>{children}</FinanceServiceContext.Provider>;
}

export function useFinanceService(): FinanceService {
  const service = useContext(FinanceServiceContext);
  if (!service) throw new Error('useFinanceService must be used inside a FinanceServiceProvider');
  return service;
}

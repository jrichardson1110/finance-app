import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { AppShell } from './components/layout/AppShell';
import { DashboardPage } from './pages/DashboardPage';
import { FinanceServiceProvider } from './services/FinanceServiceContext';
import type { FinanceService } from './services';

interface AppProps {
  service: FinanceService;
}

export function App({ service }: AppProps) {
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } } }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <FinanceServiceProvider service={service}>
        <AppShell title="Market Dashboard" subtitle="IBM versus major competitors">
          <DashboardPage />
        </AppShell>
      </FinanceServiceProvider>
    </QueryClientProvider>
  );
}

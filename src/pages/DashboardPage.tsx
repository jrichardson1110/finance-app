import { useState } from 'react';
import { CompanySearchInput } from '../components/layout/CompanySearchInput';
import { WindowSelector } from '../components/layout/WindowSelector';
import { FOCUS_SYMBOL, SYMBOLS } from '../config/companies';
import { WINDOW_CONFIG } from '../config/windows';
import { useQuotes } from '../hooks/useQuotes';
import { useWindowSeries } from '../hooks/useWindowSeries';
import type { TimeWindow } from '../types';
import { DayView } from '../views/DayView';
import { QuarterView } from '../views/QuarterView';
import { UserCompanyCard } from '../views/UserCompanyCard';
import { WeekView } from '../views/WeekView';

const DEFAULT_CURRENCY = 'USD';

/** Owns the selected window and loads its data; each view only decides how to present it. */
export function DashboardPage() {
  const [window, setWindow] = useState<TimeWindow>('day');
  const [userSymbol, setUserSymbol] = useState('');
  const quotes = useQuotes(SYMBOLS);
  const data = useWindowSeries(window);

  const currency = quotes.data?.find((q) => q.symbol === FOCUS_SYMBOL)?.currency ?? DEFAULT_CURRENCY;

  return (
    <>
      <CompanySearchInput value={userSymbol} onChange={setUserSymbol} />
      <WindowSelector value={window} onChange={setWindow} />
      <section aria-label={`${WINDOW_CONFIG[window].label} view`}>
        {window === 'day' ? (
          <DayView
            quotes={{ data: quotes.data, isError: quotes.isError, refetch: () => void quotes.refetch() }}
            data={data}
          />
        ) : null}
        {window === 'week' ? <WeekView data={data} currency={currency} /> : null}
        {window === 'quarter' ? <QuarterView data={data} currency={currency} /> : null}
      </section>
      {userSymbol ? (
        <section className="user-company-section" aria-label={`${userSymbol} chart`}>
          <p className="user-company-section__heading">Your selection</p>
          <UserCompanyCard symbol={userSymbol} window={window} />
        </section>
      ) : null}
    </>
  );
}

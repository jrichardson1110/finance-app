import { lazy, Suspense, useState, type FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChartCard } from '../components/charts/ChartCard';
import { LoadingBlock } from '../components/feedback/LoadingBlock';
import { FOCUS_SYMBOL } from '../config/companies';
import { WINDOW_CONFIG } from '../config/windows';
import { buildComparisonRows } from '../domain/performance';
import { FinanceServiceError } from '../services/FinanceService';
import { useFinanceService } from '../services/FinanceServiceContext';
import { SYMBOL_PATTERN, type TimeWindow } from '../types';

const ComparisonLineChart = lazy(() =>
  import('../components/charts/ComparisonLineChart').then((m) => ({ default: m.ComparisonLineChart })),
);

interface CustomCompanyCardProps {
  window: TimeWindow;
}

export function CustomCompanyCard({ window }: CustomCompanyCardProps) {
  const [inputSymbol, setInputSymbol] = useState('');
  const [activeSymbol, setActiveSymbol] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const service = useFinanceService();

  const customQuery = useQuery({
    queryKey: ['customHistory', activeSymbol, window],
    queryFn: ({ signal }) => service.getHistory(activeSymbol!, window, signal),
    enabled: Boolean(activeSymbol),
    staleTime: WINDOW_CONFIG[window].staleTimeMs,
  });

  const focusQuery = useQuery({
    queryKey: ['history', FOCUS_SYMBOL, window],
    queryFn: ({ signal }) => service.getHistory(FOCUS_SYMBOL, window, signal),
    enabled: Boolean(activeSymbol && activeSymbol !== FOCUS_SYMBOL),
    staleTime: WINDOW_CONFIG[window].staleTimeMs,
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const input = (form.querySelector('input[name="symbol"]') ||
      form.querySelector('#custom-symbol-input')) as HTMLInputElement | null;
    const raw = input ? input.value : inputSymbol;
    const normalized = raw.trim().toUpperCase();

    if (!normalized) {
      setValidationError('Please enter a stock symbol.');
      return;
    }

    if (!SYMBOL_PATTERN.test(normalized)) {
      setValidationError('Invalid symbol format. Symbols must be 1-10 letters, numbers, dots, or dashes.');
      return;
    }

    setValidationError(null);
    setInputSymbol(normalized);
    setActiveSymbol(normalized);
  }

  function handleClear() {
    setInputSymbol('');
    setActiveSymbol(null);
    setValidationError(null);
  }

  let errorMessage: string | undefined;
  if (customQuery.isError) {
    const error = customQuery.error as (FinanceServiceError & { code?: string; message?: string }) | null;
    if (
      (error instanceof FinanceServiceError && error.code === 'SYMBOL_NOT_FOUND') ||
      error?.code === 'SYMBOL_NOT_FOUND' ||
      /unknown symbol|not found/i.test(error?.message ?? '')
    ) {
      errorMessage = `No data available for symbol "${activeSymbol}".`;
    } else {
      errorMessage = `Price history for "${activeSymbol}" is currently unavailable.`;
    }
  } else if (customQuery.data && customQuery.data.points.length === 0) {
    errorMessage = `No data available for symbol "${activeSymbol}".`;
  }

  const seriesList =
    customQuery.data && customQuery.data.points.length > 0
      ? activeSymbol === FOCUS_SYMBOL || !focusQuery.data
        ? [customQuery.data]
        : [focusQuery.data, customQuery.data]
      : [];

  const symbols =
    activeSymbol === FOCUS_SYMBOL || !focusQuery.data
      ? activeSymbol
        ? [activeSymbol]
        : []
      : [FOCUS_SYMBOL, activeSymbol!];

  return (
    <section className="custom-company-section" aria-label="Custom company comparison">
      <div className="custom-company-control">
        <form onSubmit={handleSubmit} className="custom-company-form" role="search" aria-label="Search company symbol">
          <label htmlFor="custom-symbol-input" className="custom-company-form__label">
            Look up another company:
          </label>
          <div className="custom-company-form__input-group">
            <input
              id="custom-symbol-input"
              name="symbol"
              type="text"
              className="custom-company-form__input"
              value={inputSymbol}
              onChange={(e) => {
                setInputSymbol(e.target.value);
                if (validationError) setValidationError(null);
              }}
              placeholder="e.g. AAPL, NVDA, GOOGL"
              maxLength={10}
              autoComplete="off"
              spellCheck="false"
            />
            <button type="submit" className="custom-company-form__submit">
              View chart
            </button>
            {activeSymbol ? (
              <button type="button" onClick={handleClear} className="custom-company-form__clear">
                Clear
              </button>
            ) : null}
          </div>
        </form>
        {validationError ? (
          <p className="custom-company-form__validation-error" role="alert">
            {validationError}
          </p>
        ) : null}
      </div>

      {activeSymbol ? (
        <ChartCard
          title={`${activeSymbol} performance`}
          description={`Relative performance rebased to 100 over ${WINDOW_CONFIG[window].label.toLowerCase()}${
            activeSymbol !== FOCUS_SYMBOL ? ` compared with ${FOCUS_SYMBOL}` : ''
          }.`}
          isLoading={customQuery.isPending || (activeSymbol !== FOCUS_SYMBOL && focusQuery.isPending)}
          errorMessage={errorMessage}
          onRetry={() => void customQuery.refetch()}
        >
          {seriesList.length > 0 ? (
            <Suspense fallback={<LoadingBlock label="Loading chart…" />}>
              <ComparisonLineChart
                rows={buildComparisonRows(seriesList)}
                symbols={symbols}
                window={window}
                ariaLabel={`${activeSymbol} relative trend over ${WINDOW_CONFIG[window].label.toLowerCase()}`}
              />
            </Suspense>
          ) : null}
        </ChartCard>
      ) : null}
    </section>
  );
}

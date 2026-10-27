import { lazy, Suspense, useState } from 'react';
import { ChartCard } from '../components/charts/ChartCard';
import { LoadingBlock } from '../components/feedback/LoadingBlock';
import { WINDOW_CONFIG } from '../config/windows';
import { buildComparisonRows } from '../domain/performance';
import { useUserSymbolSeries } from '../hooks/useUserSymbolSeries';
import type { TimeWindow } from '../types';

// Lazy so the charting library stays in its own chunk, consistent with RelativePerformanceCard.
const ComparisonLineChart = lazy(() =>
  import('../components/charts/ComparisonLineChart').then((m) => ({ default: m.ComparisonLineChart })),
);

interface UserChartSectionProps {
  window: TimeWindow;
  /** Symbol currently being shown (null = nothing selected yet). */
  selectedSymbol: string | null;
  /** Called with the normalised symbol when the user submits, or null when the input is cleared. */
  onSymbolChange: (symbol: string | null) => void;
}

function errorMessage(data: ReturnType<typeof useUserSymbolSeries>): string | undefined {
  if (!data.allFailed) return undefined;
  return `No data available for "${data.failedSymbols[0]}". Check the ticker symbol and try again.`;
}

/**
 * An isolated section below the main dashboards where users can look up any ticker.
 * Entering a symbol triggers a new history fetch; the existing IBM-vs-competitors views
 * are completely unaffected.
 */
export function UserChartSection({ window, selectedSymbol, onSymbolChange }: UserChartSectionProps) {
  const [inputValue, setInputValue] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const data = useUserSymbolSeries(selectedSymbol, window);
  const windowLabel = WINDOW_CONFIG[window].label.toLowerCase();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = inputValue.trim().toUpperCase();
    if (!trimmed) {
      setValidationError('Enter a ticker symbol, for example NVDA or AMZN.');
      return;
    }
    setValidationError(null);
    onSymbolChange(trimmed);
  }

  function handleClear() {
    setInputValue('');
    setValidationError(null);
    onSymbolChange(null);
  }

  return (
    <section className="user-chart-section" aria-label="Look up a company">
      <h2 className="user-chart-section__heading">Look up a company</h2>
      <p className="user-chart-section__description">
        Enter a ticker symbol to add an individual company chart for the current time window.
      </p>

      <form className="symbol-form" onSubmit={handleSubmit} noValidate>
        <label htmlFor="symbol-input" className="symbol-form__label">
          Ticker symbol
        </label>
        <div className="symbol-form__row">
          <input
            id="symbol-input"
            type="text"
            className="symbol-form__input"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="e.g. NVDA"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            aria-describedby={validationError ? 'symbol-input-error' : undefined}
          />
          <button type="submit" className="symbol-form__button">
            Show chart
          </button>
          {selectedSymbol ? (
            <button type="button" className="symbol-form__button symbol-form__button--secondary" onClick={handleClear}>
              Clear
            </button>
          ) : null}
        </div>
        {validationError ? (
          <p id="symbol-input-error" className="symbol-form__error" role="alert">
            {validationError}
          </p>
        ) : null}
      </form>

      {selectedSymbol ? (
        <ChartCard
          title={`${selectedSymbol} — ${WINDOW_CONFIG[window].label}`}
          description={`Price history for ${selectedSymbol} over the ${windowLabel}. Series rebased to 100 at the start of the window.`}
          isLoading={data.isLoading}
          errorMessage={errorMessage(data)}
          onRetry={data.refetch}
        >
          <Suspense fallback={<LoadingBlock label="Loading chart…" />}>
            <ComparisonLineChart
              rows={buildComparisonRows(data.series)}
              symbols={data.series.map((s) => s.symbol)}
              window={window}
              ariaLabel={`${selectedSymbol} price history over ${windowLabel}`}
            />
          </Suspense>
        </ChartCard>
      ) : null}
    </section>
  );
}

import type { ReactNode } from 'react';
import { ErrorPanel } from '../feedback/ErrorPanel';
import { LoadingBlock } from '../feedback/LoadingBlock';

interface ChartCardProps {
  title: string;
  description?: string;
  isLoading?: boolean;
  /** User-safe error message; when set it replaces the chart. */
  errorMessage?: string;
  onRetry?: () => void;
  /** Shown beneath the chart, e.g. which series are unavailable. */
  footnote?: string;
  children: ReactNode;
}

/** Reusable frame that gives any chart consistent title, loading and error behaviour. */
export function ChartCard({
  title,
  description,
  isLoading = false,
  errorMessage,
  onRetry,
  footnote,
  children,
}: ChartCardProps) {
  return (
    <section className="chart-card" aria-label={title}>
      <header className="chart-card__header">
        <h2>{title}</h2>
        {description ? <p>{description}</p> : null}
      </header>
      {isLoading ? (
        <LoadingBlock label={`Loading ${title.toLowerCase()}…`} />
      ) : errorMessage ? (
        <ErrorPanel message={errorMessage} onRetry={onRetry} />
      ) : (
        children
      )}
      {footnote ? <p className="chart-card__footnote">{footnote}</p> : null}
    </section>
  );
}

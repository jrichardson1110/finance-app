import { formatCurrency, formatPercent } from '../../domain/format';
import type { Quote } from '../../types';

interface QuoteCardProps {
  name: string;
  symbol: string;
  /** Undefined while loading or when the quote is unavailable. */
  quote?: Quote;
  /** Percent change over the window the card is being shown for. */
  windowChangePercent?: number;
  /** Label for the window figure, e.g. "Last 7 days". Omit to show only today's quote. */
  windowLabel?: string;
  /** Highlights the company the dashboard is about. */
  isFocus?: boolean;
}

function trend(value: number | undefined): 'up' | 'down' | 'flat' {
  if (value === undefined || value === 0) return 'flat';
  return value > 0 ? 'up' : 'down';
}

export function QuoteCard({ name, symbol, quote, windowChangePercent, windowLabel, isFocus = false }: QuoteCardProps) {
  return (
    <article className={`quote-card${isFocus ? ' quote-card--focus' : ''}`} aria-label={`${name} summary`}>
      <header className="quote-card__header">
        <h3>{name}</h3>
        <span className="quote-card__symbol">{symbol}</span>
      </header>
      {quote ? (
        <>
          <p className="quote-card__price">{formatCurrency(quote.price, quote.currency)}</p>
          <p className={`quote-card__change change--${trend(quote.changePercent)}`}>
            Today {formatPercent(quote.changePercent)}
          </p>
        </>
      ) : (
        <p className="quote-card__unavailable">Quote unavailable</p>
      )}
      {windowLabel ? (
        <p className={`quote-card__change change--${trend(windowChangePercent)}`}>
          {windowLabel} {formatPercent(windowChangePercent)}
        </p>
      ) : null}
    </article>
  );
}

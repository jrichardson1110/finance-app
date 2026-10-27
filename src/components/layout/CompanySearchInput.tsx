import { useState } from 'react';
import { SYMBOL_PATTERN } from '../../../shared/schemas';

interface CompanySearchInputProps {
  onSubmit: (symbol: string) => void;
}

/**
 * Text input for a user-supplied ticker symbol.
 * Validates the value against the shared SYMBOL_PATTERN before calling onSubmit.
 * The raw value is uppercased on submit so the user can type in either case.
 */
export function CompanySearchInput({ onSubmit }: CompanySearchInputProps) {
  const [raw, setRaw] = useState('');

  const trimmed = raw.trim().toUpperCase();
  const isInvalid = raw.trim().length > 0 && !SYMBOL_PATTERN.test(trimmed);
  const canSubmit = trimmed.length > 0 && !isInvalid;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (canSubmit) {
      onSubmit(trimmed);
    }
  }

  return (
    <form className="company-search" onSubmit={handleSubmit} aria-label="Company chart lookup">
      <div className="company-search__input-group">
        <label htmlFor="company-symbol-input" className="company-search__label">
          Ticker symbol
        </label>
        <input
          id="company-symbol-input"
          type="text"
          className="company-search__input"
          placeholder="e.g. NVDA"
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          aria-invalid={isInvalid || undefined}
          aria-describedby={isInvalid ? 'company-symbol-error' : undefined}
          autoComplete="off"
          spellCheck={false}
        />
        {isInvalid ? (
          <p id="company-symbol-error" className="company-search__error" role="alert">
            Enter a valid ticker (1–10 uppercase letters, digits, hyphens or dots).
          </p>
        ) : null}
      </div>
      <button type="submit" className="company-search__button" disabled={!canSubmit}>
        Show chart
      </button>
    </form>
  );
}

import { SYMBOL_PATTERN } from '../../../shared/schemas';

interface CompanySearchInputProps {
  value: string;
  onChange: (value: string) => void;
}

/**
 * Controlled text input for a user-supplied ticker symbol.
 * Normalises to uppercase and rejects characters that cannot form a valid symbol
 * before forwarding the value, so invalid text never reaches the data layer.
 */
export function CompanySearchInput({ value, onChange }: CompanySearchInputProps) {
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.toUpperCase();
    // Allow an empty field (clearing) or any prefix that still matches the pattern.
    // The full-string check keeps partial typing (e.g. "BRK") valid while
    // still blocking characters that can never appear in a symbol (e.g. spaces).
    if (raw === '' || SYMBOL_PATTERN.test(raw)) {
      onChange(raw);
    }
  }

  return (
    <div className="company-search">
      <label className="company-search__label" htmlFor="company-search-input">
        Look up a company
      </label>
      <input
        id="company-search-input"
        className="company-search__input"
        type="text"
        value={value}
        onChange={handleChange}
        placeholder="e.g. AAPL"
        aria-label="Company ticker symbol"
        maxLength={10}
        autoComplete="off"
        spellCheck={false}
      />
    </div>
  );
}

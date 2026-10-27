# Feature Request Analysis: User-Selected Company Chart

**Branch:** `feature/user-selected-company-chart`  
**Source document:** `docs/pr-feature-request-example.md`  
**Date analysed:** 2026-10-23

---

## 1. Feature Summary

The existing dashboard fixes its universe of companies at build time — IBM plus four competitors
(`MSFT`, `ORCL`, `SAP`, `CRM`) — and every view, chart, and table operates over that hardcoded set.
The request asks for an additional graph that renders price history for **any ticker the user supplies**,
without touching or hiding the IBM comparison dashboards.

> "We now want users to indicate a company symbol and see an additional graph for that company
> without removing the existing dashboard views."
> — `docs/pr-feature-request-example.md`

---

## 2. Acceptance Criteria

Derived from the stated expected behaviour and suggested criteria in the feature request.

| # | Criterion | Verifiable signal |
|---|-----------|-------------------|
| AC-1 | User can enter or select a ticker symbol | An input (or select) control exists on the page |
| AC-2 | Input is validated before a request is made | Non-empty, matches `/^[A-Z0-9.-]{1,10}$/` (`SYMBOL_PATTERN` in `shared/schemas.ts`) |
| AC-3 | A loading skeleton is shown while data is fetching | `LoadingBlock` (or equivalent) renders when `isPending` is true |
| AC-4 | An error state is shown when the symbol is invalid or unavailable | `ErrorPanel` renders for `SYMBOL_NOT_FOUND` / `UPSTREAM_UNAVAILABLE` |
| AC-5 | A price-history chart renders for the selected company | `ComparisonLineChart` or `ChangeBarChart` renders with the returned `PriceSeries` |
| AC-6 | The time-window selector (Day / Week / Quarter) also controls the new chart | Selected window drives the `getHistory` call for the user symbol |
| AC-7 | All existing IBM comparison views remain visible and unmodified | No regressions in `DayView`, `WeekView`, `QuarterView` |
| AC-8 | Tests or test updates cover the new input control and chart rendering | New or updated `*.test.tsx` passes under `npm run validate` |

---

## 3. Codebase Assessment

### 3.1 Architecture snapshot

```
App
└── DashboardPage          (owns window state + orchestrates data)
    ├── WindowSelector     (Day / Week / Quarter toggle)
    ├── DayView            (quotes + ChangeBarCard + RelativePerformanceCard)
    ├── WeekView           (Highlights + RelativePerformanceCard + PerformanceTable)
    └── QuarterView        (Highlights + ChangeBarCard + RelativePerformanceCard + PerformanceTable)
```

Key data path:
```
DashboardPage
  └── useWindowSeries(window)
        └── useHistories(SYMBOLS, window)       ← SYMBOLS is the hardcoded const
              └── useQueries → FinanceService.getHistory(symbol, window)
```

Both `useWindowSeries` and the three views hard-reference `SYMBOLS` and `FOCUS_SYMBOL` from
`src/config/companies.ts`. No runtime-selection mechanism exists today.

### 3.2 What the existing code does well

- `FinanceService.getHistory(symbol, window)` already accepts **any** symbol string — the API layer
  is generic. No server change is needed for the happy path.
- `useHistories` accepts a `symbols` array, making it straightforward to call with a single
  user-supplied symbol.
- `ComparisonLineChart` and `ChangeBarChart` are purely presentational — they accept props; they do
  not reach into config.
- `ChartCard` already handles loading, error, and retry states uniformly.
- The `FinanceServiceError` already distinguishes `SYMBOL_NOT_FOUND` from `UPSTREAM_UNAVAILABLE`,
  which can power differentiated error messages.

### 3.3 Gaps / required changes

| Area | Current state | Change needed |
|------|--------------|---------------|
| **State** | No selected-symbol state exists | Add `selectedSymbol: string \| null` to `DashboardPage` (or a new sub-page) |
| **Input control** | None | New `CompanySearchInput` component — text field + submit, with client-side validation |
| **Data hook** | `useWindowSeries` is hard-wired to `SYMBOLS` | Add `useSymbolSeries(symbol, window)` that calls `useHistories([symbol], window)` |
| **View / card** | No card renders a single-company chart | New `UserCompanyCard` view that wraps `RelativePerformanceCard` (or `ChangeBarChart`) |
| **Fixture service** | `assertKnown()` throws for unknown symbols | Acceptable — the error path is the intended behaviour for unknown symbols in the fixture |
| **CSS** | No layout slot for the new card | Add a section beneath the existing view grid, or reuse `.chart-card` styles |
| **Tests** | No tests for user-symbol flow | Add tests for `CompanySearchInput` validation + `UserCompanyCard` loading/error/success states |

---

## 4. Detailed Implementation Plan

### 4.1 New state in `DashboardPage`

Add a second piece of state for the user's chosen symbol, initialised to `null`:

```tsx
// src/pages/DashboardPage.tsx
const [userSymbol, setUserSymbol] = useState<string | null>(null);
```

This keeps all data-driving state co-located in one place, consistent with the existing
`window` state ownership comment: *"Owns the selected window and loads its data."*

### 4.2 New component: `CompanySearchInput`

Location: `src/components/layout/CompanySearchInput.tsx`

Responsibilities:
- Render a labelled text input and a "Show chart" submit button.
- Convert the raw value to uppercase (mirrors `SymbolSchema` in `shared/schemas.ts`).
- Block submission if the trimmed, uppercased value does not match `SYMBOL_PATTERN`.
- Call `onSubmit(symbol)` only on valid input.
- Expose a `value` + `onChange` pattern so `DashboardPage` keeps the source of truth.

```tsx
interface CompanySearchInputProps {
  onSubmit: (symbol: string) => void;
}
```

Validation rule (reuse the shared constant):
```tsx
import { SYMBOL_PATTERN } from '../../../shared/schemas';
const isValid = SYMBOL_PATTERN.test(raw.trim().toUpperCase());
```

Accessible markup requirements:
- `<label>` associated with the `<input>` via `htmlFor` / `id`.
- `aria-invalid` on the input when the value is present but fails validation.
- `aria-describedby` pointing at an inline error message when invalid.
- Submit button disabled when input is empty or invalid.

### 4.3 New hook: `useSymbolSeries`

Location: `src/hooks/useSymbolSeries.ts`

A thin wrapper around the existing `useHistories` hook, accepting a nullable symbol so
`DashboardPage` can call it unconditionally:

```ts
export function useSymbolSeries(symbol: string | null, window: TimeWindow): SymbolSeries {
  const histories = useHistories(symbol ? [symbol] : [], window);
  const result = histories[0];
  return {
    data: result?.data ?? null,
    isLoading: result?.isPending ?? false,
    isError: result?.isError ?? false,
    errorCode: ...,   // extracted from result.error if it is a FinanceServiceError
    refetch: () => void result?.refetch(),
  };
}
```

The hook must **not** fire when `symbol` is `null` — achieved by passing an empty array to
`useHistories`, which calls `useQueries` with zero queries (TanStack Query handles this safely).

### 4.4 New view: `UserCompanyCard`

Location: `src/views/UserCompanyCard.tsx`

Renders the user-selected company chart inside a `ChartCard`. Uses `RelativePerformanceCard`
internally (rebase-to-100 line chart) or renders `ChangeBarChart` for a single series.
A `RelativePerformanceCard` with a single series is the simplest approach — no new chart
component required.

States handled:
- `symbol === null` → render nothing (or a placeholder prompt).
- `isLoading` → `ChartCard` shows `LoadingBlock` automatically.
- `isError` and `errorCode === 'SYMBOL_NOT_FOUND'` → targeted message: *"Symbol not found."*
- `isError` and other codes → generic: *"Price history is currently unavailable."*
- success → line chart with a single series.

### 4.5 Changes to `DashboardPage`

```tsx
// 1. Add state
const [userSymbol, setUserSymbol] = useState<string | null>(null);

// 2. Load user symbol data
const userSeriesData = useSymbolSeries(userSymbol, window);

// 3. Render search input above the existing view section
<CompanySearchInput onSubmit={setUserSymbol} />

// 4. Render user chart below the existing view (outside the window-conditional block)
<UserCompanyCard symbol={userSymbol} data={userSeriesData} window={window} />
```

The existing `window` state, `quotes`, and `data` (from `useWindowSeries`) are untouched.

### 4.6 Fixture service compatibility

`fixtureFinanceService.ts` uses a `BASE_PRICES` lookup and throws `FinanceServiceError('SYMBOL_NOT_FOUND')`
for unknown symbols. This is the correct offline behaviour — it allows testing the error state without
network access. No change to the fixture service is needed.

If a realistic demo with a custom symbol is desired during development, add an entry to `BASE_PRICES`
in the fixture service (e.g., `NVDA: 950`). This is optional and does not affect production.

### 4.7 CSS additions

Add to `src/styles/app.css`:

```css
/* User company chart — sits below the time-windowed views */
.user-company-section { margin-top: 24px; }

/* Inline validation error for the symbol input */
.company-search { display: flex; gap: 8px; align-items: flex-end; margin-bottom: 16px; }
.company-search__input-group { display: flex; flex-direction: column; gap: 4px; }
.company-search__error { color: var(--down); font-size: 0.8rem; }
```

No existing class names should be modified.

---

## 5. Non-Breaking Strategy

The central risk is accidentally altering the IBM comparison views. The following constraints
prevent that:

1. **`SYMBOLS`, `FOCUS_SYMBOL`, `COMPANIES`** in `src/config/companies.ts` are read-only and
   must not be modified. The user-symbol flow is entirely separate.

2. **`useWindowSeries`** must not be modified. The new `useSymbolSeries` hook is a parallel
   path that reads from the same cache keys (`['history', symbol, window]`) — if the user
   happens to enter `IBM`, the result is served from the React Query cache.

3. **`DayView`, `WeekView`, `QuarterView`** must not receive any new props or conditionals.
   The user card is rendered by `DashboardPage` outside the `window`-conditional block.

4. **`ChartCard`, `ComparisonLineChart`, `ChangeBarChart`** are unchanged — the user card
   reuses them as-is.

5. **All existing tests must continue to pass** with zero modification. New tests are additive.

---

## 6. Files to Create

| File | Purpose |
|------|---------|
| `src/components/layout/CompanySearchInput.tsx` | Symbol text input with validation |
| `src/hooks/useSymbolSeries.ts` | Hook: loads one user-selected symbol |
| `src/views/UserCompanyCard.tsx` | Card: renders line chart for user symbol |
| `src/components/layout/CompanySearchInput.test.tsx` | Tests: input validation, submit, aria states |
| `src/views/UserCompanyCard.test.tsx` | Tests: loading, error, success render paths |

---

## 7. Files to Modify

| File | Change |
|------|--------|
| `src/pages/DashboardPage.tsx` | Add `userSymbol` state, `useSymbolSeries` call, `CompanySearchInput`, `UserCompanyCard` |
| `src/styles/app.css` | Add `.company-search` and `.user-company-section` classes |

---

## 8. Files That Must Not Change

| File | Reason |
|------|--------|
| `src/config/companies.ts` | IBM comparison universe must remain hardcoded |
| `src/hooks/useWindowSeries.ts` | Existing views depend on this contract |
| `src/views/DayView.tsx` | Must remain unmodified |
| `src/views/WeekView.tsx` | Must remain unmodified |
| `src/views/QuarterView.tsx` | Must remain unmodified |
| `src/components/charts/ComparisonLineChart.tsx` | Reused as-is |
| `src/components/charts/ChangeBarChart.tsx` | Reused as-is |
| `shared/schemas.ts` | API contract is already sufficient; `SYMBOL_PATTERN` is reused |
| `server/` | No server changes required |

---

## 9. Validation Checklist

All of the following must pass before the branch is ready for review:

- [ ] `npm run validate` (lint + typecheck + test + build) exits with code 0
- [ ] Entering a valid ticker (e.g., `NVDA`) renders a chart for that company
- [ ] Entering a lowercase ticker (e.g., `nvda`) is auto-uppercased before submission
- [ ] Entering an invalid string (e.g., `!!!`) disables the submit button and shows an inline error
- [ ] Submitting a symbol the server does not recognise shows the "Symbol not found" error panel
- [ ] The Day, Week, and Quarter views for IBM/MSFT/ORCL/SAP/CRM render correctly
- [ ] No new TypeScript errors or ESLint warnings

---

## 10. Open Questions

| Question | Recommendation |
|----------|---------------|
| Should the user-symbol chart respect the same `TimeWindow` as the main dashboard? | **Yes** — simplest UX, single `window` state controls everything |
| Should the selected symbol persist across window changes (Day → Week)? | **Yes** — `userSymbol` state sits above the window-conditional block |
| Should the selected symbol persist across page refreshes? | **Out of scope** — `useState` is sufficient for this request; URL state or `localStorage` can be a follow-up |
| Should the user be able to compare multiple custom symbols? | **Out of scope** — the request says "a company" (singular); multi-symbol is a separate feature |
| Should the `fixtureFinanceService` support arbitrary symbols for demo purposes? | **Optional** — add entries to `BASE_PRICES` if a live-demo with a custom symbol is required offline |

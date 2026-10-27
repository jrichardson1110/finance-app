# Feature Request Analysis: User-Selected Company Chart

**Branch:** `feature/user-selected-company-chart`  
**Source document:** [`docs/pr-feature-request-example.md`](pr-feature-request-example.md)  
**Prepared by:** IBM Bob  
**Date:** 2025

---

## 1. Request Summary

> *"Add a graph for a user-selected company"*

The existing finance dashboard compares IBM with a fixed set of four competitors (Microsoft, Oracle, SAP, Salesforce). These are hard-coded in `src/config/companies.ts` and are consumed uniformly by every view. The request asks for an **additional graph** driven by an arbitrary ticker symbol the user provides at runtime — without removing or altering the existing IBM-vs-competitors dashboards.

---

## 2. Acceptance Criteria

The following criteria are derived from the feature request in `docs/pr-feature-request-example.md` and from an analysis of what the existing application already handles:

| # | Criterion | Notes |
|---|-----------|-------|
| AC-1 | The user can enter or select an arbitrary ticker symbol | A text input or dropdown must be added to the UI |
| AC-2 | The symbol input is validated before a fetch is triggered | Empty, whitespace-only, or obviously invalid input must not reach the service layer |
| AC-3 | A loading state is shown while the history is being fetched | Consistent with how `ChartCard` already handles loading across existing views |
| AC-4 | An error state is shown when the symbol is invalid or the upstream service is unavailable | `FinanceServiceError.code` values `SYMBOL_NOT_FOUND` and `UPSTREAM_UNAVAILABLE` must be surfaced |
| AC-5 | A price-history chart renders for the selected company | The chart must use the same time window that is currently active on the dashboard |
| AC-6 | The existing IBM-vs-competitor dashboards (Day / Week / Quarter views) are completely unaffected | No changes to `COMPANIES`, `SYMBOLS`, `FOCUS_SYMBOL`, `useWindowSeries`, `DayView`, `WeekView`, or `QuarterView` |
| AC-7 | At least one test covers the new component or hook behaviour | New unit or integration test covering the happy path and the error path |

---

## 3. What the Existing Codebase Already Provides

Before listing changes it is important to understand what does **not** need to be built:

| Existing asset | What it gives the new feature for free |
|---|---|
| `useHistories(symbols, window)` in `src/hooks/useHistories.ts` | Fetches one `PriceSeries` per symbol via TanStack Query; already supports an arbitrary symbol array |
| `FinanceService.getHistory(symbol, window, signal)` in `src/services/FinanceService.ts` | Contract already accepts any ticker string; the HTTP and fixture implementations already validate the symbol server-side |
| `buildComparisonRows(seriesList)` in `src/domain/performance.ts` | Rebases and merges series; works identically for one series as for five |
| `ComparisonLineChart` in `src/components/charts/ComparisonLineChart.tsx` | Accepts `rows` and `symbols` as props; completely symbol-agnostic |
| `ChartCard` in `src/components/charts/ChartCard.tsx` | Provides title, description, loading, error, and footnote framing for any chart |
| `WINDOW_CONFIG[window]` in `src/config/windows.ts` | Stale time and label are already available for the selected window |
| `FinanceServiceError` codes | `SYMBOL_NOT_FOUND` already exists and is thrown by both service implementations |

The net result is that **no changes are needed in the data service layer, the shared schema, the server, or any existing view**. The entire feature sits in new UI state and one new React component.

---

## 4. Required Changes

### 4.1 UI State — `src/pages/DashboardPage.tsx`

**What to change:** Add a `selectedSymbol: string | null` state variable (initially `null`) and a `pendingSymbol: string` state variable for the controlled input. Pass both to the new `UserChartSection` component described below. The existing `window`, `quotes`, and `data` state remain unchanged.

**Why `DashboardPage`:** It is the page-level owner of all dashboard state, consistent with the existing pattern where `window` state lives here and is threaded down to views. Keeping the selected symbol here means it persists when the user switches time windows, which is the correct product behaviour.

**Minimal diff sketch:**

```tsx
// src/pages/DashboardPage.tsx  (additions only; existing lines unchanged)
const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
```

Then, below the existing `<section>` for the current window, add:

```tsx
<UserChartSection
  window={window}
  selectedSymbol={selectedSymbol}
  onSymbolChange={setSelectedSymbol}
/>
```

### 4.2 New Component — `src/views/UserChartSection.tsx`

This component owns the symbol input, the on-demand fetch, and the chart. It is a *view* (like `DayView`, `WeekView`, `QuarterView`) because it uses a hook and composes presentational components; it does not fetch directly.

**Responsibilities:**

1. Render a labelled text input that accepts a ticker symbol.
2. Validate the trimmed input on the submit action (non-empty, uppercase normalisation).
3. Call `useHistories([selectedSymbol], window)` only when `selectedSymbol` is non-null, using TanStack Query's `enabled` option.
4. Map the query result to `ChartCard` + `ComparisonLineChart` using the same pattern as `RelativePerformanceCard`.
5. Surface `SYMBOL_NOT_FOUND` with a friendly message distinct from the generic upstream-unavailable message.

**Interface sketch:**

```tsx
interface UserChartSectionProps {
  window: TimeWindow;
  selectedSymbol: string | null;
  onSymbolChange: (symbol: string | null) => void;
}
```

**State inside the component:**

| State variable | Type | Purpose |
|---|---|---|
| `inputValue` | `string` | Controlled text-input value (before the user submits) |
| `validationError` | `string \| null` | Client-side validation message shown inline |

**Key implementation note — avoid dual-state drift:** The component should keep `inputValue` as the uncommitted draft. The committed value (`selectedSymbol`) lives in `DashboardPage` and only changes when the user explicitly submits (button click or Enter key). This prevents a fetch being triggered on every keystroke.

### 4.3 New Hook — `src/hooks/useUserSymbolSeries.ts`

Wraps `useHistories` to encapsulate the single-symbol, conditionally-enabled query pattern. Keeps `UserChartSection` free of direct TanStack Query logic and makes the hook independently testable.

```ts
// Returns the same WindowSeries shape so UserChartSection can pass it straight to ChartCard.
export function useUserSymbolSeries(symbol: string | null, window: TimeWindow): WindowSeries
```

**Implementation:** Call `useHistories` with `[symbol]` when `symbol` is non-null and an empty array otherwise, or use TanStack Query's `enabled: symbol !== null` option. Return a `WindowSeries`-compatible object. No changes to `useHistories` or `useWindowSeries`.

### 4.4 Input Component / Symbol Selector

A minimal accessible input that fits the existing CSS conventions. No new third-party library is needed — the existing pattern of plain HTML with BEM class names used throughout the codebase (e.g., `window-selector`, `quote-card`) is sufficient.

Minimum required elements:
- `<form>` with `onSubmit` (prevents page reload, calls `onSymbolChange`)
- `<label>` associated to the `<input>` via `htmlFor` / `id`
- `<input type="text">` — `aria-label` or visible label required for accessibility
- `<button type="submit">` with explicit label
- Inline validation error rendered in a `role="alert"` element

### 4.5 `src/services/fixtureFinanceService.ts` — No Change Required (Caveat)

The fixture service throws `FinanceServiceError('SYMBOL_NOT_FOUND', ...)` for any symbol not in `BASE_PRICES`. This correctly exercises the error path when running `npm run dev:fixture`. No code change is needed, but test authors should be aware that the fixture service only serves IBM, MSFT, ORCL, SAP, and CRM.

---

## 5. How Existing Dashboards Are Protected

The feature request explicitly requires that the existing dashboards remain intact. The implementation strategy ensures this through strict isolation:

| Risk | Mitigation |
|---|---|
| New symbol leaking into the company registry | `COMPANIES` and `SYMBOLS` in `src/config/companies.ts` are **never modified**; the user symbol is held only in component state |
| `useWindowSeries` returning unexpected data | `useWindowSeries` reads from `SYMBOLS` directly; it is never called with the user symbol |
| `DayView`, `WeekView`, `QuarterView` receiving extra data | These views receive only `data` (from `useWindowSeries(window)`) and `quotes` (from `useQuotes(SYMBOLS)`); neither is changed |
| Chart styles being re-mapped | `ComparisonLineChart` uses `SERIES_STYLES[index % SERIES_STYLES.length]`; index 0 is always the IBM blue for the existing charts because symbol arrays are built from `data.series.map(s => s.symbol)`, which comes from the fixed `SYMBOLS` |
| Quote cards on Day view showing the user company | `DayView` maps over `COMPANIES` for quote cards; the user symbol is not in `COMPANIES` |
| `FOCUS_SYMBOL` rank logic breaking | `Highlights` and `PerformanceTable` receive `focusSymbol={FOCUS_SYMBOL}` via props; the user chart section does not use these components |

---

## 6. Data Service Layer — No Changes Needed

`FinanceService.getHistory(symbol, window, signal)` already accepts any ticker string. The HTTP service sends `GET /api/history?symbol=<user-input>&window=<window>` and the Express server (`server/app.ts`) validates the symbol via the upstream provider, returning `SYMBOL_NOT_FOUND` for unrecognised tickers. The fixture service does the same via `assertKnown`. Both error paths are already mapped to `FinanceServiceError`.

The only data-layer concern is **input sanitisation** before the symbol is committed:
- Trim whitespace
- Uppercase normalise (Yahoo Finance symbols are upper-case)
- Reject empty strings client-side before triggering a query

---

## 7. Test Strategy

| Test | Location | What to cover |
|---|---|---|
| `useUserSymbolSeries` hook | `src/hooks/useUserSymbolSeries.test.ts` | Returns loading state; resolves to a `WindowSeries` for a known symbol; returns `allFailed: true` for an unknown symbol |
| `UserChartSection` — happy path | `src/views/UserChartSection.test.tsx` | Renders input; submitting a valid symbol triggers a query; chart appears after data loads |
| `UserChartSection` — validation | `src/views/UserChartSection.test.tsx` | Submitting an empty input shows a validation error; no query is triggered |
| `UserChartSection` — error state | `src/views/UserChartSection.test.tsx` | Service throws `SYMBOL_NOT_FOUND`; error message is shown; existing dashboards are not re-rendered |
| `DashboardPage` — isolation | `src/pages/DashboardPage.test.tsx` (new or extend `App.test.tsx`) | Adding a user symbol does not change the symbols passed to `useWindowSeries` |

All new tests should use the `fixtureFinanceService` (IBM, MSFT, ORCL, SAP, CRM for happy paths; any other symbol for error paths) consistent with the existing test suite.

---

## 8. File Change Summary

| File | Action | Reason |
|---|---|---|
| `src/pages/DashboardPage.tsx` | Modify | Add `selectedSymbol` state; render `UserChartSection` below existing views |
| `src/views/UserChartSection.tsx` | **Create** | New view: symbol input + conditional chart |
| `src/hooks/useUserSymbolSeries.ts` | **Create** | Hook that wraps `useHistories` for a single optional symbol |
| `src/views/UserChartSection.test.tsx` | **Create** | Unit tests for the new view |
| `src/hooks/useUserSymbolSeries.test.ts` | **Create** | Unit tests for the new hook |
| `src/config/companies.ts` | **No change** | |
| `src/hooks/useWindowSeries.ts` | **No change** | |
| `src/views/DayView.tsx` | **No change** | |
| `src/views/WeekView.tsx` | **No change** | |
| `src/views/QuarterView.tsx` | **No change** | |
| `src/services/*.ts` | **No change** | |
| `server/` | **No change** | |
| `shared/schemas.ts` | **No change** | |

---

## 9. Open Questions / Follow-Up Items

1. **Symbol persistence** — Should the selected symbol survive a page refresh? The current state-only approach does not persist. A URL query param (`?symbol=NVDA`) would make the view shareable with no additional server work.
2. **Multiple user symbols** — The request is scoped to "at least one". If the product need grows to multiple simultaneously-selected symbols, `selectedSymbol: string | null` can be widened to `selectedSymbols: string[]` with minimal impact to the rest of the architecture.
3. **Fixture test data** — The fixture service only knows five symbols. Tests that need an error path can use any other symbol (e.g. `FAKE`). If the happy-path test coverage needs a wider set, `BASE_PRICES` in `fixtureFinanceService.ts` can be extended, but this is optional for the initial implementation.
4. **Rate limiting** — The server already applies a rate limit. Rapid symbol changes by the user will hit the same limit. No additional throttling is required for the initial feature; a debounce on the input is a quality-of-life improvement for a follow-up.

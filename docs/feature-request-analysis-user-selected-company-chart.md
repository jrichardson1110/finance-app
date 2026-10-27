# Feature Request Analysis: User-Selected Company Chart

**Source:** `docs/pr-feature-request-example.md` — "Add a graph for a user-selected company"  
**Branch:** `feature/user-selected-company-chart`  
**Date:** 2025-07  
**Author:** Bob (IBM AI Coding Assistant)

---

## 1. Request Summary

The existing finance dashboard displays a fixed comparison of **IBM against four
hard-coded competitors** (Microsoft, Oracle, SAP, Salesforce). The request asks for
an additional section that lets a user supply any valid ticker symbol and view its
price-history graph without removing or altering the existing IBM comparison views.

### Verbatim Expected Behaviour (from the request)

| # | Behaviour |
|---|-----------|
| 1 | The user can enter or select a ticker symbol. |
| 2 | The application validates the symbol input. |
| 3 | The application loads data for the selected company. |
| 4 | A new graph appears for the selected company. |
| 5 | The existing IBM and competitor dashboards remain visible. |

---

## 2. Acceptance Criteria

The criteria below are derived directly from the request's "Suggested Acceptance
Criteria" and the codebase's existing quality standards.

### Functional

| ID | Criterion | Priority |
|----|-----------|----------|
| AC-1 | A text input accepts any ticker symbol that matches `SYMBOL_PATTERN` (`/^[A-Z0-9.-]{1,10}$/`). | Must |
| AC-2 | The input is case-insensitive; lowercase is normalised to uppercase before submission. | Must |
| AC-3 | While data is loading, a loading indicator replaces the chart. | Must |
| AC-4 | When the symbol is unknown or the upstream is unavailable, an error state with a retry action is shown. | Must |
| AC-5 | When data loads successfully, a line chart of the symbol's relative performance is displayed. | Must |
| AC-6 | The existing IBM + competitor views (`DayView`, `WeekView`, `QuarterView`) are entirely unaffected. | Must |
| AC-7 | The selected window (Day / Last 7 days / Last quarter) drives the user chart just as it drives the comparison charts. | Should |
| AC-8 | An empty input clears the chart section rather than showing an error. | Should |

### Non-Functional

| ID | Criterion |
|----|-----------|
| AC-9 | The charting library chunk is not pulled into the main bundle (lazy-load, matching the existing pattern). |
| AC-10 | At least one unit test covers the new hook; at least one component test covers the new view section. |
| AC-11 | The new UI control is keyboard-accessible and labelled for screen readers. |
| AC-12 | Symbol validation reuses `SYMBOL_PATTERN` from `shared/schemas.ts`; no duplicate regex. |

---

## 3. Codebase Archaeology

### 3.1 Data Flow (existing)

```
DashboardPage
  ├── useWindowSeries(window)           # calls useHistories(SYMBOLS, window)
  │     └── useHistories(symbols, win)  # one useQuery per symbol → FinanceService.getHistory
  ├── useQuotes(SYMBOLS)                # one useQuery → FinanceService.getQuotes
  ├── DayView   → ChangeBarCard, RelativePerformanceCard
  ├── WeekView  → Highlights, RelativePerformanceCard, PerformanceTable
  └── QuarterView → Highlights, ChangeBarCard, RelativePerformanceCard, PerformanceTable
```

`SYMBOLS` in `src/config/companies.ts` is the single authoritative list
`['IBM', 'MSFT', 'ORCL', 'SAP', 'CRM']`. Every existing hook and view reads it
from this constant; nothing is prop-threaded.

### 3.2 Key Extension Points

| File | Role | What changes |
|------|------|--------------|
| `src/config/companies.ts` | Symbol registry | **No change.** The user's symbol lives outside the registry. |
| `shared/schemas.ts` | `SYMBOL_PATTERN`, `FinanceService` contract | **No change.** Reuse `SYMBOL_PATTERN` for input validation. |
| `src/services/FinanceService.ts` | Interface | **No change.** `getHistory(symbol, window)` already accepts any string. |
| `src/services/fixtureFinanceService.ts` | Offline provider | **Extend `BASE_PRICES`** or make `assertKnown` more permissive for test symbols. |
| `src/hooks/useHistories.ts` | Per-symbol query | **No change.** Already parameterised on an arbitrary `symbols` array. |
| `src/hooks/useWindowSeries.ts` | Multi-symbol aggregation | **No change** for the existing comparison. A new single-symbol variant is needed. |
| `src/pages/DashboardPage.tsx` | Page state | **Extend:** add `userSymbol` state and render the new section. |

### 3.3 What Must NOT Change

- `COMPANIES`, `SYMBOLS`, `FOCUS_SYMBOL` in `src/config/companies.ts`.
- The signature or behaviour of `useWindowSeries`.
- All three view components (`DayView`, `WeekView`, `QuarterView`) and their
  subordinate cards (`ChangeBarCard`, `RelativePerformanceCard`, etc.).
- The `FinanceService` interface and both its implementations (HTTP and fixture)
  for their existing symbol sets.

---

## 4. Required Changes

### 4.1 New: `src/components/layout/CompanySearchInput.tsx`

A controlled text input that:

- Accepts a `value: string` and `onChange: (value: string) => void`.
- Normalises input to uppercase on every keystroke.
- Renders an accessible `<label>` and an `<input type="text">`.
- Does **not** own any query or loading state — that belongs in the hook.

```tsx
// Minimal shape
interface CompanySearchInputProps {
  value: string;
  onChange: (value: string) => void;
}
```

### 4.2 New: `src/hooks/useSymbolSeries.ts`

A single-symbol variant of `useWindowSeries` that:

- Accepts `(symbol: string | null, window: TimeWindow)`.
- Returns `null`/idle when `symbol` is `null` or empty.
- Calls `useHistories([symbol], window)` (the existing hook) when a symbol is
  provided — **no new query logic**, just a thin adapter.
- Returns `{ series, isLoading, isError, errorCode, refetch }` shaped for the
  new card to consume.

```ts
// Return shape
interface SymbolSeries {
  series: PriceSeries | undefined;
  isLoading: boolean;
  isError: boolean;
  errorCode?: 'SYMBOL_NOT_FOUND' | 'UPSTREAM_UNAVAILABLE';
  refetch: () => void;
}
```

> **Why a new hook instead of reusing `useWindowSeries`?**  
> `useWindowSeries` is hardwired to the full `SYMBOLS` constant and returns an
> array-centric `WindowSeries` type. Passing a user symbol through it would
> either mutate the constant (forbidden) or create a branching overload that
> complicates its single responsibility. A thin adapter hook keeps the
> separation clean and is independently testable.

### 4.3 New: `src/views/UserCompanyCard.tsx`

A self-contained view card that:

- Accepts `(symbol: string, window: TimeWindow)`.
- Calls `useSymbolSeries(symbol, window)` internally.
- Wraps `RelativePerformanceCard` (or renders a `ChartCard` directly) once data
  is available.
- Delegates loading and error rendering to `ChartCard`'s built-in states.
- Renders nothing (returns `null`) when `symbol` is empty.

This keeps `DashboardPage` thin — it only passes the symbol string down.

### 4.4 Modify: `src/pages/DashboardPage.tsx`

Two additions:

1. A `userSymbol` state (`useState<string>('')`).
2. A `<CompanySearchInput>` rendered **above** the `<WindowSelector>` (or just
   below it, before the `<section>` block).
3. A `<UserCompanyCard>` rendered **below** the existing `<section>` block so
   the IBM comparison views are never displaced.

```tsx
// Illustrative diff
const [userSymbol, setUserSymbol] = useState('');

// …inside return:
<CompanySearchInput value={userSymbol} onChange={setUserSymbol} />
<WindowSelector value={window} onChange={setWindow} />
<section aria-label={…}>  {/* existing views unchanged */}  </section>
{userSymbol ? <UserCompanyCard symbol={userSymbol} window={window} /> : null}
```

### 4.5 Extend: `src/services/fixtureFinanceService.ts` (tests only)

`assertKnown` throws `SYMBOL_NOT_FOUND` for any symbol not in `BASE_PRICES`.
The new hook tests will use known fixture symbols (`IBM`, `MSFT`, etc.) so no
structural change is required. However, if any test needs to exercise the
`SYMBOL_NOT_FOUND` error path, that already works with any unknown string — no
change needed.

### 4.6 Style: `src/styles/app.css`

Add a `.company-search` block for the input control layout. The rest of the
styles (`.chart-card`, `.comparison-chart`, `.window-selector`) already apply
to the new card via `ChartCard` and `ComparisonLineChart` reuse.

---

## 5. Implementation Plan

Tasks are ordered to avoid blocking steps and respect the existing test-first
convention visible in the project's test files.

```
Step 1 — New hook (useSymbolSeries)
  src/hooks/useSymbolSeries.ts        [new]
  src/hooks/useSymbolSeries.test.ts   [new]

Step 2 — New UI input (CompanySearchInput)
  src/components/layout/CompanySearchInput.tsx        [new]
  src/components/layout/CompanySearchInput.test.tsx   [new]
  src/styles/app.css                                  [extend]

Step 3 — New view card (UserCompanyCard)
  src/views/UserCompanyCard.tsx       [new]
  src/views/UserCompanyCard.test.tsx  [new]

Step 4 — Wire into DashboardPage
  src/pages/DashboardPage.tsx         [extend: add userSymbol state + two JSX nodes]
```

No step requires a preceding step to be merged — each is independently
reviewable. Step 4 is the only step that touches existing production code.

---

## 6. Backward-Compatibility Analysis

### What cannot break

| Concern | Protection |
|---------|-----------|
| `DayView`, `WeekView`, `QuarterView` receive the same `data: WindowSeries` they always have. | `useWindowSeries` is not modified; it still reads from `SYMBOLS`. |
| `COMPANIES` / `SYMBOLS` / `FOCUS_SYMBOL` are not mutated. | The user symbol is held in transient React state only. |
| The existing query cache (`['history', symbol, window]`) is not invalidated. | `useSymbolSeries` uses the same key structure, so new entries are additive. |
| Server `GET /history?symbol=…` already accepts any valid symbol. | `FinanceService.getHistory` is unchanged; the server validates against `SYMBOL_PATTERN`. |
| The fixture service already throws `SYMBOL_NOT_FOUND` for unknown symbols. | The new hook surfaces that error code through `errorCode`; it does not swallow it. |

### Risk areas

| Risk | Mitigation |
|------|-----------|
| User types a symbol like `IBM` or `MSFT` already shown in the comparison charts — two fetch calls will be made for the same symbol+window pair. | React Query deduplicates by query key; the second subscriber re-uses the cached result at zero network cost. |
| Long or malformed input could reach the server. | `CompanySearchInput` validates against `SYMBOL_PATTERN` before updating state; invalid characters are stripped client-side. |
| The new section might make the page feel cluttered. | `UserCompanyCard` renders `null` until the user types a symbol — zero visual impact on the default state. |

---

## 7. Test Strategy

| Layer | What to test | Suggested approach |
|-------|-------------|-------------------|
| `useSymbolSeries` | Returns idle shape when `symbol` is `null`; calls `useHistories` when a symbol is set; surfaces `isError` and `errorCode` when the service throws. | `renderHook` with a mock `FinanceServiceContext`. |
| `CompanySearchInput` | Renders a labelled input; normalises lowercase to uppercase; calls `onChange` with trimmed uppercase value. | `@testing-library/react` DOM assertions. |
| `UserCompanyCard` | Renders nothing when `symbol` is `''`; shows a loading block while fetching; renders a chart section once data resolves; shows an error panel for `SYMBOL_NOT_FOUND`. | Mock `useSymbolSeries` or use the fixture service. |
| `DashboardPage` (existing test) | Still passes without modification — confirm no regressions. | Re-run `npm test` after Step 4. |

---

## 8. Out of Scope

The following are explicitly **not** part of this feature request and should not
be included in the implementing PR:

- Persisting the user's selected symbol across page refreshes (localStorage or URL param).
- Supporting multiple simultaneously selected user symbols.
- Adding the user symbol to the `COMPANIES` registry or the existing comparison
  charts.
- Showing a quote card (price / change) for the user symbol alongside the IBM
  quote cards — the request asks only for a *graph*.
- A symbol autocomplete or search-by-company-name lookup.

These are natural follow-on enhancements that the PR description should note as
future work.

---

## 9. Definition of Done

- [ ] All four implementation steps above are committed to `feature/user-selected-company-chart`.
- [ ] `npm test` passes with no new failures.
- [ ] `npm run build` produces a clean production bundle.
- [ ] AC-1 through AC-12 are each verifiably satisfied.
- [ ] The existing `DayView`, `WeekView`, and `QuarterView` render identically to
      `main` (visual smoke-test or screenshot comparison).
- [ ] PR description references this document and maps each AC to the
      implementing file(s).

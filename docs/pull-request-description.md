## Summary

Adds a user-selected company chart to the finance dashboard. A "Look up a
company" text input now appears above the time-window selector; when a valid
ticker symbol is entered, a new line chart section appears below the existing
IBM vs. competitors views showing that company's relative performance for the
currently selected time window. The existing IBM comparison dashboards are
completely unchanged.

## Motivation

The existing dashboard compares IBM against a fixed set of four competitors.
Users need the ability to explore any publicly traded company alongside that
fixed view — for example, to check a sector peer, a portfolio holding, or a
company under evaluation — without disrupting the curated IBM comparison.
This feature was requested in `docs/pr-feature-request-example.md` and
analysed in `docs/feature-request-analysis-user-selected-company-chart.md`.

## Change Type

- [ ] Initial application delivery
- [x] Dashboard enhancement
- [ ] Data integration update
- [x] Test / validation improvement
- [ ] GitHub workflow improvement

## Bob Collaboration Notes

IBM Bob supported every stage of this change end-to-end:

- **Repository analysis** — Bob read the full source tree (components, hooks,
  services, tests, config) to map the existing data flow before proposing any
  changes, ensuring the plan was grounded in the actual codebase rather than
  assumptions.
- **Feature request analysis** — Bob produced
  `docs/feature-request-analysis-user-selected-company-chart.md`, which
  defines 12 acceptance criteria, identifies every extension point, lists what
  must not change, and outlines the four-step implementation plan.
- **Implementation** — Bob authored all seven new files and the two
  modifications with no changes to the existing view components, hooks, or
  service interface.
- **Validation** — Bob ran `npm run validate` (lint → typecheck → test →
  build) and fixed the one test assertion that was incorrectly written for a
  controlled-input contract.
- **Diff review** — Bob confirmed the diff touches only the four intended
  files/components and leaves `DayView`, `WeekView`, `QuarterView`,
  `useWindowSeries`, `SYMBOLS`, and `FinanceService` untouched.
- **PR description generation** — this document.

## Validation

```bash
npm run validate   # lint + typecheck + test + build — all pass
```

Full results:

| Check      | Result                          |
|------------|---------------------------------|
| ESLint     | ✅ 0 errors, 0 warnings         |
| TypeScript | ✅ 0 type errors                |
| Tests      | ✅ 139 / 139 passed (18 files)  |
| Build      | ✅ Clean bundle, 127 ms         |

New test files and counts:

| File | Tests |
|------|-------|
| `src/hooks/useSymbolSeries.test.tsx` | 4 |
| `src/components/layout/CompanySearchInput.test.tsx` | 5 |
| `src/views/UserCompanyCard.test.tsx` | 6 |

Pre-existing `App.test.tsx` (7 tests) continues to pass without modification,
confirming zero regressions in the IBM comparison views.

## Feature Request Alignment

**Requested behaviour** (from `docs/pr-feature-request-example.md`):

1. The user can enter or select a ticker symbol. ✅
2. The application validates the symbol input. ✅
3. The application loads data for the selected company. ✅
4. A new graph appears for the selected company. ✅
5. The existing IBM and competitor dashboards remain visible. ✅

**Acceptance criteria satisfied:**

| AC | Criterion | Satisfying code |
|----|-----------|-----------------|
| AC-1 | Input accepts symbols matching `SYMBOL_PATTERN` | `CompanySearchInput` — validates on every keystroke |
| AC-2 | Lowercase normalised to uppercase | `e.target.value.toUpperCase()` before `onChange` |
| AC-3 | Loading indicator while fetching | `ChartCard` renders `<LoadingBlock>` via `isLoading` prop |
| AC-4 | Error state with retry for invalid/unavailable | Symbol-specific message for `SYMBOL_NOT_FOUND`; generic for `UPSTREAM_UNAVAILABLE`; Retry button on both |
| AC-5 | Line chart shown on success | `ComparisonLineChart` rendered inside `UserCompanyCard` |
| AC-6 | Existing views unaffected | `useWindowSeries`, `SYMBOLS`, and all three view components unchanged |
| AC-7 | Active window drives user chart | `window` prop threaded from `DashboardPage` → `UserCompanyCard` → `useSymbolSeries` |
| AC-8 | Empty input shows no chart section | `{userSymbol ? <section>…</section> : null}` in `DashboardPage` |
| AC-9 | Charting library not in main bundle | `lazy()` import in `UserCompanyCard`; confirmed by build output |
| AC-10 | Tests added | 15 new tests across 3 files |
| AC-11 | Keyboard accessible, screen-reader labelled | `<label htmlFor>` + `aria-label`; Retry is a native `<button>` |
| AC-12 | `SYMBOL_PATTERN` reused, no duplication | Imported directly from `shared/schemas.ts` |

## Screenshots / Demo Notes

Default state (no symbol entered) — identical to the existing dashboard; the
input field appears above the window selector but the page otherwise looks
unchanged.

After typing a symbol (e.g. `AAPL`):
- A "Your selection" section appears below the IBM comparison section.
- The chart title reads `AAPL: relative performance`.
- The chart reacts immediately when the time-window toggle is changed.
- Typing an unknown symbol (e.g. `ZZZZ`) shows: *No data found for "ZZZZ".*
  with a Retry button — no fallback to another company's data.

## Risks / Follow-Up

**Known limitations (out of scope for this PR):**

- The user's selected symbol is not persisted across page refreshes. A
  follow-on could store it in a URL query parameter (`?symbol=AAPL`) so
  dashboards can be bookmarked and shared.
- Only one user symbol can be viewed at a time. A future enhancement could
  allow up to N additional symbols, each shown in its own card.
- There is no autocomplete or company-name search — the user must know the
  ticker. A symbol-search endpoint and combobox would improve discoverability.
- The user-selected chart shows only relative performance (rebased to 100). A
  follow-on could add a raw price view or a percent-change bar alongside it.

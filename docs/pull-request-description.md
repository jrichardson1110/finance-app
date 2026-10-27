## Summary

Implements the user-selected company chart feature requested in `docs/pr-feature-request-example.md`.
A ticker-symbol input control is added below the existing IBM comparison dashboards. When the user
submits a valid symbol, a rebased price-history line chart appears for that company. Entering an
unknown or unavailable symbol surfaces a clear, differentiated error message. All existing Day,
Week, and Quarter comparison views are untouched.

## Motivation

The existing dashboard hard-codes its five companies (IBM, MSFT, ORCL, SAP, CRM) at build time.
Product stakeholders asked for a way to inspect any arbitrary ticker without disturbing the fixed
IBM-versus-competitors comparison. This change adds that capability as an opt-in section beneath
the existing content so neither set of users loses anything.

## Change Type

- [ ] Initial application delivery
- [x] Dashboard enhancement
- [ ] Data integration update
- [x] Test / validation improvement
- [ ] GitHub workflow improvement

## Bob Collaboration Notes

IBM Bob supported every stage of this change:

- **Repository analysis** — Bob read all source files, mapped the data flow from
  `FinanceService` → `useHistories` → `useWindowSeries` → views, and produced a detailed
  feature request analysis report saved to
  `docs/feature-request-analysis-user-selected-company-chart.md`.
- **Implementation** — Bob authored all five new files and the two targeted edits to existing
  files, following the architecture conventions already established in the codebase (hook
  separation, lazy-loaded charts, `ChartCard` as the error/loading frame).
- **Validation** — Bob ran `npm run validate` (lint + typecheck + test + build) to confirm
  138/138 tests pass and the production bundle builds cleanly before declaring the branch ready.
- **Diff review** — Bob reviewed `git diff main...HEAD` and `git status` to confirm only the
  intended files are staged and that the CI workflow change already on the branch is unrelated
  to this feature.
- **PR description generation** — this document.

## Validation

```bash
npm run validate   # lint + typecheck + test + build — all pass

# Results:
# eslint .                → 0 errors, 0 warnings
# tsc --noEmit            → 0 type errors
# vitest run              → 17 test files, 138 tests, 138 passed
# vite build              → ✓ built in ~115 ms, no warnings
```

## Feature Request Alignment

**Requested behavior** (`docs/pr-feature-request-example.md`):
- User can enter or select a ticker symbol
- Application validates the symbol input
- Application loads data for the selected company
- A new graph appears for the selected company
- Existing IBM and competitor dashboards remain visible

**Acceptance criteria — all satisfied:**

| # | Criterion | How it is met |
|---|-----------|---------------|
| AC-1 | User can enter a ticker | `CompanySearchInput` text field + submit button |
| AC-2 | Input is validated before a request fires | Client-side check against `SYMBOL_PATTERN` from `shared/schemas.ts`; button disabled until valid |
| AC-3 | Loading state while fetching | `ChartCard` renders `LoadingBlock` while `useSymbolSeries` is pending |
| AC-4 | Error state for invalid / unavailable symbols | `SYMBOL_NOT_FOUND` → targeted message; other errors → generic message; both include a Retry button |
| AC-5 | Price-history chart for selected company | `UserCompanyCard` renders `ComparisonLineChart` with a single rebased series |
| AC-6 | Time-window selector also controls the new chart | `userSeriesData = useSymbolSeries(userSymbol, window)` — same `window` state drives both |
| AC-7 | Existing IBM comparison views unchanged | Zero modifications to `DayView`, `WeekView`, `QuarterView`, `useWindowSeries`, or `companies.ts` |
| AC-8 | Tests cover new behavior | 14 new tests across `CompanySearchInput.test.tsx` and `UserCompanyCard.test.tsx` |

## Screenshots / Demo Notes

Run `npm run dev:fixture` (no network required) to exercise the feature offline:

1. The three IBM comparison views render as before.
2. Below them a **Ticker symbol** field and **Show chart** button appear.
3. Type `IBM` and click **Show chart** → a "IBM: price trend" card appears with a single line.
4. Switch the time window (Day → Week → Quarter) → the user chart updates alongside the comparison views.
5. Type `!!!` → button stays disabled, inline validation error appears.
6. Type `NOPE` and submit → "NOPE" was not found error panel with a Retry button appears (fixture
   service returns `SYMBOL_NOT_FOUND` for unknown symbols).

## Risks / Follow-Up

| Item | Notes |
|------|-------|
| No URL / localStorage persistence | The selected symbol resets on page refresh. Acceptable for the initial request; can be a follow-up via `URLSearchParams`. |
| Single symbol only | The request specified "a company" (singular). Multi-symbol comparison is a separate feature. |
| Fixture service covers only the original 5 symbols | Any symbol outside `IBM/MSFT/ORCL/SAP/CRM` will hit the `SYMBOL_NOT_FOUND` path in `dev:fixture` mode. The live server (`npm run dev`) will attempt a real Yahoo Finance lookup for any valid ticker. |
| `SYMBOL_PATTERN` max length is 10 characters | Inherited from the shared API contract. Covers all standard exchange tickers. |

# Macro Lens

**Five countries. Four decades. One honest look.**

Macroeconomic data for South Asia, Pakistan, India, Bangladesh, Sri Lanka and Nepal, from primary sources (World Bank WDI), published as static, finding-first country dossiers. Purely static: no backend, no database, no aggregators.

## Live

https://macrolens-pied.vercel.app

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind v4 + Recharts
- 100% static output: data lives as JSON files in `data/`, pages are pre-rendered at build time

## Structure

```
data/
  {country}/            pakistan | india | bangladesh | sri-lanka | nepal
    {indicator}.json    flat [{year, value}] arrays, null for missing years
  meta.json             generatedAt, lastUpdated, per-indicator sources
src/
  app/                  layout, home, [country]/ dossier, methodology
  components/           CountryToggle, StatCard, ChartCard, MacroChart, DossierView
  lib/                  countries, indicators, loaders, stats, insights, format, types
pull.py                 (repo root · copied from macrolens-data) data pipeline
```

## Refreshing the data

```bash
python pull.py          # pulls WDI + WEO, rewrites data/ (idempotent)
npm run test            # strict JSON, series sanity, findings groundedness
npm run build           # regenerates the static site
```

The pipeline is intentionally dumb: pull → verify → build. If the APIs are down or a series breaks, tests fail loudly instead of shipping gaps.

## Chart philosophy

- Chart titles are findings, not variable names ("Back above 3 months, after three years in the danger zone", not "Reserves over time").
- Findings are generated, never hand-typed. `src/lib/insights.ts` computes every title and note from the shipped series at build time; `__tests__/insights.test.ts` re-derives each cited statistic from the same files and fails the build on an ungrounded number. A data refresh rewrites the prose; nothing can go stale.
- Every chart can overlay all five countries (peers in grey), same source, same unit, same scale.
- Missing years render as real gaps; nothing is interpolated. Series that end early or carry gaps say so in their own caption.
- Methodology and limitations are published on the site, not hidden in a README.

## Sources

- World Bank World Development Indicators (13 series codes, see `src/lib/indicators.ts`)
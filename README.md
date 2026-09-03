# Macro Lens

**Five countries. Four decades. One honest look.**

Macroeconomic data for South Asia, Pakistan, India, Bangladesh, Sri Lanka and Nepal, from primary sources (World Bank WDI), published as static, finding-first country dossiers. Purely static: no backend, no database, no aggregators.

## Live

https://macrolens.vercel.app

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
  lib/                  countries, indicators, loaders, insights, format, types
pull.py                 (repo root · copied from macrolens-data) data pipeline
```

## Refreshing the data

```bash
python pull.py          # pulls WDI + WEO, rewrites data/ (idempotent)
npm run test            # strict JSON + series-sanity tests
npm run build           # regenerates the static site
```

The pipeline is intentionally dumb: pull → verify → build. If the APIs are down or a series breaks, tests fail loudly instead of shipping gaps.

## Chart philosophy

- Chart titles are findings, not variable names ("Back above 3 months, after three years in the danger zone", not "Reserves over time").
- Every chart can overlay all five countries (peers in grey), same source, same unit, same scale.
- Missing years render as real gaps; nothing is interpolated.
- Methodology and limitations are published on the site, not hidden in a README.

## Sources

- World Bank World Development Indicators (13 series codes, see `src/lib/indicators.ts`)
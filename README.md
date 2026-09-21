# Macro Lens

**Five countries. Four decades. One honest look.**

Macroeconomic data for South Asia, Pakistan, India, Bangladesh, Sri Lanka and Nepal, from primary sources (World Bank WDI, IMF WEO for public debt), published as static, finding-first country dossiers. Vietnam and Indonesia ride along as benchmarks: same publishers, same units, drawn on every chart, never counted in the regional rankings. Purely static: no backend, no database, no aggregators.

## Live

https://macrolens-pied.vercel.app

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind v4 + Recharts
- 100% static output: data lives as JSON files in `data/`, pages are pre-rendered at build time

## Structure

```
data/
  {country}/            pakistan | india | bangladesh | sri-lanka | nepal
                        (+ vietnam, indonesia: benchmarks, no dossier pages)
    {indicator}.json    flat [{year, value}] arrays, null for missing years
  meta.json             generatedAt, lastUpdated, per-indicator sources
src/
  app/                  layout, home, [country]/ dossier + OG image, compare, methodology
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
- Every chart can overlay all five countries (neighbours in grey, the Vietnam and Indonesia benchmarks in dashed grey), same source, same unit, same scale.
- Missing years render as real gaps; nothing is interpolated. Series that end early or carry gaps say so in their own caption.
- Benchmarks are context, not neighbours: the regional ranks, ranges and verdicts in the generated findings run over the five South Asian countries only.
- Methodology and limitations are published on the site, not hidden in a README.

## Sources

- World Bank World Development Indicators (22 series codes, see `src/lib/indicators.ts`)
- IMF World Economic Outlook, general-government public debt (`GGXWDG_NGDP`), best-effort: the series is optional and the build survives its absence
"use client";

import { useMemo, useState } from "react";
import type { CountryMeta, SeriesPoint } from "@/lib/types";
import { INDICATOR_MAP } from "@/lib/indicators";
import CountryToggle from "./CountryToggle";
import StatCard from "./StatCard";
import ChartCard from "./ChartCard";
import { getInsight } from "@/lib/insights";

function latestOf(series: SeriesPoint[]): { year: number; value: number } | null {
  for (let i = series.length - 1; i >= 0; i--) {
    const p = series[i];
    if (p.value !== null && p.value !== undefined) return { year: p.year, value: p.value };
  }
  return null;
}

interface DossierViewProps {
  country: CountryMeta;
  // indicator slug -> country slug -> series
  seriesByIndicator: Record<string, Record<string, SeriesPoint[]>>;
  updated: string;
}

const SECTIONS: { title: string; indicators: string[] }[] = [
  { title: "Growth & Output", indicators: ["gdp-growth", "gdp-per-capita"] },
  { title: "Prices & Money", indicators: ["inflation", "broad-money"] },
  {
    title: "Investment & Debt",
    indicators: ["gross-capital-formation", "external-debt"],
  },
  {
    title: "External Sector",
    indicators: ["exports", "imports", "current-account", "reserves-months", "remittances"],
  },
];

const STAT_STRIP = ["gdp-growth", "inflation", "gdp-per-capita", "reserves-months", "remittances"];

export default function DossierView({ country, seriesByIndicator, updated }: DossierViewProps) {
  const [showPeers, setShowPeers] = useState(true);

  const population = useMemo(() => {
    const s = seriesByIndicator.population?.[country.slug] ?? [];
    return latestOf(s);
  }, [seriesByIndicator, country.slug]);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-16">
      {/* Country header */}
      <div className="pt-8">
        <CountryToggle />
      </div>

      <div className="mt-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-[#6E6E78]">
            South Asia macro profile
          </div>
          <h1 className="mt-1 text-4xl font-bold tracking-tight text-[#E8E8ED]">
            {country.flag} {country.name}
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-[#A0A0A8]">{country.blurb}</p>
          {population && (
            <p className="mt-2 text-xs text-[#6E6E78]">
              {population.value.toLocaleString("en-US")} people · {population.year}
            </p>
          )}
        </div>
        <label className="flex cursor-pointer items-center gap-2 rounded-full border border-[#2A2A32] px-3 py-1.5 text-xs font-medium text-[#A0A0A8]">
          <input
            type="checkbox"
            checked={showPeers}
            onChange={(e) => setShowPeers(e.target.checked)}
            className="accent-[#52B788]"
          />
          Show peers (all 5 countries)
        </label>
      </div>

      {/* Stat strip */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {STAT_STRIP.map((slug) => {
          const ind = INDICATOR_MAP[slug];
          const series = seriesByIndicator[slug]?.[country.slug] ?? [];
          return (
            <StatCard
              key={slug}
              label={ind.title}
              latest={latestOf(series)}
              series={series}
              kind={ind.kind}
              decimals={ind.decimals}
              color={country.color}
              compareYears={5}
            />
          );
        })}
      </div>

      {/* Sections */}
      {SECTIONS.map((section) => (
        <section key={section.title} className="mt-10">
          <h2 className="border-b border-[#1A1A20] pb-2 text-xs font-bold uppercase tracking-[0.18em] text-[#6E6E78]">
            {section.title}
          </h2>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {section.indicators.map((slug) => {
              const ind = INDICATOR_MAP[slug];
              const byCountry = seriesByIndicator[slug] ?? {};
              const insight = getInsight(country.slug, slug);
              return (
                <ChartCard
                  key={slug}
                  indicator={ind}
                  seriesByCountry={byCountry}
                  active={country.slug}
                  showPeers={showPeers}
                  insightTitle={insight?.title}
                  insightNote={insight?.note}
                />
              );
            })}
          </div>
        </section>
      ))}

      <footer className="mt-12 border-t border-[#1A1A20] pt-4 text-[11px] text-[#6E6E78]">
        <p>
          Data: World Bank WDI · updated <span className="text-[#A0A0A8]">{updated}</span> ·
          methodology & limitations on the{" "}
          <a href="/methodology" className="text-[#52B788] hover:text-[#6ED49C]">
            methodology page
          </a>
          . Peers are shown in grey for context; every series is independently sourced.
        </p>
      </footer>
    </div>
  );
}
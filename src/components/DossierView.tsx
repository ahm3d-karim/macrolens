"use client";

import { useMemo, useState } from "react";
import type { CountryMeta, SeriesPoint } from "@/lib/types";
import { INDICATOR_MAP, INDICATOR_SECTIONS } from "@/lib/indicators";
import CountryToggle from "./CountryToggle";
import StatCard from "./StatCard";
import ChartCard from "./ChartCard";
import { getInsight } from "@/lib/insights";
import Link from "next/link";

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
          <div className="text-[11px] font-semibold uppercase tracking-wider text-[#8A8A94]">
            South Asia macro profile
          </div>
          <h1 className="mt-1 text-4xl font-bold tracking-tight text-[#E8E8ED]">
            {country.flag} {country.name}
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-[#A0A0A8]">{country.blurb}</p>
          {population && (
            <p className="mt-2 text-xs text-[#8A8A94]">
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
          Show peers (5 neighbours + 2 benchmarks)
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
      {INDICATOR_SECTIONS.map((section) => (
        <section key={section.title} className="mt-10">
          <h2 className="border-b border-[#1A1A20] pb-2 text-xs font-bold uppercase tracking-[0.18em] text-[#8A8A94]">
            {section.title}
          </h2>
          <div className="mt-4 space-y-4">
            {section.rows.map((row, rowIndex) => {
              const cols =
                row.length === 1 ? "grid-cols-1" : row.length === 2 ? "lg:grid-cols-2" : "lg:grid-cols-3";
              const chartHeight = row.length === 1 ? 320 : row.length === 2 ? 280 : 240;
              return (
                <div key={rowIndex} className={`grid gap-4 ${cols}`}>
                  {row.map((slug) => {
                    const ind = INDICATOR_MAP[slug];
                    const byCountry = seriesByIndicator[slug] ?? {};
                    const insight = getInsight(country.slug, slug, (indSlug) => seriesByIndicator[indSlug] ?? {});
                    return (
                      <ChartCard
                        key={slug}
                        indicator={ind}
                        seriesByCountry={byCountry}
                        active={country.slug}
                        showPeers={showPeers}
                        insightTitle={insight?.title}
                        insightNote={insight?.note}
                        height={chartHeight}
                      />
                    );
                  })}
                </div>
              );
            })}
          </div>
        </section>
      ))}

      <footer className="mt-12 border-t border-[#1A1A20] pt-4 text-[11px] text-[#8A8A94]">
        <p>
          Data: World Bank WDI · updated <span className="text-[#A0A0A8]">{updated}</span> ·
          methodology & limitations on the{" "}
          <Link href="/methodology" className="text-[#52B788] hover:text-[#6ED49C]">
            methodology page
          </Link>
          . Neighbours are drawn in grey, the Vietnam and Indonesia benchmarks in
          dashed grey; every series is independently sourced. Headline findings
          rank this country against its five South Asian neighbours only.
        </p>
      </footer>
    </div>
  );
}
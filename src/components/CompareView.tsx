"use client";

import { useEffect, useMemo, useState } from "react";
import { ALL_COUNTRIES, COUNTRIES, COUNTRY_MAP } from "@/lib/countries";
import { INDICATOR_MAP, INDICATOR_SECTIONS } from "@/lib/indicators";
import { formatValue } from "@/lib/format";
import type { CountrySlug, SeriesPoint } from "@/lib/types";
import { buildCompareRows, deltaDisplay, deltaLabel, gapLeaderLaggard } from "@/lib/compare";
import MacroChart from "./MacroChart";

interface CompareViewProps {
  // indicator slug -> country slug -> series
  allSeries: Record<string, Record<string, SeriesPoint[]>>;
  initialIndicator?: string;
}

const DEFAULT_INDICATOR = "gdp-per-capita";

export default function CompareView({ allSeries, initialIndicator }: CompareViewProps) {
  const [indicatorSlug, setIndicatorSlug] = useState(initialIndicator ?? DEFAULT_INDICATOR);
  const [selected, setSelected] = useState<Set<CountrySlug>>(
    new Set(COUNTRIES.map((c) => c.slug)),
  );

  // Keep the URL in step with the selected indicator so a single chart can be
  // linked and shared. replaceState, not push: no history spam per pill click.
  useEffect(() => {
    const url = indicatorSlug === DEFAULT_INDICATOR ? "/compare" : `/compare?indicator=${indicatorSlug}`;
    window.history.replaceState(null, "", url);
  }, [indicatorSlug]);

  const ind = INDICATOR_MAP[indicatorSlug];

  const seriesByCountry = useMemo(() => {
    const out: Record<string, SeriesPoint[]> = {};
    for (const c of ALL_COUNTRIES) {
      if (selected.has(c.slug)) out[c.slug] = allSeries[indicatorSlug]?.[c.slug] ?? [];
    }
    return out;
  }, [allSeries, indicatorSlug, selected]);

  const rows = useMemo(
    () => buildCompareRows(seriesByCountry, [...selected]),
    [seriesByCountry, selected],
  );
  const gap = useMemo(() => gapLeaderLaggard(rows), [rows]);

  const sortedRows = [...rows].sort((a, b) => {
    const ra = a.rank ?? Number.MAX_SAFE_INTEGER;
    const rb = b.rank ?? Number.MAX_SAFE_INTEGER;
    return ra - rb;
  });

  function toggleCountry(slug: CountrySlug) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) {
        if (next.size > 1) next.delete(slug); // keep at least one country
      } else {
        next.add(slug);
      }
      return next;
    });
  }

  function pillClass(on: boolean) {
    return `inline-flex min-h-[44px] items-center rounded-full border px-4 py-2 text-sm font-medium transition-all ${
      on
        ? "border-transparent bg-[#52B788] text-[#0A0A0B]"
        : "border-[#2A2A32] text-[#A0A0A8] hover:border-[#3A3A44] hover:text-[#E8E8ED]"
    }`;
  }

  // The table as a file, raw values and no rounding: the site's numbers are for
  // reading, the CSV is for whatever the reader wants to do next.
  function downloadCsv() {
    const head = ["country", "code", "latest_year", "latest", "ref_year", "delta", "pct_change", "rank"];
    const lines = sortedRows.map((r) => {
      const c = COUNTRY_MAP[r.slug as CountrySlug];
      return [
        c.name,
        c.short,
        Number.isFinite(r.latestYear) ? r.latestYear : "",
        Number.isFinite(r.latest) ? r.latest : "",
        r.refYear ?? "",
        r.delta ?? "",
        r.pctChange === null ? "" : Number(r.pctChange.toFixed(2)),
        r.rank ?? "",
      ].join(",");
    });
    const blob = new Blob([[head.join(","), ...lines].join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `macrolens-${indicatorSlug}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-16 pt-8">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#52B788]">
        Compare
      </p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#E8E8ED]">
        One indicator, any mix of countries, same scale
      </h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#A0A0A8]">
        Pick an indicator, keep the countries you want, and read the spread.
        Same source, same unit, same scale on every line. Vietnam and Indonesia
        are benchmarks: they can join the table, but they sit outside the
        regional findings on the dossiers.
      </p>

      {/* Indicator pills (single select), grouped the way the dossiers are */}
      <div className="mt-6">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-[#8A8A94]">
          Indicator
        </div>
        {INDICATOR_SECTIONS.map((section) => (
          <div key={section.title} className="mt-3">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-[#8A8A94]">
              {section.title}
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {section.rows.flat().map((slug) => {
                const i = INDICATOR_MAP[slug];
                return (
                  <button
                    key={slug}
                    type="button"
                    onClick={() => setIndicatorSlug(slug)}
                    aria-pressed={slug === indicatorSlug}
                    className={pillClass(slug === indicatorSlug)}
                  >
                    {i.title}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Country pills (multi select) */}
      <div className="mt-4">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-[#8A8A94]">
          Countries
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {ALL_COUNTRIES.map((c) => {
            const on = selected.has(c.slug);
            return (
              <button
                key={c.slug}
                type="button"
                onClick={() => toggleCountry(c.slug)}
                aria-pressed={on}
                className={`inline-flex min-h-[44px] items-center rounded-full border px-4 py-2 text-sm font-medium transition-all ${
                  on
                    ? "border-transparent text-[#0A0A0B]"
                    : `text-[#A0A0A8] hover:border-[#3A3A44] hover:text-[#E8E8ED] ${
                        c.benchmark ? "border-dashed border-[#2A2A32]" : "border-[#2A2A32]"
                      }`
                }`}
                style={on ? { backgroundColor: c.color } : undefined}
              >
                <span className="mr-1.5">{c.flag}</span>
                {c.name}
                {c.benchmark && (
                  <span className="ml-1.5 text-[10px] uppercase tracking-wide opacity-70">
                    benchmark
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Gap line */}
      {gap && (
        <p className="mt-6 text-sm text-[#A0A0A8]">
          <span
            className="mr-2 inline-block h-2 w-2 rounded-full align-middle"
            style={{ backgroundColor: COUNTRY_MAP[gap.leaderSlug as CountrySlug].color }}
          />
          <strong className="text-[#E8E8ED]">{COUNTRY_MAP[gap.leaderSlug as CountrySlug].name}</strong>
          {" "}leads at {formatValue(gap.leaderValue, ind.kind, ind.decimals)}
          {" "}against{" "}
          <strong className="text-[#E8E8ED]">{COUNTRY_MAP[gap.laggardSlug as CountrySlug].name}</strong>
          {" "}at {formatValue(gap.laggardValue, ind.kind, ind.decimals)}
          {gap.ratio !== null && gap.ratio >= 1.05
            ? `, a ${gap.ratio.toFixed(1)}x spread.`
            : `, a gap of ${formatValue(gap.gap, ind.kind, ind.decimals)}.`}
        </p>
      )}

      {/* Stats table */}
      <div className="mt-6 flex items-center justify-between gap-3">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8A8A94]">
          Latest, change, rank
        </span>
        <button
          type="button"
          onClick={downloadCsv}
          className="inline-flex min-h-[44px] items-center rounded-full border border-[#2A2A32] px-4 py-2 text-xs font-medium text-[#A0A0A8] transition-all hover:border-[#3A3A44] hover:text-[#E8E8ED]"
        >
          Download CSV
        </button>
      </div>
      <div className="mt-2 overflow-x-auto rounded-xl border border-[#1A1A20] bg-[#111115]">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-[#2A2A32] text-left text-[11px] uppercase tracking-wider text-[#8A8A94]">
              <th className="px-4 py-3 font-semibold">Country</th>
              <th className="px-4 py-3 font-semibold">Latest</th>
              <th className="px-4 py-3 font-semibold">{deltaLabel(ind.kind)}</th>
              <th className="px-4 py-3 font-semibold">Rank</th>
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((r) => {
              const c = COUNTRY_MAP[r.slug as CountrySlug];
              const hasData = Number.isFinite(r.latest);
              return (
                <tr key={r.slug} className="border-b border-[#1A1A20] last:border-0">
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-2 font-medium text-[#E8E8ED]">
                      <span
                        className="inline-block h-2 w-2 rounded-full"
                        style={{ backgroundColor: c.color }}
                      />
                      {c.flag} {c.name}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-[#E8E8ED]">
                    {hasData ? formatValue(r.latest, ind.kind, ind.decimals) : "no data"}
                    {hasData && <span className="ml-2 text-[11px] text-[#8A8A94]">{r.latestYear}</span>}
                  </td>
                  <td className="px-4 py-3 font-mono text-[#A0A0A8]">
                    {hasData ? deltaDisplay(r, ind.kind) : "n/a"}
                    {hasData && r.refYear !== null && (
                      <span className="ml-2 text-[11px] text-[#8A8A94]">vs {r.refYear}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-[#A0A0A8]">
                    {r.rank ? `${r.rank} of ${sortedRows.filter((x) => x.rank).length}` : "-"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Chart */}
      <div className="mt-6 rounded-xl border border-[#1A1A20] bg-[#111115] p-5">
        <h2 className="text-base font-semibold text-[#E8E8ED]">
          {ind.title}, {ind.unit}
        </h2>
        <div className="mt-3">
          <MacroChart
            seriesByCountry={seriesByCountry}
            active={[...selected][0]}
            indicator={ind}
            showPeers={false}
            height={360}
            variant="compare"
          />
        </div>
        <div className="mt-2 border-t border-[#1A1A20] pt-2 text-[11px] text-[#8A8A94]">
          {ind.source} · {ind.code} ·{" "}
          <a
            href={ind.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="text-[#52B788] hover:text-[#6ED49C]"
          >
            source
          </a>
        </div>
      </div>

      <footer className="mt-10 border-t border-[#1A1A20] pt-4 text-[11px] text-[#8A8A94]">
        <p>
          Deltas compare each country&apos;s latest reading with its observation
          closest to ten years earlier (the reference year is shown, and short
          series fall back to their earliest observation). Ranks are among the
          countries you selected, not the region. Population is excluded: it is
          a scale, not a performance indicator. The CSV carries the same rows
          with unrounded values and one row per country.
        </p>
      </footer>
    </div>
  );
}

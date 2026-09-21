import { COUNTRIES, COUNTRY_MAP } from "@/lib/countries";
import { INDICATOR_MAP } from "@/lib/indicators";
import { loadAllCountriesSeries, latestValue, loadSeries, loadMeta } from "@/lib/loaders";
import { buildCompareRows, gapLeaderLaggard } from "@/lib/compare";
import { formatValue } from "@/lib/format";
import type { CountrySlug, IndicatorKind } from "@/lib/types";
import Link from "next/link";

// A four-line regional snapshot, computed from the shipped series with the
// same helpers the compare page uses: no hand-typed numbers, and the region
// means the five South Asian countries, benchmarks excluded.
const SNAPSHOT = ["gdp-growth", "inflation", "gdp-per-capita", "reserves-months"];
const REGION = COUNTRIES.map((c) => c.slug);

// A gap between two countries reads as percentage points for percent series
// and as a multiple for level series (income, reserves in months).
function spreadText(kind: IndicatorKind, gap: number, ratio: number | null): string {
  if (kind === "pct") return `${gap.toFixed(1)} pp`;
  if (ratio === null) return "n/a";
  return `${ratio.toFixed(1)}x`;
}

export default function HomePage() {
  const meta = loadMeta();
  const updated =
    typeof meta?.lastUpdated === "string" ? meta.lastUpdated : "n/a";

  return (
    <div>
      <section className="mx-auto w-full max-w-6xl px-4 pb-10 pt-20">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#52B788]">
          A South Asia macro lens
        </p>
        <h1 className="mt-3 max-w-3xl text-4xl font-black tracking-tight text-[#E8E8ED] sm:text-5xl">
          Five countries. Four decades.{" "}
          <span className="gradient-text">One honest look.</span>
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-[#A0A0A8]">
          Macroeconomic indicators for Pakistan, India, Bangladesh, Sri Lanka and
          Nepal, every series pulled straight from the original publisher (World
          Bank WDI). Vietnam and Indonesia ride along as benchmarks. Pick a
          country, read what the data actually says, and flip between neighbours
          for context.
        </p>
        <p className="mt-3 text-xs text-[#8A8A94]">
          Data refreshed from WB WDI, last updated {updated}
        </p>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 pb-12">
        <h2 className="border-b border-[#1A1A20] pb-2 text-xs font-bold uppercase tracking-[0.18em] text-[#8A8A94]">
          Where the region stands
        </h2>
        <p className="mt-3 text-xs leading-relaxed text-[#8A8A94]">
          The latest reading for each of the five, ranked against each other.
          Latest years differ where coverage ends earlier, and every number
          comes from the same series the dossiers plot, so a refresh rewrites
          this table too. Benchmarks are excluded, as everywhere on this site.
        </p>
        <div className="mt-4 overflow-x-auto rounded-xl border border-[#1A1A20] bg-[#111115]">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-[#2A2A32] text-left text-[11px] uppercase tracking-wider text-[#8A8A94]">
                <th className="px-4 py-3 font-semibold">Indicator</th>
                <th className="px-4 py-3 font-semibold">Highest</th>
                <th className="px-4 py-3 font-semibold">Lowest</th>
                <th className="px-4 py-3 font-semibold">Spread</th>
              </tr>
            </thead>
            <tbody>
              {SNAPSHOT.map((slug) => {
                const ind = INDICATOR_MAP[slug];
                const gap = gapLeaderLaggard(
                  buildCompareRows(loadAllCountriesSeries(slug), REGION),
                );
                if (!gap) return null;
                const hi = COUNTRY_MAP[gap.leaderSlug as CountrySlug];
                const lo = COUNTRY_MAP[gap.laggardSlug as CountrySlug];
                return (
                  <tr key={slug} className="border-b border-[#1A1A20] last:border-0">
                    <td className="px-4 py-3">
                      <Link
                        href={`/compare?indicator=${slug}`}
                        className="font-medium text-[#E8E8ED] hover:text-[#6ED49C]"
                      >
                        {ind.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-[#A0A0A8]">
                      <span className="mr-1.5">{hi.flag}</span>
                      {hi.name}{" "}
                      <span className="font-mono text-[#E8E8ED]">
                        {formatValue(gap.leaderValue, ind.kind, ind.decimals)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#A0A0A8]">
                      <span className="mr-1.5">{lo.flag}</span>
                      {lo.name}{" "}
                      <span className="font-mono text-[#E8E8ED]">
                        {formatValue(gap.laggardValue, ind.kind, ind.decimals)}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-[#A0A0A8]">
                      {spreadText(ind.kind, gap.gap, gap.ratio)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-6xl gap-4 px-4 pb-20 sm:grid-cols-2 lg:grid-cols-3">
        {COUNTRIES.map((c) => {
          const growth = latestValue(loadSeries(c.slug, "gdp-growth"));
          const inflation = latestValue(loadSeries(c.slug, "inflation"));
          const gdpCap = latestValue(loadSeries(c.slug, "gdp-per-capita"));
          const pop = latestValue(loadSeries(c.slug, "population"));
          return (
            <a
              key={c.slug}
              href={`/${c.slug}`}
              className="group flex flex-col rounded-xl border border-[#1A1A20] bg-[#111115] p-5 transition-all hover:-translate-y-0.5 hover:border-[#3A3A44]"
              style={{ borderLeft: `3px solid ${c.color}` }}
            >
              <div className="flex items-center justify-between">
                <span className="text-lg font-semibold text-[#E8E8ED]">
                  {c.flag} {c.name}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#8A8A94]">
                  {c.code}
                </span>
              </div>
              <p className="mt-2 flex-1 text-xs leading-relaxed text-[#A0A0A8]">
                {c.blurb}
              </p>
              <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-[#1A1A20] pt-3 text-center">
                {[
                  { label: "GDP growth", v: growth ? formatValue(growth.value, "pct", 1) : "n/a" },
                  { label: "Inflation", v: inflation ? formatValue(inflation.value, "pct", 1) : "n/a" },
                  { label: "GDP/capita", v: gdpCap ? formatValue(gdpCap.value, "usd", 0) : "n/a" },
                ].map((s) => (
                  <div key={s.label}>
                    <dt className="text-[10px] uppercase tracking-wide text-[#8A8A94]">
                      {s.label}
                    </dt>
                    <dd className="font-mono text-sm font-semibold text-[#E8E8ED]">
                      {s.v}
                    </dd>
                  </div>
                ))}
              </dl>
              {pop && (
                <p className="mt-2 text-right text-[10px] text-[#8A8A94]">
                  {pop.value.toLocaleString("en-US")} people · {pop.year}
                </p>
              )}
              <span className="mt-1 text-xs font-medium text-[#52B788] opacity-0 transition-opacity group-hover:opacity-100">
                Open dossier →
              </span>
            </a>
          );
        })}

        <div className="flex flex-col justify-center rounded-xl border border-dashed border-[#2A2A32] p-6">
          <h3 className="text-sm font-semibold text-[#E8E8ED]">
            Compare, don&apos;t just stare
          </h3>
          <p className="mt-2 text-xs leading-relaxed text-[#A0A0A8]">
            Every chart on every dossier can show all five countries at once,
            with Vietnam and Indonesia alongside in dashed grey for scale. Your
            country is drawn solid, the neighbours in grey, and that is where
            the stories live: Bangladesh passing Pakistan, Sri Lanka&apos;s
            reserves collapse, Nepal&apos;s remittance dependence.
          </p>
          <p className="mt-4 text-xs leading-relaxed text-[#8A8A94]">
            Method & limitations: <Link href="/methodology" className="text-[#52B788] hover:text-[#6ED49C]">methodology page</Link>
          </p>
        </div>
      </section>

      <footer className="border-t border-[#1A1A20] py-6">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-2 px-4 text-[11px] text-[#8A8A94] sm:flex-row">
          <span>MACROLENS · WB WDI · updated {updated}</span>
          <span>Source: World Bank · every series verifiable upstream</span>
        </div>
      </footer>
    </div>
  );
}

export const dynamicParams = false;
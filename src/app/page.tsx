import { COUNTRIES } from "@/lib/countries";
import { INDICATOR_MAP } from "@/lib/indicators";
import { latestValue, loadSeries, loadMeta } from "@/lib/loaders";
import { formatValue } from "@/lib/format";

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
          Bank WDI). Pick a country, read what the data actually says, and flip
          between neighbours for context.
        </p>
        <p className="mt-3 text-xs text-[#8A8A94]">
          Data refreshed from WB WDI, last updated {updated}
        </p>
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
            Compare, don't just stare
          </h3>
          <p className="mt-2 text-xs leading-relaxed text-[#A0A0A8]">
            Every chart on every dossier can show all five countries at once.
            Your country is drawn solid, the neighbours in grey, and that is
            where the stories live: Bangladesh passing Pakistan, Sri Lanka&apos;s
            reserves collapse, Nepal&apos;s remittance dependence.
          </p>
          <p className="mt-4 text-xs leading-relaxed text-[#8A8A94]">
            Method & limitations: <a href="/methodology" className="text-[#52B788] hover:text-[#6ED49C]">methodology page</a>
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
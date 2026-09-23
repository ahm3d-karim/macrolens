import type { Metadata } from "next";
import { INDICATOR_SECTIONS } from "@/lib/indicators";
import { loadMeta } from "@/lib/loaders";
import RegionTable from "@/components/RegionTable";
import Link from "next/link";

export const metadata: Metadata = {
  title: "The region",
  description:
    "Every South Asia macro indicator on one page: who is highest, who is lowest and how wide the spread runs across Pakistan, India, Bangladesh, Sri Lanka and Nepal.",
};

export default function RegionPage() {
  const meta = loadMeta();
  const updated =
    typeof meta?.lastUpdated === "string" ? meta.lastUpdated : "n/a";

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-16 pt-20">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#52B788]">
        The region
      </p>
      <h1 className="mt-3 max-w-3xl text-4xl font-black tracking-tight text-[#E8E8ED] sm:text-5xl">
        Twenty-two indicators, ranked across five countries
      </h1>
      <p className="mt-4 max-w-2xl text-base leading-relaxed text-[#A0A0A8]">
        The whole lens on one page. Each row is one series: the highest reading
        and the lowest among the five South Asian countries, and the distance
        between them. Same publishers, same units, same source as the dossiers,
        so this table is rewritten by every data refresh and cannot drift from
        the charts it summarises.
      </p>
      <p className="mt-3 text-xs text-[#8A8A94]">
        Data refreshed from WB WDI, last updated {updated}. Vietnam and Indonesia
        are benchmarks and stay out of these ranks, as everywhere on the site.
        Latest years differ where a series ends earlier: a country can lead on a
        reading taken three years before another&apos;s.
      </p>

      {INDICATOR_SECTIONS.map((section) => (
        <section key={section.title} className="mt-10">
          <h2 className="border-b border-[#1A1A20] pb-2 text-xs font-bold uppercase tracking-[0.18em] text-[#8A8A94]">
            {section.title}
          </h2>
          <RegionTable slugs={section.rows.flat()} />
        </section>
      ))}

      <footer className="mt-12 border-t border-[#1A1A20] pt-4 text-[11px] text-[#8A8A94]">
        <p>
          Every figure is computed from the shipped series at build time, never
          typed. Open an indicator to read the five countries side by side on the{" "}
          <Link href="/compare" className="text-[#52B788] hover:text-[#6ED49C]">
            compare page
          </Link>
          , or a single country in full on its{" "}
          <Link href="/" className="text-[#52B788] hover:text-[#6ED49C]">
            dossier
          </Link>
          .
        </p>
      </footer>
    </div>
  );
}

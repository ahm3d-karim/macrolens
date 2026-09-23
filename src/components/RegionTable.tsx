import { COUNTRIES, COUNTRY_MAP } from "@/lib/countries";
import { INDICATOR_MAP } from "@/lib/indicators";
import { loadAllCountriesSeries } from "@/lib/loaders";
import { buildCompareRows, gapLeaderLaggard } from "@/lib/compare";
import { formatValue } from "@/lib/format";
import type { CountrySlug, IndicatorKind } from "@/lib/types";
import Link from "next/link";

// The five South Asian countries, never the benchmarks: this table is a regional
// ranking, and Vietnam and Indonesia are context, not neighbours.
const REGION = COUNTRIES.map((c) => c.slug);

// A gap between two countries reads as percentage points for percent series and
// as a multiple for level series (income, reserves in months).
function spreadText(kind: IndicatorKind, gap: number, ratio: number | null): string {
  if (kind === "pct") return `${gap.toFixed(1)} pp`;
  if (ratio === null) return "n/a";
  return `${ratio.toFixed(1)}x`;
}

// One row per indicator: who is highest, who is lowest, how wide the spread is.
// Every number comes out of the same helpers the compare page uses, so a data
// refresh rewrites this table too and nothing here can go stale.
export default function RegionTable({ slugs }: { slugs: string[] }) {
  return (
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
          {slugs.map((slug) => {
            const ind = INDICATOR_MAP[slug];
            if (!ind) return null;
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
                  <span className="mt-0.5 block text-[11px] text-[#8A8A94]">{ind.unit}</span>
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
  );
}

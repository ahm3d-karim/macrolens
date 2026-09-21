import type { IndicatorMeta, SeriesPoint } from "@/lib/types";
import { lastConsecutiveWindow } from "@/lib/stats";
import MacroChart from "./MacroChart";

// The shipped series, as committed: the site promises every number is
// reproducible from primary sources, so the raw file is one click away.
const DATA_BASE =
  "https://raw.githubusercontent.com/ahm3d-karim/macrolens/master/data";

interface ChartCardProps {
  indicator: IndicatorMeta;
  seriesByCountry: Record<string, SeriesPoint[]>;
  active: string;
  showPeers: boolean;
  insightTitle?: string;
  insightNote?: string;
  height?: number;
}

export default function ChartCard({
  indicator,
  seriesByCountry,
  active,
  showPeers,
  insightTitle,
  insightNote,
  height = 280,
}: ChartCardProps) {
  // Where this country's data stops: a chart whose last observation is 2019 or
  // 2021 must not read as current just because the page was built today.
  const coverage = lastConsecutiveWindow(seriesByCountry[active] ?? []);

  return (
    <div
      id={indicator.slug}
      className="flex scroll-mt-24 flex-col rounded-xl border border-[#1A1A20] bg-[#111115] p-5"
    >
      <h3 className="text-base font-semibold leading-snug text-[#E8E8ED]">
        {insightTitle ?? indicator.title}
      </h3>
      {insightNote ? (
        <p className="mt-1 text-sm leading-relaxed text-[#A0A0A8]">{insightNote}</p>
      ) : (
        <p className="mt-1 text-sm text-[#8A8A94]">{indicator.unit}</p>
      )}
      <div className="mt-3 flex-1">
        <MacroChart
          seriesByCountry={seriesByCountry}
          active={active as never}
          indicator={indicator}
          showPeers={showPeers}
          height={height}
        />
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-[#1A1A20] pt-2 text-[11px] text-[#8A8A94]">
        <span>
          {indicator.source} · {indicator.code}
          {coverage && ` · covers to ${coverage.lastYear}`}
        </span>
        <span className="flex items-center gap-3">
          <a
            href={`#${indicator.slug}`}
            className="text-[#8A8A94] hover:text-[#E8E8ED]"
            title="Link straight to this chart"
          >
            permalink
          </a>
          <a
            href={`${DATA_BASE}/${active}/${indicator.slug}.json`}
            target="_blank"
            rel="noreferrer"
            className="text-[#52B788] hover:text-[#6ED49C]"
          >
            raw data
          </a>
          <a
            href={indicator.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="text-[#52B788] hover:text-[#6ED49C]"
          >
            source
          </a>
        </span>
      </div>
    </div>
  );
}
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

  // A series can hold no observations for a country at all (WDI publishes no
  // Pakistan fiscal balance), or no clean run of years at the end (India's
  // fiscal series ends in a single 2022 point after a four year hole). Both
  // leave the finding slot empty, so the card says which one it is rather than
  // printing the unit next to a chart the country barely appears in.
  const observed = (seriesByCountry[active] ?? []).filter(
    (p) => p.value !== null && p.value !== undefined,
  );
  const own = observed.length;
  const lastOwn = own ? observed[own - 1].year : null;
  const thinNote =
    own === 0
      ? "No WDI observations for this country in this series: the lines drawn are its neighbours."
      : !coverage || coverage.points.length < 6
        ? `No clean run of years at the end of this series (${own} observations, latest ${lastOwn}), so there is no headline to compute: the chart plots the years that exist, gaps included.`
        : null;
  const note = insightNote ?? thinNote ?? indicator.unit;

  return (
    <div
      id={indicator.slug}
      className="flex scroll-mt-24 flex-col rounded-xl border border-[#1A1A20] bg-[#111115] p-5"
    >
      {/* The finding is the headline, so the series behind it needs its own
          label: which indicator, in which unit, every chart. */}
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#8A8A94]">
        {indicator.title} · {indicator.unit}
      </p>
      <h3 className="mt-1 text-base font-semibold leading-snug text-[#E8E8ED]">
        {insightTitle ?? indicator.title}
      </h3>
      <p className="mt-1 text-sm leading-relaxed text-[#A0A0A8]">{note}</p>
      <div className="mt-3 flex-1">
        <MacroChart
          seriesByCountry={seriesByCountry}
          active={active as never}
          indicator={indicator}
          showPeers={showPeers}
          height={height}
          label={`${insightTitle ?? indicator.title}. ${note}`}
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
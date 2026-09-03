import type { IndicatorMeta, SeriesPoint } from "@/lib/types";
import MacroChart from "./MacroChart";

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
  return (
    <div className="flex flex-col rounded-xl border border-[#1A1A20] bg-[#111115] p-5">
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
        </span>
        <a
          href={indicator.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="text-[#52B788] hover:text-[#6ED49C]"
        >
          source
        </a>
      </div>
    </div>
  );
}
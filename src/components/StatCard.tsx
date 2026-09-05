import type { IndicatorKind, SeriesPoint } from "@/lib/types";
import { formatValue } from "@/lib/format";

interface StatCardProps {
  label: string;
  latest: { year: number; value: number } | null;
  series: SeriesPoint[];
  kind: IndicatorKind;
  decimals: number;
  color: string;
  compareYears: number; // delta window
}

function Sparkline({
  points,
  color,
}: {
  points: number[];
  color: string;
}) {
  if (points.length < 2) return null;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const w = 100;
  const h = 28;
  const step = w / (points.length - 1);
  const coords = points.map((v, i) => {
    const x = i * step;
    const y = h - 3 - ((v - min) / range) * (h - 6);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="mt-1 block opacity-80">
      <polyline
        points={coords.join(" ")}
        fill="none"
        stroke={color}
        strokeWidth={1.8}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function StatCard({
  label,
  latest,
  series,
  kind,
  decimals,
  color,
  compareYears,
}: StatCardProps) {
  const lastN = series
    .filter((p) => p.value !== null && p.value !== undefined)
    .slice(-8)
    .map((p) => p.value as number);

  let delta: number | null = null;
  if (latest) {
    const ref = series
      .filter((p) => p.value !== null && p.value !== undefined && p.year <= latest.year - compareYears)
      .slice(-1)[0];
    if (ref) delta = latest.value - (ref.value as number);
  }

  return (
    <div className="rounded-xl border border-[#1A1A20] bg-[#111115] p-4">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-[#8A8A94]">
        {label}
      </div>
      {latest ? (
        <>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[#E8E8ED]">
              {formatValue(latest.value, kind, decimals)}
            </span>
            {delta !== null && (
              <span
                className="text-xs font-medium"
                style={{ color: delta >= 0 ? "#52B788" : "#E76F51" }}
              >
                {delta >= 0 ? "▲" : "▼"} {Math.abs(delta).toFixed(1)}
                <span className="text-[#8A8A94]"> vs {compareYears}y ago</span>
              </span>
            )}
          </div>
          <div className="text-[11px] text-[#8A8A94]">latest: {latest.year}</div>
        </>
      ) : (
        <div className="mt-2 text-sm text-[#8A8A94]">no data</div>
      )}
      <Sparkline points={lastN} color={color} />
    </div>
  );
}
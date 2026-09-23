import type { IndicatorKind, SeriesPoint } from "@/lib/types";
import { formatValue } from "@/lib/format";
import { consecutiveRuns, lastConsecutiveWindow } from "@/lib/stats";

interface StatCardProps {
  label: string;
  latest: { year: number; value: number } | null;
  series: SeriesPoint[];
  kind: IndicatorKind;
  decimals: number;
  color: string;
  compareYears: number; // delta window
}

// A sparkline is a chart, so it keeps the big charts' promise: points sit at
// their real year and the line breaks at a missing year instead of bridging it
// (an isolated observation is drawn as a dot, not joined to a stale one).
function Sparkline({
  points,
  color,
}: {
  points: { year: number; value: number }[];
  color: string;
}) {
  if (points.length < 2) return null;
  const w = 100;
  const h = 28;
  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const range = Math.max(...values) - min || 1;
  const firstYear = points[0].year;
  const span = points[points.length - 1].year - firstYear || 1;
  const x = (year: number) => ((year - firstYear) / span) * w;
  const y = (value: number) => h - 3 - ((value - min) / range) * (h - 6);
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="mt-1 block opacity-80">
      {consecutiveRuns(points).map((run, i) =>
        run.length > 1 ? (
          <polyline
            key={i}
            points={run.map((p) => `${x(p.year).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ")}
            fill="none"
            stroke={color}
            strokeWidth={1.8}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ) : (
          <circle
            key={i}
            cx={x(run[0].year).toFixed(1)}
            cy={y(run[0].value).toFixed(1)}
            r={1.6}
            fill={color}
          />
        ),
      )}
    </svg>
  );
}

// Same convention as the compare table (deltaDisplay): percent and months
// series move in points, level series (US$, LCU per US$, people) in relative
// percent. A bare number beside a headline reads as that headline's own unit.
function deltaText(kind: IndicatorKind, delta: number, pctDelta: number | null): string {
  if (kind === "months") return `${Math.abs(delta).toFixed(1)} mo`;
  if (kind === "pct") return `${Math.abs(delta).toFixed(1)} pp`;
  return pctDelta === null ? "n/a" : `${Math.abs(pctDelta).toFixed(1)}%`;
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
  // The sparkline plots the last observations as they are, holes and all, the
  // way the big charts do. The delta is the stricter case: it comes out of the
  // consecutive window, so it is never taken across a data hole, and the
  // reference year is printed because a short or gappy series does not always
  // reach back exactly compareYears.
  const lastN = series
    .filter((p) => p.value !== null && p.value !== undefined)
    .slice(-8)
    .map((p) => ({ year: p.year, value: p.value as number }));
  const windowPoints = lastConsecutiveWindow(series)?.points ?? [];

  let delta: number | null = null;
  let pctDelta: number | null = null;
  let refYear: number | null = null;
  if (latest) {
    const ref = windowPoints
      .filter((p) => p.year <= latest.year - compareYears)
      .slice(-1)[0];
    if (ref) {
      delta = latest.value - ref.value;
      pctDelta = ref.value !== 0 ? ((latest.value - ref.value) / Math.abs(ref.value)) * 100 : null;
      refYear = ref.year;
    }
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
            {delta !== null && refYear !== null && (
              <span
                className="text-xs font-medium"
                style={{ color: delta >= 0 ? "#52B788" : "#E76F51" }}
              >
                {delta >= 0 ? "▲" : "▼"} {deltaText(kind, delta, pctDelta)}
                <span className="text-[#8A8A94]"> vs {refYear}</span>
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

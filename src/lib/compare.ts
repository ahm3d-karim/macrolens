import type { IndicatorKind, SeriesPoint } from "./types";
import { lastConsecutiveWindow, yearsAgo, type Window } from "./stats";

// One row per included country: latest reading, 10-yr delta, and rank among
// the included set (1 = highest latest). All math flows through src/lib/stats
// so the compare table and the dossier findings can never disagree.
export interface CompareRow {
  slug: string;
  latestYear: number;
  latest: number;
  refYear: number | null;
  delta: number | null; // absolute change, latest minus reference
  pctChange: number | null; // sign-aware relative change vs reference
  rank: number | null;
}

export function buildCompareRows(
  seriesByCountry: Record<string, SeriesPoint[]>,
  included: string[],
): CompareRow[] {
  const rows: CompareRow[] = [];
  for (const slug of included) {
    const series = seriesByCountry[slug] ?? [];
    const w: Window | null = lastConsecutiveWindow(series);
    if (!w || w.points.length === 0) {
      rows.push({ slug, latestYear: NaN, latest: NaN, refYear: null, delta: null, pctChange: null, rank: null });
      continue;
    }
    const last = w.points[w.points.length - 1];
    const ref = yearsAgo(w, 10);
    const delta = ref ? last.value - ref.value : null;
    const pctChange =
      ref && ref.value !== 0 ? ((last.value - ref.value) / Math.abs(ref.value)) * 100 : null;
    rows.push({
      slug,
      latestYear: last.year,
      latest: last.value,
      refYear: ref ? ref.year : null,
      delta,
      pctChange,
      rank: null,
    });
  }
  rows
    .filter((r) => Number.isFinite(r.latest))
    .sort((a, b) => b.latest - a.latest)
    .forEach((r, i) => {
      r.rank = i + 1;
    });
  return rows;
}

export function deltaLabel(kind: IndicatorKind): string {
  switch (kind) {
    case "pct":
      return "10-yr change (pp)";
    case "months":
      return "10-yr change (mo)";
    default:
      return "10-yr change (%)";
  }
}

export function deltaDisplay(row: CompareRow, kind: IndicatorKind): string {
  if (kind === "pct" || kind === "months") {
    if (row.delta === null) return "n/a";
    const s = row.delta >= 0 ? "+" : "-";
    return `${s}${Math.abs(row.delta).toFixed(1)}`;
  }
  if (row.pctChange === null) return "n/a";
  const s = row.pctChange >= 0 ? "+" : "-";
  return `${s}${Math.abs(row.pctChange).toFixed(1)}%`;
}

export interface Gap {
  leaderSlug: string;
  leaderValue: number;
  laggardSlug: string;
  laggardValue: number;
  gap: number;
  ratio: number | null;
}

export function gapLeaderLaggard(rows: CompareRow[]): Gap | null {
  const valid = rows.filter((r) => Number.isFinite(r.latest));
  if (valid.length < 2) return null;
  const sorted = [...valid].sort((a, b) => b.latest - a.latest);
  const leader = sorted[0];
  const laggard = sorted[sorted.length - 1];
  return {
    leaderSlug: leader.slug,
    leaderValue: leader.latest,
    laggardSlug: laggard.slug,
    laggardValue: laggard.latest,
    gap: leader.latest - laggard.latest,
    ratio: laggard.latest !== 0 ? leader.latest / laggard.latest : null,
  };
}

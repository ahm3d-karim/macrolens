// Pure statistics over [{year, value}] series. No imports, no I/O.
// Every narrative number on the site comes from these functions at build
// time, so nothing on a chart card can drift from the underlying data.

export interface SeriesPoint {
  year: number;
  value: number | null;
}

export interface Window {
  firstYear: number;
  lastYear: number;
  points: { year: number; value: number }[];
}

// Restrict a series to consecutive non-null observations ending at its last
// non-null value. The window defines which past the narrative is allowed to
// reference: claims like "since 2000" or "over the past decade" are computed
// inside this window or not at all.
export function lastConsecutiveWindow(series: SeriesPoint[]): Window | null {
  const idx: number[] = [];
  for (let i = 0; i < series.length; i++) {
    if (series[i].value !== null && series[i].value !== undefined) idx.push(i);
  }
  if (idx.length === 0) return null;
  const last = idx[idx.length - 1];
  let startIdx = last;
  while (startIdx > 0 && idx.includes(startIdx - 1)) startIdx--;
  const points: { year: number; value: number }[] = [];
  for (let i = startIdx; i <= last; i++) {
    const v = series[i].value;
    if (v !== null && v !== undefined) points.push({ year: series[i].year, value: v });
  }
  return { firstYear: points[0].year, lastYear: points[points.length - 1].year, points };
}

// Observations split into runs of consecutive years. A chart drawn from these
// breaks at a missing year instead of bridging it: a sparkline makes the same
// promise as the big line charts, and index-spaced points would hide the hole.
export function consecutiveRuns(
  points: { year: number; value: number }[],
): { year: number; value: number }[][] {
  const runs: { year: number; value: number }[][] = [];
  for (const p of points) {
    const run = runs[runs.length - 1];
    if (run && p.year === run[run.length - 1].year + 1) run.push(p);
    else runs.push([p]);
  }
  return runs;
}

// Value exactly at `year` (null when missing), plus the nearest observation
// within `tolerance` years on either side (data ends mid-decade on some series).
export function valueInYear(
  w: Window,
  year: number,
  tolerance = 0,
): { year: number; value: number } | null {
  const exact = w.points.find((p) => p.year === year);
  if (exact) return exact;
  if (tolerance <= 0) return null;
  let best: { year: number; value: number } | null = null;
  for (const p of w.points) {
    const d = Math.abs(p.year - year);
    if (d <= tolerance && (!best || d < Math.abs(best.year - year))) best = p;
  }
  return best;
}

// Trailing mean over the `n` observations ending at the window's last point.
export function trailingMean(w: Window, n: number): { mean: number; fromYear: number; toYear: number } | null {
  if (w.points.length === 0) return null;
  const slice = w.points.slice(-n);
  const mean = slice.reduce((s, p) => s + p.value, 0) / slice.length;
  return { mean, fromYear: slice[0].year, toYear: slice[slice.length - 1].year };
}

export interface Extremum {
  year: number;
  value: number;
}

export function maxIn(w: Window, fromYear?: number): Extremum | null {
  const pool = fromYear ? w.points.filter((p) => p.year >= fromYear) : w.points;
  if (pool.length === 0) return null;
  return pool.reduce((a, b) => (b.value > a.value ? b : a));
}

export function minIn(w: Window, fromYear?: number): Extremum | null {
  const pool = fromYear ? w.points.filter((p) => p.year >= fromYear) : w.points;
  if (pool.length === 0) return null;
  return pool.reduce((a, b) => (b.value < a.value ? b : a));
}

// Count of observations strictly below `threshold` in the trailing `n` points.
export function countBelowInLast(w: Window, n: number, threshold: number): { count: number; span: number } {
  const slice = w.points.slice(-n);
  const count = slice.filter((p) => p.value < threshold).length;
  return { count, span: slice.length };
}

// Count of observations strictly above `threshold` in the trailing `n` points.
export function countAboveInLast(w: Window, n: number, threshold: number): { count: number; span: number } {
  const slice = w.points.slice(-n);
  const count = slice.filter((p) => p.value > threshold).length;
  return { count, span: slice.length };
}

export interface Change {
  pctChange: number; // relative change in percent (sign-aware)
  absChange: number; // absolute change (level series)
  fromYear: number;
  toYear: number;
}

// Change between the observation at/near `fromYear` (within `tolerance`) and
// the window's last observation. Relative change is sign-aware: for a
// negative base (e.g. current account deficits) a move toward positive reads
// as positive pctChange, computed as (to - from) / |from|.
export function changeFrom(
  w: Window,
  fromYear: number,
  tolerance = 0,
): Change | null {
  const from = valueInYear(w, fromYear, tolerance);
  if (!from) return null;
  const to = w.points[w.points.length - 1];
  if (to.year <= from.year) return null;
  const absChange = to.value - from.value;
  const pctChange = from.value !== 0 ? (absChange / Math.abs(from.value)) * 100 : NaN;
  return { pctChange, absChange, fromYear: from.year, toYear: to.year };
}

// The latest year the series crossed `level` in `dir` direction, searching
// backwards. `dir: "above"` finds the last year value was >= level before
// falling below it afterwards (the last time it was true and stopped being
// true), and vice versa. Returns null when no such crossing exists in-window.
export function lastCrossing(
  w: Window,
  level: number,
  dir: "above" | "below",
): Extremum | null {
  const test = dir === "above" ? (v: number) => v >= level : (v: number) => v <= level;
  for (let i = w.points.length - 1; i > 0; i--) {
    const p = w.points[i];
    const prev = w.points[i - 1];
    if (test(p.value) && !test(prev.value)) return p;
  }
  // The window itself may open on the far side of the level (series starts
  // above/below and never returns): report the first observation then.
  if (w.points.length > 0 && test(w.points[0].value)) return w.points[0];
  return null;
}

// First year the country being described was overtaken by a peer and stayed
// behind. `mine` and `theirs` are windows; both must have the overlap years.
// Returns null when the overtaking never happened inside the shared window.
export function overtakingYear(
  mine: Window,
  theirs: Window,
): { year: number; mineNow: number; theirsNow: number } | null {
  const overlap = new Map<number, { a?: number; b?: number }>();
  for (const p of mine.points) {
    const e = overlap.get(p.year) ?? {};
    e.a = p.value;
    overlap.set(p.year, e);
  }
  for (const p of theirs.points) {
    const e = overlap.get(p.year) ?? {};
    e.b = p.value;
    overlap.set(p.year, e);
  }
  const rows = [...overlap.entries()]
    .filter(([, e]) => e.a !== undefined && e.b !== undefined)
    .map(([year, e]) => ({ year, a: e.a as number, b: e.b as number }))
    .sort((x, y) => x.year - y.year);
  if (rows.length === 0) return null;
  let cross: number | null = null;
  for (let i = 1; i < rows.length; i++) {
    if (rows[i - 1].a >= rows[i - 1].b && rows[i].a < rows[i].b) cross = rows[i].year;
  }
  if (cross === null) return null;
  const last = rows[rows.length - 1];
  // Confirm it stuck: at the end of the shared window they are still ahead.
  if (last.a >= last.b) return null;
  return { year: cross, mineNow: last.a, theirsNow: last.b };
}

// Compare years for "X years ago" claims: observation nearest (lastYear - n)
// within tolerance 1, else the oldest point in the window.
export function yearsAgo(w: Window, n: number, tol = 1): { year: number; value: number } | null {
  const target = w.lastYear - n;
  const hit = valueInYear(w, target, tol);
  if (hit) return hit;
  return w.points[0];
}

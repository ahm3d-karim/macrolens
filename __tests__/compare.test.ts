import { describe, expect, it } from "vitest";
import { buildCompareRows, deltaDisplay, deltaLabel, gapLeaderLaggard } from "../src/lib/compare";
import type { SeriesPoint } from "../src/lib/types";

// A climbs 10 -> 20 over 2010-2020, B declines 20 -> 10, C has interior gaps.
const A: SeriesPoint[] = Array.from({ length: 11 }, (_, i) => ({ year: 2010 + i, value: 10 + i }));
const B: SeriesPoint[] = Array.from({ length: 11 }, (_, i) => ({ year: 2010 + i, value: 20 - i }));
const C: SeriesPoint[] = [
  { year: 2010, value: 5 },
  { year: 2011, value: null },
  { year: 2012, value: 6 },
  { year: 2013, value: null },
  { year: 2014, value: null },
  { year: 2015, value: 9 },
  { year: 2016, value: 10 },
  { year: 2017, value: null },
  { year: 2018, value: 12 },
  { year: 2019, value: 13 },
  { year: 2020, value: 15 },
];

describe("buildCompareRows", () => {
  it("ranks latest values and computes 10-yr deltas among included countries", () => {
    const rows = buildCompareRows({ a: A, b: B, c: C }, ["a", "b", "c"]);
    expect(rows.find((r) => r.slug === "a")).toMatchObject({
      latest: 20, latestYear: 2020, rank: 1, refYear: 2010, delta: 10, pctChange: 100,
    });
    expect(rows.find((r) => r.slug === "b")).toMatchObject({
      latest: 10, latestYear: 2020, rank: 3, refYear: 2010, delta: -10, pctChange: -50,
    });
    // C's window is 2018-2020 (gap at 2017); ref falls back to the window start.
    expect(rows.find((r) => r.slug === "c")).toMatchObject({
      latest: 15, latestYear: 2020, rank: 2, refYear: 2018, delta: 3, pctChange: 25,
    });
  });

  it("marks countries without data as unranked, and ignores unselected countries", () => {
    const rows = buildCompareRows({ a: A }, ["a", "zz"]);
    expect(rows.find((r) => r.slug === "a")!.rank).toBe(1);
    const zz = rows.find((r) => r.slug === "zz")!;
    expect(zz.rank).toBeNull();
    expect(Number.isFinite(zz.latest)).toBe(false);
  });
});

describe("delta display", () => {
  const row = { slug: "x", latestYear: 2020, latest: 15, refYear: 2010, delta: -27.3, pctChange: -88.7, rank: 2 };
  it("shows percentage points for pct kind, percent for usd/count", () => {
    expect(deltaDisplay(row, "pct")).toBe("-27.3");
    expect(deltaDisplay(row, "months")).toBe("-27.3");
    expect(deltaDisplay(row, "usd")).toBe("-88.7%");
    expect(deltaDisplay(row, "count")).toBe("-88.7%");
  });
  it("handles null and zero-reference rows", () => {
    expect(deltaDisplay({ ...row, delta: null, pctChange: null }, "pct")).toBe("n/a");
    expect(deltaLabel("pct")).toBe("10-yr change (pp)");
    expect(deltaLabel("months")).toBe("10-yr change (mo)");
    expect(deltaLabel("usd")).toBe("10-yr change (%)");
  });
});

describe("gapLeaderLaggard", () => {
  it("returns leader, laggard, absolute gap and ratio", () => {
    const rows = buildCompareRows({ a: A, b: B, c: C }, ["a", "b", "c"]);
    const gap = gapLeaderLaggard(rows)!;
    expect(gap.leaderSlug).toBe("a");
    expect(gap.leaderValue).toBe(20);
    expect(gap.laggardSlug).toBe("b");
    expect(gap.laggardValue).toBe(10);
    expect(gap.gap).toBe(10);
    expect(gap.ratio).toBe(2);
  });
  it("returns null for fewer than two valid rows", () => {
    const rows = buildCompareRows({ a: A }, ["a"]);
    expect(gapLeaderLaggard(rows)).toBeNull();
  });
});

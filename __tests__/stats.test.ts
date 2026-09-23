import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { consecutiveRuns, lastConsecutiveWindow } from "../src/lib/stats";

describe("sparkline runs", () => {
  it("splits at a missing year, keeps consecutive years together", () => {
    const runs = consecutiveRuns([
      { year: 2012, value: 1 },
      { year: 2013, value: 2 },
      { year: 2014, value: 3 },
      { year: 2022, value: 4 },
    ]);
    expect(runs.map((r) => r.map((p) => p.year))).toEqual([
      [2012, 2013, 2014],
      [2022],
    ]);
  });

  it("the shipped India fiscal balance series really has a hole to protect", () => {
    const file = path.join(process.cwd(), "data", "india", "fiscal-balance.json");
    const series = JSON.parse(fs.readFileSync(file, "utf-8")) as {
      year: number;
      value: number | null;
    }[];
    const observed = series
      .filter((p) => p.value !== null && p.value !== undefined)
      .slice(-8)
      .map((p) => ({ year: p.year, value: p.value as number }));
    // 2012..2018 and then 2022: index-spaced points would bridge four missing years.
    expect(consecutiveRuns(observed).length).toBeGreaterThan(1);

    // The delta is the stricter case: the consecutive window ends at 2022 alone,
    // so StatCard shows that reading without a change figure rather than
    // measuring it against 2018 across the hole.
    const window = lastConsecutiveWindow(series);
    expect(window?.points.map((p) => p.year)).toEqual([2022]);
  });
});

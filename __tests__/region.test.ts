import { describe, expect, it } from "vitest";
import { INDICATOR_SECTIONS } from "../src/lib/indicators";
import { COUNTRIES } from "../src/lib/countries";
import { buildCompareRows, gapLeaderLaggard } from "../src/lib/compare";
import type { SeriesPoint } from "../src/lib/types";
import fs from "node:fs";
import path from "node:path";

// The region page renders one row per section slug and drops any slug whose
// gap comes back null, so a series losing its coverage would make a row
// disappear silently. This is that check: every shipped slug still has at
// least two countries with a finite latest reading.
describe("region table rows", () => {
  const slugs = INDICATOR_SECTIONS.flatMap((s) => s.rows.flat());

  it("every section slug yields a leader and a laggard", () => {
    const missing: string[] = [];
    for (const slug of slugs) {
      const byCountry: Record<string, SeriesPoint[]> = {};
      for (const c of COUNTRIES) {
        const file = path.join(process.cwd(), "data", c.slug, `${slug}.json`);
        byCountry[c.slug] = fs.existsSync(file)
          ? (JSON.parse(fs.readFileSync(file, "utf-8")) as SeriesPoint[])
          : [];
      }
      const gap = gapLeaderLaggard(buildCompareRows(byCountry, COUNTRIES.map((c) => c.slug)));
      if (!gap) missing.push(slug);
    }
    expect(missing).toEqual([]);
    expect(slugs.length).toBe(22);
  });
});

import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { COUNTRIES } from "../src/lib/countries";
import { INDICATORS } from "../src/lib/indicators";
import { getFacts, type SeriesLookup } from "../src/lib/insights";
import { lastConsecutiveWindow, type Window } from "../src/lib/stats";
import type { SeriesPoint } from "../src/lib/types";

const DATA_DIR = path.join(process.cwd(), "data");

const DASHES = /[\u2013\u2014]/; // en dash, em dash (R-02)

function loadSeries(country: string, indicator: string): { year: number; value: number | null }[] {
  const file = path.join(DATA_DIR, country, `${indicator}.json`);
  return JSON.parse(fs.readFileSync(file, "utf-8"));
}

function windowsByCountry(indicator: string): Record<string, Window | null> {
  const out: Record<string, Window | null> = {};
  for (const c of COUNTRIES) {
    out[c.slug] = lastConsecutiveWindow(loadSeries(c.slug, indicator));
  }
  return out;
}

// Structural constants the engine is allowed to cite without being a statistic:
// thresholds (3-month line, debt bands), window lengths, ranks.
const STRUCTURAL = new Set([
  0, 1, 1.5, 2, 3, 4, 5, 6, 8, 10, 12, 15, 18, 20, 25, 30, 40, 60, 100,
]);

const round1 = (v: number) => Math.round(v * 10) / 10;

// Every numeric value the prose of a given (country, indicator) finding could
// legitimately cite, re-derived from the same series the chart displays.
function groundTruth(
  w: Window,
  peers: Window[],
  cross: Window[],
): { values: Set<number>; counts: Set<number> } {
  const values = new Set<number>();
  const counts = new Set<number>();

  // The engine formats USD levels rounded to whole dollars, pct/months at 1dp,
  // so every derived value is grounded in all the forms the formatter emits.
  const addVal = (x: number) => {
    values.add(round1(x));
    values.add(Math.round(x * 100) / 100);
    values.add(Math.round(x));
  };

  const pts = w.points;
  // Raw window values, plus every pairwise difference and percent change
  // (the engine cites peaks, troughs, gaps and swings).
  for (const p of pts) {
    addVal(p.value);
  }
  for (let i = 0; i < pts.length; i++) {
    for (let j = 0; j < pts.length; j++) {
      if (i === j) continue;
      addVal(Math.abs(pts[i].value - pts[j].value));
      const base = Math.abs(pts[j].value);
      if (base > 0.01) addVal(((pts[i].value - pts[j].value) / base) * 100);
    }
  }
  // Trailing means over any window length the engine might reference.
  for (let n = 2; n <= pts.length; n++) {
    const slice = pts.slice(-n);
    addVal(slice.reduce((s, p) => s + p.value, 0) / slice.length);
  }
  // Peer and cross-series windows: every one of their values can be cited
  // ("vs" figures at historical years), plus cross-country ratios at shared
  // years and against my latest ("1.2x as rich", "imports run 3.8x exports").
  const mineLatest = pts[pts.length - 1].value;
  for (const pw of [...peers, ...cross]) {
    for (const p of pw.points) {
      addVal(p.value);
      const mineAt = pts.find((q) => q.year === p.year);
      if (mineAt && mineAt.value !== 0) addVal(p.value / mineAt.value);
      if (mineAt && p.value !== 0) addVal(mineAt.value / p.value);
      if (mineLatest !== 0) addVal(p.value / mineLatest);
      if (p.value !== 0) addVal(mineLatest / p.value);
    }
  }
  // Observation counts: years below the 3-month reserves line, negative
  // growth years, window length. Both trailing-30 and whole-window variants
  // are grounded (the engine cites the trailing form).
  const belowAll = countBelow(w, 3);
  const belowLast = w.points.slice(-30).filter((p) => p.value < 3).length;
  counts.add(belowAll);
  counts.add(belowLast);
  counts.add(countNegative(w));
  counts.add(w.points.slice(-30).filter((p) => p.value < 0).length);
  counts.add(pts.length);
  for (const pw of peers) {
    counts.add(countBelow(pw, 3));
    counts.add(pw.points.length);
  }
  return { values, counts };
}

// Series lookup built straight from the data dir, same shape the page uses.
function lookupFromDisk(): SeriesLookup {
  return (slug: string) => {
    const out: Record<string, SeriesPoint[]> = {};
    for (const x of COUNTRIES) out[x.slug] = loadSeries(x.slug, slug);
    return out;
  };
}

function countBelow(w: Window, level: number): number {
  return w.points.filter((p) => p.value < level).length;
}

function countNegative(w: Window): number {
  return w.points.filter((p) => p.value < 0).length;
}

describe("computed findings", () => {
  it("produces a finding for every country x indicator with enough data", () => {
    for (const ind of INDICATORS) {
      const byCountry = windowsByCountry(ind.slug);
      for (const c of COUNTRIES) {
        const w = byCountry[c.slug];
        // The engine declines to speak on thin windows (fewer than 6
        // consecutive observations): India's fiscal balance ends 2018 with
        // one stray 2022 point, Nepal's real-rate series is empty. Silence
        // is the designed behavior there, not a bug.
        if (!w || w.points.length < 6) continue;
        const finding = getFacts(c.slug, ind.slug, lookupFromDisk());
        expect(finding, `no finding for ${c.slug}:${ind.slug}`).not.toBeNull();
        expect(finding!.title.length, `${c.slug}:${ind.slug} title empty`).toBeGreaterThan(0);
        expect(finding!.note.length, `${c.slug}:${ind.slug} note empty`).toBeGreaterThan(0);
      }
    }
  });

  it("findings are deterministic across repeated calls", () => {
    for (const ind of INDICATORS.slice(0, 3)) {
      for (const c of COUNTRIES) {
        const a = getFacts(c.slug, ind.slug, lookupFromDisk());
        const b = getFacts(c.slug, ind.slug, lookupFromDisk());
        expect(a).toEqual(b);
      }
    }
  });

  it("titles are findings, not variable names (no indicator title echo)", () => {
    for (const ind of INDICATORS) {
      for (const c of COUNTRIES) {
        const finding = getFacts(c.slug, ind.slug, lookupFromDisk());
        if (!finding) continue;
        expect(
          finding.title,
          `${c.slug}:${ind.slug} title just echoes the indicator name`,
        ).not.toBe(ind.title);
        expect(finding.title, `${c.slug}:${ind.slug} title too short to be a finding`).toContain(" ");
      }
    }
  });

  it("no template residue or banned punctuation anywhere (R-02)", () => {
    const banned = [/TODO/i, /placeholder/i, /lorem/i, /undefined/, /\[object/, /\$\{/, /null/];
    for (const ind of INDICATORS) {
      for (const c of COUNTRIES) {
        const finding = getFacts(c.slug, ind.slug, lookupFromDisk());
        if (!finding) continue;
        const text = `${finding.title} ${finding.note}`;
        expect(text.match(DASHES), `${c.slug}:${ind.slug} has en/em dash`).toBeNull();
        for (const re of banned) {
          expect(re.test(text), `${c.slug}:${ind.slug} contains banned token ${re}`).toBe(false);
        }
      }
    }
  });

  it("every number in prose is grounded in the shipped series (R-17)", () => {
    for (const ind of INDICATORS) {
      const byCountry = windowsByCountry(ind.slug);
      // Cross-series lookups the engine may cite (imports vs exports etc.).
      const crossSlugs = ["imports", "exports", "remittances"].filter((s) => s !== ind.slug);
      for (const c of COUNTRIES) {
        const w = byCountry[c.slug];
        if (!w) continue;
        const finding = getFacts(c.slug, ind.slug, lookupFromDisk());
        if (!finding) continue;

        const peers = Object.entries(byCountry)
          .filter(([slug]) => slug !== c.slug)
          .map(([, pw]) => pw)
          .filter((pw): pw is Window => pw !== null);
        const cross = crossSlugs
          .map((s) => {
            const cw = lastConsecutiveWindow(loadSeries(c.slug, s));
            return cw;
          })
          .filter((cw): cw is Window => cw !== null);

        const { values, counts } = groundTruth(w, peers, cross);

        const text = `${finding.title} ${finding.note}`;
        const tokens = (text.match(/-?\d[\d,]*(?:\.\d+)?/g) ?? []).map((t) =>
          t.replace(/[,.;:]+$/, ""),
        );
        for (const tok of tokens) {
          const isYear = /^(19|20)\d{2}$/.test(tok);
          if (isYear) {
            const y = parseInt(tok, 10);
            expect(
              y >= w.firstYear - 1 && y <= w.lastYear + 10,
              `${c.slug}:${ind.slug} cites year ${y} outside the data era (${w.firstYear}-${w.lastYear}): "${text}"`,
            ).toBe(true);
            continue;
          }
          const num = parseFloat(tok.replace(/,/g, ""));
          const groundedVal = [...values].some((v) => Math.abs(v - num) < 0.051);
          const groundedCount = Number.isInteger(num) && counts.has(num);
          const structural = STRUCTURAL.has(num);
          expect(
            groundedVal || groundedCount || structural,
            `${c.slug}:${ind.slug} cites ungrounded number ${tok} in: "${text}"`,
          ).toBe(true);
        }
      }
    }
  });

  it("remains silent (null) when a series has too little data, never invents", () => {
    // A series truncated to 2 points cannot support any claim.
    const stub: SeriesPoint[] = [
      { year: 2020, value: 5 },
      { year: 2021, value: 6 },
    ];
    const finding = getFacts("pakistan", "gdp-growth", (slug): Record<string, SeriesPoint[]> => {
      if (slug !== "gdp-growth") return {};
      return Object.fromEntries(COUNTRIES.map((x) => [x.slug, stub]));
    });
    // With 2 points even the generic block declines to speak.
    expect(finding).toBeNull();
  });
});

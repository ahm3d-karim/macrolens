import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { COUNTRIES } from "../src/lib/countries";
import { INDICATORS } from "../src/lib/indicators";

const DATA_DIR = path.join(process.cwd(), "data");

function strictParse(file: string): unknown {
  const raw = fs.readFileSync(file, "utf-8");
  expect(raw).not.toMatch(/\bNaN\b|\bInfinity\b/);
  return JSON.parse(raw, (k, v) => {
    if (typeof v === "number" && !Number.isFinite(v)) throw new Error(`non-finite in ${file}`);
    return v;
  });
}

describe("macrolens data files", () => {
  it("every country has every indicator file, strictly valid JSON, sorted years", () => {
    for (const c of COUNTRIES) {
      for (const ind of INDICATORS) {
        const file = path.join(DATA_DIR, c.slug, `${ind.slug}.json`);
        expect(fs.existsSync(file), `missing ${file}`).toBe(true);
        const rows = strictParse(file) as { year: number; value: number | null }[];
        expect(Array.isArray(rows)).toBe(true);
        for (let i = 1; i < rows.length; i++) {
          expect(rows[i].year, `${file}: years unsorted at ${i}`).toBeGreaterThan(rows[i - 1].year);
        }
      }
    }
  });

  it("meta.json exists and lists every indicator", () => {
    const meta = strictParse(path.join(DATA_DIR, "meta.json")) as {
      sources: Record<string, unknown>;
    };
    for (const ind of INDICATORS) {
      expect(meta.sources[ind.slug], `meta missing ${ind.slug}`).toBeDefined();
    }
  });

  it("spot-check known values against the live data (sanity bands)", () => {
    const get = (country: string, ind: string, year: number) => {
      const rows = strictParse(path.join(DATA_DIR, country, `${ind}.json`)) as {
        year: number;
        value: number | null;
      }[];
      return rows.find((r) => r.year === year)?.value;
    };
    const inBand = (v: number | null | undefined, lo: number, hi: number, what: string) => {
      expect(v, what).toBeDefined();
      expect(v as number, what).toBeGreaterThanOrEqual(lo);
      expect(v as number, what).toBeLessThanOrEqual(hi);
    };
    inBand(get("pakistan", "gdp-growth", 2025), 2.5, 5.0, "PK growth 2025");
    inBand(get("india", "inflation", 2023), 4.5, 7.5, "IN CPI 2023");
    inBand(get("sri-lanka", "inflation", 2022), 40, 60, "LK CPI 2022 (crisis)");
    inBand(get("bangladesh", "gdp-per-capita", 2024), 1400, 2600, "BD GDP/cap 2024");
    inBand(get("nepal", "remittances", 2023), 18, 32, "NP remittances 2023");
    inBand(get("pakistan", "reserves-months", 2024), 1.2, 3.5, "PK reserves 2024");
    inBand(get("india", "external-debt", 2023), 15, 30, "IN ext debt 2023");
    inBand(get("pakistan", "broad-money", 2024), 30, 60, "PK broad money 2024");
    inBand(get("pakistan", "gross-capital-formation", 2024), 10, 25, "PK GCF 2024");
  });

  it("every file has a real history: >=20 rows and >=10 non-null values", () => {
    for (const c of COUNTRIES) {
      for (const ind of INDICATORS) {
        const file = path.join(DATA_DIR, c.slug, `${ind.slug}.json`);
        const rows = JSON.parse(fs.readFileSync(file, "utf-8")) as { value: number | null }[];
        expect(rows.length, `${file} too thin`).toBeGreaterThanOrEqual(20);
        const nonNull = rows.filter((r) => r.value !== null && r.value !== undefined).length;
        expect(nonNull, `${file} all-null series`).toBeGreaterThanOrEqual(10);
      }
    }
  });
});
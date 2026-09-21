import fs from "node:fs";
import path from "node:path";
import type { SeriesPoint } from "./types";
import { COUNTRY_MAP, ALL_COUNTRIES } from "./countries";

export const DATA_DIR = path.join(process.cwd(), "data");

export function loadSeries(country: string, indicator: string): SeriesPoint[] {
  const file = path.join(DATA_DIR, country, `${indicator}.json`);
  if (!fs.existsSync(file)) return [];
  return JSON.parse(fs.readFileSync(file, "utf-8")) as SeriesPoint[];
}

export function loadCountrySeries(
  country: string,
  indicator: string,
): SeriesPoint[] {
  return loadSeries(country, indicator);
}

export function loadAllCountriesSeries(indicator: string): Record<
  string,
  SeriesPoint[]
> {
  const out: Record<string, SeriesPoint[]> = {};
  for (const c of ALL_COUNTRIES) {
    out[c.slug] = loadSeries(c.slug, indicator);
  }
  return out;
}

export function loadMeta(): Record<string, unknown> | null {
  const file = path.join(DATA_DIR, "meta.json");
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, "utf-8")) as Record<string, unknown>;
}

export function latestValue(series: SeriesPoint[]): {
  year: number;
  value: number;
} | null {
  for (let i = series.length - 1; i >= 0; i--) {
    const p = series[i];
    if (p.value !== null && p.value !== undefined) {
      return { year: p.year, value: p.value };
    }
  }
  return null;
}

export function valueInYear(
  series: SeriesPoint[],
  year: number,
): number | null {
  const p = series.find((s) => s.year === year);
  return p && p.value !== null && p.value !== undefined ? p.value : null;
}

export function yearRange(series: SeriesPoint[]): {
  start: number;
  end: number;
} | null {
  const years = series.map((s) => s.year);
  if (years.length === 0) return null;
  return { start: years[0], end: years[years.length - 1] };
}

// First and last year with an actual observation, nulls skipped: the coverage
// a series really has, as opposed to the year range the file happens to list.
// A series can end in 2025 and still stop in 2019, and the site says so.
export function coverageSpan(
  series: SeriesPoint[],
): { first: number; last: number } | null {
  let first: number | null = null;
  let last: number | null = null;
  for (const p of series) {
    if (p.value === null || p.value === undefined) continue;
    if (first === null) first = p.year;
    last = p.year;
  }
  return first === null || last === null ? null : { first, last };
}

export function countryName(slug: string): string {
  return COUNTRY_MAP[slug as keyof typeof COUNTRY_MAP]?.name ?? slug;
}
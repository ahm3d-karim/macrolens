export type CountrySlug =
  | "pakistan"
  | "india"
  | "bangladesh"
  | "sri-lanka"
  | "nepal"
  | "vietnam"
  | "indonesia";

export interface CountryMeta {
  slug: CountrySlug;
  name: string;
  short: string;
  code: string; // WDI 2-letter
  iso3: string;
  flag: string;
  color: string;
  blurb: string;
  // Drawn in charts and selectable in the compare table, but kept out of the
  // regional rankings and peer ranges: a benchmark is context, not a neighbour.
  benchmark?: boolean;
}

export interface SeriesPoint {
  year: number;
  value: number | null;
}

export type IndicatorKind =
  | "pct" // percent (e.g. growth, inflation, shares of GDP)
  | "usd" // US dollars (levels)
  | "months" // reserves in months of imports
  | "rate" // bare level (e.g. LCU per USD): no unit suffix
  | "count"; // population etc.

export interface IndicatorMeta {
  slug: string;
  title: string;
  unit: string;
  kind: IndicatorKind;
  code: string;
  source: string;
  sourceUrl: string;
  decimals: number;
  optional?: boolean; // series may be absent from data/ without failing the build
}
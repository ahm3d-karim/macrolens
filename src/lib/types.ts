export type CountrySlug =
  | "pakistan"
  | "india"
  | "bangladesh"
  | "sri-lanka"
  | "nepal";

export interface CountryMeta {
  slug: CountrySlug;
  name: string;
  short: string;
  code: string; // WDI 2-letter
  iso3: string;
  flag: string;
  color: string;
  blurb: string;
}

export interface SeriesPoint {
  year: number;
  value: number | null;
}

export type IndicatorKind =
  | "pct" // percent (e.g. growth, inflation, shares of GDP)
  | "usd" // US dollars (levels)
  | "months" // reserves in months of imports
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
}
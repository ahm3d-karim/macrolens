import type { CountryMeta, CountrySlug } from "./types";

export const COUNTRIES: CountryMeta[] = [
  {
    slug: "pakistan",
    name: "Pakistan",
    short: "PK",
    code: "PK",
    iso3: "PAK",
    flag: "🇵🇰",
    color: "#52B788",
    blurb: "Boom-bust growth, chronic reserves stress, remittance-dependent.",
  },
  {
    slug: "india",
    name: "India",
    short: "IN",
    code: "IN",
    iso3: "IND",
    flag: "🇮🇳",
    color: "#DD8452",
    blurb: "The regional giant: reform-led growth pulling away from the pack.",
  },
  {
    slug: "bangladesh",
    name: "Bangladesh",
    short: "BD",
    code: "BD",
    iso3: "BGD",
    flag: "🇧🇩",
    color: "#8B5CF6",
    blurb: "The export machine: it overtook Pakistan in GDP per capita.",
  },
  {
    slug: "sri-lanka",
    name: "Sri Lanka",
    short: "LK",
    code: "LK",
    iso3: "LKA",
    flag: "🇱🇰",
    color: "#D4A373",
    blurb: "The 2022 crisis teardown: what reserve depletion does to a country.",
  },
  {
    slug: "nepal",
    name: "Nepal",
    short: "NP",
    code: "NP",
    iso3: "NPL",
    flag: "🇳🇵",
    color: "#E76F51",
    blurb: "The remittance paradox: a quarter of GDP sent home from abroad.",
  },
];

// Benchmarks: same publishers, same units, same scale, so a South Asian
// reading has an Asian reference point ("Bangladesh passed Pakistan" means
// more next to Vietnam). They are drawn on every dossier chart and can be
// mixed into the compare table, but they carry no dossier page, no sitemap
// entry and no vote in the regional rankings and peer ranges: those are
// computed over COUNTRIES only.
export const BENCHMARKS: CountryMeta[] = [
  {
    slug: "vietnam",
    name: "Vietnam",
    short: "VN",
    code: "VN",
    iso3: "VNM",
    flag: "🇻🇳",
    color: "#5BC0DE",
    blurb: "Benchmark: the export-led growth model South Asia is measured against.",
    benchmark: true,
  },
  {
    slug: "indonesia",
    name: "Indonesia",
    short: "ID",
    code: "ID",
    iso3: "IDN",
    flag: "🇮🇩",
    color: "#F2B705",
    blurb: "Benchmark: a large commodity exporter that kept its reserves.",
    benchmark: true,
  },
];

export const ALL_COUNTRIES: CountryMeta[] = [...COUNTRIES, ...BENCHMARKS];

export const COUNTRY_MAP: Record<CountrySlug, CountryMeta> = Object.fromEntries(
  ALL_COUNTRIES.map((c) => [c.slug, c]),
) as Record<CountrySlug, CountryMeta>;

export function isCountrySlug(s: string): s is CountrySlug {
  return s in COUNTRY_MAP;
}
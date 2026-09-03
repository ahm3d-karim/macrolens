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
    blurb: "The regional giant — reform-led growth pulling away from the pack.",
  },
  {
    slug: "bangladesh",
    name: "Bangladesh",
    short: "BD",
    code: "BD",
    iso3: "BGD",
    flag: "🇧🇩",
    color: "#8B5CF6",
    blurb: "The export machine — overtook Pakistan in GDP per capita.",
  },
  {
    slug: "sri-lanka",
    name: "Sri Lanka",
    short: "LK",
    code: "LK",
    iso3: "LKA",
    flag: "🇱🇰",
    color: "#D4A373",
    blurb: "The 2022 crisis teardown — what reserve depletion does to a country.",
  },
  {
    slug: "nepal",
    name: "Nepal",
    short: "NP",
    code: "NP",
    iso3: "NPL",
    flag: "🇳🇵",
    color: "#E76F51",
    blurb: "The remittance paradox — a quarter of GDP sent home from abroad.",
  },
];

export const COUNTRY_MAP: Record<CountrySlug, CountryMeta> = Object.fromEntries(
  COUNTRIES.map((c) => [c.slug, c]),
) as Record<CountrySlug, CountryMeta>;

export function isCountrySlug(s: string): s is CountrySlug {
  return s in COUNTRY_MAP;
}
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { COUNTRIES, COUNTRY_MAP, isCountrySlug } from "@/lib/countries";
import { INDICATORS } from "@/lib/indicators";
import { loadAllCountriesSeries, loadMeta } from "@/lib/loaders";
import type { SeriesPoint } from "@/lib/types";
import DossierView from "@/components/DossierView";

export const dynamicParams = false;

export function generateStaticParams() {
  return COUNTRIES.map((c) => ({ country: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ country: string }>;
}): Promise<Metadata> {
  const { country } = await params;
  if (!isCountrySlug(country)) return { title: "Not found" };
  const c = COUNTRY_MAP[country];
  return {
    title: `${c.name} macro profile`,
    description: `${c.blurb} GDP growth, inflation, fiscal balance, reserves, trade and remittances for ${c.name} — from World Bank WDI and IMF WEO data.`,
  };
}

export default async function CountryPage({
  params,
}: {
  params: Promise<{ country: string }>;
}) {
  const { country } = await params;
  if (!isCountrySlug(country)) notFound();

  const seriesByIndicator: Record<string, Record<string, SeriesPoint[]>> = {};
  for (const ind of INDICATORS) {
    seriesByIndicator[ind.slug] = loadAllCountriesSeries(ind.slug);
  }

  const meta = loadMeta();
  const updated =
    typeof meta?.lastUpdated === "string" ? meta.lastUpdated : "—";

  return (
    <DossierView
      country={COUNTRY_MAP[country]}
      seriesByIndicator={seriesByIndicator}
      updated={updated}
    />
  );
}
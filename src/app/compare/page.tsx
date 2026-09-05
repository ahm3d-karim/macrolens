import type { Metadata } from "next";
import { INDICATORS } from "@/lib/indicators";
import { loadAllCountriesSeries } from "@/lib/loaders";
import type { SeriesPoint } from "@/lib/types";
import CompareView from "@/components/CompareView";

export const metadata: Metadata = {
  title: "Compare",
  description:
    "One indicator, five countries, same scale. Side-by-side South Asia macro comparisons from World Bank WDI data.",
};

export default function ComparePage() {
  const allSeries: Record<string, Record<string, SeriesPoint[]>> = {};
  for (const ind of INDICATORS) {
    allSeries[ind.slug] = loadAllCountriesSeries(ind.slug);
  }
  return <CompareView allSeries={allSeries} />;
}

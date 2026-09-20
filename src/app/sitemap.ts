import type { MetadataRoute } from "next";
import { COUNTRIES } from "@/lib/countries";
import { loadMeta } from "@/lib/loaders";

const BASE = "https://macrolens-pied.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const meta = loadMeta();
  const lastUpdated =
    typeof meta?.lastUpdated === "string" ? new Date(meta.lastUpdated) : undefined;

  return [
    { url: BASE, lastModified: lastUpdated, priority: 1 },
    { url: `${BASE}/compare`, lastModified: lastUpdated, priority: 0.8 },
    ...COUNTRIES.map((c) => ({
      url: `${BASE}/${c.slug}`,
      lastModified: lastUpdated,
      priority: 0.9,
    })),
    { url: `${BASE}/methodology`, priority: 0.5 },
  ];
}

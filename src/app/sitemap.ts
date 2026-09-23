import type { MetadataRoute } from "next";
import { COUNTRIES } from "@/lib/countries";
import { loadMeta } from "@/lib/loaders";

const BASE = "https://macrolens-pied.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const meta = loadMeta();
  // generatedAt is when this build's numbers were written (the refresh), so it
  // is what actually moved; lastUpdated is the publisher's vintage and can be
  // months older, which would tell a crawler nothing changed on refresh day.
  const stamp =
    (typeof meta?.generatedAt === "string" ? meta.generatedAt : undefined) ??
    (typeof meta?.lastUpdated === "string" ? meta.lastUpdated : undefined);
  const lastModified = stamp ? new Date(stamp) : undefined;

  return [
    { url: BASE, lastModified: lastModified, priority: 1 },
    { url: `${BASE}/region`, lastModified: lastModified, priority: 0.8 },
    { url: `${BASE}/compare`, lastModified: lastModified, priority: 0.8 },
    ...COUNTRIES.map((c) => ({
      url: `${BASE}/${c.slug}`,
      lastModified: lastModified,
      priority: 0.9,
    })),
    { url: `${BASE}/methodology`, lastModified: lastModified, priority: 0.5 },
  ];
}

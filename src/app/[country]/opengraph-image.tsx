import { ImageResponse } from "next/og";
import { COUNTRIES, COUNTRY_MAP, isCountrySlug } from "@/lib/countries";
import { INDICATOR_MAP } from "@/lib/indicators";
import { latestValue, loadSeries } from "@/lib/loaders";
import { formatValue } from "@/lib/format";

export const alt = "Macro Lens country macro profile";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function generateStaticParams() {
  return COUNTRIES.map((c) => ({ country: c.slug }));
}

// Three headline readings, straight from the shipped series: the same numbers
// the dossier's stat strip shows, so a shared link cannot contradict the page.
const HEADLINE = ["gdp-growth", "inflation", "gdp-per-capita"];

export default async function Image({
  params,
}: {
  params: Promise<{ country: string }>;
}) {
  const { country } = await params;
  const meta = isCountrySlug(country) ? COUNTRY_MAP[country] : null;
  const accent = meta?.color ?? "#52B788";

  const stats = HEADLINE.map((slug) => {
    const ind = INDICATOR_MAP[slug];
    const latest = meta ? latestValue(loadSeries(meta.slug, slug)) : null;
    return {
      label: ind.title,
      value: latest ? formatValue(latest.value, ind.kind, ind.decimals) : "no data",
      year: latest ? String(latest.year) : "",
    };
  });

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#0A0A0B",
          padding: "64px 72px",
          color: "#E8E8ED",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 24,
            letterSpacing: 6,
            fontWeight: 700,
          }}
        >
          <span>MACROLENS</span>
          <span style={{ color: "#8A8A94", fontSize: 20, letterSpacing: 4 }}>
            SOUTH ASIA MACRO PROFILE
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <div style={{ width: 12, height: 132, background: accent, borderRadius: 6 }} />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 84, fontWeight: 900, lineHeight: 1.05 }}>
              {meta?.name ?? "South Asia"}
            </span>
            <span style={{ fontSize: 26, color: "#A0A0A8", marginTop: 12 }}>
              {meta?.blurb ?? "Five countries. Four decades. One honest look."}
            </span>
          </div>
        </div>

        <div style={{ display: "flex", gap: 56 }}>
          {stats.map((s) => (
            <div key={s.label} style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: 20, color: "#8A8A94", textTransform: "uppercase", letterSpacing: 2 }}>
                {s.label}
              </span>
              <span style={{ fontSize: 52, fontWeight: 700, marginTop: 6 }}>{s.value}</span>
              {s.year && <span style={{ fontSize: 20, color: "#8A8A94" }}>{s.year}</span>}
            </div>
          ))}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 20, color: "#8A8A94" }}>
          <span>Findings computed from the data at build time</span>
          <span>World Bank WDI</span>
        </div>
      </div>
    ),
    size,
  );
}

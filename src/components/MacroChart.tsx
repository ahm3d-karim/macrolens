"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { COUNTRIES, COUNTRY_MAP } from "@/lib/countries";
import type { CountrySlug, IndicatorMeta, SeriesPoint } from "@/lib/types";
import { axisFormat, formatValue } from "@/lib/format";

interface MacroChartProps {
  seriesByCountry: Record<string, SeriesPoint[]>;
  active: CountrySlug;
  indicator: IndicatorMeta;
  showPeers: boolean;
  height?: number;
}

function mergeYears(
  seriesByCountry: Record<string, SeriesPoint[]>,
): { year: number; [slug: string]: number | null }[] {
  const yearSet = new Set<number>();
  for (const series of Object.values(seriesByCountry)) {
    for (const p of series) yearSet.add(p.year);
  }
  const years = Array.from(yearSet).sort((a, b) => a - b);
  return years.map((year) => {
    const row: { year: number; [slug: string]: number | null } = { year };
    for (const [slug, series] of Object.entries(seriesByCountry)) {
      const p = series.find((s) => s.year === year);
      row[slug] = p && p.value !== null && p.value !== undefined ? p.value : null;
    }
    return row;
  });
}

const TICK_COLORS = { tick: { fill: "#8A8A94", fontSize: 11 } };

export default function MacroChart({
  seriesByCountry,
  active,
  indicator,
  showPeers,
  height = 280,
}: MacroChartProps) {
  const data = mergeYears(seriesByCountry);
  const activeMeta = COUNTRY_MAP[active];

  const tickFormatter = (v: number) => v.toString();

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="#1A1A20" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="year"
            tick={TICK_COLORS.tick}
            tickLine={false}
            axisLine={{ stroke: "#2A2A32" }}
            tickFormatter={(v: number) => tickFormatter(v)}
            minTickGap={24}
          />
          <YAxis
            tick={TICK_COLORS.tick}
            tickLine={false}
            axisLine={false}
            width={52}
            tickFormatter={(v: number) => axisFormat(v, indicator.kind)}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#111115",
              border: "1px solid #2A2A32",
              borderRadius: 8,
              fontSize: 12,
              color: "#E8E8ED",
            }}
            labelStyle={{ color: "#A0A0A8", fontWeight: 600 }}
            formatter={((value: unknown, name: unknown) => {
              const n = typeof value === "number" ? value : parseFloat(String(value ?? ""));
              const label = COUNTRY_MAP[name as CountrySlug]?.name ?? String(name ?? "");
              return [Number.isFinite(n) ? formatValue(n, indicator.kind, indicator.decimals) : "n/a", label];
            }) as never}
          />
          {showPeers &&
            COUNTRIES.filter((c) => c.slug !== active).map((c) => (
              <Line
                key={c.slug}
                type="monotone"
                dataKey={c.slug}
                stroke={c.color}
                strokeWidth={1.2}
                strokeOpacity={0.35}
                dot={false}
                connectNulls={false}
                isAnimationActive={false}
              />
            ))}
          <Line
            type="monotone"
            dataKey={active}
            stroke={activeMeta.color}
            strokeWidth={2.6}
            dot={false}
            connectNulls={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
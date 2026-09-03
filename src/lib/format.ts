export function formatValue(v: number, kind: "pct" | "usd" | "months" | "count", decimals = 1): string {
  switch (kind) {
    case "pct":
      return `${v.toFixed(decimals)}%`;
    case "usd":
      return `$${v.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
    case "months":
      return `${v.toFixed(decimals)} mo`;
    case "count":
      return compactNumber(v);
  }
}

export function compactNumber(v: number): string {
  if (Math.abs(v) >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}B`;
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return v.toFixed(0);
}

export function axisFormat(v: number, kind: "pct" | "usd" | "months" | "count"): string {
  switch (kind) {
    case "pct":
      return `${v.toFixed(0)}%`;
    case "usd":
      return `$${compactNumber(v)}`;
    case "months":
      return `${v.toFixed(0)}`;
    case "count":
      return compactNumber(v);
  }
}
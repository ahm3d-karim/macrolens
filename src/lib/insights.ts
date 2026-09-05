import type { CountrySlug, IndicatorMeta, SeriesPoint } from "./types";
import { COUNTRIES, COUNTRY_MAP } from "./countries";
import { INDICATOR_MAP } from "./indicators";
import {
  Window,
  lastConsecutiveWindow,
  valueInYear,
  trailingMean,
  maxIn,
  minIn,
  countBelowInLast,
  changeFrom,
  overtakingYear,
  yearsAgo,
} from "./stats";

// -----------------------------------------------------------------------------
// Findings engine
//
// Every chart title and note on the site is generated here at build time from
// the shipped data files. Nothing in this file hard-codes a number: each block
// computes its claims from the series on display and returns null when the
// data does not support the claim. Blocks are evaluated in order, and the
// first block that produces a finding wins; a generic summary block always
// exists as the last resort.
//
// To add or retire a claim, add or remove a block. The numbers can never go
// stale, because there are none to go stale: a data refresh recomputes every
// title and note.
// -----------------------------------------------------------------------------

export interface FactFinding {
  title: string;
  note: string;
}

// (indicator slug) -> country slug -> series
export type SeriesLookup = (indicator: string) => Record<string, SeriesPoint[]>;

interface Ctx {
  c: { slug: CountrySlug; name: string };
  ind: IndicatorMeta;
  w: Window; // this country's last consecutive non-null window
  all: Record<string, Window | null>; // every country's window, same indicator
  lookup: SeriesLookup;
}

type Block = (ctx: Ctx) => FactFinding | null;

// --- prose helpers -----------------------------------------------------------

function fmt(ctx: Ctx, v: number): string {
  switch (ctx.ind.kind) {
    case "pct":
      return `${v.toFixed(ctx.ind.decimals)}%`;
    case "usd":
      return `$${Math.round(v).toLocaleString("en-US")}`;
    case "months":
      return `${v.toFixed(ctx.ind.decimals)} months`;
    default:
      return v.toLocaleString("en-US");
  }
}

function signedPct(v: number): string {
  const s = v >= 0 ? "+" : "-";
  return `${s}${Math.abs(v).toFixed(1)}%`;
}

function pts(v: number): string {
  return `${Math.abs(v).toFixed(1)} percentage points`;
}

function yearList(years: number[]): string {
  if (years.length <= 1) return years.map(String).join("");
  return `${years.slice(0, -1).map(String).join(", ")} and ${years[years.length - 1]}`;
}

function timesWord(n: number): string {
  if (n === 1) return "once";
  if (n === 2) return "twice";
  if (n === 3) return "three times";
  return `${n} times`;
}

// --- window/peer helpers -----------------------------------------------------

function need(ctx: Ctx, minPoints = 6): boolean {
  return ctx.w !== null && ctx.w.points.length >= minPoints;
}

function latestOf(w: Window): { year: number; value: number } {
  return w.points[w.points.length - 1];
}

function peerWindows(ctx: Ctx): { slug: CountrySlug; name: string; w: Window }[] {
  const out: { slug: CountrySlug; name: string; w: Window }[] = [];
  for (const c of COUNTRIES) {
    if (c.slug === ctx.c.slug) continue;
    const w = ctx.all[c.slug];
    if (w) out.push({ slug: c.slug, name: c.name, w });
  }
  return out;
}

// Rank of the country's latest value among all latest values (1 = highest).
function rankByLatest(ctx: Ctx): { rank: number; of: number } | null {
  const rows = COUNTRIES.map((c) => {
    const w = ctx.all[c.slug];
    return w ? { slug: c.slug, latest: latestOf(w).value } : null;
  }).filter((r): r is { slug: CountrySlug; latest: number } => r !== null);
  if (!rows.some((r) => r.slug === ctx.c.slug)) return null;
  rows.sort((a, b) => b.latest - a.latest);
  return { rank: rows.findIndex((r) => r.slug === ctx.c.slug) + 1, of: rows.length };
}

function peersRange(ctx: Ctx): { min: string; max: string; minName: string; maxName: string } | null {
  const peers = peerWindows(ctx);
  if (peers.length === 0) return null;
  let lo = peers[0];
  let hi = peers[0];
  for (const p of peers) {
    if (latestOf(p.w).value < latestOf(lo.w).value) lo = p;
    if (latestOf(p.w).value > latestOf(hi.w).value) hi = p;
  }
  return {
    min: fmt(ctx, latestOf(lo.w).value),
    max: fmt(ctx, latestOf(hi.w).value),
    minName: lo.name,
    maxName: hi.name,
  };
}

// Value in a base year for "since Y" claims, falling back to the window's
// first observation when the base year predates the window.
function baseValue(ctx: Ctx, year: number): { year: number; value: number } | null {
  if (!ctx.w) return null;
  if (ctx.w.firstYear > year) return ctx.w.points[0];
  return valueInYear(ctx.w, year);
}

// A series from another indicator, as a window (for cross-series claims).
function crossWindow(ctx: Ctx, indicator: string, slug: CountrySlug): Window | null {
  const all = ctx.lookup(indicator);
  const s = all?.[slug];
  return s ? lastConsecutiveWindow(s) : null;
}

// --- generic fallback --------------------------------------------------------

const genericBlock: Block = (ctx) => {
  if (!need(ctx)) return null;
  const latest = latestOf(ctx.w);
  // Recent range when the window is long enough; full range otherwise.
  const recent = ctx.w.points.length >= 10 ? ctx.w.points.slice(-10) : ctx.w.points;
  const rangeMin = recent.reduce((a, b) => (b.value < a.value ? b : a));
  const rangeMax = recent.reduce((a, b) => (b.value > a.value ? b : a));
  const rangeLabel = ctx.w.points.length >= 10 ? "Past-decade range" : "Window range";
  const change = changeFrom(ctx.w, ctx.w.lastYear - 10, 1);
  const bits: string[] = [`Runs ${ctx.w.firstYear} to ${ctx.w.lastYear}.`];
  bits.push(
    `${rangeLabel}: ${fmt(ctx, rangeMin.value)} (${rangeMin.year}) to ${fmt(ctx, rangeMax.value)} (${rangeMax.year}).`,
  );
  if (change) {
    const fromVal = latest.value - change.absChange;
    bits.push(
      `Ten-year change: ${fmt(ctx, fromVal)} (${change.fromYear}) to ${fmt(ctx, latest.value)} (${latest.year}).`,
    );
  }
  return {
    title: `${ctx.ind.title}: ${fmt(ctx, latest.value)} in ${latest.year}`,
    note: bits.join(" "),
  };
};

// --- growth ------------------------------------------------------------------

// Negative-growth years inside the trailing `lastN` observations (whole series
// when lastN is omitted).
const contractions = (w: Window, lastN?: number): number[] => {
  const slice = lastN ? w.points.slice(-lastN) : w.points;
  const out: number[] = [];
  for (const p of slice) {
    if (p.value < 0) out.push(p.year);
  }
  return out;
};

const growthBlocks: Block[] = [
  // Repeated recent contractions: the boom-bust pattern.
  (ctx) => {
    if (!need(ctx, 12)) return null;
    const recent = contractions(ctx.w, 6);
    if (recent.length < 2) return null;
    const all = contractions(ctx.w);
    const latest = latestOf(ctx.w);
    const mean = trailingMean(ctx.w, 30);
    return {
      title: `Boom-bust: contractions in ${yearList(recent)}`,
      note:
        `${ctx.c.name} contracted in ${yearList(recent)}` +
        (all.length > recent.length
          ? `, ${timesWord(all.length)} since ${ctx.w.firstYear} overall. `
          : `, the only contractions since ${ctx.w.firstYear}. `) +
        `Latest reading ${fmt(ctx, latest.value)} in ${latest.year}` +
        (mean ? ` against a ${Math.min(30, ctx.w.points.length)}-year average of ${fmt(ctx, mean.mean)}.` : "."),
    };
  },
  // One recent contraction, but the decade holds more: stop-start.
  (ctx) => {
    if (!need(ctx, 12)) return null;
    const recent = contractions(ctx.w, 6);
    if (recent.length !== 1) return null;
    const decade = contractions(ctx.w, 10);
    if (decade.length < 2) return null;
    const latest = latestOf(ctx.w);
    const mean10 = trailingMean(ctx.w, 10);
    return {
      title: `Stop-start: contractions in ${yearList(decade)} in the past decade`,
      note:
        `Latest reading ${fmt(ctx, latest.value)} in ${latest.year}` +
        (mean10 ? `, against a trailing ten-observation average of ${fmt(ctx, mean10.mean)}.` : ".") +
        ` Recovery keeps getting interrupted.`,
    };
  },
  // A single recent shock that has been recovered.
  (ctx) => {
    if (!need(ctx, 12)) return null;
    const recent = contractions(ctx.w, 6);
    if (recent.length !== 1) return null;
    const decade = contractions(ctx.w, 10);
    if (decade.length !== 1) return null;
    const latest = latestOf(ctx.w);
    const shock = minIn(ctx.w, ctx.w.lastYear - 9);
    const mean = trailingMean(ctx.w, 10);
    if (!shock) return null;
    return {
      title: `Recovered from the ${shock.year} shock`,
      note:
        `Growth bottomed at ${fmt(ctx, shock.value)} in ${shock.year} and stands at ${fmt(ctx, latest.value)} in ${latest.year}. ` +
        (mean ? `Trailing ten-observation average: ${fmt(ctx, mean.mean)}.` : ""),
    };
  },
  // No contraction, but growth has clearly slowed against the decade norm.
  (ctx) => {
    if (!need(ctx, 12)) return null;
    const recent = contractions(ctx.w, 6);
    if (recent.length !== 0) return null;
    const mean10 = trailingMean(ctx.w, 10);
    const latest = latestOf(ctx.w);
    if (!mean10 || mean10.mean < 4) return null;
    if (latest.value >= mean10.mean * 0.75) return null;
    const last2 = ctx.w.points.slice(-2);
    return {
      title: `The slowdown is real: ${fmt(ctx, latest.value)} against a ${fmt(ctx, mean10.mean)} decade average`,
      note:
        `Growth averaged ${fmt(ctx, mean10.mean)} over the past ten observations; the last two readings ran ${fmt(ctx, last2[0].value)} and ${fmt(ctx, last2[1].value)}.`,
    };
  },
  // Steady compounding: no contraction recently.
  (ctx) => {
    if (!need(ctx, 12)) return null;
    const recent = contractions(ctx.w, 6);
    if (recent.length !== 0) return null;
    const latest = latestOf(ctx.w);
    const mean10 = trailingMean(ctx.w, 10);
    const min10 = minIn(ctx.w, ctx.w.lastYear - 9);
    if (!mean10 || !min10) return null;
    return {
      title: `Steady compounder: ${fmt(ctx, mean10.mean)} average over the past decade`,
      note:
        `No contraction in the past six observations; the weakest of the past ten was ${fmt(ctx, min10.value)} (${min10.year}). ` +
        `Latest: ${fmt(ctx, latest.value)} in ${latest.year}.`,
    };
  },
];

// --- income levels (works for any level series; used by gdp-per-capita) ------

function overtakeBlocks(baseYear: number): Block[] {
  return [
    // This country was overtaken by a peer and stayed behind. Only narrated
    // for recent overtakings; ancient history falls through to rank blocks.
    (ctx) => {
      if (!need(ctx, 10)) return null;
      let best: { peer: string; year: number; mineNow: number; theirsNow: number } | null = null;
      for (const p of peerWindows(ctx)) {
        const ot = overtakingYear(ctx.w, p.w);
        if (ot && ot.year >= ctx.w.lastYear - 25 && (!best || ot.year > best.year)) {
          best = { peer: p.name, year: ot.year, mineNow: ot.mineNow, theirsNow: ot.theirsNow };
        }
      }
      if (!best) return null;
      const base = baseValue(ctx, baseYear);
      const peerW = peerWindows(ctx).find((p) => p.name === best!.peer);
      let baseLine = "";
      if (base && peerW) {
        const peerBase = valueInYear(peerW.w, base.year, 1);
        if (peerBase) {
          baseLine = `In ${base.year} ${ctx.c.name} was ${(base.value / peerBase.value).toFixed(1)}x as rich per person (${fmt(ctx, base.value)} vs ${fmt(ctx, peerBase.value)}). `;
        }
      }
      return {
        title: `Overtaken by ${best.peer} in ${best.year}, still behind`,
        note:
          baseLine +
          `${best.peer} passed ${ctx.c.name} in ${best.year} and the lead now stands at ${fmt(ctx, best.theirsNow)} vs ${fmt(ctx, best.mineNow)}.`,
      };
    },
    // This country did the overtaking.
    (ctx) => {
      if (!need(ctx, 10)) return null;
      let best: { peer: string; year: number; mineNow: number; theirsNow: number } | null = null;
      for (const p of peerWindows(ctx)) {
        // Peer = "mine" (the one passed), this country = "theirs".
        const ot = overtakingYear(p.w, ctx.w);
        if (ot && (!best || ot.year > best.year)) {
          best = { peer: p.name, year: ot.year, mineNow: ot.mineNow, theirsNow: ot.theirsNow };
        }
      }
      if (!best) return null;
      return {
        title: `The overtaking is real: past ${best.peer} in ${best.year}, still ahead`,
        note: `The lines crossed in ${best.year}; ${ctx.c.name} now stands at ${fmt(ctx, best.theirsNow)} against ${best.peer}'s ${fmt(ctx, best.mineNow)}.`,
      };
    },
  ];
}

function levelBlocks(baseYear: number): Block[] {
  return [
    ...overtakeBlocks(baseYear),
    // Poorest in the region.
    (ctx) => {
      if (!need(ctx, 10)) return null;
      const rank = rankByLatest(ctx);
      if (!rank || rank.rank !== rank.of) return null;
      const latest = latestOf(ctx.w);
      const range = peersRange(ctx);
      const change = changeFrom(ctx.w, ctx.w.lastYear - 10, 1);
      return {
        title: `Lowest income per person in the region: ${fmt(ctx, latest.value)}`,
        note:
          `${fmt(ctx, latest.value)} in ${latest.year}` +
          (range ? `, against a peer range of ${range.min} (${range.minName}) to ${range.max} (${range.maxName}).` : ".") +
          (change ? ` Ten-year change: ${signedPct(change.pctChange)}.` : ""),
      };
    },
    // Richest in the region.
    (ctx) => {
      if (!need(ctx, 10)) return null;
      const rank = rankByLatest(ctx);
      if (!rank || rank.rank !== 1) return null;
      const latest = latestOf(ctx.w);
      const range = peersRange(ctx);
      const change = changeFrom(ctx.w, ctx.w.lastYear - 10, 1);
      const ago10 = yearsAgo(ctx.w, 10);
      return {
        title: `Still the region's richest: ${fmt(ctx, latest.value)} per person`,
        note:
          (range ? `Peers range from ${range.min} (${range.minName}) to ${range.max} (${range.maxName}). ` : "") +
          (change && ago10
            ? `Income is ${signedPct(change.pctChange)} above its ${ago10.year} level of ${fmt(ctx, ago10.value)}.`
            : `Latest observation: ${latest.year}.`),
      };
    },
    // Default for levels: the decade climb, ranked against peers.
    (ctx) => {
      if (!need(ctx, 10)) return null;
      const latest = latestOf(ctx.w);
      const ago10 = yearsAgo(ctx.w, 10);
      if (!ago10) return null;
      const pct = ((latest.value - ago10.value) / Math.abs(ago10.value)) * 100;
      const myChange = pct;
      const peerChanges: { name: string; pct: number }[] = [];
      for (const p of peerWindows(ctx)) {
        const pAgo = yearsAgo(p.w, 10);
        if (!pAgo) continue;
        const pLatest = latestOf(p.w);
        peerChanges.push({ name: p.name, pct: ((pLatest.value - pAgo.value) / Math.abs(pAgo.value)) * 100 });
      }
      const faster = peerChanges.filter((p) => p.pct > myChange).length;
      const ord = ["fastest", "second-fastest", "third-fastest", "fourth-fastest", "fifth-fastest"][faster] ?? "";
      return {
        title: `Income per person ${signedPct(pct)} in ten years`,
        note:
          `${fmt(ctx, ago10.value)} (${ago10.year}) to ${fmt(ctx, latest.value)} (${latest.year})` +
          (ord ? `, the ${ord} climb among the five over the same period.` : "."),
      };
    },
  ];
}

// --- inflation ---------------------------------------------------------------

const inflationBlocks: Block[] = [
  // Crisis spike, with two endings: deflation or disinflation.
  (ctx) => {
    if (!need(ctx, 10)) return null;
    const max10 = maxIn(ctx.w, ctx.w.lastYear - 9);
    if (!max10 || max10.value < 25) return null;
    const latest = latestOf(ctx.w);
    if (latest.value < 0) {
      return {
        title: `Crisis whiplash: ${fmt(ctx, max10.value)} to ${fmt(ctx, latest.value)}`,
        note:
          `CPI exploded to ${fmt(ctx, max10.value)} in ${max10.year}, then fell into deflation (${fmt(ctx, latest.value)} in ${latest.year}). ` +
          `Disinflation by collapse in demand, not by policy success.`,
      };
    }
    if (latest.value < 10) {
      return {
        title: `Crisis inflation: peaked at ${fmt(ctx, max10.value)}, now ${fmt(ctx, latest.value)}`,
        note:
          `CPI peaked at ${fmt(ctx, max10.value)} in ${max10.year} during the crisis, then fell to ${fmt(ctx, latest.value)} by ${latest.year}. ` +
          `The fall is real; the question is whether it holds.`,
      };
    }
    return {
      title: `Still elevated after the ${max10.year} spike`,
      note: `CPI peaked at ${fmt(ctx, max10.value)} in ${max10.year} and has not returned to single digits (${fmt(ctx, latest.value)} in ${latest.year}).`,
    };
  },
  // Deflation without a crisis spike.
  (ctx) => {
    if (!need(ctx, 10)) return null;
    const latest = latestOf(ctx.w);
    if (latest.value >= 0) return null;
    const max = maxIn(ctx.w);
    return {
      title: `Deflation: prices falling at ${fmt(ctx, latest.value)}`,
      note:
        `Latest reading ${fmt(ctx, latest.value)} in ${latest.year}` +
        (max ? `, against a window peak of ${fmt(ctx, max.value)} (${max.year}).` : "."),
    };
  },
  // Quiet prices: a low latest reading, with decade and all-time context.
  (ctx) => {
    if (!need(ctx, 10)) return null;
    const latest = latestOf(ctx.w);
    if (latest.value >= 5) return null;
    const max10 = maxIn(ctx.w, ctx.w.lastYear - 9);
    const maxAll = maxIn(ctx.w);
    const mean10 = trailingMean(ctx.w, 10);
    const rank = rankByLatest(ctx);
    const isLowest = rank?.rank === rank?.of;
    const historic =
      maxAll && max10 && maxAll.value > max10.value && maxAll.year < max10.year
        ? `; the all-window peak is ${fmt(ctx, maxAll.value)} (${maxAll.year})`
        : "";
    return {
      title: isLowest
        ? `Quiet prices: ${fmt(ctx, latest.value)}, the region's lowest`
        : `Quiet prices: ${fmt(ctx, latest.value)}`,
      note:
        `Has not exceeded ${fmt(ctx, max10?.value ?? latest.value)} in the past decade (that high came in ${max10?.year ?? latest.year})` +
        (historic ? `${historic}.` : "") +
        (mean10 && !historic ? `, with a ten-observation average of ${fmt(ctx, mean10.mean)}.` : !historic ? "." : ""),
    };
  },
  // The region's outlier on the high side.
  (ctx) => {
    if (!need(ctx, 10)) return null;
    const rank = rankByLatest(ctx);
    const latest = latestOf(ctx.w);
    if (!rank || rank.rank !== 1 || latest.value < 6) return null;
    const range = peersRange(ctx);
    return {
      title: `The region's inflation outlier: ${fmt(ctx, latest.value)}`,
      note:
        `Highest of the five right now` +
        (range ? ` (peers run from ${range.min} to ${range.max}).` : "."),
    };
  },
];

// --- broad money (% of GDP) ---------------------------------------------------

const broadMoneyBlocks: Block[] = [
  // Extreme depth: money larger than the economy.
  (ctx) => {
    if (!need(ctx, 10)) return null;
    const rank = rankByLatest(ctx);
    const latest = latestOf(ctx.w);
    if (latest.value < 100 || rank?.rank !== 1) return null;
    const range = peersRange(ctx);
    return {
      title: `${fmt(ctx, latest.value)} of GDP, the deepest money in the region`,
      note:
        `Money supply is larger than the entire economy (${fmt(ctx, latest.value)} in ${latest.year})` +
        (range ? `, while no peer exceeds ${range.max} (${range.maxName}).` : "."),
    };
  },
  // Deep financial system: high depth without recent shrinkage.
  (ctx) => {
    if (!need(ctx, 10)) return null;
    const latest = latestOf(ctx.w);
    if (latest.value < 70) return null;
    const ago10 = yearsAgo(ctx.w, 10);
    const max = maxIn(ctx.w);
    return {
      title: `Deep financial system: ${fmt(ctx, latest.value)} of GDP`,
      note:
        (ago10 ? `Ten years ago: ${fmt(ctx, ago10.value)} (${ago10.year}). ` : "") +
        (max ? `Window peak ${fmt(ctx, max.value)} (${max.year}).` : ""),
    };
  },
  // Shallowing: a decade drop, or a big fall from a recent peak.
  (ctx) => {
    if (!need(ctx, 10)) return null;
    const latest = latestOf(ctx.w);
    const ago10 = yearsAgo(ctx.w, 10);
    const max = maxIn(ctx.w);
    const decadeDrop = ago10 ? latest.value - ago10.value <= -8 : false;
    const peakDrop =
      max && max.year >= ctx.w.lastYear - 6 && latest.value <= max.value - 8;
    if (!decadeDrop && !peakDrop) return null;
    if (peakDrop && (!ago10 || latest.value - ago10.value > -8)) {
      return {
        title: `Shrunk from its ${max!.year} peak: ${fmt(ctx, max!.value)} to ${fmt(ctx, latest.value)} of GDP`,
        note:
          `Broad money peaked at ${fmt(ctx, max!.value)} of GDP in ${max!.year} and stands at ${fmt(ctx, latest.value)} (${latest.year}). ` +
          `Deposits are shrinking relative to the economy.`,
      };
    }
    return {
      title: `Financial shallowing: down ${pts(latest.value - ago10!.value)} in a decade`,
      note:
        `Broad money ${fmt(ctx, ago10!.value)} of GDP (${ago10!.year}) to ${fmt(ctx, latest.value)} (${latest.year})` +
        (max && max.value > latest.value && max.year !== ago10!.year
          ? `, from a window peak of ${fmt(ctx, max.value)} (${max.year}).`
          : ".") +
        ` Deposits are shrinking relative to the economy.`,
    };
  },
  // Deepening: a solid rise over the decade.
  (ctx) => {
    if (!need(ctx, 10)) return null;
    const latest = latestOf(ctx.w);
    const ago10 = yearsAgo(ctx.w, 10);
    if (!ago10 || latest.value - ago10.value < 8) return null;
    return {
      title: `Financial deepening: ${fmt(ctx, ago10.value)} (${ago10.year}) to ${fmt(ctx, latest.value)} (${latest.year})`,
      note: `Broad money rose ${pts(latest.value - ago10.value)} over the decade to ${latest.year}.`,
    };
  },
  // Peaked long ago and slid since.
  (ctx) => {
    if (!need(ctx, 10)) return null;
    const latest = latestOf(ctx.w);
    const max = maxIn(ctx.w);
    if (!max || ctx.w.lastYear - max.year < 8 || latest.value > max.value - 5) return null;
    return {
      title: `Money depth peaked in ${max.year} at ${fmt(ctx, max.value)}, now ${fmt(ctx, latest.value)}`,
      note: `Broad money reached ${fmt(ctx, max.value)} of GDP in ${max.year} and stands at ${fmt(ctx, latest.value)} in ${latest.year}.`,
    };
  },
  // Stable depth.
  (ctx) => {
    if (!need(ctx, 8)) return null;
    const latest = latestOf(ctx.w);
    const max = maxIn(ctx.w);
    const min = minIn(ctx.w);
    return {
      title: `Money depth steady at ${fmt(ctx, latest.value)} of GDP`,
      note:
        max && min
          ? `Window range ${fmt(ctx, min.value)} (${min.year}) to ${fmt(ctx, max.value)} (${max.year}); latest ${fmt(ctx, latest.value)} in ${latest.year}.`
          : `Latest observation ${latest.year}.`,
    };
  },
];

// --- gross capital formation --------------------------------------------------

const gcfBlocks: Block[] = [
  // Region's lowest investor.
  (ctx) => {
    if (!need(ctx, 10)) return null;
    const rank = rankByLatest(ctx);
    const latest = latestOf(ctx.w);
    if (!rank || rank.rank !== rank.of || latest.value >= 18) return null;
    const range = peersRange(ctx);
    const mean10 = trailingMean(ctx.w, 10);
    return {
      title: `Investment stuck at ${fmt(ctx, latest.value)} of GDP, the region's lowest`,
      note:
        (range ? `Peers range from ${range.min} (${range.minName}) to ${range.max} (${range.maxName}). ` : "") +
        (mean10 ? `Trailing-decade average: ${fmt(ctx, mean10.mean)}.` : ""),
    };
  },
  // Region's heaviest investor.
  (ctx) => {
    if (!need(ctx, 10)) return null;
    const rank = rankByLatest(ctx);
    const latest = latestOf(ctx.w);
    if (!rank || rank.rank !== 1 || latest.value < 30) return null;
    const range = peersRange(ctx);
    const ago10 = yearsAgo(ctx.w, 10);
    return {
      title: `The region's heaviest investor: ${fmt(ctx, latest.value)} of GDP`,
      note:
        (ago10 ? `Up from ${fmt(ctx, ago10.value)} in ${ago10.year}. ` : "") +
        (range ? `Next closest peer: ${range.max} (${range.maxName}).` : ""),
    };
  },
  // Peaked recently and still well below it: fell from the peak.
  (ctx) => {
    if (!need(ctx, 10)) return null;
    const latest = latestOf(ctx.w);
    const max10 = maxIn(ctx.w, ctx.w.lastYear - 9);
    const min10 = minIn(ctx.w, ctx.w.lastYear - 9);
    if (!max10 || !min10) return null;
    if (max10.year < ctx.w.lastYear - 8 || latest.value > max10.value - 5) return null;
    if (min10.year >= max10.year) return null; // trough after peak = rebuilding
    return {
      title: `Investment fell from its ${max10.year} peak: ${fmt(ctx, max10.value)} to ${fmt(ctx, latest.value)} of GDP`,
      note:
        `A ${min10.year} trough (${fmt(ctx, min10.value)}) was followed by the ${max10.year} spike (${fmt(ctx, max10.value)}), which has since unwound to ${fmt(ctx, latest.value)} (${latest.year}).`,
    };
  },
  // Rebuilding after a crisis trough that came after the peak.
  (ctx) => {
    if (!need(ctx, 10)) return null;
    const latest = latestOf(ctx.w);
    const max10 = maxIn(ctx.w, ctx.w.lastYear - 9);
    const min10 = minIn(ctx.w, ctx.w.lastYear - 9);
    if (!max10 || !min10) return null;
    if (max10.year < ctx.w.lastYear - 8 || max10.value - latest.value < 3) return null;
    if (max10.value - min10.value < 5 || min10.year <= max10.year) return null;
    return {
      title: `Investment rebuilding, ${pts(max10.value - latest.value)} short of its ${max10.year} peak`,
      note:
        `Capital formation peaked at ${fmt(ctx, max10.value)} of GDP (${max10.year}), bottomed at ${fmt(ctx, min10.value)} (${min10.year}), ` +
        `and stands at ${fmt(ctx, latest.value)} in ${latest.year}.`,
    };
  },
  // Steady high investment.
  (ctx) => {
    if (!need(ctx, 10)) return null;
    const latest = latestOf(ctx.w);
    if (latest.value < 25) return null;
    const ago10 = yearsAgo(ctx.w, 10);
    if (!ago10 || Math.abs(latest.value - ago10.value) >= 5) return null;
    const min10 = minIn(ctx.w, ctx.w.lastYear - 9);
    const max10 = maxIn(ctx.w, ctx.w.lastYear - 9);
    return {
      title: `Steady investor: ${fmt(ctx, latest.value)} of GDP`,
      note:
        (ago10 ? `A decade ago: ${fmt(ctx, ago10.value)} (${ago10.year}). ` : "") +
        (min10 && max10 ? `The past ten observations ran between ${fmt(ctx, min10.value)} and ${fmt(ctx, max10.value)}.` : ""),
    };
  },
  // Rising investment over the decade.
  (ctx) => {
    if (!need(ctx, 10)) return null;
    const latest = latestOf(ctx.w);
    const ago10 = yearsAgo(ctx.w, 10);
    if (!ago10 || latest.value - ago10.value < 5) return null;
    return {
      title: `Investment climbing: ${fmt(ctx, ago10.value)} to ${fmt(ctx, latest.value)} of GDP`,
      note: `Up ${pts(latest.value - ago10.value)} over the decade to ${latest.year}.`,
    };
  },
];

// --- external debt (% of GNI) ---------------------------------------------------

const debtBlocks: Block[] = [
  // A recent crisis peak still in the rear-view mirror.
  (ctx) => {
    if (!need(ctx, 10)) return null;
    const max10 = maxIn(ctx.w, ctx.w.lastYear - 9);
    if (!max10 || max10.value < 60) return null;
    const latest = latestOf(ctx.w);
    return {
      title: `After the ${max10.year} peak: ${fmt(ctx, latest.value)} of GNI`,
      note:
        `External debt reached ${fmt(ctx, max10.value)} of GNI in ${max10.year} and remains ${fmt(ctx, latest.value)} (${latest.year}). ` +
        `The decade low was ${fmt(ctx, minIn(ctx.w, ctx.w.lastYear - 9)?.value ?? latest.value)}.`,
    };
  },
  // Crisis-level stock right now.
  (ctx) => {
    if (!need(ctx, 10)) return null;
    const latest = latestOf(ctx.w);
    if (latest.value <= 60) return null;
    const max = maxIn(ctx.w);
    return {
      title: `Debt at crisis levels: ${fmt(ctx, latest.value)} of GNI`,
      note:
        `Latest reading ${fmt(ctx, latest.value)} in ${latest.year}` +
        (max ? `, the window peak is ${fmt(ctx, max.value)} (${max.year}).` : "."),
    };
  },
  // Climbed hard over the decade, plateaued high.
  (ctx) => {
    if (!need(ctx, 10)) return null;
    const latest = latestOf(ctx.w);
    const max10 = maxIn(ctx.w, ctx.w.lastYear - 9);
    const min10 = minIn(ctx.w, ctx.w.lastYear - 9);
    if (!max10 || !min10) return null;
    if (max10.value - min10.value < 10 || max10.year <= min10.year) return null;
    if (latest.value < max10.value - 8) return null;
    return {
      title: `Debt climbed to ${fmt(ctx, max10.value)} in ${max10.year}, now ${fmt(ctx, latest.value)}`,
      note:
        `From ${fmt(ctx, min10.value)} of GNI (${min10.year}) to the ${max10.year} high of ${fmt(ctx, max10.value)}; stands at ${fmt(ctx, latest.value)} (${latest.year}).`,
    };
  },
  // Falling fast over the decade.
  (ctx) => {
    if (!need(ctx, 10)) return null;
    const latest = latestOf(ctx.w);
    const ago10 = yearsAgo(ctx.w, 10);
    if (!ago10 || latest.value - ago10.value > -10) return null;
    const rank = rankByLatest(ctx);
    const rankLine = rank !== null && rank.rank === rank.of ? " The lightest burden in the region." : "";
    return {
      title: `Debt down ${pts(latest.value - ago10.value)} in a decade`,
      note: `${fmt(ctx, ago10.value)} of GNI (${ago10.year}) to ${fmt(ctx, latest.value)} (${latest.year}).${rankLine}`,
    };
  },
  // Light debt.
  (ctx) => {
    if (!need(ctx, 10)) return null;
    const latest = latestOf(ctx.w);
    if (latest.value >= 30) return null;
    const rank = rankByLatest(ctx);
    const isLightest = rank !== null && rank.rank === rank.of;
    const max = maxIn(ctx.w);
    return {
      title:
        isLightest
          ? `The region's lightest external debt: ${fmt(ctx, latest.value)} of GNI`
          : `Light external debt: ${fmt(ctx, latest.value)} of GNI`,
      note:
        (max && max.year < latest.year ? `Down from a window peak of ${fmt(ctx, max.value)} (${max.year}). ` : "") +
        `Latest observation ${latest.year}.`,
    };
  },
  // The middle band: anchored, hovering.
  (ctx) => {
    if (!need(ctx, 10)) return null;
    const latest = latestOf(ctx.w);
    const max = maxIn(ctx.w);
    const min10 = minIn(ctx.w, ctx.w.lastYear - 9);
    const max10 = maxIn(ctx.w, ctx.w.lastYear - 9);
    if (!max || !min10 || !max10) return null;
    return {
      title: `External debt at ${fmt(ctx, latest.value)} of GNI`,
      note:
        `Past-decade range ${fmt(ctx, min10.value)} (${min10.year}) to ${fmt(ctx, max10.value)} (${max10.year}). ` +
        (max.year < ctx.w.lastYear ? `All-window peak: ${fmt(ctx, max.value)} (${max.year}).` : `Latest observation ${latest.year}.`),
    };
  },
];

// --- exports -------------------------------------------------------------------

const exportBlocks: Block[] = [
  // A long flatline since the base year.
  (ctx) => {
    if (!need(ctx, 10)) return null;
    const base = baseValue(ctx, 2000);
    if (!base) return null;
    const latest = latestOf(ctx.w);
    const pct = ((latest.value - base.value) / Math.abs(base.value)) * 100;
    if (Math.abs(pct) >= 25 || latest.year - base.year < 15) return null;
    const rank = rankByLatest(ctx);
    return {
      title: `Stuck at ${fmt(ctx, latest.value)} of GDP for ${latest.year - base.year} years`,
      note:
        `Exports were ${fmt(ctx, base.value)} in ${base.year} and are ${fmt(ctx, latest.value)} in ${latest.year}.` +
        (rank !== null && rank.rank === rank.of ? " The region's lowest export share." : ""),
    };
  },
  // Down from a recent peak.
  (ctx) => {
    if (!need(ctx, 10)) return null;
    const latest = latestOf(ctx.w);
    const max = maxIn(ctx.w);
    if (!max || max.year < 2008 || max.value - latest.value < 5) return null;
    return {
      title: `Down from the ${max.year} peak: ${fmt(ctx, max.value)} to ${fmt(ctx, latest.value)}`,
      note: `The export share peaked at ${fmt(ctx, max.value)} of GDP in ${max.year} and stands at ${fmt(ctx, latest.value)} in ${latest.year}.`,
    };
  },
  // Roughly halved since the base year.
  (ctx) => {
    if (!need(ctx, 10)) return null;
    const base = baseValue(ctx, 2000);
    if (!base) return null;
    const latest = latestOf(ctx.w);
    const pct = ((latest.value - base.value) / Math.abs(base.value)) * 100;
    if (pct > -40) return null;
    return {
      title: `Export share ${signedPct(pct)} since ${base.year}: ${fmt(ctx, base.value)} to ${fmt(ctx, latest.value)}`,
      note: `From ${fmt(ctx, base.value)} of GDP in ${base.year} to ${fmt(ctx, latest.value)} in ${latest.year}.`,
    };
  },
  // Strong expansion since the base year.
  (ctx) => {
    if (!need(ctx, 10)) return null;
    const base = baseValue(ctx, 2000);
    if (!base) return null;
    const latest = latestOf(ctx.w);
    const pct = ((latest.value - base.value) / Math.abs(base.value)) * 100;
    if (pct < 40) return null;
    const rank = rankByLatest(ctx);
    return {
      title: `Exports ${signedPct(pct)} since ${base.year}: ${fmt(ctx, base.value)} to ${fmt(ctx, latest.value)}`,
      note:
        `From ${fmt(ctx, base.value)} of GDP in ${base.year} to ${fmt(ctx, latest.value)} in ${latest.year}` +
        (rank ? `, ranked ${rank.rank} of ${rank.of} in the region.` : "."),
    };
  },
  // The region's smallest, with the imports ratio when computable.
  (ctx) => {
    if (!need(ctx, 10)) return null;
    const rank = rankByLatest(ctx);
    const latest = latestOf(ctx.w);
    if (!rank || rank.rank !== rank.of || latest.value >= 15) return null;
    const impW = crossWindow(ctx, "imports", ctx.c.slug);
    const impLatest = impW ? latestOf(impW) : null;
    return {
      title: `The region's smallest export sector: ${fmt(ctx, latest.value)} of GDP`,
      note:
        (impLatest
          ? `Imports run ${(impLatest.value / latest.value).toFixed(1)}x exports (${fmt(ctx, impLatest.value)} vs ${fmt(ctx, latest.value)}).`
          : `Latest observation ${latest.year}.`),
    };
  },
];

// --- imports -------------------------------------------------------------------

const importBlocks: Block[] = [
  // Compression from a recent peak.
  (ctx) => {
    if (!need(ctx, 10)) return null;
    const latest = latestOf(ctx.w);
    const max10 = maxIn(ctx.w, ctx.w.lastYear - 9);
    if (!max10 || max10.value - latest.value < 5) return null;
    return {
      title: `Imports compressed: ${fmt(ctx, max10.value)} (${max10.year}) to ${fmt(ctx, latest.value)}`,
      note:
        `The gap to the ${max10.year} peak is ${pts(max10.value - latest.value)} of GDP. ` +
        `Latest reading ${fmt(ctx, latest.value)} in ${latest.year}.`,
    };
  },
  // Heavy import dependence, sized against exports.
  (ctx) => {
    if (!need(ctx, 10)) return null;
    const latest = latestOf(ctx.w);
    if (latest.value <= 30) return null;
    const expW = crossWindow(ctx, "exports", ctx.c.slug);
    const expLatest = expW ? latestOf(expW) : null;
    return {
      title: `Import appetite: ${fmt(ctx, latest.value)} of GDP`,
      note: expLatest
        ? `${(latest.value / expLatest.value).toFixed(1)}x the export share (${fmt(ctx, expLatest.value)}); latest observation ${latest.year}.`
        : `Latest observation ${latest.year}.`,
    };
  },
];

// --- current account -----------------------------------------------------------

const currentAccountBlocks: Block[] = [
  // Surplus, with the remittance share when computable.
  (ctx) => {
    if (!need(ctx, 10)) return null;
    const latest = latestOf(ctx.w);
    if (latest.value <= 0.5) return null;
    const remW = crossWindow(ctx, "remittances", ctx.c.slug);
    const remLatest = remW ? latestOf(remW) : null;
    return {
      title: `In surplus: ${fmt(ctx, latest.value)} of GDP`,
      note:
        `Latest reading ${fmt(ctx, latest.value)} in ${latest.year}` +
        (remLatest ? `, alongside remittances of ${fmt(ctx, remLatest.value)} of GDP (${remLatest.year}).` : "."),
    };
  },
  // Near balance.
  (ctx) => {
    if (!need(ctx, 10)) return null;
    const latest = latestOf(ctx.w);
    if (Math.abs(latest.value) > 0.25) return null;
    const min = minIn(ctx.w);
    return {
      title: `Near balance: ${fmt(ctx, latest.value)} of GDP`,
      note: min
        ? `The window low is ${fmt(ctx, min.value)} (${min.year}); the swing from that trough is ${pts(latest.value - min.value)}.`
        : `Latest observation ${latest.year}.`,
    };
  },
  // Deficit.
  (ctx) => {
    if (!need(ctx, 10)) return null;
    const latest = latestOf(ctx.w);
    if (latest.value >= -0.5) return null;
    const min = minIn(ctx.w);
    const range = peersRange(ctx);
    return {
      title: `Deficit at ${fmt(ctx, latest.value)} of GDP`,
      note:
        (min ? `Window low ${fmt(ctx, min.value)} (${min.year}). ` : "") +
        (range ? `Peers run from ${range.min} to ${range.max}.` : `Latest observation ${latest.year}.`),
    };
  },
];

// --- reserves (months of imports) ----------------------------------------------

const reservesBlocks: Block[] = [
  // Danger zone right now.
  (ctx) => {
    if (!need(ctx, 10)) return null;
    const latest = latestOf(ctx.w);
    if (latest.value >= 3) return null;
    const below30 = countBelowInLast(ctx.w, 30, 3);
    const min = minIn(ctx.w, ctx.w.lastYear - 9);
    return {
      title: `Below the 3-month line: ${fmt(ctx, latest.value)}`,
      note:
        (below30.span > 0 ? `Below three months of import cover in ${below30.count} of the past ${below30.span} years. ` : "") +
        (min ? `Decade low: ${fmt(ctx, min.value)} (${min.year}).` : `Latest observation ${latest.year}.`),
    };
  },
  // The fortress: no brush with the danger line for decades.
  (ctx) => {
    if (!need(ctx, 15)) return null;
    const latest = latestOf(ctx.w);
    const min30 = minIn(ctx.w, ctx.w.lastYear - 29);
    if (!min30 || min30.value < 4) return null;
    const rank = rankByLatest(ctx);
    return {
      title:
        latest.value >= 12
          ? `A year of imports banked: ${fmt(ctx, latest.value)}`
          : `The fortress: ${fmt(ctx, latest.value)} of imports`,
      note:
        `Never below ${fmt(ctx, min30.value)} in the past ${Math.min(30, ctx.w.points.length)} years` +
        (rank?.rank === 1 ? ", the region's deepest buffer." : "."),
    };
  },
  // Rebuilt but thin.
  (ctx) => {
    if (!need(ctx, 10)) return null;
    const latest = latestOf(ctx.w);
    if (latest.value >= 4 || latest.value < 3) return null;
    const below30 = countBelowInLast(ctx.w, 30, 3);
    if (below30.count < 5) return null;
    const min = minIn(ctx.w);
    return {
      title: `Rebuilt, but thin: ${fmt(ctx, latest.value)}`,
      note:
        `Below the 3-month line in ${below30.count} of the past ${below30.span} years` +
        (min ? `, including a low of ${fmt(ctx, min.value)} (${min.year}).` : ".") +
        ` The recovery is real; the buffer is shallow.`,
    };
  },
  // Rebuilt after a long stretch below the line.
  (ctx) => {
    if (!need(ctx, 10)) return null;
    const latest = latestOf(ctx.w);
    if (latest.value < 3) return null;
    const below30 = countBelowInLast(ctx.w, 30, 3);
    if (below30.count < 5) return null;
    const min = minIn(ctx.w);
    return {
      title: `Reserves back above 3 months of imports`,
      note:
        `Sank to ${min ? fmt(ctx, min.value) : "n/a"} (${min?.year ?? "n/a"}); below the line in ${below30.count} of the past ${below30.span} years. ` +
        `Now ${fmt(ctx, latest.value)} (${latest.year}).`,
    };
  },
  // Deep reserves without the fortress history.
  (ctx) => {
    if (!need(ctx, 10)) return null;
    const latest = latestOf(ctx.w);
    const min = minIn(ctx.w);
    const rank = rankByLatest(ctx);
    return {
      title: `Reserves at ${fmt(ctx, latest.value)} of imports`,
      note:
        (min ? `Window low ${fmt(ctx, min.value)} (${min.year}). ` : "") +
        (rank?.rank === 1 ? "The region's deepest buffer." : `Latest observation ${latest.year}.`),
    };
  },
];

// --- remittances ----------------------------------------------------------------

const remittanceBlocks: Block[] = [
  // Giant share of the economy.
  (ctx) => {
    if (!need(ctx, 10)) return null;
    const latest = latestOf(ctx.w);
    if (latest.value < 20) return null;
    const range = peersRange(ctx);
    const rank = rankByLatest(ctx);
    return {
      title: `${fmt(ctx, latest.value)} of GDP arrives as remittances`,
      note:
        `Latest reading ${fmt(ctx, latest.value)} in ${latest.year}` +
        (rank?.rank === 1 && range
          ? `, by far the region's largest share (next peer: ${range.max}).`
          : "."),
    };
  },
  // Remittances match the export bill.
  (ctx) => {
    if (!need(ctx, 10)) return null;
    const latest = latestOf(ctx.w);
    const expW = crossWindow(ctx, "exports", ctx.c.slug);
    const expLatest = expW ? latestOf(expW) : null;
    if (!expLatest || Math.abs(latest.value - expLatest.value) > 1.5) return null;
    return {
      title: `Remittances match the entire export bill: ${fmt(ctx, latest.value)} vs ${fmt(ctx, expLatest.value)}`,
      note: `Worker remittances (${latest.year}) roughly equal goods-and-services exports (${expLatest.year}); the Gulf, not factories, pays for imports.`,
    };
  },
  // Past its peak.
  (ctx) => {
    if (!need(ctx, 10)) return null;
    const latest = latestOf(ctx.w);
    const max = maxIn(ctx.w);
    if (!max || max.year === latest.year) return null;
    const offPeak = max.value - latest.value >= 2 || latest.value < 0.85 * max.value;
    if (!offPeak) return null;
    return {
      title: `Past its peak: ${fmt(ctx, latest.value)}, down from ${fmt(ctx, max.value)}`,
      note: `The remittance share peaked at ${fmt(ctx, max.value)} of GDP in ${max.year} and sits at ${fmt(ctx, latest.value)} (${latest.year}).`,
    };
  },
  // Modest reliance.
  (ctx) => {
    if (!need(ctx, 10)) return null;
    const latest = latestOf(ctx.w);
    if (latest.value >= 5) return null;
    const ago10 = yearsAgo(ctx.w, 10);
    const rank = rankByLatest(ctx);
    return {
      title: `Modest remittance reliance: ${fmt(ctx, latest.value)} of GDP`,
      note:
        (ago10 ? `Ten years ago: ${fmt(ctx, ago10.value)} (${ago10.year}). ` : "") +
        (rank ? `Ranked ${rank.rank} of ${rank.of} in the region.` : ""),
    };
  },
];

// --- registry ---------------------------------------------------------------------

const BLOCKS: Record<string, Block[]> = {
  "gdp-growth": growthBlocks,
  "gdp-per-capita": levelBlocks(2014),
  inflation: inflationBlocks,
  "broad-money": broadMoneyBlocks,
  "gross-capital-formation": gcfBlocks,
  "external-debt": debtBlocks,
  exports: exportBlocks,
  imports: importBlocks,
  "current-account": currentAccountBlocks,
  "reserves-months": reservesBlocks,
  remittances: remittanceBlocks,
};

// --- public API -------------------------------------------------------------------

export function getFacts(
  country: string,
  indicator: string,
  lookup: SeriesLookup,
): FactFinding | null {
  const cMeta = COUNTRY_MAP[country as CountrySlug];
  const indMeta = INDICATOR_MAP[indicator];
  if (!cMeta || !indMeta) return null;
  const series = lookup(indicator)?.[country];
  if (!series) return null;
  const w = lastConsecutiveWindow(series);
  if (!w) return null;
  const all: Record<string, Window | null> = {};
  for (const c of COUNTRIES) {
    const s = lookup(indicator)?.[c.slug];
    all[c.slug] = s ? lastConsecutiveWindow(s) : null;
  }
  const ctx: Ctx = { c: { slug: cMeta.slug, name: cMeta.name }, ind: indMeta, w, all, lookup };

  let finding: FactFinding | null = null;
  for (const block of BLOCKS[indicator] ?? []) {
    const f = block(ctx);
    if (f) {
      finding = f;
      break;
    }
  }
  if (!finding) finding = genericBlock(ctx);
  if (!finding) return null;

  // Series that end well before their peers get an explicit coverage caveat,
  // and series whose early history is broken by gaps get that said too,
  // whatever block produced the finding.
  const peerLastYears = peerWindows(ctx).map((p) => p.w.lastYear);
  const maxPeerLast = peerLastYears.length ? Math.max(...peerLastYears) : ctx.w.lastYear;
  let note = finding.note;
  if (ctx.w.lastYear <= maxPeerLast - 2 && !note.includes("coverage")) {
    note = `${note} WDI coverage for this series runs only to ${ctx.w.lastYear}.`;
  }
  const hasEarlier = series.some((p) => p.value !== null && p.value !== undefined && p.year < ctx.w.firstYear);
  if (hasEarlier && !note.includes("coverage") && !note.includes("gap")) {
    note = `${note} Earlier observations exist but are interrupted by data gaps.`;
  }
  return { ...finding, note };
}

// Back-compat shape: insight objects now come from the data, keyed the same way.
export function getInsight(
  country: string,
  indicator: string,
  lookup: SeriesLookup,
): FactFinding | null {
  return getFacts(country, indicator, lookup);
}

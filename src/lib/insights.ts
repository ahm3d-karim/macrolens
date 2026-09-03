import type { CountrySlug } from "./types";

// Finding-first insight lines, keyed `${countrySlug}:${indicatorSlug}`.
// Titles are claims the data shows, not variable descriptions. Every number
// below was computed from the shipped JSON (see macrolens-data/verify.py at
// pull time), no invented figures.

type Insight = { title: string; note: string };

const INSIGHTS: Record<string, Insight> = {
  // ── GDP GROWTH ──────────────────────────────────────────────────────────
  "pakistan:gdp-growth": {
    title: "Boom-bust, then a rare double dip",
    note: "Pakistan contracted twice in four years (2020 −1.3%, 2023 −0.4%) and averaged only ~4% growth across three decades. The 2025 recovery (3.7%) is still below the ~6% needed to absorb a young labour force.",
  },
  "india:gdp-growth": {
    title: "The region's growth engine, 7%+ since 2022",
    note: "India grew 7.2 to 7.6% in 2023 to 2025 while neighbours stagnated; the 2020 shock (−5.8%) was fully erased within two years.",
  },
  "bangladesh:gdp-growth": {
    title: "From 6.6% runner to a 3.5% crawl",
    note: "Bangladesh averaged 6.6% in the 2010s, second-fastest in the region, then slowed sharply (4.2% in 2024, 3.5% in 2025) as the export engine cooled.",
  },
  "sri-lanka:gdp-growth": {
    title: "Crisis trough to snapback",
    note: "Growth collapsed to −7.4% in 2022 and rebounded to ~5% in 2024 to 2025, a classic post-crisis recovery from an extremely low base, not a new trend.",
  },
  "nepal:gdp-growth": {
    title: "Small, volatile, remittance-steady",
    note: "Nepal swings from −2.4% (2020) to 5.6% (2022); 2025: 4.4%. Growth rarely compounds into structural change, the economy imports demand in the form of remittances.",
  },

  // ── GDP PER CAPITA ──────────────────────────────────────────────────────
  "pakistan:gdp-per-capita": {
    title: "Ten years, +22%: the slowest climb in the region",
    note: "Pakistan's GDP per capita (constant US$) rose just 21.7% in a decade. Bangladesh passed it in 2020 and is now ~19% ahead ($1,941 vs $1,635 in 2024).",
  },
  "india:gdp-per-capita": {
    title: "Income per person up ~60% in ten years",
    note: "$1,484 → $2,367 (2014 to 2024) on the back of sustained ~7% growth, the fastest per-capita climb at this scale in South Asia.",
  },
  "bangladesh:gdp-per-capita": {
    title: "The overtaking is real, and widening",
    note: "In 1990 Pakistan was twice as rich per person ($951 vs $473). Bangladesh crossed Pakistan in 2020 and keeps pulling away: $1,941 vs $1,635 in 2024.",
  },
  "sri-lanka:gdp-per-capita": {
    title: "Still the richest, but the crisis cost a decade",
    note: "Sri Lanka leads at ~$4,200 per person, yet income is only ~7% above 2014: the 2022 crisis erased nearly ten years of progress.",
  },
  "nepal:gdp-per-capita": {
    title: "Poor but climbing, +39% in ten years",
    note: "From ~$847 (2014) to ~$1,180 (2024), Nepal's per-capita income grew fastest after Bangladesh, from the region's lowest base.",
  },

  // ── INFLATION ───────────────────────────────────────────────────────────
  "pakistan:inflation": {
    title: "30.8% → 3.5%: the sharpest disinflation in the region",
    note: "CPI peaked at 30.8% in 2023 during the crisis, then crashed to 3.5% by 2025, base effects plus record policy rates. Watch fuel and food pass-through.",
  },
  "india:inflation": {
    title: "Price stability, the quiet success",
    note: "India's CPI is 2.4% (2025); even its post-reform peak (13.9% in 1991) was mild by South Asian standards.",
  },
  "bangladesh:inflation": {
    title: "The region's inflation outlier, 8.8% and sticky",
    note: "While neighbours disinflated, Bangladesh's CPI ran 8.8% in 2025, the region's highest (barring deflating Sri Lanka), driven by food prices and Taka depreciation.",
  },
  "sri-lanka:inflation": {
    title: "49.7% to −4.8%: the crisis whiplash",
    note: "CPI exploded to 49.7% in 2022, then fell into deflation (−4.8% in 2025) as demand collapsed. Disinflation by recession, not by policy success.",
  },
  "nepal:inflation": {
    title: "Quiet prices: 2.6%, with food swings",
    note: "Nepal's CPI has stayed low for decades (peak: 19.0% back in 1986); 2025: 2.6%, a rare price-stability story in the region.",
  },

  // ── BROAD MONEY ─────────────────────────────────────────────────────────
  "pakistan:broad-money": {
    title: "Financial depth collapsed through the crisis",
    note: "Broad money fell from a 54.5% of GDP peak (2020) to ~38% (2024), deposits shrivelled relative to the economy through the inflation shock, and remains depressed at 40.9% (2025).",
  },
  "india:broad-money": {
    title: "Deep, stable, non-inflationary: 82% of GDP",
    note: "India's broad money is 82% of GDP (latest: 2021), high depth with CPI at 2.4%: the financial system monetises growth without stoking prices.",
  },
  "bangladesh:broad-money": {
    title: "Money depth peaked in 2010, now shrinking",
    note: "Broad money hit 58.8% of GDP in 2010 and has since fallen to 47.9% (2025), deposit growth lagging nominal GDP through the inflation years.",
  },
  "sri-lanka:broad-money": {
    title: "Peaked before the crisis, ~59% (data to 2019)",
    note: "Sri Lanka's money supply reached 59.5% of GDP in 2019; WDI coverage stops there, so the crisis-era monetary contraction isn't visible in this series.",
  },
  "nepal:broad-money": {
    title: "131% of GDP, deepest money in the region",
    note: "Nepal's broad money is extraordinary: 131% of GDP (2025), from 5.4% in 1960. Remittance deposits swamp a small formal economy.",
  },

  // ── GROSS CAPITAL FORMATION ─────────────────────────────────────────────
  "pakistan:gross-capital-formation": {
    title: "14.3% of GDP: Pakistan invests like a war economy, not a developing one",
    note: "Investment is barely a third of India's 34.6% or Bangladesh's 28.5% (2025). This, not exchange rates, is the structural gap behind the overtaking.",
  },
  "india:gross-capital-formation": {
    title: "34.6% of GDP, investment-led growth",
    note: "India invests at East Asian rates; capital formation has doubled as a share of GDP since 1960 and is the engine behind its growth premium.",
  },
  "bangladesh:gross-capital-formation": {
    title: "28.5% and climbing, the machine being built",
    note: "Bangladesh's investment share rose from ~7% (1960s) to 28.5% (2025), factories and infrastructure, funded partly by its export surplus.",
  },
  "sri-lanka:gross-capital-formation": {
    title: "Investment fell through the crisis, still below pre-2020",
    note: "Capital formation dropped from 34.1% of GDP (2019) to 24.3% (2023) during the crisis and has recovered to 29.7% (2025), still short of its pre-crisis rate.",
  },
  "nepal:gross-capital-formation": {
    title: "29.4% of GDP, construction-led",
    note: "Nepal invests nearly 30% of GDP, mostly construction funded by remittance-fuelled demand, investment without export earnings to back it.",
  },

  // ── EXTERNAL DEBT ───────────────────────────────────────────────────────
  "pakistan:external-debt": {
    title: "Hovering at 35 to 40% of GNI, the IMF anchor",
    note: "External debt is down from 55.9% of GNI (1999) and has hovered around 35 to 40% since 2019, the servicing burden, not the stock, keeps Pakistan chained to IMF programmes.",
  },
  "india:external-debt": {
    title: "The most insulated, 18.6% of GNI",
    note: "India's external debt is the region's lowest relative to income (18.6%, 2024), and reserves cover it several times over.",
  },
  "bangladesh:external-debt": {
    title: "Light external debt, 22.3% of GNI",
    note: "Bangladesh borrowed little abroad; its fragility is the banking sector, not external creditors.",
  },
  "sri-lanka:external-debt": {
    title: "81.3% at the crisis peak, the warning others ignore",
    note: "External debt hit 81.3% of GNI in 2022, the year of default, and remains high at 58.9% (2024). Watch this line on every neighbour's chart.",
  },
  "nepal:external-debt": {
    title: "Light, and falling: 23.3% of GNI",
    note: "Nepal's external debt fell from 60.0% (1999) to 23.3% (2024), grant-heavy development kept the country lightly leveraged.",
  },

  // ── EXPORTS ─────────────────────────────────────────────────────────────
  "pakistan:exports": {
    title: "Stuck at ~10% of GDP for 25 years",
    note: "Exports were 9.6% of GDP in 2000 and 10.0% in 2025, the deepest export stagnation in the region, and the root of the recurring balance-of-payments crises.",
  },
  "india:exports": {
    title: "Exports nearly doubled, 13% → 22%",
    note: "India's exports rose from 13.0% of GDP (2000) to 22.3% (2025), led by services, pharma and engineering, the region's only sustained export expansion.",
  },
  "bangladesh:exports": {
    title: "The export machine, but small as a share",
    note: "Bangladesh's exports (11.1% of GDP, 2025) are far below the legend: the share peaked at 20.2% in 2012 and garments have since faced price and competition headwinds.",
  },
  "sri-lanka:exports": {
    title: "A trading economy in retreat, 39% → 19%",
    note: "Sri Lanka's export share halved from 39.0% (2000, pre-conflict-ending peak) to 19.0% (2025). Trade openness shrank as the war economy ended and austerity set in.",
  },
  "nepal:exports": {
    title: "Exports nearly vanished, 23% → 8.8%",
    note: "Nepal's export share collapsed from 23.3% (2000) to 8.8% (2025), by far the smallest in the region, against imports of 33.7% of GDP.",
  },

  // ── IMPORTS ─────────────────────────────────────────────────────────────
  "pakistan:imports": {
    title: "17.2% of GDP, and every dip is a crisis",
    note: "Imports crashed from a 22.5% peak (2022) on FX controls rather than demand strength, import compression is how Pakistan balances, not exports.",
  },
  "india:imports": {
    title: "24% of GDP, a growing economy's appetite",
    note: "India's import share (24.0%, 2025) reflects energy, gold and manufacturing inputs; a widening gap funded by services exports and capital inflows.",
  },
  "bangladesh:imports": {
    title: "Imports fell with the dollar crunch",
    note: "Bangladesh's imports dropped from a 28.0% peak (2012) and 2022-era highs to 16.8% (2025), an FX-shortage compression, not an efficiency gain.",
  },
  "sri-lanka:imports": {
    title: "From 49.6% to 22.8%, the austerity squeeze",
    note: "Sri Lanka's import share more than halved since 2000, crisis collapse plus policy austerity; consumption of imports is now rationed by reserves.",
  },
  "nepal:imports": {
    title: "33.7% of GDP, imports 4× exports",
    note: "Nepal imports nearly four times what it exports (33.7% vs 8.8% of GDP, 2025). The gap is paid by remittances and aid, a debt-free but fragile model.",
  },

  // ── CURRENT ACCOUNT ─────────────────────────────────────────────────────
  "pakistan:current-account": {
    title: "Zero by compression, not by export strength",
    note: "The current account swung from −7.7% of GDP (2008) to −0.1% (2025), but via import collapse and remittance inflows, not export growth.",
  },
  "india:current-account": {
    title: "Small deficit, big buffer: −0.4%",
    note: "India runs a tiny external deficit (−0.4%, 2025), comfortably funded by FDI and portfolio flows, no FX stress signal.",
  },
  "bangladesh:current-account": {
    title: "From −3.8% crunch to near zero",
    note: "Bangladesh's deficit hit −3.8% in 2022 (the reserves crunch year) before tightening to −0.1% (2025), stability won the same way Pakistan's was: by imports compression.",
  },
  "sri-lanka:current-account": {
    title: "Back to surplus, the austerity dividend",
    note: "Sri Lanka swung to +1.2% (2024) after crisis-era lows of −9.5% (2008) and −1.9% (2022), a surplus bought with collapsed demand.",
  },
  "nepal:current-account": {
    title: "Surplus by remittance, +3.9% of GDP",
    note: "Nepal's external balance is positive only because a quarter of GDP arrives as worker remittances, the mirror image of its export collapse.",
  },

  // ── RESERVES ────────────────────────────────────────────────────────────
  "pakistan:reserves-months": {
    title: "Back above 3 months, after three years in the danger zone",
    note: "Reserves crashed to 1.4 months in 2022 and stayed below the 3-month line through 2024 (below it 12 of the past 30 years; 1996 low: 0.9). Only 2025's 3.8 months restores the buffer.",
  },
  "india:reserves-months": {
    title: "The fortress: 7.9 months, never below 5 since 1995",
    note: "India has held above five months of import cover for three decades, the deepest large-economy buffer in the region.",
  },
  "bangladesh:reserves-months": {
    title: "Rebuilt, but shallow: 3.9 months",
    note: "Bangladesh has spent 13 of the past 30 years below 3 months of import cover, including the 2022 dollar crunch. The 2025 recovery (3.9 months) is real but thin.",
  },
  "sri-lanka:reserves-months": {
    title: "1.06 months in 2022, the region's worst-ever reading",
    note: "Sri Lanka's reserves slid from 3.5 (2015) to 1.1 months (2022), the year of default, and remain below 3 (2.9, 2024). The Guidotti-Greenspan test says: danger.",
  },
  "nepal:reserves-months": {
    title: "A year of imports banked, 13.0 months",
    note: "Nepal has never dipped below 4 months of import cover since 1995; at 13.0 (2024) it holds the region's deepest buffer, remittance FX parked, not spent.",
  },

  // ── REMITTANCES ─────────────────────────────────────────────────────────
  "pakistan:remittances": {
    title: "Remittances now match the entire export bill",
    note: "At 9.9% of GDP (2025, an all-time high), worker remittances roughly equal all goods-and-services exports (10.0%), the Gulf, not factories, pays Pakistan's import bill.",
  },
  "india:remittances": {
    title: "The world's largest diaspora, 3.8% of GDP",
    note: "India's remittances are the largest in absolute terms, yet modest relative to a $4T economy, exports and services carry the balance instead.",
  },
  "bangladesh:remittances": {
    title: "Past its peak: 7.4%, down from 10.6%",
    note: "The remittance share peaked at 10.6% of GDP (2012) and sits at 7.4% (2025), still the economy's second pillar after garments.",
  },
  "sri-lanka:remittances": {
    title: "The quiet stabiliser, 6.8% of GDP",
    note: "Sri Lanka's diaspora sent home 6.8% of GDP (2024), the cushion its post-default adjustment stood on while tourism rebuilt.",
  },
  "nepal:remittances": {
    title: "A quarter of the economy, wired home: 26.0% of GDP",
    note: "Nepal's remittance share (2024) is among the world's highest, larger than its entire industrial value added. The economy runs on migration's proceeds.",
  },
};

export function getInsight(
  country: string,
  indicator: string,
): Insight | null {
  return INSIGHTS[`${country}:${indicator}`] ?? null;
}

export function loadInsights(): Record<string, Insight> {
  return INSIGHTS;
}
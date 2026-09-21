#!/usr/bin/env python
"""Macrolens data pipeline: World Bank WDI (22 indicators) + IMF WEO public debt
(best-effort, optional) for 5 South Asian countries -> normalized per-country
per-indicator JSON files.

Outputs:
  data/<country>/<indicator-slug>.json   flat array [{"year": int, "value": float|int|null}],
                                         sorted by year ascending; missing in-range years = null.
  data/meta.json                         generation metadata + per-indicator source info.

Idempotent: safe to re-run; files are overwritten deterministically.
Usage: python pull.py
"""

import json
import math
import os
import sys
import time

import requests

BASE_DIR = r"C:/Users/Ahmad Karim/Documents/Projects/Active/DATA-PRODUCTS/macrolens-data"
DATA_DIR = os.path.join(BASE_DIR, "data")
UA = {"User-Agent": "macrolens-data-pipeline/0.1 (contact: research@example.com)"}

GENERATED_AT = "2026-09-20"

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
COUNTRIES = [
    # (wdi_code, iso3, slug)
    ("PK", "PAK", "pakistan"),
    ("IN", "IND", "india"),
    ("BD", "BGD", "bangladesh"),
    ("LK", "LKA", "sri-lanka"),
    ("NP", "NPL", "nepal"),
]

WDI_INDICATORS = [
    # (wdi_code, slug, is_population)
    ("NY.GDP.MKTP.KD.ZG", "gdp-growth", False),
    ("NY.GDP.PCAP.KD", "gdp-per-capita", False),
    ("FP.CPI.TOTL.ZG", "inflation", False),
    ("FM.LBL.BMNY.GD.ZS", "broad-money", False),
    ("NE.GDI.TOTL.ZS", "gross-capital-formation", False),
    ("NE.EXP.GNFS.ZS", "exports", False),
    ("NE.IMP.GNFS.ZS", "imports", False),
    ("BN.CAB.XOKA.GD.ZS", "current-account", False),
    ("FI.RES.TOTL.MO", "reserves-months", False),
    ("BX.TRF.PWKR.DT.GD.ZS", "remittances", False),
    ("SP.POP.TOTL", "population", True),
    ("DT.DOD.DECT.GN.ZS", "external-debt", False),
    ("PA.NUS.FCRF", "exchange-rate", False),
    ("FR.INR.RINR", "real-interest-rate", False),
    ("GC.NLD.TOTL.GD.ZS", "fiscal-balance", False),
    ("BX.KLT.DINV.WD.GD.ZS", "fdi-inflows", False),
    ("NV.IND.MANF.ZS", "manufacturing", False),
    ("NY.GNS.ICTR.ZS", "gross-savings", False),
    ("DT.TDS.DECT.EX.ZS", "debt-service", False),
    ("NV.AGR.TOTL.ZS", "agriculture", False),
    ("SL.UEM.TOTL.ZS", "unemployment", False),
    ("SL.TLF.CACT.FE.ZS", "female-labor-participation", False),
]

# NOTE: public debt (IMF WEO) is best-effort: the datamapper API returned 403
# from this network on 2026-09-03, so fetch_imf treats any failure as a clean
# skip (the series is optional; stale files are removed on a skip). External
# debt (World Bank WDI) remains the always-shipped debt measure. WDI
# government finance (GC.*) has no recent Pakistan coverage, so fiscal
# balance ships with its coverage gaps visible.

IMF_INDICATOR = ("GGXWDG_NGDP", "public-debt")
IMF_URL = "https://www.imf.org/external/datamapper/api/v1/GGXWDG_NGDP"
# WEO publishes current-year estimates and out-year projections. The site
# promises historical outcomes, not forecasts, so the pipeline truncates at
# the latest fully completed calendar year. Bump when a new year completes.
IMF_LAST_HISTORICAL_YEAR = 2025


def wdi_indicator_url(code):
    return "https://api.worldbank.org/v2/country/{c}/indicator/{i}?format=json&per_page=2000"


def wdi_page_url(code, indicator, page=1):
    return (
        f"https://api.worldbank.org/v2/country/{code}/indicator/{indicator}"
        f"?format=json&per_page=2000&page={page}"
    )


# ---------------------------------------------------------------------------
# Fetching
# ---------------------------------------------------------------------------
def fetch_wdi(code, indicator):
    """Fetch full history for one country x indicator, handling pagination.
    Returns (records, lastupdated). Retries transient read timeouts: a single
    flaky read from api.worldbank.org must not kill a whole refresh."""
    records = []
    lastupdated = None
    page = 1
    while True:
        payload = None
        for attempt in range(4):
            try:
                r = requests.get(wdi_page_url(code, indicator, page), headers=UA, timeout=60)
                r.raise_for_status()
                payload = r.json()
                break
            except requests.RequestException as e:
                if attempt == 3:
                    raise
                print(f"  retry {attempt + 1} {code}/{indicator} p{page}: {e.__class__.__name__}")
                sys.stdout.flush()
                time.sleep(3 * (attempt + 1))
        meta = payload[0]
        if "message" in meta:  # API error object
            raise RuntimeError(f"WDI error for {code}/{indicator}: {meta['message']}")
        lastupdated = meta.get("lastupdated", lastupdated)
        records.extend(payload[1])
        if page >= int(meta.get("pages", 1)):
            break
        page += 1
    return records, lastupdated


def fetch_imf():
    """Public debt, % of GDP, by ISO3, from IMF WEO. Returns None when the
    source is unreachable; the series is optional and the build must not fail."""
    try:
        r = requests.get(IMF_URL, headers=UA, timeout=60)
        r.raise_for_status()
        return r.json()["values"][IMF_INDICATOR[0]]
    except Exception as e:
        print(f"IMF {IMF_INDICATOR[1]} unavailable ({e.__class__.__name__}: {e}); skipping optional series")
        return None


# ---------------------------------------------------------------------------
# Normalization
# ---------------------------------------------------------------------------
def normalize(records, is_population):
    """records -> sorted list of {year, value} (missing = None)."""
    by_year = {}
    for rec in records:
        year_str = rec.get("date", "")
        if not year_str.isdigit():
            continue
        year = int(year_str)
        value = rec.get("value")
        if value is None:
            by_year[year] = None
            continue
        try:
            value = float(value)
        except (TypeError, ValueError):
            by_year[year] = None
            continue
        if math.isnan(value) or math.isinf(value):
            by_year[year] = None
            continue
        if is_population:
            by_year[year] = int(round(value))
        else:
            rounded = round(value, 2)
            if rounded == 0:
                rounded = 0.0
            by_year[year] = rounded
    return [{"year": y, "value": by_year[y]} for y in sorted(by_year)]


def normalize_imf(country_map, iso3):
    """IMF {year_str: value} -> sorted list of {year, value}; missing kept as None
    only if the source map actually contains the year with a null (the WEO map
    only lists available years, so no in-range nulls are synthesised)."""
    out = []
    for year_str, value in country_map.items():
        if not year_str.isdigit():
            continue
        year = int(year_str)
        if value is None:
            out.append({"year": year, "value": None})
            continue
        try:
            v = float(value)
        except (TypeError, ValueError):
            out.append({"year": year, "value": None})
            continue
        if math.isnan(v) or math.isinf(v):
            out.append({"year": year, "value": None})
            continue
        rounded = round(v, 2)
        if rounded == 0:
            rounded = 0.0
        out.append({"year": year, "value": rounded})
    out.sort(key=lambda x: x["year"])
    return out


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():
    os.makedirs(DATA_DIR, exist_ok=True)

    sources = {}
    wdi_lastupdated = set()

    # --- WDI ---
    for wdi_code, slug, is_pop in WDI_INDICATORS:
        sources[slug] = {
            "source": "World Bank WDI",
            "code": wdi_code,
            "url": f"https://data.worldbank.org/indicator/{wdi_code}",
        }
        for country_code, _, country_slug in COUNTRIES:
            records, lastupdated = fetch_wdi(country_code, wdi_code)
            if lastupdated:
                wdi_lastupdated.add(lastupdated)
            series = normalize(records, is_pop)
            out_path = os.path.join(DATA_DIR, country_slug, f"{slug}.json")
            os.makedirs(os.path.dirname(out_path), exist_ok=True)
            with open(out_path, "w", encoding="utf-8") as f:
                json.dump(series, f, ensure_ascii=False)
            non_null = sum(1 for p in series if p["value"] is not None)
            if series:
                rng = f"({series[0]['year']}-{series[-1]['year']})"
            else:
                rng = "(no records)"
            print(f"WDI  {country_slug:10s} {slug:20s} {len(series):3d} years "
                  f"{rng}, non-null={non_null}")
            sys.stdout.flush()

    # --- IMF (optional) ---
    imf = fetch_imf()
    if imf is not None:
        sources[IMF_INDICATOR[1]] = {
            "source": "IMF WEO",
            "code": IMF_INDICATOR[0],
            "url": IMF_URL,
        }
        for _, iso3, country_slug in COUNTRIES:
            series = normalize_imf(imf.get(iso3, {}), iso3)
            series = [p for p in series if p["year"] <= IMF_LAST_HISTORICAL_YEAR]
            out_path = os.path.join(DATA_DIR, country_slug, f"{IMF_INDICATOR[1]}.json")
            os.makedirs(os.path.dirname(out_path), exist_ok=True)
            with open(out_path, "w", encoding="utf-8") as f:
                json.dump(series, f, ensure_ascii=False)
            nn = sum(1 for p in series if p["value"] is not None)
            print(f"IMF  {country_slug:10s} {IMF_INDICATOR[1]:20s} {len(series):3d} years, non-null={nn}")
            sys.stdout.flush()
    else:
        for _, _, country_slug in COUNTRIES:
            p = os.path.join(DATA_DIR, country_slug, f"{IMF_INDICATOR[1]}.json")
            if os.path.exists(p):
                os.remove(p)  # optional series: stale files must not linger

    # --- meta.json ---
    meta = {
        "generatedAt": GENERATED_AT,
        "lastUpdated": max(wdi_lastupdated) if wdi_lastupdated else None,
        "sources": dict(sorted(sources.items())),
    }
    meta_path = os.path.join(DATA_DIR, "meta.json")
    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(meta, f, ensure_ascii=False, indent=2)
    print(f"META written: {meta_path}  lastUpdated={meta['lastUpdated']}")


if __name__ == "__main__":
    main()

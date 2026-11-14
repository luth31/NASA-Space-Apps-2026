"""Fetch public FIRMS observations and publish an auditable, offline app bundle.

This path deliberately does not infer clear-sky zeros from an empty point list.
Calendar rows are raw reported detections; eligible harmonized values come only
from the separate coverage-validated pipeline.
"""

from __future__ import annotations

import argparse
import concurrent.futures
import hashlib
import json
import time
import urllib.request
from datetime import UTC, datetime

import duckdb
import pandas as pd

from pipeline.catalog import CASES, FIRMS_BASE, GLOBAL_URL, PUBLIC, RAW, ROOT, WORK


def write_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_suffix(".tmp")
    temp.write_text(json.dumps(value, separators=(",", ":"), allow_nan=False))
    temp.replace(path)


def fetch(url, path, refresh=False):
    started = time.perf_counter()
    cached = path.exists() and not refresh
    if not cached:
        path.parent.mkdir(parents=True, exist_ok=True)
        request = urllib.request.Request(
            url, headers={"User-Agent": "PyroBridge/0.1 research (NASA Space Apps)"}
        )
        for attempt in range(3):
            try:
                with urllib.request.urlopen(request, timeout=90) as response:
                    content = response.read()
                if content.startswith(b"<"):
                    raise ValueError("Expected data, received HTML")
                temp = path.with_suffix(".part")
                temp.write_bytes(content)
                temp.replace(path)
                break
            except Exception:
                if attempt == 2:
                    raise
                time.sleep(attempt + 1)
    content = path.read_bytes()
    lock = ROOT / "config" / "public-sources.json"
    if lock.exists() and not refresh:
        expected = next(
            (
                s
                for s in json.loads(lock.read_text())["sources"]
                if s["file"] == path.name
            ),
            None,
        )
        if expected and hashlib.sha256(content).hexdigest() != expected["sha256"]:
            raise ValueError(
                f"{path.name} differs from the pinned source. Use --refresh to deliberately publish a new snapshot."
            )
    return {
        "url": url,
        "file": path.name,
        "bytes": len(content),
        "sha256": hashlib.sha256(content).hexdigest(),
        "cached": cached,
        "seconds": round(time.perf_counter() - started, 3),
    }


def normalize(df, sensor):
    df = df.copy()
    df["sensor"] = sensor
    if sensor == "MODIS":
        df = df[df.satellite.str.upper().eq("AQUA")].copy()
    if df.empty:
        return df
    df["acq_time"] = df.acq_time.astype(str).str.zfill(4)
    df["timestamp"] = (
        df.acq_date + "T" + df.acq_time.str[:2] + ":" + df.acq_time.str[2:] + ":00Z"
    )
    df["month"] = df.acq_date.str[:7]
    df["type"] = df.get("type", pd.Series(-1, index=df.index)).fillna(-1).astype(int)
    df["confidence"] = (
        df.confidence.astype(str)
        .str.lower()
        .replace({"n": "nominal", "h": "high", "l": "low"})
    )
    df["version"] = df.version.astype(str)
    df["id"] = [
        hashlib.sha256(f"{sensor}|{a}|{b}|{c}".encode()).hexdigest()[:16]
        for a, b, c in zip(df.timestamp, df.latitude, df.longitude)
    ]
    return df.drop_duplicates("id")


def pack(df):
    """Compact tuple contract is documented in schema.json and decoded in web/src/data.ts."""
    if df.empty:
        return []
    result = []
    for r in df.itertuples():
        result.append(
            [
                r.id,
                round(float(r.longitude), 5),
                round(float(r.latitude), 5),
                r.timestamp,
                r.sensor,
                str(r.confidence),
                None if pd.isna(r.frp) else round(float(r.frp), 2),
                round(float(r.scan), 2),
                round(float(r.track), 2),
                str(r.version),
                str(r.daynight),
                int(r.type),
            ]
        )
    return result


def in_box(df, bbox):
    w, s, e, n = bbox
    return df[
        (df.longitude >= w)
        & (df.longitude < e)
        & (df.latitude >= s)
        & (df.latitude < n)
    ]


def build(refresh=False):
    started = time.perf_counter()
    RAW.mkdir(parents=True, exist_ok=True)
    WORK.mkdir(parents=True, exist_ok=True)
    PUBLIC.mkdir(parents=True, exist_ok=True)
    index_url = (
        "https://firms.modaps.eosdis.nasa.gov/data/country/yearly_summary_files.txt"
    )
    index_meta = fetch(index_url, RAW / "yearly_summary_files.txt", refresh)
    index = pd.read_csv(RAW / "yearly_summary_files.txt")
    available = set(index.filename)
    jobs = []
    for sensor, prefix, first in [
        ("MODIS", "modis", 2003),
        ("VIIRS", "viirs-snpp", 2012),
    ]:
        for country in [
            "Greece",
            "Turkey",
            "Bulgaria",
            "Argentina",
            "Bolivia",
            "Paraguay",
            "Brazil",
        ]:
            years = (
                range(first, 2026)
                if country in {"Greece", "Turkey", "Bulgaria"}
                else [2020]
            )
            for year in years:
                name = f"{prefix}_{year}_{country}.csv"
                if name in available:
                    jobs.append((sensor, country, year, name))
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
        futures = [
            executor.submit(fetch, FIRMS_BASE + name, RAW / name, refresh)
            for _, _, _, name in jobs
        ]
        sources = [f.result() for f in futures]
    print(
        f"Fetched {len(sources)} country files ({sum(x['bytes'] for x in sources) / 1e6:.1f} MB)",
        flush=True,
    )
    frames = {}
    for sensor, country, year, name in jobs:
        frame = normalize(
            pd.read_csv(RAW / name, dtype={"acq_time": str, "version": str}), sensor
        )
        # Retain only scene context after parsing each country file. Countries
        # on both sides of a case boundary are included before clipping.
        relevant = [c["sceneBounds"] for c in CASES if country in c["sourceCountries"]]
        frame = pd.concat(
            [in_box(frame, bounds) for bounds in relevant]
        ).drop_duplicates("id")
        frames.setdefault(country, []).append(frame)
    countries = {
        country: pd.concat(fs, ignore_index=True).drop_duplicates("id")
        for country, fs in frames.items()
    }
    case_summaries = []
    pilot_frames = []
    for case in CASES:
        context = in_box(
            pd.concat(
                [countries[c] for c in case["sourceCountries"]], ignore_index=True
            ).drop_duplicates("id"),
            case["sceneBounds"],
        ).copy()
        df = in_box(context, case["bbox"]).copy()
        df["region"] = case["id"]
        pilot_frames.append(df)
        # Only raw observations. A point-free source month is not an observed zero.
        grouped = df.groupby(["month", "sensor"]).size().to_dict()
        region_jobs = [j for j in jobs if j[1] in case["sourceCountries"]]
        years = sorted({j[2] for j in region_jobs})
        available_sources = {
            (year, sensor, country) for sensor, country, year, _ in region_jobs
        }
        context_grouped = context.groupby(["month", "sensor"]).size().to_dict()
        months = []
        context_months = []
        for year in years:
            for month in range(1, 13):
                key = f"{year}-{month:02}"
                m = {
                    "month": key,
                    "modis": None,
                    "viirs": None,
                    "estimate": None,
                    "interval": None,
                    "coverage": "unknown",
                    "status": "observations_only",
                    "eligible": False,
                }
                for sensor, field in [("MODIS", "modis"), ("VIIRS", "viirs")]:
                    if all(
                        (year, sensor, country) in available_sources
                        for country in case["sourceCountries"]
                    ):
                        m[field] = int(grouped.get((key, sensor), 0))
                months.append(m)
                context_months.append(
                    {
                        "month": key,
                        "modis": int(context_grouped.get((key, "MODIS"), 0))
                        if m["modis"] is not None
                        else None,
                        "viirs": int(context_grouped.get((key, "VIIRS"), 0))
                        if m["viirs"] is not None
                        else None,
                    }
                )
        for month, rows in df.groupby("month"):
            write_json(
                PUBLIC / "observations" / case["id"] / f"{month}.json",
                pack(rows.sort_values("timestamp")),
            )
        for month, rows in context.groupby("month"):
            write_json(
                PUBLIC / "context" / case["id"] / f"{month}.json",
                pack(rows.sort_values("timestamp")),
            )
        scene = df[
            (df.acq_date >= case["window"][0]) & (df.acq_date <= case["window"][1])
        ]
        write_json(
            PUBLIC / "scenes" / f"{case['id']}.json",
            pack(scene.sort_values("timestamp")),
        )
        case_summaries.append(
            {
                **case,
                "months": months,
                "contextMonths": context_months,
                "contextRawCount": len(context),
                "rawCount": len(df),
                "sceneCount": len(scene),
                "years": years,
                "harmonized": False,
                "supportReason": "Matched usable coverage has not been verified. Historical counts are reported detections, not estimates of all fire activity.",
                "versions": sorted(df.version.unique().tolist()),
                "coverage": "unknown",
            }
        )
    all_regions = pd.concat(pilot_frames, ignore_index=True)
    connection = duckdb.connect()
    connection.register("observations", all_regions)
    connection.execute(
        "COPY observations TO ? (FORMAT PARQUET, COMPRESSION ZSTD)",
        [str(WORK / "case-observations.parquet")],
    )
    global_meta = fetch(GLOBAL_URL, RAW / "global-noaa20-24h.csv", refresh)
    global_frame = normalize(
        pd.read_csv(
            RAW / "global-noaa20-24h.csv", dtype={"acq_time": str, "version": str}
        ),
        "NOAA-20",
    )
    write_json(PUBLIC / "global.json", pack(global_frame))
    manifest = {
        "schemaVersion": 1,
        "bundleVersion": datetime.now(UTC).strftime("%Y%m%dT%H%M%SZ"),
        "builtAt": datetime.now(UTC).isoformat(),
        "snapshotStart": global_frame.timestamp.min(),
        "snapshotEnd": global_frame.timestamp.max(),
        "globalCount": len(global_frame),
        "globalSensor": "NOAA-20 VIIRS",
        "globalSource": GLOBAL_URL,
        "globalProcessing": "Near real time",
        "sources": [index_meta, *sources, global_meta],
        "qualityPolicy": {
            "time": "UTC",
            "bounds": "west/south inclusive, east/north exclusive",
            "duplicateKey": "sensor, timestamp, latitude, longitude",
            "confidence": "Retain all reported levels with their source meaning",
            "sourceType": "Retain source types, including unknown; never label all hotspots as confirmed wildfires",
            "missing": "No detection is distinct from verified clear-sky zero",
            "historical": "Aqua only for MODIS; S-NPP only for VIIRS",
        },
        "buildSeconds": round(time.perf_counter() - started, 2),
        "validationStatus": "coverage_pending",
        "cases": case_summaries,
    }
    write_json(PUBLIC / "manifest.json", manifest)
    if refresh:
        write_json(
            ROOT / "config" / "public-sources.json",
            {
                "bundleVersion": manifest["bundleVersion"],
                "sources": [
                    {k: s[k] for k in ["url", "file", "bytes", "sha256"]}
                    for s in manifest["sources"]
                ],
            },
        )
    write_json(
        PUBLIC / "schema.json",
        {
            "schemaVersion": 1,
            "observationTuple": [
                "id",
                "longitude",
                "latitude",
                "timestampUTC",
                "sensor",
                "sourceConfidence",
                "frpMW",
                "scanKM",
                "trackKM",
                "processingVersion",
                "dayNight",
                "sourceType",
            ],
            "months": {
                "modis": "Reported Aqua detections or null if source unavailable",
                "viirs": "Reported S-NPP detections or null if source unavailable",
                "estimate": "Validated VIIRS-equivalent estimate; null until supported",
                "coverage": "unknown means no cloud/usable-observation denominator",
                "status": "observations_only or validated",
                "eligible": "True only after published release gate passes",
            },
        },
    )
    print(
        json.dumps(
            {
                "cases": {c["id"]: c["sceneCount"] for c in case_summaries},
                "global": len(global_frame),
                "snapshot": global_frame.timestamp.max(),
                "seconds": manifest["buildSeconds"],
            }
        ),
        flush=True,
    )


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--refresh",
        action="store_true",
        help="Refresh NASA sources instead of using checksum-pinned cached files",
    )
    args = parser.parse_args()
    build(args.refresh)

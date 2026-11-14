"""Coverage-aware, native-pixel count pairs from standard NASA Level-2 swaths.

Area is sampled on a local Lambert azimuthal equal-area grid. The nearest
geolocated pixel is queried including cloudy/invalid neighbors, then rejected
unless usable. This is an explicitly approximate footprint treatment. The
published audit includes sensitivity to distance limits; it does not certify a
complete monthly reference exposure or historical transfer on its own.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import time
from dataclasses import dataclass

import duckdb
import numpy as np
import pandas as pd
from netCDF4 import Dataset
from pyhdf.SD import SD, SDC
from scipy.spatial import cKDTree

from pipeline.build import write_json
from pipeline.catalog import CASES, PUBLIC, RAW, ROOT, WORK

RADIUS_KM = 6371.00718
POLICY = json.loads((ROOT / "config" / "coverage-policy.json").read_text())


@dataclass
class Area:
    bbox: tuple[float, float, float, float]

    def inside(self, lon, lat, pad=0):
        w, s, e, n = self.bbox
        return (lon >= w - pad) & (lon < e + pad) & (lat >= s - pad) & (lat < n + pad)

    def project(self, lon, lat):
        w, s, e, n = self.bbox
        a, b = np.radians([(w + e) / 2, (s + n) / 2])
        l = np.radians(lon) - a
        p = np.radians(lat)
        k = np.sqrt(2 / (1 + np.sin(b) * np.sin(p) + np.cos(b) * np.cos(p) * np.cos(l)))
        return np.column_stack(
            [
                RADIUS_KM * k * np.cos(p) * np.sin(l),
                RADIUS_KM
                * k
                * (np.cos(b) * np.sin(p) - np.sin(b) * np.cos(p) * np.cos(l)),
            ]
        )

    def inverse(self, xy):
        w, s, e, n = self.bbox
        a, b = np.radians([(w + e) / 2, (s + n) / 2])
        x, y = xy.T
        rho = np.hypot(x, y)
        c = 2 * np.arcsin(rho / (2 * RADIUS_KM))
        k = np.divide(
            np.sin(c), rho, out=np.full_like(rho, 1 / RADIUS_KM), where=rho != 0
        )
        lat = np.arcsin(np.cos(c) * np.sin(b) + y * k * np.cos(b))
        lon = a + np.arctan2(x * k, np.cos(c) * np.cos(b) - y * k * np.sin(b))
        return np.degrees(lon), np.degrees(lat)

    def grid(self, step=0.5):
        w, s, e, n = self.bbox
        x, y = self.project(np.array([w, w, e, e]), np.array([s, n, s, n])).T
        xx, yy = np.meshgrid(
            np.arange(
                np.floor(x.min() / step) * step, np.ceil(x.max() / step) * step, step
            ),
            np.arange(
                np.floor(y.min() / step) * step, np.ceil(y.max() / step) * step, step
            ),
        )
        xy = np.column_stack([xx.ravel(), yy.ravel()])
        lon, lat = self.inverse(xy)
        inside = self.inside(lon, lat)
        return xy[inside], lon[inside], lat[inside]


def native(area: Area, fire_path, geo_path, sensor: str):
    if sensor == "MODIS":
        geo = SD(str(geo_path), SDC.READ)
        fire = SD(str(fire_path), SDC.READ)
        lat = geo.select("Latitude").get()
        lon = geo.select("Longitude").get()
        rr, cc = np.where(area.inside(lon, lat, 0.16))
        if not len(rr):
            geo.end()
            fire.end()
            raise ValueError("Granule does not cover the requested area")
        r0, r1, c0, c1 = (
            int(rr.min()),
            int(rr.max() + 1),
            int(cc.min()),
            int(cc.max() + 1),
        )
        sl = np.s_[r0:r1, c0:c1]
        ri, ci = rr - r0, cc - c0
        shape = lat.shape
        if list(shape) != fire.select("fire mask").info()[2]:
            raise ValueError("Fire and geolocation arrays disagree")
        lat, lon = lat[sl][ri, ci], lon[sl][ri, ci]
        land = geo.select("Land/SeaMask")[sl][ri, ci] == 1
        geo_ok = (geo.select("gflags")[sl][ri, ci] & 0b11111100) == 0
        solar = geo.select("SolarZenith")[sl][ri, ci] * 0.01
        view = geo.select("SensorZenith")[sl][ri, ci] * 0.01
        tai = geo.select("EV center time").get()[rr // 10]
        classes = fire.select("fire mask")[sl][ri, ci]
        bowtie = np.zeros(len(rr), dtype=bool)
        geo.end()
        fire.end()
    else:
        with Dataset(geo_path) as geo, Dataset(fire_path) as fire:
            geo.set_auto_mask(False)
            fire.set_auto_mask(False)
            g = geo.groups["geolocation_data"]
            lat = g["latitude"][:]
            lon = g["longitude"][:]
            rr, cc = np.where(area.inside(lon, lat, 0.16))
            if not len(rr):
                raise ValueError("Granule does not cover requested area")
            r0, r1, c0, c1 = (
                int(rr.min()),
                int(rr.max() + 1),
                int(cc.min()),
                int(cc.max() + 1),
            )
            sl = np.s_[r0:r1, c0:c1]
            ri, ci = rr - r0, cc - c0
            shape = lat.shape
            if shape != fire["fire mask"].shape:
                raise ValueError("Fire and geolocation arrays disagree")
            lat, lon = lat[sl][ri, ci], lon[sl][ri, ci]
            land = g["land_water_mask"][sl][ri, ci] == 1
            geo_ok = (g["quality_flag"][sl][ri, ci] & 0b1111) == 0
            solar = g["solar_zenith"][sl][ri, ci]
            view = g["sensor_zenith"][sl][ri, ci]
            tai = geo.groups["scan_line_attributes"]["ev_mid_time"][:][rr // 32]
            classes = fire["fire mask"][sl][ri, ci]
            bowtie = ((fire["algorithm QA"][sl][ri, ci] >> 22) & 1) != 0
    xy = area.project(lon, lat)
    day = (
        geo_ok
        & (solar >= 0)
        & (solar < POLICY["maximum_solar_zenith_degrees"])
        & (view >= 0)
        & (view < POLICY["maximum_view_zenith_degrees"])
    )
    # Count all source confidence classes, preserving flags for later sensitivity.
    fire_pixel = (classes >= 7) & (classes <= 9)
    usable = day & land & ((classes == 5) | fire_pixel) & ~bowtie
    return {
        "xy": xy,
        "lon": lon,
        "lat": lat,
        "day": day,
        "land": land,
        "usable": usable,
        "fire": fire_pixel,
        "class": classes,
        "view": view,
        "tai": tai,
        "tree": cKDTree(xy),
        "inside": area.inside(lon, lat),
        "shape": shape,
    }


def nearest_usable(native, xy, radius):
    distances, index = native["tree"].query(xy)
    return (distances <= radius) & native["usable"][index], index


def cell_keys(lon, lat, resolution=0.25):
    # Global half-open lat/lon cells, independent of the particular case boundary.
    return np.floor((lon + 180) / resolution).astype(np.int32) * 10000 + np.floor(
        (lat + 90) / resolution
    ).astype(np.int32)


def prepare_pair(pair, step=POLICY["grid_step_km"]):
    region = next(c for c in CASES if c["id"] == pair["region"])
    area = Area(tuple(region["bbox"]))

    def path(product):
        p = pair["products"][product]
        return RAW / "swaths" / (p.get("file") or p["url"].rsplit("/", 1)[-1])

    modis = native(area, path("MYD14"), path("MYD03"), "MODIS")
    viirs = native(area, path("VNP14IMG"), path("VNP03IMG"), "VIIRS")
    grid, lon, lat = area.grid(step)
    m_ok, mi = nearest_usable(modis, grid, POLICY["nearest_distance_km"]["MODIS"])
    v_ok, vi = nearest_usable(viirs, grid, POLICY["nearest_distance_km"]["VIIRS"])
    dt = np.abs(modis["tai"][mi] - viirs["tai"][vi])
    both = m_ok & v_ok & (dt <= POLICY["maximum_scan_gap_seconds"])
    aq_land = modis["land"][mi] & modis["day"][mi]
    # Source counts for historical predictors only use MODIS information.
    mfire = modis["inside"] & modis["usable"] & modis["fire"]
    vfire = viirs["inside"] & viirs["usable"] & viirs["fire"]
    counterpart, idx = nearest_usable(
        modis, viirs["xy"][vfire], POLICY["nearest_distance_km"]["MODIS"]
    )
    counterpart &= (
        np.abs(viirs["tai"][vfire] - modis["tai"][idx])
        <= POLICY["maximum_scan_gap_seconds"]
    )
    mkeys = cell_keys(modis["lon"][mfire], modis["lat"][mfire])
    vkeys = cell_keys(
        viirs["lon"][vfire][counterpart], viirs["lat"][vfire][counterpart]
    )
    gkeys = cell_keys(lon, lat)
    rows = []
    for key in np.unique(gkeys):
        cell = gkeys == key
        area_km = cell.sum() * step**2
        marea = (cell & m_ok).sum() * step**2
        carea = (cell & both).sum() * step**2
        land = (cell & aq_land).sum() * step**2
        eligible = (
            land >= POLICY["minimum_common_area_km2"]
            and carea >= POLICY["minimum_common_area_km2"]
            and carea / max(land, 1) >= POLICY["minimum_common_land_fraction"]
            and marea / max(land, 1) >= POLICY["minimum_common_land_fraction"]
        )
        rows.append(
            {
                "region": pair["region"],
                "date": pair["date"],
                "month": pair["date"][:7],
                "pair_id": pair["id"],
                "episode_group": pair["episode_group"],
                "cell": int(key),
                "latitude": float(lat[cell].mean()),
                "longitude": float(lon[cell].mean()),
                "area_km2": float(area_km),
                "aqua_land_km2": float(land),
                "aqua_usable_km2": float(marea),
                "common_usable_km2": float(carea),
                "common_fraction": float(carea / max(land, 1)),
                "aqua_count": int((mkeys == key).sum()),
                "viirs_count": int((vkeys == key).sum()) if eligible else None,
                "aqua_view": float(modis["view"][mi][cell & m_ok].mean())
                if (cell & m_ok).any()
                else None,
                "pair_gap_seconds": float(np.median(dt[cell & both]))
                if (cell & both).any()
                else None,
                "eligible": bool(eligible),
                "coverage_method": "nearest_geolocated_pixel_equal_area_sample_v1",
                "grid_step_km": step,
                "reference_status": "sampled_pass_not_complete_month",
            }
        )
    # A sensitivity audit is required before these approximate footprints support release.
    strict_m, _ = nearest_usable(
        modis, grid, POLICY["sensitivity_distance_km"]["MODIS"]
    )
    strict_v, _ = nearest_usable(
        viirs, grid, POLICY["sensitivity_distance_km"]["VIIRS"]
    )
    strict = strict_m & strict_v & (dt <= POLICY["maximum_scan_gap_seconds"])
    audit = {
        "id": pair["id"],
        "region": pair["region"],
        "date": pair["date"],
        "bbox": region["bbox"],
        "commonAreaKM2": float(both.sum() * step**2),
        "commonFractionAOI": float(both.mean()),
        "strictCommonFractionAOI": float(strict.mean()),
        "eligibleCells": sum(r["eligible"] for r in rows),
        "requestedCells": len(rows),
        "medianPassGapSeconds": float(np.median(dt[both])) if both.any() else None,
        "products": pair["products"],
        "monthlyEligible": False,
    }
    candidate = m_ok & v_ok
    audit["candidateMedianScanGapSeconds"] = (
        float(np.median(dt[candidate])) if candidate.any() else None
    )
    audit["timingSensitivity"] = {
        "seconds": POLICY["sensitivity_scan_gap_seconds"],
        "commonAreaKM2": float(
            (candidate & (dt <= POLICY["sensitivity_scan_gap_seconds"])).sum() * step**2
        ),
        "usedForTraining": False,
    }
    return rows, audit


def existing_pilot_pairs():
    m = json.loads((WORK / "evros-swath-manifest.json").read_text())
    pairs = []
    for kind, date in [("busy", "2023-08-22"), ("quiet", "2023-08-09")]:
        products = {
            s["sensor"]: {
                "url": s["url"],
                "file": s["url"].rsplit("/", 1)[-1],
                "bytes": s["size"],
            }
            for s in m["sources"]
            if s["case"] == kind
        }
        pairs.append(
            {
                "id": "evros-" + date,
                "region": "evros",
                "date": date,
                "episode_group": "evros-2023-august",
                "products": products,
            }
        )
    return pairs


def main(manifest=None):
    started = time.perf_counter()
    manifest = manifest or ROOT / "config" / "swath-pairs.json"
    pairs = json.loads(manifest.read_text())["pairs"]
    unique = {
        (
            p["region"],
            p["date"],
            tuple(sorted(v["file"] for v in p["products"].values())),
        ): p
        for p in pairs
    }
    rows = []
    audits = []
    for pair in unique.values():
        try:
            r, a = prepare_pair(pair)
            rows.extend(r)
            audits.append(a)
            print(
                f"{pair['id']}: {a['eligibleCells']}/{a['requestedCells']} eligible cells, {a['commonFractionAOI']:.1%} common area",
                flush=True,
            )
        except ValueError as error:
            audits.append(
                {"id": pair["id"], "error": str(error), "monthlyEligible": False}
            )
            print(f"Excluded {pair['id']}: {error}", flush=True)
    df = pd.DataFrame(rows)
    con = duckdb.connect()
    con.register("paired", df)
    con.execute(
        "COPY paired TO ? (FORMAT PARQUET, COMPRESSION ZSTD)",
        [str(WORK / "paired-cells.parquet")],
    )
    con.close()
    sources = {}
    for p in unique.values():
        for product, meta in p["products"].items():
            name = meta.get("file") or meta["url"].rsplit("/", 1)[-1]
            path = RAW / "swaths" / name
            if name not in sources:
                sources[name] = {
                    "product": product,
                    "url": meta["url"],
                    "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
                    "bytes": path.stat().st_size,
                }
    result = {
        "schemaVersion": 1,
        "method": "Approximate common usable coverage from standard L2 fire masks and geolocation. Source confidence classes 7–9 retained; bowtie duplicates excluded. Daytime only; view zenith <65°; scan midpoint gaps <=300s. Sensitivity to smaller distance limits is shown.",
        "parameters": {
            "gridKM": 0.5,
            "cellsDegrees": 0.25,
            "minimumCommonLandFraction": 0.65,
            "minimumCommonKM2": 20,
            "nearestDistanceKM": {"MODIS": 2.5, "VIIRS": 1.0},
        },
        "seconds": round(time.perf_counter() - started, 3),
        "pairs": audits,
        "sources": sources,
        "monthlyRelease": False,
        "limitation": "Selected passes establish sampling feasibility, not complete monthly observation effort. Their errors cannot be quoted as monthly historical accuracy.",
    }
    write_json(PUBLIC / "coverage.json", result)
    print(
        f"Prepared {int(df.eligible.sum())}/{len(df)} eligible rows in {result['seconds']} seconds",
        flush=True,
    )


if __name__ == "__main__":
    from pathlib import Path

    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", type=Path)
    args = parser.parse_args()
    main(args.manifest)

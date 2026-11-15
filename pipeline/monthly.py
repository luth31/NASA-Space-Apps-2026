"""Experimental monthly count transfer, separate from coverage-normalized release.

Train on complete calendar years from 2013 onward. Withhold each entire year
across every region before predicting it. Pre-overlap months use the final fit.
Inputs are MODIS counts, season and location; VIIRS is only the training target.
This estimates reported counts under the archive's observing conditions, not
coverage-corrected fire activity or new pixel locations.
"""

from __future__ import annotations

import hashlib
import json
import time

import lightgbm as lgb
import numpy as np
import pandas as pd

from pipeline.build import write_json
from pipeline.catalog import PUBLIC, ROOT

METHODS = ["Seasonal scaling", "LightGBM"]


def features(rows):
    month = rows.month.str[5:7].astype(int).to_numpy()
    return np.column_stack(
        [
            np.log1p(rows.modis.to_numpy(float)),
            np.sin(month * np.pi / 6),
            np.cos(month * np.pi / 6),
            rows.latitude.to_numpy(float),
            rows.longitude.to_numpy(float),
        ]
    )


class MonthlyScaling:
    def fit(self, rows):
        self.ratio = float(rows.viirs.sum() / max(1, rows.modis.sum()))
        self.regions = {}
        for region, group in rows.groupby("region"):
            # One isolated season cannot establish a local annual transfer.
            if group.year.nunique() < 3:
                continue
            pooled = float(group.viirs.sum() / max(1, group.modis.sum()))
            prior = max(1.0, float(group.modis.mean()) * 12)
            seasonal = {}
            for month, part in group.groupby(group.month.str[5:7]):
                seasonal[month] = float(
                    (part.viirs.sum() + pooled * prior) / (part.modis.sum() + prior)
                )
            self.regions[region] = {"ratio": pooled, "months": seasonal}
        return self

    def predict(self, rows):
        return np.array(
            [
                row.modis
                * self.regions.get(row.region, {})
                .get("months", {})
                .get(
                    row.month[5:7],
                    self.regions.get(row.region, {}).get("ratio", self.ratio),
                )
                for row in rows.itertuples()
            ]
        )


def fit_models(rows):
    boosted = lgb.LGBMRegressor(
        objective="poisson",
        n_estimators=80,
        num_leaves=7,
        min_child_samples=12,
        learning_rate=0.05,
        reg_lambda=5,
        monotone_constraints=[1, 0, 0, 0, 0],
        random_state=42,
        n_jobs=2,
        verbosity=-1,
    ).fit(features(rows), rows.viirs.to_numpy(float))
    return {"Seasonal scaling": MonthlyScaling().fit(rows), "LightGBM": boosted}


def predict(models, rows):
    return {
        name: np.maximum(
            0, model.predict(features(rows) if name == "LightGBM" else rows)
        )
        for name, model in models.items()
    }


def year_folds(rows):
    for year in sorted(rows.year.unique()):
        yield year, rows[rows.year != year], rows[rows.year == year]


def score(rows, values):
    truth = rows.viirs.to_numpy(float)
    delta = np.asarray(values) - truth
    active = truth > 0
    return {
        "n": len(rows),
        "mae": round(float(np.abs(delta).mean()), 2),
        "bias": round(float(delta.mean()), 2),
        "activeMae": round(float(np.abs(delta[active]).mean()), 2)
        if active.any()
        else None,
        "baselineMae": round(
            float(np.abs(rows.modis.to_numpy(float) - truth).mean()), 2
        ),
        "observedTotal": int(truth.sum()),
    }


def build():
    start = time.perf_counter()
    manifest = json.loads((PUBLIC / "manifest.json").read_text())
    records = [
        {
            "region": c["id"],
            "latitude": c["center"][1],
            "longitude": c["center"][0],
            "year": int(m["month"][:4]),
            **{k: m[k] for k in ("month", "modis", "viirs")},
        }
        for c in manifest["cases"]
        for m in c["months"]
    ]
    rows = pd.DataFrame(records)
    paired = rows[(rows.year >= 2013) & rows.modis.notna() & rows.viirs.notna()].copy()
    if paired.year.nunique() < 4:
        raise ValueError(
            "Monthly calibration needs at least four complete overlap years"
        )
    predictions = {name: pd.Series(index=paired.index, dtype=float) for name in METHODS}
    folds = []
    for year, train, test in year_folds(paired):
        models = fit_models(train)
        result = predict(models, test)
        for name, values in result.items():
            predictions[name].loc[test.index] = values
        folds.append(
            {
                "withheldYear": int(year),
                "trainingYears": sorted(map(int, train.year.unique())),
                "testMonths": len(test),
                "scores": {n: score(test, p) for n, p in result.items()},
            }
        )
    final = fit_models(paired)
    historical = rows[rows.modis.notna() & ~rows.index.isin(paired.index)]
    history_predictions = predict(final, historical)
    model_dir = ROOT / "models" / "monthly"
    model_dir.mkdir(exist_ok=True)
    final["LightGBM"].booster_.save_model(str(model_dir / "lightgbm.txt"))
    write_json(model_dir / "seasonal-scaling.json", vars(final["Seasonal scaling"]))
    artifact = {
        "schemaVersion": 1,
        "status": "experimental",
        "unit": "estimated monthly S-NPP VIIRS reported detections",
        "sourceSha256": hashlib.sha256(
            json.dumps(records, sort_keys=True).encode()
        ).hexdigest(),
        "protocol": "Leave one entire year out across all regions; fixed parameters; no target-sensor predictors. 2012 is excluded because it is a partial VIIRS year.",
        "scope": "Archive-count calibration; cloud and overpass effort are not normalized. No new fire locations are inferred.",
        "defaultModel": "Seasonal scaling",
        "trainingMonths": len(paired),
        "years": sorted(map(int, paired.year.unique())),
        "features": [
            "log1p MODIS count",
            "month sine",
            "month cosine",
            "latitude",
            "longitude",
        ],
        "folds": folds,
        "models": [{"name": n, **score(paired, predictions[n])} for n in METHODS],
        "cases": {},
    }
    for case in manifest["cases"]:
        subset = paired[paired.region == case["id"]]
        months = []
        for idx, row in rows[rows.region == case["id"]].iterrows():
            estimates = {
                n: round(
                    float(
                        predictions[n].loc[idx]
                        if idx in paired.index
                        else history_predictions[n][historical.index.get_loc(idx)]
                    ),
                    1,
                )
                if pd.notna(row.modis)
                else None
                for n in METHODS
            }
            months.append(
                {
                    "month": row.month,
                    "estimates": estimates,
                    "evaluation": "withheld-year"
                    if idx in paired.index
                    else "historical-fit",
                }
            )
        artifact["cases"][case["id"]] = {
            "months": months,
            "overlapYears": int(subset.year.nunique()),
            "scores": {
                n: score(subset, predictions[n].loc[subset.index]) for n in METHODS
            },
        }
    artifact["seconds"] = round(time.perf_counter() - start, 3)
    write_json(PUBLIC / "monthly-harmonization.json", artifact)
    write_json(model_dir / "evaluation.json", artifact)
    print(
        json.dumps(
            {k: artifact[k] for k in ("trainingMonths", "seconds", "models")}, indent=2
        )
    )


if __name__ == "__main__":
    build()

"""Fit and audit three count-transfer candidates on real paired swath cells.

This sampled-pass experiment intentionally cannot release a monthly calendar.
Deployment requires a separately frozen monthly exposure and release assessment.
No VIIRS-derived predictors enter the feature matrix. Common area is a target
exposure, used to score counts; the historical feature path uses Aqua alone.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import time
import warnings
from datetime import UTC, datetime

import duckdb
import lightgbm as lgb
import numpy as np
from scipy.optimize import minimize
from scipy.special import gammaln

from pipeline.build import write_json
from pipeline.catalog import PUBLIC, ROOT, WORK

FEATURES = [
    "log_aqua_rate",
    "log_aqua_area",
    "aqua_view",
    "latitude",
    "month_sin",
    "month_cos",
]


def features(df):
    month = df.date.str[5:7].astype(int).to_numpy()
    area = df.aqua_usable_km2.to_numpy()
    return np.column_stack(
        [
            np.log1p(df.aqua_count.to_numpy() / area * 1000),
            np.log(area),
            df.aqua_view.to_numpy() / 65,
            df.latitude.to_numpy() / 90,
            np.sin(2 * np.pi * month / 12),
            np.cos(2 * np.pi * month / 12),
        ]
    )


class Unchanged:
    """Identity sensor-rate control at the same target scoring exposure."""

    name = "Unchanged MODIS rate"

    def fit(self, df):
        return self

    def predict_rate(self, df):
        return df.aqua_count.to_numpy() / df.aqua_usable_km2.to_numpy()

    def save(self, path):
        write_json(
            path.with_suffix(".json"),
            {
                "learned": False,
                "rate": "Aqua counts / Aqua usable km2",
                "unit": "Aqua detections per km2; no sensor-transfer adjustment",
            },
        )


class Seasonal:
    name = "Seasonal scaling"

    def fit(self, df):
        # Exposure-corrected pooled ratio, shrink by total MODIS-equivalent exposure.
        x = (
            df.aqua_count.to_numpy()
            * df.common_usable_km2.to_numpy()
            / df.aqua_usable_km2.to_numpy()
        )
        y = df.viirs_count.to_numpy()
        self.ratio = float(y.sum() / max(x.sum(), 1))
        self.months = {}
        for month in range(1, 13):
            k = df.date.str[5:7].astype(int).to_numpy() == month
            self.months[month] = float(
                (y[k].sum() + 20 * self.ratio) / (x[k].sum() + 20)
            )
        return self

    def predict_rate(self, df):
        ratios = np.array([self.months[int(x[5:7])] for x in df.date])
        return df.aqua_count.to_numpy() / df.aqua_usable_km2.to_numpy() * ratios

    def save(self, path):
        write_json(
            path.with_suffix(".json"),
            {"ratio": self.ratio, "months": self.months, "shrinkage_pseudocount": 20},
        )


class NegativeBinomial:
    name = "Negative binomial"

    def fit(self, df):
        raw = features(df)
        self.mean = raw.mean(axis=0)
        self.std = np.maximum(raw.std(axis=0), 0.01)
        x = np.column_stack([np.ones(len(df)), (raw - self.mean) / self.std])
        y = df.viirs_count.to_numpy()
        offset = np.log(df.common_usable_km2.to_numpy())
        initial = np.zeros(x.shape[1] + 1)
        initial[0] = np.log(max(y.sum(), 0.01) / df.common_usable_km2.sum())
        initial[-1] = 0

        def objective(theta):
            eta = np.clip(x @ theta[:-1] + offset, -25, 20)
            mu = np.exp(eta)
            r = np.exp(-theta[-1])
            ll = (
                gammaln(y + r)
                - gammaln(r)
                - gammaln(y + 1)
                + r * (np.log(r) - np.log(r + mu))
                + y * (eta - np.log(r + mu))
            )
            return float(-ll.mean() + 0.02 * np.square(theta[1:-1]).sum())

        fit = minimize(
            objective,
            initial,
            method="L-BFGS-B",
            bounds=[(-25, 20)] + [(-10, 10)] * (x.shape[1] - 1) + [(-8, 6)],
            options={"maxiter": 1000, "ftol": 1e-10},
        )
        if not fit.success:
            warnings.warn("Negative-binomial optimization: " + fit.message)
        self.beta = fit.x[:-1]
        self.alpha = float(np.exp(fit.x[-1]))
        self.converged = bool(fit.success)
        return self

    def predict_rate(self, df):
        x = np.column_stack([np.ones(len(df)), (features(df) - self.mean) / self.std])
        return np.exp(np.clip(x @ self.beta, -25, 20))

    def save(self, path):
        write_json(
            path.with_suffix(".json"),
            {
                "features": FEATURES,
                "mean": self.mean.tolist(),
                "std": self.std.tolist(),
                "beta": self.beta.tolist(),
                "dispersion": self.alpha,
                "converged": self.converged,
                "penalty": 0.02,
            },
        )


class Boosted:
    name = "LightGBM"

    def fit(self, df):
        self.constant = None
        if df.viirs_count.sum() == 0:
            self.constant = 0.0
            self.model = None
            return self
        dataset = lgb.Dataset(
            features(df),
            label=df.viirs_count.to_numpy() / df.common_usable_km2.to_numpy(),
            weight=df.common_usable_km2.to_numpy(),
            feature_name=FEATURES,
        )
        self.model = lgb.train(
            {
                "objective": "poisson",
                "verbosity": -1,
                "num_threads": 4,
                "seed": 2026,
                "deterministic": True,
                "force_col_wise": True,
                "learning_rate": 0.05,
                "num_leaves": 7,
                "min_data_in_leaf": 8,
                "lambda_l2": 2,
                "feature_pre_filter": False,
            },
            dataset,
            num_boost_round=120,
        )
        return self

    def predict_rate(self, df):
        return (
            np.full(len(df), self.constant)
            if self.constant is not None
            else self.model.predict(features(df))
        )

    def save(self, path):
        if self.model:
            self.model.save_model(str(path.with_suffix(".txt")))
        else:
            write_json(path.with_suffix(".json"), {"constant": self.constant})


def metrics(y, pred):
    errors = pred - y
    return {
        "mae": float(np.abs(errors).mean()),
        "bias": float(errors.mean()),
        "rmse": float(np.sqrt(np.square(errors).mean())),
        "n": len(y),
        "observedTotal": float(y.sum()),
        "predictedTotal": float(pred.sum()),
    }


def skill(mae, baseline_mae):
    return None if baseline_mae <= 0 else 100 * (1 - mae / baseline_mae)


def check_table(df):
    required = {
        "region",
        "date",
        "episode_group",
        "aqua_count",
        "viirs_count",
        "aqua_usable_km2",
        "common_usable_km2",
        "aqua_view",
        "latitude",
        "eligible",
    }
    if not required.issubset(df.columns):
        raise ValueError(
            "Missing paired coverage fields: " + str(required - set(df.columns))
        )
    valid = df[df.eligible].copy()
    if valid.empty:
        raise ValueError(
            "No coverage-eligible rows. Do not substitute zero for missing coverage."
        )
    if (valid[["aqua_usable_km2", "common_usable_km2"]] <= 0).any().any():
        raise ValueError("Eligible rows require positive observation exposure")
    if valid[["aqua_count", "viirs_count", "aqua_view"]].isna().any().any():
        raise ValueError("Eligible rows require known counts and geometry")
    if (valid[["aqua_count", "viirs_count"]] < 0).any().any():
        raise ValueError("Negative counts are invalid")
    return valid


def train(path):
    started = time.perf_counter()
    df = check_table(duckdb.read_parquet(str(path)).df())
    output = ROOT / "models"
    output.mkdir(exist_ok=True)
    # Configuration is fixed before training. The final chronological check is
    # exploratory; these hand-selected case dates are not a representative test.
    candidates = [Unchanged, Seasonal, NegativeBinomial, Boosted]
    reports = []
    predictions = []
    for constructor in candidates:
        folds = []
        for region in sorted(df.region.unique()):
            training = df[df.region != region]
            test = df[df.region == region]
            if len(training) < 8 or len(test) < 1:
                continue
            model = constructor().fit(training)
            p = model.predict_rate(test) * test.common_usable_km2.to_numpy()
            score = metrics(test.viirs_count.to_numpy(), p)
            folds.append({"region": region, **score})
            for row, pred in zip(test.itertuples(), p):
                predictions.append(
                    {
                        "model": constructor.name,
                        "holdout": "region",
                        "region": region,
                        "pair": row.pair_id,
                        "cell": row.cell,
                        "observed": float(row.viirs_count),
                        "predicted": float(pred),
                    }
                )
        chronological = None
        training = df[df.date < "2022-01-01"]
        test = df[df.date >= "2022-01-01"]
        if len(training) >= 8 and len(test):
            model = constructor().fit(training)
            p = model.predict_rate(test) * test.common_usable_km2.to_numpy()
            chronological = metrics(test.viirs_count.to_numpy(), p)
            for row, pred in zip(test.itertuples(), p):
                predictions.append(
                    {
                        "model": constructor.name,
                        "holdout": "time",
                        "region": row.region,
                        "pair": row.pair_id,
                        "cell": row.cell,
                        "observed": float(row.viirs_count),
                        "predicted": float(pred),
                    }
                )
        fit_start = time.perf_counter()
        final = constructor().fit(df)
        seconds = time.perf_counter() - fit_start
        slug = constructor.name.lower().replace(" ", "-")
        final.save(output / slug)
        artifact = next(
            f for f in output.glob(slug + ".*") if f.suffix in {".json", ".txt"}
        )
        report = {
            "artifact": artifact.name,
            "artifactSha256": hashlib.sha256(artifact.read_bytes()).hexdigest(),
            "name": constructor.name,
            "family": constructor.__name__,
            "status": "exploratory_fitted",
            "seconds": round(seconds, 4),
            "folds": folds,
            "chronological": chronological,
        }
        if folds:
            report.update(
                {
                    "mae": float(np.mean([f["mae"] for f in folds])),
                    "bias": float(np.mean([f["bias"] for f in folds])),
                    "range": [
                        min(f["mae"] for f in folds),
                        max(f["mae"] for f in folds),
                    ],
                }
            )
        reports.append(report)
    baseline = next(r for r in reports if r["name"] == "Seasonal scaling")
    for r in reports:
        r["skill"] = (
            skill(r["mae"], baseline["mae"])
            if "mae" in r and "mae" in baseline
            else None
        )
    report = {
        "schemaVersion": 1,
        "status": "exploratory",
        "trainedAt": datetime.now(UTC).isoformat(),
        "totalRows": len(df),
        "requestedRows": len(duckdb.read_parquet(str(path)).df()),
        "independentRegions": int(df.region.nunique()),
        "episodeGroups": int(df.episode_group.nunique()),
        "dates": sorted(df.date.unique().tolist()),
        "label": "Coverage-eligible sampled swath cells",
        "limitation": "The models were fitted to a small, selected set of matched daytime passes. Coverage is checked for those passes, but complete monthly sampling and historical transfer are not established. Calendar estimates and accuracy claims remain unreleased.",
        "seconds": round(time.perf_counter() - started, 3),
        "unit": "Hotspot pixels per 0.25-degree cell and paired pass (not full region-month)",
        "models": reports,
        "monthlyRelease": False,
        "provenance": {
            "inputSha256": hashlib.sha256(path.read_bytes()).hexdigest(),
            "featureNames": FEATURES,
            "predictionExposure": "Target common usable km², supplied only when scoring paired counts. Historical inference requires an independently defined reference observation effort.",
            "hyperparameters": "Fixed, no outer-fold tuning. Native model files stored in models/.",
            "zeroRows": int((df.viirs_count == 0).sum()),
            "positiveRows": int((df.viirs_count > 0).sum()),
            "selection": "Case-day feasibility sample with coverage-based eligibility, including confirmed clear-sky zeros. No positive-only row filtering.",
        },
    }
    write_json(PUBLIC / "models.json", report)
    write_json(output / "training-report.json", report)
    write_json(output / "held-out-predictions.json", predictions)
    write_json(PUBLIC / "held-out-predictions.json", predictions)
    print(
        json.dumps(
            {
                "rows": len(df),
                "regions": report["independentRegions"],
                "groups": report["episodeGroups"],
                "seconds": report["seconds"],
                "models": [
                    {
                        "name": r["name"],
                        "fitSeconds": r["seconds"],
                        "macroCellPassMAE": r.get("mae"),
                    }
                    for r in reports
                ],
                "monthlyRelease": False,
            }
        ),
        flush=True,
    )


if __name__ == "__main__":
    from pathlib import Path

    p = argparse.ArgumentParser()
    p.add_argument("--input", type=Path, default=WORK / "paired-cells.parquet")
    args = p.parse_args()
    train(args.input)

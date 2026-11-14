"""Load saved candidate models without fitting during an investigation.

This is the Aqua-only feature path. An independently established reference
area-times-pass exposure converts rate predictions to counts. VIIRS fields
are deliberately absent from the inference contract.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import lightgbm as lgb
import numpy as np
import pandas as pd

from pipeline.train import Boosted, NegativeBinomial, Seasonal, features

REQUIRED = {"date", "aqua_count", "aqua_usable_km2", "aqua_view", "latitude"}


def load_candidate(name: str, directory: Path, expected_sha256: str | None = None):
    stem = name.lower().replace(" ", "-")
    path = directory / (stem + (".txt" if name == "LightGBM" else ".json"))
    if not path.exists() and name == "LightGBM":
        path = path.with_suffix(".json")
    if (
        expected_sha256
        and hashlib.sha256(path.read_bytes()).hexdigest() != expected_sha256
    ):
        raise ValueError("The model file differs from the validated artifact")
    if name == "LightGBM":
        model = Boosted()
        model.constant = None
        if path.suffix == ".txt":
            model.model = lgb.Booster(model_file=str(path))
        else:
            model.constant = json.loads(path.read_text())["constant"]
            model.model = None
        return model
    data = json.loads(path.read_text())
    if name == "Seasonal scaling":
        model = Seasonal()
        model.ratio = data["ratio"]
        model.months = {int(k): v for k, v in data["months"].items()}
        return model
    if name == "Negative binomial":
        if not data["converged"]:
            raise ValueError("The negative-binomial optimization did not converge")
        model = NegativeBinomial()
        model.mean = np.asarray(data["mean"])
        model.std = np.asarray(data["std"])
        model.beta = np.asarray(data["beta"])
        model.alpha = data["dispersion"]
        model.converged = True
        return model
    raise ValueError("Unknown candidate: " + name)


def predict_counts(model, aqua: pd.DataFrame, reference_area_pass_km2) -> np.ndarray:
    missing = REQUIRED - set(aqua.columns)
    if missing:
        raise ValueError("Missing Aqua inputs: " + ", ".join(sorted(missing)))
    numeric = aqua[
        ["aqua_count", "aqua_usable_km2", "aqua_view", "latitude"]
    ].to_numpy()
    if not np.isfinite(numeric).all() or (aqua.aqua_usable_km2 <= 0).any():
        raise ValueError("Inference requires finite inputs and positive observed area")
    if (
        (aqua.aqua_count < 0).any()
        or (aqua.aqua_view < 0).any()
        or (aqua.aqua_view >= 65).any()
    ):
        raise ValueError(
            "Aqua counts or viewing geometry are outside the observation contract"
        )
    dates = pd.to_datetime(aqua.date, errors="raise")
    if (dates < pd.Timestamp("2002-07-01")).any():
        raise ValueError(
            "The Aqua transfer cannot be applied to the earlier Terra record"
        )
    exposure = np.asarray(reference_area_pass_km2, dtype=float)
    if (
        exposure.shape != (len(aqua),)
        or not np.isfinite(exposure).all()
        or (exposure <= 0).any()
    ):
        raise ValueError(
            "An explicit positive reference area-pass exposure is required for every row"
        )
    # Construct the predictor view before calling a model; reference observations
    # and common-mask fields cannot reach feature preparation accidentally.
    source = aqua[list(REQUIRED)].copy()
    if not np.isfinite(features(source)).all():
        raise ValueError("The historical predictor matrix contains invalid values")
    result = model.predict_rate(source) * exposure
    if not np.isfinite(result).all() or (result < 0).any():
        raise ValueError("Candidate produced invalid counts")
    return result

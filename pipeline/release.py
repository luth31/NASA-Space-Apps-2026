"""Explicit publication boundary between experimental fits and the calendar.

A model file or a high cell-pass score cannot enable a monthly product. The
validation evidence must describe the published estimand, a protocol fixed
before the final holdout, independent geography and time, and monthly error.
"""

from __future__ import annotations

import hashlib
import json
import math
from datetime import UTC, datetime
from pathlib import Path

import pandas as pd

from pipeline.build import write_json
from pipeline.catalog import PUBLIC, ROOT
from pipeline.inference import load_candidate, predict_counts
from pipeline.train import features

POLICY_PATH = ROOT / "config" / "release-policy.json"
MODEL_ORDER = ["LightGBM", "Negative binomial", "Seasonal scaling"]


def assess_candidate(evidence: dict | None, name: str, policy: dict) -> dict:
    failures = []
    if not evidence or evidence.get("unit") != policy["unit"]:
        return {
            "model": name,
            "eligible": False,
            "reasons": ["Independent region-month validation is unavailable."],
        }
    required = {
        "referenceEffortValidated": "The monthly reference observing effort has not been validated.",
        "protocolFrozenBeforeHoldout": "The final holdout protocol was not frozen before scoring.",
        "geographicHoldoutPassed": "Independent geographic transfer is unsupported.",
        "chronologicalHoldoutPassed": "Later-time transfer is unsupported.",
        "historicalInputPathScored": "The Aqua-only historical inference path has not been scored.",
    }
    failures.extend(
        reason for field, reason in required.items() if evidence.get(field) is not True
    )
    for field, threshold, label in [
        ("regions", "minimum_independent_regions", "independent regions"),
        ("months", "minimum_held_out_region_months", "held-out region-months"),
        (
            "historicalYears",
            "minimum_eligible_historical_years",
            "eligible historical years",
        ),
    ]:
        if evidence.get(field, 0) < policy[threshold]:
            failures.append("Too few " + label + ".")
    if evidence.get("sourceCollection") != policy["required_source_collection"]:
        failures.append(
            "The source collection differs from the validated Aqua collection."
        )
    if not evidence.get("modelSha256") or not evidence.get("supportedRegions"):
        failures.append(
            "The validated artifact and geographic support must be explicit."
        )
    values = {
        k: evidence.get(k)
        for k in [
            "mae",
            "bias",
            "baselineMae",
            "meanObservedCount",
            "highActivityMae",
            "highActivityMeanCount",
        ]
    }
    if not all(
        isinstance(v, (int, float)) and math.isfinite(v) for v in values.values()
    ):
        failures.append(
            "Finite monthly error, bias and high-activity scores are required."
        )
    else:
        mean = values["meanObservedCount"]
        if (
            mean <= 0
            or values["mae"] < 0
            or values["mae"] > policy["maximum_mae_fraction_of_mean_count"] * mean
        ):
            failures.append("Monthly absolute error exceeds the release tolerance.")
        if abs(values["bias"]) > policy[
            "maximum_absolute_bias_fraction_of_mean_count"
        ] * max(mean, 0):
            failures.append("Monthly signed bias exceeds the release tolerance.")
        high_mean = values["highActivityMeanCount"]
        if (
            high_mean <= 0
            or values["highActivityMae"] < 0
            or values["highActivityMae"]
            > policy["maximum_high_activity_mae_fraction_of_mean_count"] * high_mean
        ):
            failures.append("High-activity performance exceeds the release tolerance.")
        required_improvement = (
            policy["main_minimum_mae_improvement"] if name == "LightGBM" else 0
        )
        if (
            values["baselineMae"] < 0
            or (name == "LightGBM" and values["baselineMae"] == 0)
            or values["mae"] > (1 - required_improvement) * values["baselineMae"]
        ):
            failures.append(
                "The candidate does not meet its improvement requirement against seasonal scaling."
            )
    return {
        "model": name,
        "eligible": not failures,
        "reasons": failures,
        "evidence": evidence,
    }


def select_supported(
    assessments: list[dict],
    region: str,
    source_collection: str,
    feature_vector: list[float],
):
    """Try the main model, then independently qualified simpler alternatives."""
    by_name = {a["model"]: a for a in assessments}
    for name in MODEL_ORDER:
        assessment = by_name.get(name, {})
        evidence = assessment.get("evidence", {})
        if not assessment.get("eligible") or region not in evidence.get(
            "supportedRegions", []
        ):
            continue
        if source_collection != evidence.get("sourceCollection"):
            continue
        bounds = evidence.get("featureBounds", [])
        if len(bounds) != len(feature_vector) or not bounds:
            continue
        if all(
            math.isfinite(v) and low <= v <= high
            for v, (low, high) in zip(feature_vector, bounds)
        ):
            return name
    return None


def predict_month(
    payload: dict, assessments: list[dict], model_directory: Path, policy: dict
) -> dict:
    """Precompute a supported month, choosing one independently qualified model.

    Each pass-cell row carries Aqua-only predictors and its reference exposure.
    A complete observation inventory and a validated reference-effort definition
    are mandatory. Partial sampled passes cannot be promoted to a whole month.
    """
    unavailable = {
        "region": payload.get("region"),
        "month": payload.get("month"),
        "estimate": None,
        "interval": None,
        "eligible": False,
    }
    if payload.get("completeObservationInventory") is not True:
        return {**unavailable, "reason": "Monthly observation inventory is incomplete."}
    fraction = payload.get("usableAreaPassFraction", 0)
    if (
        not isinstance(fraction, (int, float))
        or not math.isfinite(fraction)
        or not 0.8 <= fraction <= 1
    ):
        return {
            **unavailable,
            "reason": "Insufficient monthly usable observation effort.",
        }
    rows = pd.DataFrame(payload.get("passes", []))
    if rows.empty or "reference_area_pass_km2" not in rows or "date" not in rows:
        return {
            **unavailable,
            "reason": "Aqua pass inputs and reference exposures are unavailable.",
        }
    if not rows.date.astype(str).str.startswith(str(payload.get("month"))).all():
        raise ValueError("Pass dates cross the requested month")
    if "passCellId" not in rows or rows.passCellId.duplicated().any():
        raise ValueError(
            "Every observation opportunity requires a unique pass-cell identifier"
        )
    vectors = features(rows)
    by_name = {a["model"]: a for a in assessments}
    for name in MODEL_ORDER:
        candidate = by_name.get(name)
        evidence = (candidate or {}).get("evidence", {})
        if not candidate or evidence.get("referenceEffortId") != payload.get(
            "referenceEffortId"
        ):
            continue
        if int(payload["month"][5:7]) not in evidence.get(
            "supportedCalendarMonths", []
        ):
            continue
        if not all(
            select_supported(
                [candidate],
                payload["region"],
                payload.get("sourceCollection", ""),
                vector.tolist(),
            )
            == name
            for vector in vectors
        ):
            continue
        model = load_candidate(name, model_directory, evidence["modelSha256"])
        values = predict_counts(model, rows, rows.reference_area_pass_km2.to_numpy())
        estimate = float(values.sum())
        interval = None
        calibration = evidence.get("intervalCalibration", {})
        radius = calibration.get("absoluteResidualQuantile")
        if (
            calibration.get("independent") is True
            and calibration.get("nominalCoverage") == 0.9
            and 0.85 <= calibration.get("observedCoverage", 0) <= 0.95
            and isinstance(radius, (int, float))
            and math.isfinite(radius)
            and radius >= 0
        ):
            interval = [max(0, estimate - radius), estimate + radius]
        return {
            **unavailable,
            "estimate": estimate,
            "interval": interval,
            "eligible": True,
            "model": name,
            "referenceEffortId": payload["referenceEffortId"],
            "unit": policy["unit"],
            "coverage": "verified_monthly_effort",
            "usableAreaPassFraction": fraction,
            "modelSha256": evidence["modelSha256"],
            "sourceCollection": payload["sourceCollection"],
        }
    return {
        **unavailable,
        "reason": "No independently qualified candidate supports these historical inputs.",
    }


def publish_assessment(monthly_input: Path | None = None):
    policy = json.loads(POLICY_PATH.read_text())
    report = json.loads((ROOT / "models" / "training-report.json").read_text())
    # The current report contains selected-pass diagnostics only. A future
    # monthly benchmark must carry its own evidence; no conversion is inferred.
    monthly = report.get("monthlyValidation", {})
    assessments = [
        assess_candidate(monthly.get(name), name, policy) for name in MODEL_ORDER
    ]
    manifest_path = PUBLIC / "manifest.json"
    manifest = json.loads(manifest_path.read_text())
    computed = []
    if monthly_input:
        inputs = json.loads(monthly_input.read_text())
        if inputs.get("schemaVersion") != 1:
            raise ValueError("Unsupported monthly input schema")
        keys = [(p["region"], p["month"]) for p in inputs["months"]]
        if len(keys) != len(set(keys)):
            raise ValueError(
                "Duplicate region-month inputs would double-count the calendar"
            )
        computed = [
            predict_month(p, assessments, ROOT / "models", policy)
            for p in inputs["months"]
        ]
    published = 0
    for case in manifest["cases"]:
        case["harmonized"] = False
        case["coverage"] = "monthly_observation_effort_unverified"
        case["supportReason"] = (
            "Selected passes were coverage-checked and candidate models were fitted. Complete monthly observing effort and historical transfer remain unverified."
        )
        for month in case["months"]:
            month.update(
                estimate=None,
                interval=None,
                eligible=False,
                status="observations_only",
                coverage="unknown",
            )
            result = next(
                (
                    p
                    for p in computed
                    if p["region"] == case["id"]
                    and p["month"] == month["month"]
                    and p["eligible"]
                ),
                None,
            )
            if result:
                years = {
                    p["month"][:4]
                    for p in computed
                    if p["region"] == case["id"]
                    and p["month"][5:7] == month["month"][5:7]
                    and p["eligible"]
                    and p["month"][:4] != month["month"][:4]
                }
                if len(years) >= policy["minimum_eligible_historical_years"]:
                    month.update(
                        {
                            k: v
                            for k, v in result.items()
                            if k not in {"region", "month"}
                        }
                    )
                    month["status"] = "validated"
                    month["historicalYears"] = sorted(years)
                    published += 1
        if any(m["eligible"] for m in case["months"]):
            case["harmonized"] = True
            case["coverage"] = "qualified_published_months"
            case["supportReason"] = (
                "Only qualifying region-months are published; scope and observation effort are attached to each estimate."
            )
    manifest["validationStatus"] = "validated" if published else "observations_only"
    write_json(manifest_path, manifest)
    release = {
        "schemaVersion": 1,
        "evaluatedAt": datetime.now(UTC).isoformat(),
        "policyVersion": policy["version"],
        "policySha256": hashlib.sha256(POLICY_PATH.read_bytes()).hexdigest(),
        "monthlyRelease": published > 0,
        "publishedEstimates": published,
        "computedMonths": computed,
        "candidateAssessments": assessments,
        "reason": "Only coverage-qualified monthly inputs with independent validation and sufficient historical comparison years can be published."
        if published
        else "The current bundle has no qualifying monthly results. Selected-pass diagnostics cannot establish monthly historical accuracy.",
        "nextEvidence": [
            "Complete monthly observation opportunity and a declared reference effort",
            "Independent monthly geography and later-time holdouts under a frozen protocol",
            "Historically available Aqua inputs in the scored inference path",
            "At least three eligible years for same-month historical comparisons",
        ],
    }
    write_json(PUBLIC / "release.json", release)
    write_json(ROOT / "models" / "release-assessment.json", release)
    print(
        f"Publication assessment: observations available; {published} historical estimates released."
    )


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--monthly-input",
        type=Path,
        help="Versioned monthly Aqua inputs with verified observation effort; sampled-pass tables are insufficient",
    )
    publish_assessment(parser.parse_args().monthly_input)

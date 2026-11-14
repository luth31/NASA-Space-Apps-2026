"""Publication behavior: fail closed, use an independently qualified fallback,
and preserve the saved-model historical inference path."""

import hashlib
import json

import numpy as np
import pandas as pd
import pytest

from pipeline.inference import load_candidate, predict_counts
from pipeline.release import (
    POLICY_PATH,
    assess_candidate,
    predict_month,
    select_supported,
)
from pipeline.train import Seasonal

POLICY = json.loads(POLICY_PATH.read_text())


def evidence():
    return {
        "unit": POLICY["unit"],
        "referenceEffortValidated": True,
        "protocolFrozenBeforeHoldout": True,
        "geographicHoldoutPassed": True,
        "chronologicalHoldoutPassed": True,
        "historicalInputPathScored": True,
        "regions": 3,
        "months": 24,
        "historicalYears": 3,
        "sourceCollection": "MYD14.061",
        "modelSha256": "test-only",
        "supportedRegions": ["fixture"],
        "supportedCalendarMonths": [8],
        "featureBounds": [[-100, 100]] * 6,
        "referenceEffortId": "test-reference",
        "mae": 10.0,
        "bias": 2.0,
        "baselineMae": 20.0,
        "meanObservedCount": 100.0,
        "highActivityMae": 20.0,
        "highActivityMeanCount": 200.0,
    }


def aqua_rows():
    return pd.DataFrame(
        {
            "date": ["2020-08-01", "2020-08-02"],
            "aqua_count": [10, 0],
            "aqua_usable_km2": [100.0, 100.0],
            "aqua_view": [20.0, 20.0],
            "latitude": [40.0, 40.0],
            "common_usable_km2": [100.0, 100.0],
            "viirs_count": [20, 0],
            "reference_area_pass_km2": [100.0, 100.0],
            "passCellId": ["test-pass-a", "test-pass-b"],
        }
    )


def test_cell_pass_success_cannot_certify_monthly_product():
    assessment = assess_candidate({"mae": 0.0, "unit": "cell-pass"}, "LightGBM", POLICY)
    assert not assessment["eligible"]
    assert "region-month" in assessment["reasons"][0]


def test_complex_model_must_add_value_even_if_baseline_is_perfect():
    e = evidence()
    e.update(mae=0.0, baselineMae=0.0)
    assert not assess_candidate(e, "LightGBM", POLICY)["eligible"]
    assert assess_candidate(e, "Negative binomial", POLICY)["eligible"]


def test_fallback_requires_its_own_geography_collection_and_feature_support():
    main = evidence()
    main["featureBounds"] = [[0, 1]] * 6
    fallback = evidence()
    assessments = [
        assess_candidate(main, "LightGBM", POLICY),
        assess_candidate(fallback, "Negative binomial", POLICY),
    ]
    assert (
        select_supported(assessments, "fixture", "MYD14.061", [2.0] * 6)
        == "Negative binomial"
    )
    assert select_supported(assessments, "unseen", "MYD14.061", [2.0] * 6) is None
    assert select_supported(assessments, "fixture", "MYD14.006", [2.0] * 6) is None
    assessments[1]["eligible"] = False
    assert select_supported(assessments, "fixture", "MYD14.061", [2.0] * 6) is None


def test_saved_model_inference_preserves_zeros_and_ignores_reference_fields(tmp_path):
    rows = aqua_rows()
    fitted = Seasonal().fit(rows)
    fitted.save(tmp_path / "seasonal-scaling")
    model = load_candidate("Seasonal scaling", tmp_path)
    expected = fitted.predict_rate(rows) * rows.reference_area_pass_km2.to_numpy()
    rows["viirs_count"] = 99999
    rows["common_usable_km2"] = 1.0
    actual = predict_counts(model, rows, rows.reference_area_pass_km2)
    np.testing.assert_allclose(actual, expected)
    assert actual[1] == 0
    with pytest.raises(ValueError, match="explicit positive"):
        predict_counts(model, rows, [0.0, 100.0])
    rows["date"] = "2001-08-01"
    with pytest.raises(ValueError, match="earlier Terra"):
        predict_counts(model, rows, [100.0, 100.0])


def test_whole_month_requires_complete_inventory_and_verified_artifact(tmp_path):
    rows = aqua_rows()
    Seasonal().fit(rows).save(tmp_path / "seasonal-scaling")
    e = evidence()
    e["modelSha256"] = hashlib.sha256(
        (tmp_path / "seasonal-scaling.json").read_bytes()
    ).hexdigest()
    assessments = [assess_candidate(e, "Seasonal scaling", POLICY)]
    payload = {
        "region": "fixture",
        "month": "2020-08",
        "sourceCollection": "MYD14.061",
        "referenceEffortId": "test-reference",
        "completeObservationInventory": False,
        "usableAreaPassFraction": 0.9,
        "passes": rows.to_dict("records"),
    }
    assert predict_month(payload, assessments, tmp_path, POLICY)["estimate"] is None
    payload["completeObservationInventory"] = True
    result = predict_month(payload, assessments, tmp_path, POLICY)
    assert result["estimate"] == pytest.approx(20.0)
    assert result["interval"] is None
    assert result["model"] == "Seasonal scaling"
    payload["passes"].append(payload["passes"][0])
    with pytest.raises(ValueError, match="unique pass-cell"):
        predict_month(payload, assessments, tmp_path, POLICY)
    payload["passes"].pop()
    (tmp_path / "seasonal-scaling.json").write_text("{}")
    with pytest.raises(ValueError, match="differs from the validated artifact"):
        predict_month(payload, assessments, tmp_path, POLICY)

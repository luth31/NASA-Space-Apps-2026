import numpy as np
import pandas as pd
import pytest
from scipy.spatial import cKDTree

from pipeline.coverage import Area, nearest_usable
from pipeline.train import Boosted, Seasonal, check_table, features, skill


def sample():
    return pd.DataFrame(
        {
            "region": ["one"] * 12,
            "date": ["2020-08-01"] * 12,
            "episode_group": ["one-august"] * 12,
            "aqua_count": [0] * 12,
            "viirs_count": [0] * 12,
            "aqua_usable_km2": [200.0] * 12,
            "common_usable_km2": [180.0] * 12,
            "aqua_view": [20.0] * 12,
            "latitude": [41.0] * 12,
            "eligible": [True] * 12,
        }
    )


def test_unknown_coverage_cannot_be_substituted_with_a_zero():
    df = sample()
    df["eligible"] = False
    with pytest.raises(ValueError, match="No coverage-eligible"):
        check_table(df)
    df["eligible"] = True
    df["viirs_count"] = np.nan
    with pytest.raises(ValueError, match="known counts"):
        check_table(df)


def test_predictors_do_not_leak_reference_sensor_or_common_mask():
    df = sample()
    before = features(df)
    df["viirs_count"] = 90000
    df["common_usable_km2"] = 1
    np.testing.assert_array_equal(features(df), before)


def test_confirmed_zero_rows_are_retained_and_models_handle_them():
    df = check_table(sample())
    assert len(df) == 12
    for model in [Boosted(), Seasonal()]:
        result = model.fit(df).predict_rate(df)
        np.testing.assert_array_equal(result, np.zeros(12))


def test_nearest_cloudy_pixel_is_not_replaced_with_a_more_distant_clear_pixel():
    source = {
        "tree": cKDTree(np.array([[0.0, 0.0], [0.3, 0.0]])),
        "usable": np.array([False, True]),
    }
    valid, index = nearest_usable(source, np.array([[0.05, 0.0]]), 1.0)
    assert index[0] == 0 and not valid[0]


def test_analysis_boundary_is_half_open_and_projection_roundtrips():
    area = Area((25.6, 40.65, 26.5, 41.4))
    assert area.inside(np.array([25.6]), np.array([40.65]))[0]
    assert not area.inside(np.array([26.5]), np.array([41.4]))[0]
    lon = np.array([25.6, 26.1, 26.5])
    lat = np.array([40.65, 41.0, 41.4])
    actual = area.inverse(area.project(lon, lat))
    np.testing.assert_allclose(actual, [lon, lat], atol=1e-9)


def test_baseline_skill_handles_zero_and_worse_models():
    assert skill(1, 0) is None
    assert skill(4, 2) == -100
    assert skill(1, 2) == 50


def test_release_input_needs_positive_exposure_and_nonnegative_counts():
    df = sample()
    df.loc[0, "common_usable_km2"] = 0
    with pytest.raises(ValueError, match="positive observation"):
        check_table(df)
    df = sample()
    df.loc[0, "viirs_count"] = -1
    with pytest.raises(ValueError, match="Negative counts"):
        check_table(df)

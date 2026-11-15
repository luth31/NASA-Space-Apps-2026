import numpy as np
import pandas as pd

from pipeline.monthly import features, year_folds, MonthlyScaling


def sample():
    return pd.DataFrame(
        [
            dict(
                region="a",
                month=f"{year}-08",
                year=year,
                modis=10.0,
                viirs=40.0,
                latitude=40.0,
                longitude=26.0,
            )
            for year in range(2013, 2019)
        ]
    )


def test_whole_year_is_withheld_across_every_region():
    rows = pd.concat([sample(), sample().assign(region="b")])
    for year, train, test in year_folds(rows):
        assert year not in train.year.values
        assert set(test.region) == {"a", "b"}
        assert set(test.year) == {year}


def test_target_cannot_change_inference_or_features():
    rows = sample()
    model = MonthlyScaling().fit(rows)
    poisoned = rows.assign(viirs=1000000)
    np.testing.assert_array_equal(features(rows), features(poisoned))
    np.testing.assert_array_equal(model.predict(rows), model.predict(poisoned))
    np.testing.assert_allclose(model.predict(rows), 40)
    assert model.predict(rows.assign(modis=0)).sum() == 0

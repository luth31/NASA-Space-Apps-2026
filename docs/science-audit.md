# Scientific claims and local test audit

Audited 15 November 2026 against the integrated checkout at `NASA-Space-Apps-2026`. This audit read the bundled observations, source summaries, saved predictions, model artifacts, and release assessment. It did not acquire new data, retrain models, regenerate outputs, or relax release gates.

## Local scientific tests

The ordinary command `.venv/bin/python -m pytest -q` initially stopped during collection with two errors: the installed LightGBM wheel could not load `@rpath/libomp.dylib`. This was an environment dependency failure, not a failed scientific assertion. `/opt/homebrew/opt/libomp/lib/libomp.dylib` was absent.

A compatible runtime already existed inside the installed scikit-learn wheel. `file` identified `.venv/lib/python3.12/site-packages/sklearn/.dylibs/libomp.dylib` as an arm64 Mach-O dynamic library. The unchanged suite passed with a command-local loader path:

```sh
cd '/Users/andramariasmarandache/Documents/Nasa Space Apps/NASA-Space-Apps-2026'
DYLD_LIBRARY_PATH="$PWD/.venv/lib/python3.12/site-packages/sklearn/.dylibs" .venv/bin/python -m pytest -q
```

**Observed result: 12 passed in 7.59 seconds.** No package installation, global environment change, system-library copy, or symlink was required. This exact workaround depends on this Python 3.12 environment and the installed scikit-learn wheel; reassess the path after changing Python or wheels. The [official LightGBM Python installation guidance](https://github.com/lightgbm-org/LightGBM/blob/main/python-package/README.rst) documents macOS's OpenMP requirement and `brew install libomp` as the usual installation method. No Homebrew installation was performed here.

The tests cover missing versus zero coverage, reference-field leakage, zero handling, nearest-pixel cloud decisions, half-open boundaries, positive exposure, saved-model Aqua-only inference, unsupported geography/collection/features, independent fallback requirements, monthly inventory, and model checksum gates. Some tests deliberately use fixtures to exercise release paths. Passing them does **not** validate the deployed monthly scientific product.

## Independently recomputed presentation findings

A separate standard-library Python audit parsed `manifest.json` and the actual observation tuples. It did not import the frontend aggregation helpers.

| Statement | Recomputed evidence | Required wording/scope |
| --- | --- | --- |
| 4,685 detections in 2023 | Sum of S-NPP VIIRS monthly source counts in Evros + Evia, across 24 source-month records | Greek study rectangles, not all of Greece; recorded thermal pixels, not unique fires |
| 89% concentrated in August | 4,178 / 4,685 × 100 = 89.178228…% | Rounded descriptive share of the selected annual record |
| 1,938 on 22 August | Direct count of VIIRS tuples with timestamp prefix `2023-08-22` | Acquisition date in UTC, not ignition date |
| 1,009 in the 00 UTC hour | Direct count of VIIRS tuples with timestamp prefix `2023-08-22T00` | 00:00–00:59 UTC acquisition window, not a one-hour fire outbreak |
| 6.6× raw VIIRS/MODIS count | 4,685 / 708 = 6.617231… | Annual raw observation counts in the same studies; not a calibrated conversion or number of fires |
| October peaks in 10 of 14 years | Full source-month availability for both studies in 2012–2025; maximum month frequencies October 10, August 2, September 1, November 1 | Timing pattern in complete monthly **source records**; observing effort remains unverified |

The August partitions reconcile exactly with the monthly summaries: Evros has 4,800 combined-sensor tuples; Evia has four. Together they contain 4,178 VIIRS and 626 MODIS observations. Every inspected August tuple is inside its own half-open study rectangle and has an August 2023 timestamp. The report's annual MODIS comparison (708) should not be confused with its August comparison (626).

The separate global file contains exactly **74,304 NOAA-20 observations**, spanning **2026-11-13 00:15 UTC through 2026-11-14 13:33 UTC**. Its row count and timestamp extremes agree with the manifest. It is a separate near-real-time snapshot, not the historical training/reference series.

## Model diagnostics and release status

MAE was recomputed from `models/held-out-predictions.json`: select `holdout=region`, compute each region's mean absolute error, then average the two regional values, matching `pipeline/train.py`. The result agrees with `web/public/data/models.json` to floating-point tolerance.

| Candidate/control | Mean regional MAE | Geographic evaluation rows |
| --- | ---: | ---: |
| Unchanged MODIS rate | 4.1250304804 | 48 |
| Seasonal scaling | 2.6203901313 | 48 |
| Negative binomial | 5.9243154744 | 48 |
| LightGBM | 11.2208318022 | 48 |

The unit is **hotspot pixels per 0.25-degree cell and paired pass**, not region-months. Each geographic evaluation has 24 rows in Evia and 24 in Evros: 42 zero targets and six positive targets. These repeated rows across candidate models must not be counted as new independent samples. The later-time diagnostic is exploratory and is not a pristine final holdout.

All four native model artifacts match their report's SHA-256. The published and `models/` training-report copies match byte for byte, as do their release assessments. These checks establish local artifact consistency, not broader model validity.

The coverage report lists ten candidate pass pairs and 48 eligible cells. Gran Chaco contributes no eligible cells: the two tested candidate median scan gaps are about 346.71 and 347.53 seconds, exceeding the 300-second tolerance. The separate 600-second sensitivity remains outside training.

All **564** published study-month rows retain `status=observations_only`, `eligible=false`, and null estimates/intervals. The release assessment has `monthlyRelease=false`, `publishedEstimates=0`, and no computed months. The app must continue to withhold harmonized estimates and gated investigation exports.

The strongest supported conclusion is: **the seasonal baseline performs best in this small selected feasibility sample; independent monthly validation is still required.** Avoid a generic accuracy percentage, claimed historical correction, prediction, operational readiness, or calibrated anomaly.

## Next scientific milestone and audit limits

Before monthly publication, freeze the reference daytime observing-effort definition and evaluation protocol; inventory complete pass opportunities and usable coverage; expand across geography, seasons, and activity levels; score the historical Aqua-only inference path on independent region-months and later time; validate support and uncertainty separately. The existing policy calls for at least three independent regions, 24 held-out region-months, and three other eligible years for same-month comparisons, alongside error/bias/support requirements. These are release requirements, not evidence that the current data pass them.

This audit did not independently recompute cloud masks or common swath coverage from protected source granules. The ignored raw cache is absent from this checkout. It checked the committed/public artifacts, their internal agreement, and the unchanged scientific unit tests. It also did not test physical-device behavior, browser rendering, or every historical monthly point partition. Those limitations should remain separate from the verified numeric findings above.

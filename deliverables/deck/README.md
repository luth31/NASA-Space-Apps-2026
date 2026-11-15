# PyroBridge — unified seven-slide source

The current presentation source is [pyrobridge-seven-slides.md](pyrobridge-seven-slides.md), with matching [speaker-notes.txt](speaker-notes.txt). It describes `feat/unified-showcase`, based on `main` at `c5b98ce`: persistent MapLibre Explore, six historical investigations with nominal Fire-Mesh comparison, the seasonal wheel plus existing experimental monthly calibration, and Models & validation.

## Imported binary artifacts

`pyrobridge-seven-slides.pptx`, `pyrobridge-seven-slides.pdf`, `slides/`, `assets/`, `sources.json` and `verification.json` were copied intact from `experience/fire-mesh`. They are **legacy feature-branch artifacts**. Their globe/atlas/Report screenshots and wording that all monthly estimates are unavailable do not represent the unified product. They have not been rebuilt or visually reverified in this worktree.

The imported `verification.json` records the earlier binary deck only; it is not a verification receipt for the new Markdown/notes or unified application. The current `speaker-notes.txt` intentionally differs from the old notes embedded in the imported PPTX. Use the Markdown/notes and live unified app for the current stage narrative; regenerate binaries with new captures before distributing a unified slide export.

## Rebuild requirements

Prepare captures from the current unified application for Dashboard, MapLibre Explore, a Fire-Mesh historical case, Fire Calendar (wheel plus chart/table), Models & validation and Data & sources. Preserve exact dates, experimental labels and NASA/map attribution. Rebuild exactly seven slides including cover/closing using the current Markdown source and inspect every rendered slide and PDF page. The older branch's `scripts/build-deck.mjs` generator is not part of this main-based port; do not assume that script is present here.

The legacy deck used Avenir Next and an editable MAE chart. Preserve license notices and source credits when rebuilding. The current Markdown table is the checked numeric source: unchanged-rate 4.125, seasonal scaling 2.620, negative binomial 5.924, LightGBM 11.221; unit hotspot pixels per 0.25-degree cell and paired pass. Monthly regional scores are a separate experiment.

## Evidence sources

- `web/public/data/manifest.json`: bundle `20261115T091758Z`; 74,304 NOAA-20 VIIRS plus 7,031 Aqua MODIS detections, 13–14 Nov 2026; six cases.
- `web/public/data/monthly-harmonization.json`: experimental, 648 overlapping region-months, 13 whole-year folds; seasonal scaling improves over raw MODIS in five of six landscapes (Evia exception).
- `web/public/data/models.json`: 48-row matched-pass pilot in two withheld regions; model MAE values above.
- `web/public/data/release.json`: `monthlyRelease: false`, zero official published estimates. Experimental archive-count calibration is separately visible and exportable; it is not normalized for cloud/overpass effort.
- `web/public/assets/assets-manifest.json` and the current map attribution: image dates, bounds, sources and credits.

No new binary-deck visual review, publication or submission is claimed.

# PyroBridge stage script

**Runtime: 3 minutes 30 seconds.** Follow the elapsed-time cues below and advance at each boundary. Speaker 1 presents Slides 1–4 (0:00–1:55). Speaker 2 presents Slides 5–7 (1:55–3:30). The spoken passages contain 453 words. Rehearse with the embedded clips already looping, and use the short pauses for the visual demonstrations.

| Slide | Speaker | Elapsed time | Duration |
| --- | --- | --- | ---: |
| 1 | 1 | 0:00–0:20 | 20 s |
| 2 | 1 | 0:20–0:55 | 35 s |
| 3 | 1 | 0:55–1:25 | 30 s |
| 4 | 1 | 1:25–1:55 | 30 s |
| 5 | 2 | 1:55–2:35 | 40 s |
| 6 | 2 | 2:35–3:05 | 30 s |
| 7 | 2 | 3:05–3:30 | 25 s |
| **Total** | | **0:00–3:30** | **210 s** |

## Slide 1 — Title and mission hook

*Speaker 1 · 0:00–0:20. Face the audience. Pause briefly after the project name.*

> PyroBridge bridges NASA's satellite fire records across twenty-six years. Emergency managers need a consistent historical context, but the instruments changed. Our offline-ready platform makes those differences visible and tests a transparent calibration before treating two sensor archives as one. Every comparison retains its provenance.

## Slide 2 — The sensor gap

*Speaker 1 · 0:20–0:55. Let the reference-mesh comparison play. Point once to the changing divider.*

> MODIS observes at roughly one kilometre, while VIIRS resolves three hundred and seventy-five metres. In our Evros case, August twenty twenty-three contains six hundred and twenty-five MODIS detections and four thousand, one hundred and seventy-five VIIRS detections: about six point seven times as many. Watch the reference meshes and divider. These are thermal pixels, not separate fires. Joining raw counts can introduce an artificial jump when VIIRS enters the record.

## Slide 3 — Global-to-local exploration

*Speaker 1 · 0:55–1:25. Follow the map zoom, then point to the local telemetry.*

> Explore connects a dated global snapshot of seventy-four thousand, three hundred and four NOAA-twenty VIIRS detections to more than twenty years of regional archives. Here we move from the global atlas into the Mediterranean and inspect local telemetry. Six landscapes include Evros, Evia, Rhodes, Manavgat, Gran Chaco and Northern Pantanal. The bundled observations remain available offline, with acquisition time and sensor identity preserved.

## Slide 4 — Seasonal fire intelligence

*Speaker 1 · 1:25–1:55. Give the wheel a brief visual beat, then turn to Speaker 2 at the end.*

> The seasonal wheel makes concentration visible. In our Evros and Evia study rectangles, August alone accounts for four thousand, one hundred and seventy-eight of the four thousand, six hundred and eighty-five Suomi-NPP detections in twenty twenty-three: approximately eighty-nine percent. October leads in nine of thirteen complete archive years. Scrubbing the calendar compares years. Switching to experimental seasonal scaling keeps observations and estimates distinct. This describes the sampled archive, not regional fire risk.

## Slide 5 — Calibration and holdout evidence

*Speaker 2 · 1:55–2:35. Point first to the matched-pass chart, then to the separate monthly table. Keep the units distinct.*

> We tested calibration in two separate experiments. In forty-eight eligible matched cell-passes, seasonal scaling achieved mean absolute error of two point six two, compared with four point one two five for unchanged MODIS: a thirty-six percent reduction. It also beat negative binomial and LightGBM. Separately, six hundred and forty-eight region-months across thirteen whole-year holdouts favoured scaling in five of six landscapes. Evia became worse, and the two South American landscapes have only one year. These are promising exploratory results, not proof of operational accuracy.

## Slide 6 — Scientific integrity and engineering

*Speaker 2 · 2:35–3:05. Emphasize the release gate. Pause briefly after “false.”*

> Scientific integrity is part of the product. The monthly release gate remains false because cloud cover and scan-angle observation effort still need normalization and independent monthly validation. Experimental calendar estimates carry explicit labels. Python and DuckDB support a reproducible pipeline pairing Aqua MODIS with Suomi-NPP VIIRS observations. Forty-six automated tests and service-worker caching support the application, while the release gate limits the scientific claim.

## Slide 7 — Next milestone, credits and disclosure

*Speaker 2 · 3:05–3:30. Leave the credits visible. Finish at 3:30 and hold for questions.*

> Our next milestone is coverage normalization and independent validation before global monthly release for emergency managers. We credit NASA Earthdata FIRMS and its MODIS and VIIRS products. We also disclose statistical and machine-learning benchmarks, plus AI-assisted software engineering. PyroBridge makes the evidence inspectable and the remaining work explicit, with source data and limitations visible to users.

## Q&A backup notes

### What exactly are the Evros counts and dates?

The 625 MODIS and 4,175 S-NPP VIIRS values are **monthly counts for August 2023 in the Evros study rectangle**. They are not verified as counts from 22 August alone. The case study and background image are dated 22 August 2023. The ratio is 4,175 ÷ 625 = 6.68, displayed as approximately 6.7×. The two sensor totals include differing acquisition opportunities. This comparison illustrates incompatibility, rather than isolating the causal effect of pixel size.

### Are detections the same as fires, burned area or risk?

No. Each record is a detected thermal pixel. Several pixels can belong to one event, and repeated overpasses can observe it again. Counts do not establish unique fires, ignition locations, fire perimeters, burned area or risk. Empty point lists do not establish that a location was observed to be fire-free. Reference meshes illustrate nominal spatial scales. They are not the exact acquisition footprints for every detection, especially off nadir.

### Is the global map live?

It displays a **pinned near-real-time snapshot**, not a continuously refreshing feed. The bundle contains 74,304 NOAA-20 VIIRS detections from **13 November 2026 at 00:15 UTC through 14 November 2026 at 13:33 UTC**. It also contains 7,031 Aqua MODIS detections filtered to that acquisition window. Historical investigations use Aqua MODIS and S-NPP VIIRS separately. Never interchange NOAA-20 and S-NPP when describing the datasets.

### What does the seasonal finding establish?

In the combined Evros and Evia rectangular study areas, August accounts for 4,178 of 4,685 S-NPP VIIRS detections in 2023, approximately 89.2%, rounded to 89%. October leads in 9 of the 13 complete archive years. The alternative 10-of-14 count includes the partial year 2012 and must not be called 14 full years. These are descriptive results from the bundled archive, not national Greek statistics or estimates of burned area. Coverage and observation effort affect the recorded counts.

### How did the matched-pass experiment avoid a circular comparison?

The selected pipeline uses historically available Aqua MODIS predictors and an independently observed S-NPP VIIRS target. Geographic folds withhold whole study regions. Ten candidate pass pairs produced **48 eligible 0.25-degree cell-pass examples across Evia and Evros**, including **42 verified zero targets and six positive targets**. The reported score is mean regional MAE in **hotspot pixels per cell and paired pass**:

| Method | MAE |
| --- | ---: |
| Unchanged MODIS rate control | 4.125 |
| Seasonal scaling | 2.620 |
| Negative binomial | 5.924 |
| LightGBM | 11.221 |

The relative error reduction is (4.125 − 2.620) ÷ 4.125 = approximately 36.5%, presented conservatively as 36%. The small, selected and predominantly zero sample supports feasibility only. It does not establish a deployable historical correction. A later-time diagnostic is exploratory. Gran Chaco passes that exceed the five-minute actual scan-time tolerance are not part of the eligible training sample.

### How does the monthly experiment differ?

It is a **separate model and evaluation artifact**, with 648 overlapping region-months and 13 whole-year folds. Each fold excludes the target year across all regions. It excludes the partial VIIRS year 2012. Scores are detections per region-month and cannot be compared directly with matched-pass MAE. Parameters were fixed before fold generation, but these exploratory folds are not a locked prospective evaluation.

| Landscape | Withheld months | Raw MODIS MAE | Seasonal MAE | LightGBM MAE |
| --- | ---: | ---: | ---: | ---: |
| Evros | 156 | 50.78 | 14.50 | 91.57 |
| Evia | 156 | 49.12 | 53.70 | 86.24 |
| Rhodes | 156 | 7.76 | 2.36 | 95.15 |
| Manavgat | 156 | 30.45 | 17.42 | 112.32 |
| Gran Chaco | 12 | 16,004.00 | 7,139.67 | 16,695.33 |
| Northern Pantanal | 12 | 10,351.83 | 1,069.44 | 10,293.18 |

Scaling improves on the raw control in five of six landscapes and worsens Evia. Gran Chaco and Northern Pantanal contribute only 2020. Holding out that year excludes both landscapes entirely, so their scores have much weaker support for transfer. Earlier historical estimates use the final model fitted to available overlap years and have no observed pre-VIIRS target for validation. An estimate never becomes an observation.

### Why did the simpler method win?

It had the lowest measured errors under these specific exploratory tests. A small or unevenly sampled training archive can support a simple seasonal correction better than a flexible model. The high LightGBM holdout errors indicate poor generalization here. These results do not establish that seasonal scaling always outperforms machine learning, and they do not supply a universal correction factor.

### What does `monthlyRelease: false` mean if the calendar shows estimates?

The validated monthly release gate remains closed. The app separately exposes an explicitly **experimental transfer of monthly reported counts**. Cloud and observation effort are not fully normalized, so it does not provide a released global harmonized climatology, reconstruct missing hotspots or forecast fires. The release assessment requires complete observation opportunities and a declared reference effort, independent monthly geography and later-time validation under a frozen protocol, historically available inputs, and sufficient eligible history. Completing cloud-mask and off-nadir scan-angle handling is necessary but not sufficient by itself to open the gate.

### What works offline and what is the engineering stack?

The frontend uses React, TypeScript and Vite, with service-worker caching for the bundled application and data. The current checkout has **46 passing automated tests: 14 pipeline and 32 frontend**. The scientific implementation uses Python, DuckDB, pandas, NumPy and the declared scientific dependencies. Source provenance, schemas, checksums, saved model artifacts and tests support reproducibility. GeoPandas is not declared in the active checkout's Python dependencies, so it is not claimed here. Offline access applies to the bundled archive and cached assets, not future downloads or an unverified emergency service guarantee.

### What NASA products and other assets should we credit?

Credit **NASA Earthdata FIRMS: MODIS Collection 6.1, Suomi-NPP VIIRS 375 m and NOAA-20 VIIRS 375 m**. The pilot's standard products include Aqua MYD14.061 with MYD03 geolocation, and S-NPP VNP14IMG.002 with VNP03IMG. Preserve the app's additional image credits for NASA GIBS daily composites, Blue Marble, NASA Earth Observatory and Landsat/USGS imagery when those assets are visible. Image dates differ from hotspot acquisition times. Full provenance remains in the data and asset manifests.

### How was AI used?

OpenAI Codex assisted with software engineering, research synthesis, tests, interface work, and presentation/script drafting. Statistical and machine-learning methods benchmark seasonal scaling against negative binomial and LightGBM. Scientific observations and scores come from the cited NASA data and reproducible pipeline, not generated observations. The team should identify who reviewed the code, design and scientific claims in its final submission.

## Presenter reference sources

These are the active checkout's traceable project sources. They are reference notes and are not part of the spoken script.

- `README.md`, sections “Experimental monthly calendar,” “Separate matched-pass benchmark,” and “Data semantics.”
- `DESIGN_REVIEW.md`, monthly calibration example for Evros August 2023.
- `docs/submission-copy.md`, seasonal concentration, NASA credits and AI/SI disclosure.
- `models/monthly/evaluation.json`, monthly evaluation protocol and regional metrics.
- `models/release-assessment.json`, current release decision and evidence requirements.
- `pyproject.toml`, declared scientific dependencies.
- `web/public/data/manifest.json` and `web/public/assets/assets-manifest.json`, pinned data and imagery provenance.

# PyroBridge stage script — unified showcase

**Target: 3 minutes 30 seconds, two speakers.** This is a rehearsal schedule, not a measured spoken runtime. The seven slides follow [the current unified Markdown deck](../deck/pyrobridge-seven-slides.md) exactly. Speaker 1 presents Slides 1–4 (0:00–1:55); Speaker 2 presents Slides 5–7 (1:55–3:30). The spoken passages contain approximately **428 words**; rehearse aloud and leave brief pauses for the indicated live controls.

Use `nasa-unified/` on `feat/unified-showcase`, based on `main` at `c5b98ce`, and the dedicated local demo at **http://127.0.0.1:5185/** when running. The [live-demo runbook](../scripts/live-demo-runbook.md) contains setup instructions. Copied PPTX/PDF/video and captures remain legacy feature-branch media; the updated Markdown and current live app define this presentation. Build/test results belong in the current project handoff rather than the spoken script.

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

## Slide 1 — Read the fire record

*Speaker 1 · 0:00–0:20. Show the current unified Dashboard.*

> PyroBridge helps people read NASA’s fire record. An analyst reviewing a difficult season needs geographic context and a longer perspective. But MODIS and VIIRS observe differently. We make those differences visible, then test a transparent calibration before treating their counts as comparable.

## Slide 2 — Explore without losing the map

*Speaker 1 · 0:20–0:55. Show MapLibre Explore; pan or zoom once and inspect one observation.*

> Explore keeps a persistent MapLibre canvas as we pan, zoom and inspect observations. Its separate global snapshot contains seventy-four thousand, three hundred and four NOAA-twenty VIIRS detections from thirteen to fourteen November twenty twenty-six. Aqua MODIS can appear alongside them. Each record retains its sensor and acquisition time. These are thermal-pixel detections, not unique fires, and acquisition time is not ignition time.

## Slide 3 — Six landscapes, two reference scales

*Speaker 1 · 0:55–1:25. Enter Investigations, open a case and move the Fire-Mesh comparison divider.*

> Investigations preserves six landscapes: Evros, Evia, Rhodes, Manavgat, Gran Chaco and Northern Pantanal. The Fire-Mesh divider compares rose MODIS markers with coral VIIRS markers. Toggleable grids show nominal one-kilometre and three-hundred-and-seventy-five-metre reference cells. They are not actual scan footprints or burned boundaries. Select an observation to inspect its original scan dimensions and source metadata over separately dated NASA context imagery.

## Slide 4 — Follow the season; keep the numbers

*Speaker 1 · 1:25–1:55. Show Fire calendar, scrub a year and select a petal; hand over to Speaker 2.*

> Fire Calendar adds a twelve-petal seasonal wheel beside the existing monthly chart and table. Scrub years, select a month and switch between observed and experimental harmonized counts. The monthly experiment uses six hundred and forty-eight overlapping region-months and thirteen whole-year folds. Seasonal scaling beats raw MODIS in five of six landscapes; Evia is the exception. The labeled CSV keeps those estimates inspectable.

## Slide 5 — Try calibration. Measure the result.

*Speaker 2 · 1:55–2:35. Show Models & validation, move the calibration slider and use Reveal VIIRS; then point to the matched-pass scores.*

> Models and validation lets you move from the MODIS reading toward a VIIRS-scale estimate, then reveal what VIIRS actually reported. The tiles illustrate counts, not predicted fire locations. A separate matched-pass pilot has forty-eight eligible rows across two held-out regions. Seasonal scaling achieves mean regional absolute error of two point six two zero, versus four point one two five for the unchanged-rate control. The unit is hotspot pixels per quarter-degree cell and paired pass. That is feasibility evidence, not validation of monthly history.

## Slide 6 — Experimental visibility, strict release gate

*Speaker 2 · 2:35–3:05. Show the official release status, then Data & sources.*

> Experimental monthly counts remain visible and exportable, but clouds and overpass effort are unnormalized. The official monthly release remains false, with zero official published estimates. The six destinations are Dashboard, Explore, Investigations, Fire calendar, Models and validation, and Data and sources. Next comes complete observation opportunity, a declared reference effort, and broader independent monthly and later-time validation under a frozen protocol.

## Slide 7 — Choose a place. Follow a season.

*Speaker 2 · 3:05–3:30. Show closing credits and face the audience.*

> NASA provides the observations. PyroBridge connects geographic investigation, seasonal inspection and measured evidence. We credit NASA FIRMS, NASA imagery and the geographic sources shown in the app. OpenAI Codex assisted with implementation and presentation; the observations and scores come from the cited data and pipeline. Choose a place. Follow a season. Test the bridge before trusting the comparison.

## Q&A backup notes

### What is in the global snapshot?

The pinned window is **13 November 2026 00:15 UTC–14 November 2026 13:33 UTC**. NOAA-20 VIIRS contributes **74,304** detections; Aqua MODIS contributes **7,031**, filtered to the same acquisition window. Both sensors total **81,335**. This is a pinned snapshot, not a continuously refreshing live feed. Historical cases use Aqua MODIS and S-NPP VIIRS separately. Preserve those platform identities.

### What does the Fire-Mesh show?

The meshes illustrate nominal **1 km MODIS / 375 m VIIRS** reference spacing. They are not measured acquisition footprints, burned area or fire perimeters. Actual scan/track dimensions remain in each original record. Differences in raw counts include sensitivity and observation-opportunity differences; the mesh does not isolate resolution as their cause. The study rectangles do not represent complete countries.

### What does the seasonal wheel establish?

It shows the selected landscape, year and count series alongside the original monthly chart/table. Petal area represents count on a labeled scale. Missing values differ from zeros. Users can inspect observed or explicitly experimental harmonized counts, scrub years and select months. The wheel describes the selected source record; it is not a fire-risk forecast or a combined-country seasonal statistic.

### How do the two calibration experiments differ?

The **monthly archive-count experiment** uses **648 overlapping region-months** and **13 whole-year folds** from 2013–2025. Seasonal scaling improves over raw MODIS MAE in **five of six** landscapes; Evia worsens (53.70 versus raw 49.12). Gran Chaco and Northern Pantanal each have only 2020, so transfer there has weaker support. Errors are detections per region-month. Earlier estimates use the final fit on the overlapping archive; retrospective folds are exploratory rather than a frozen prospective evaluation. Cloud and overpass effort are unnormalized.

The **matched-pass pilot** uses **48 eligible 0.25-degree cell-pass rows**, 24 each from Evia and Evros, with whole-region geographic holdouts: **42 zero targets and six positive targets**. Its unit is hotspot pixels per cell and paired pass.

| Matched-pass method | Mean regional MAE |
| --- | ---: |
| Unchanged MODIS rate | 4.125 |
| Seasonal scaling | 2.620 |
| Negative binomial | 5.924 |
| LightGBM | 11.221 |

These pass-level errors cannot be compared directly with monthly errors. The small, selected pilot supports feasibility, not global or operational accuracy. Its later-time check is exploratory. The interactive calibration demo uses the monthly artifact and illustrates counts, not inferred fire locations.

### What does `monthlyRelease: false` mean while estimates are visible?

The official coverage-normalized monthly product has **zero published estimates** under its release gate. A separate experimental transfer of monthly reported counts is visible and exportable with explicit labels. It does not satisfy that gate. Required evidence includes complete observing opportunities, a declared reference effort, independent monthly geography and later-time evaluation under a frozen protocol, historically available inputs and sufficient eligible history. No calibrated risk forecast is claimed.

### What should the team credit?

Credit **NASA FIRMS** historical Aqua MODIS and S-NPP VIIRS observations and the separate NOAA-20 VIIRS/Aqua global snapshot. The matched-pass standard products include Aqua `MYD14.061` with `MYD03`, and S-NPP `VNP14IMG.002` with `VNP03IMG`. Preserve visible NASA GIBS, Blue Marble, NASA Earth Observatory, Landsat/USGS and Natural Earth credits where used. Context-image dates differ from hotspot acquisition times.

OpenAI Codex assisted with implementation, tests, design, research synthesis and presentation text. Observations and model diagnostics come from the cited source data and reproducible pipeline. The final submission should identify the human reviewers and individual team contributions.

## Presenter reference sources

- [Current seven-slide source](../deck/pyrobridge-seven-slides.md) and [speaker notes](../deck/speaker-notes.txt).
- [Current submission copy](../../docs/submission-copy.md), including credits and AI disclosure.
- `README.md`, sections “Experimental monthly calendar,” “Separate matched-pass benchmark,” and “Data semantics.”
- `web/public/data/manifest.json`: bundle `20261115T091758Z`, snapshot counts/window, six historical cases.
- `web/public/data/monthly-harmonization.json`: monthly protocol and regional metrics.
- `web/public/data/models.json`: separate matched-pass sample, unit and model scores.
- `web/public/data/release.json`: official release decision and required evidence.
- `web/public/assets/assets-manifest.json` and `web/public/assets/map-context/provenance.json`: imagery dates, bounds and attribution.

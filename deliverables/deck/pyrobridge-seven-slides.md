# PyroBridge — seven-slide unified stage source

Updated 15 November 2026 for the selective showcase integration into `main`. Exactly seven slides, including cover and closing. This Markdown and `speaker-notes.txt` are the current source; the copied PPTX/PDF/PNGs have **not** been regenerated and remain legacy feature-branch artifacts. Use new unified-app captures before exporting a replacement deck. Local timing is a rehearsal target, not a verified competition rule.

---

## Slide 1 — Read the fire record

**PyroBridge**
A continuous view of fire observations.

Longer records need careful comparisons between instruments.

**Visual:** Current unified Dashboard; retain `main`'s visual identity.

**Speaker cue:** A fire analyst needs context across geography and seasons. MODIS and VIIRS differ; a longer raw count series is not automatically comparable.

---

## Slide 2 — Explore without losing the map

- Persistent MapLibre Explore canvas.
- **74,304 NOAA-20 VIIRS detections** · **13–14 Nov 2026**.
- Inspect acquisition time, sensor, confidence and source.

**Visual:** New unified MapLibre Explore capture; show NOAA-20 VIIRS selected. Do not substitute the imported unfolding-globe atlas capture.

**Speaker cue:** Window: 13 Nov 00:15 UTC–14 Nov 13:33 UTC. Aqua MODIS adds 7,031 detections; both sensors total 81,335. This global snapshot is separate from the historical investigations. Detections are thermal pixels, not unique fires.

---

## Slide 3 — Six landscapes, two reference scales

**Evros · Evia · Rhodes · Manavgat · Gran Chaco · Northern Pantanal**

Fire-Mesh comparison: **MODIS 1 km ↔ VIIRS 375 m**

Toggle the nominal reference cells. Move the sensor divider. Inspect the original record.

**Visual:** New unified case-map capture, coral MODIS and red VIIRS flames, visible comparison divider and nominal-cell label.

**Speaker cue:** The cells approximate nominal reference spacing, not actual scan footprints, fire perimeters or burned land. Original scan/track metadata remain in the observation dossier. Cases are rectangular study areas, not national totals; the NASA context image has its own date.

---

## Slide 4 — Follow the season; keep the numbers

- **Twelve-petal seasonal wheel** with year scrubbing and month inspection.
- Existing monthly comparison and experimental CSV export.
- Raw ↔ experimental harmonized counts.
- Seasonal scaling improves over raw MODIS in **5 of 6** landscapes.

**Visual:** New unified Fire Calendar capture showing the wheel and existing monthly comparison, with the experimental badge readable.

**Speaker cue:** The monthly experiment uses 648 overlap region-months and 13 whole-year folds. Evia is the exception to the improvement claim. Petal area represents the selected count on a labeled scale; missing values are not zeros. Cloud and overpass effort are not normalized. These are archive-count estimates, not inferred fire locations.

---

**Verified seasonal finding:** In the Evros and Evia study rectangles, August accounts for **4,178 of 4,685 S-NPP VIIRS detections in 2023 (89.18%)**. October is the sole busiest month in **9 of 13 complete years (2013–2025)**. The partial 2012 record is excluded. These are descriptive detection counts, not unique fires, Greek national totals or a calibrated risk measure.

## Slide 5 — Try calibration. Measure the result.

**Interactive demo:** MODIS observed → VIIRS-scale estimate → reveal VIIRS observed.

**Separate matched-pass pilot** · 48 rows · two held-out regions

| Control/model | Mean regional MAE |
| --- | ---: |
| Unchanged MODIS rate | **4.125** |
| Seasonal scaling | **2.620** |
| Negative binomial | 5.924 |
| LightGBM | 11.221 |

Unit: hotspot pixels per **0.25° cell and paired pass**.

**Visual:** New unified Models & validation capture, or a clearly labeled MAE chart using this table. Never label these pass-level results as region-month errors.

**Speaker cue:** The monthly demo and matched-pass pilot are separate experiments. The pilot contains 42 zero targets and six positive targets, 24 rows each from Evia and Evros. A simple baseline leads in this selected sample; it does not validate global or monthly performance. Tiles show counts, not predicted locations.

---

## Slide 6 — Experimental visibility, strict release gate

**Available:** Observations, six cases, seasonal wheel, experimental monthly calibration/CSV, interactive model demo, provenance.

**Official monthly release:** `monthlyRelease: false`

Next: complete observing opportunities, declared reference effort, broader independent monthly and later-time validation.

**Visual:** New unified release-status / Data & sources capture. Keep experimental labeling and official release status legible.

**Speaker cue:** The official coverage-normalized monthly series has zero published estimates. This does not hide the separate experimental archive-count panel. Clouds and overpass effort are unnormalized; no calibrated risk forecast is claimed. Navigation stays Dashboard, Explore, Investigations, Fire calendar, Models & validation, Data & sources.

---

## Slide 7 — Choose a place. Follow a season.

**Test the bridge before trusting the comparison.**

Data: NASA FIRMS
Imagery: NASA EOSDIS GIBS / Aqua MODIS; NASA/USGS where attributed
Geography: Natural Earth and the map providers credited in the app

**AI-assisted implementation and presentation; real observations and measured diagnostics.**

**Visual:** Current unified Dashboard or MapLibre view. Add verified public demo/repository/team links only when supplied; do not invent them.

**Speaker cue:** NASA provides the observations. PyroBridge connects geographic investigation, seasonal inspection and reproducible evidence. Credit the team's reviewers in the final submission. No remote publication or submission has occurred.

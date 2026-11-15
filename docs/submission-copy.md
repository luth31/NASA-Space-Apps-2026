# Submission copy — unified local draft

Prepared 15 November 2026 for `feat/unified-showcase`, based on `main` at `c5b98ce`. **Not submitted or published.** PyroBridge is the provisional project name. Final team identity and accessible project/demo URLs remain to be supplied and reviewed.

## Project title

PyroBridge — Read the fire record

## High-level summary

PyroBridge helps analysts and curious non-specialists investigate NASA's fire-observation record without confusing instrument differences with landscape change. A persistent MapLibre Explore canvas connects a recent global snapshot to six historical investigations. A Fire-Mesh slider compares MODIS and VIIRS with clearly labeled nominal reference cells. Fire Calendar combines a twelve-petal seasonal wheel with the existing monthly chart, table and experimental archive-count calibration. An interactive model demo and a separate matched-pass pilot make the evidence inspectable. Seasonal scaling improves over raw MODIS in five of six monthly landscape evaluations, while the official coverage-normalized monthly release remains gated.

## Detailed description

Our selected challenge is **Harmonization of MODIS and VIIRS Hot Spots**. A long satellite record spans instruments with different spatial resolution, sensitivities and observation opportunities. Raw detection totals alone cannot establish a consistent historical fire series.

The unified product preserves the `main` architecture and visual identity with six destinations: **Dashboard, Explore, Investigations, Fire calendar, Models & validation, and Data & sources**. Explore keeps a persistent MapLibre canvas as the user pans, zooms and inspects source observations. The global snapshot includes **74,304 NOAA-20 VIIRS detections** from **13 November 2026 00:15 UTC to 14 November 2026 13:33 UTC**. It also includes **7,031 Aqua MODIS detections**, filtered to that same acquisition window; **81,335** is the total with both sensors displayed. These recent raw observations remain separate from the historical case archive.

Investigations retains **Evros, Evia, Rhodes, Manavgat, Gran Chaco and Northern Pantanal**. Each study keeps dated NASA context imagery, sensor identity, original acquisition metadata and its rectangular analytical boundary. The Fire-Mesh visual adds rose MODIS and coral VIIRS flame markers, a sensor comparison divider and toggleable **1 km MODIS versus 375 m VIIRS nominal reference cells**. Those cells illustrate nominal spacing; they are not actual scan footprints, burned land or fire perimeters. The original scan/track dimensions remain inspectable in the observation dossier. A detection is a thermal pixel, not necessarily a unique fire; acquisition time is not ignition time.

Fire Calendar keeps the original monthly chart/table, observed-count controls, model choice and experimental CSV export, and adds a **twelve-petal seasonal wheel** with year scrubbing and month inspection. The wheel follows the selected observed or experimental count series; missing values remain different from recorded zeros. Petal area represents count on a labeled scale. Users can inspect seasonal concentration alongside the underlying monthly numbers.

The **separate experimental monthly archive-count calibration** uses **648 overlapping region-months** and **13 whole-year folds** from 2013–2025, with seasonal scaling and LightGBM. Each evaluation year is excluded across all regions; earlier estimates use a final fit to the overlapping archive. Seasonal scaling improves over the raw MODIS baseline in **five of six landscapes**, with **Evia the exception**. Errors are detections per region-month. Gran Chaco and Northern Pantanal each have only 2020; withholding that year removes both landscapes from training, so transfer there is less supported. These retrospective folds are exploratory, not a frozen prospective test. Clouds and overpass effort remain unnormalized, and the estimates do not reconstruct missing fire locations. CSV rows retain the model, experimental status, prediction provenance, regional error, coverage caveat and source hash.

Models & validation preserves the **interactive calibration demo**: choose a case, month and model, move from the original MODIS reading toward the estimated VIIRS-scale count, then reveal the actual VIIRS reading. The tiles illustrate counts, not predicted locations. The initial month follows the case date rather than model improvement; users can inspect other months and cases where calibration is worse.

The **matched-pass pilot is a different experiment**. It pins provenance, matches passes, checks common usable coverage, retains verified zero targets and uses historically available Aqua MODIS inputs. Geographic evaluation withholds whole regions. Ten candidate pass pairs yielded **48 eligible cell-pass rows** across Evia and Evros: **42 zero targets and six positive targets**. Seasonal scaling achieved mean regional MAE **2.620**, compared with **4.125** for the unchanged MODIS-rate control, **5.924** for negative binomial and **11.221** for LightGBM. The unit is **hotspot pixels per 0.25-degree cell and paired pass**, not region-month counts. This selected feasibility sample does not validate global performance, monthly history or a generic accuracy percentage. The later-time diagnostic is exploratory.

Experimental monthly estimates are visible and exportable with explicit labels. The **official coverage-normalized monthly product remains gated: `monthlyRelease: false`, with zero official published estimates**. The separate monthly experiment does not satisfy that gate. The next scientific milestone is complete observing opportunities, a declared reference effort, broader regions and seasons, and independent monthly geography/later-time holdouts under a frozen protocol. No operational forecast or calibrated risk product is claimed.

## Local artifacts and eventual links

- Current stage source: `deliverables/deck/pyrobridge-seven-slides.md`, matching speaker notes and three-/five-minute scripts; current local application in `nasa-unified/`.
- Local development demo: **http://127.0.0.1:5185/** when started by the runbook. A loopback URL is for this machine, not an accessible submission URL.
- Imported `deliverables/` PPTX, PDF, slide PNGs, captures and 29-second MP4 are **legacy feature-branch artifacts**. They have not been regenerated for the unified app; their globe/atlas/Report visuals and older wording must not be presented as current unified behavior. See `deliverables/README.md`.
- Public project/demo URLs: **not yet assigned**. Add only verified accessible links.
- Team page, registered Local Event, deadline/live-slot rules, names and individual contributions: **team to supply or verify**. Do not invent them or carry over unverified event claims.

## NASA data and imagery credits

- **NASA FIRMS**: historical Aqua MODIS and S-NPP VIIRS active-fire observations, and the separate NOAA-20 VIIRS/Aqua MODIS near-real-time global snapshot. [FIRMS](https://firms.modaps.eosdis.nasa.gov/) · [Archive](https://firms.modaps.eosdis.nasa.gov/download/). The unified bundle is `20261115T091758Z`; exact source URLs/checksums are in `web/public/data/manifest.json`. Four historical landscapes have 2003–2025 monthly archives; Gran Chaco and Northern Pantanal have 2020. Sensor availability differs.
- **NASA LAADS / Earthdata standard swaths and geolocation** for the matched-pass pilot: Aqua `MYD14.061` with `MYD03`, S-NPP `VNP14IMG.002` with `VNP03IMG`; preserve pinned inputs and checksums in `config/` and model provenance. [Aqua MODIS L2 product](https://doi.org/10.5067/MODIS/MYD14.061) · [S-NPP product](https://ladsweb.modaps.eosdis.nasa.gov/missions-and-measurements/products/VNP14IMG).
- **NASA EOSDIS GIBS / Aqua MODIS**: separately dated daily true-color regional context scenes; daily composites may mosaic passes and do not establish exact hotspot acquisition-time alignment. **NASA GIBS Blue Marble** supplies background geographic imagery for the continuous map. [GIBS documentation](https://nasa-gibs.github.io/gibs-api-docs/access-basics/). Exact dates, bounds, layers, original URLs and transformed-map provenance are in `web/public/assets/assets-manifest.json` and `web/public/assets/map-context/provenance.json`.
- **NASA Earth Observatory / Landsat 8 OLI (USGS)**: northern Evia false-color image, 10 August 2021, where used as a case card. [Image context](https://science.nasa.gov/earth/earth-observatory/fire-consumes-large-swaths-of-greece-148682/). Preserve source-specific credits for every image used in a new deck export.

## Other resources and tools

- **Natural Earth**: geographic boundaries; public domain. [Terms](https://www.naturalearthdata.com/about/terms-of-use/). Administrative boundaries do not redefine analytical study rectangles. Keep NASA GIBS and current map attribution visible.
- **Copernicus Atmosphere Monitoring Service / ECMWF** and **Copernicus Emergency Management Service**: curated contextual reports where linked by a case. Context does not establish detection-level causation or a live incident feed.
- Frontend: React, TypeScript, Vite, **MapLibre GL**, Three.js, Motion, D3 Geo, Lucide, jsPDF, Fontsource DM Sans and IBM Plex Mono; Vitest for tests. Retain actual dependency license notices and lockfile versions.
- Scientific pipeline: Python, uv, pandas, NumPy, DuckDB, SciPy, scikit-learn, LightGBM, earthaccess and declared HDF/NetCDF readers. Repository configuration and lockfiles pin the actual workflow.
- Imported legacy presentation/video tool metadata remain with those artifacts. Record the libraries, capture dates and completed visual checks when rebuilding a new unified binary deck or video; do not reuse old verification receipts as proof of a new export.

## AI disclosure

OpenAI Codex assisted with interface implementation, source synthesis, tests, design and presentation/script drafting. The final submission should identify which team members reviewed code, visual design and scientific claims. Satellite observations and measured diagnostics come from the cited data and reproducible pipeline; AI did not generate observations or model scores. No generated NASA insignia is used. Any future edited capture video should be labeled as a montage rather than a continuous interaction recording.

## Final team checks

Supply team credits and public URLs, verify actual event rules and deadlines, and ensure judges can open eventual links without an access request. Rehearse the current unified app, distinguish experimental monthly counts from the official release gate, and rebuild/review any binary presentation intended for submission. No artifact in this draft has been submitted or published.

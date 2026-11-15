# Submission copy — local draft

Prepared 15 November 2026. **Not submitted.** Final team identity, project/demo URLs and the user's approval remain required. This text intentionally does not claim a released harmonized calendar or a forecast. PyroBridge is the provisional project name.

## Project title

PyroBridge — Read the fire record

## High-level summary

PyroBridge helps fire analysts and curious non-specialists investigate NASA's satellite record of burning activity. A globe opens into a geographic atlas, while an interactive Report reveals concentration, recurring timing and differences between MODIS and VIIRS observations. A reproducible pipeline tests harmonization methods with matched passes, common-coverage checks and held-out regions. In the selected pilot, seasonal scaling outperformed more complex candidates. The app publishes real observations and keeps monthly harmonized estimates unavailable until independent validation supports them.

## Detailed description

A long fire record spans different instruments. MODIS and VIIRS differ in resolution, sensitivity and observation opportunities, so raw counts cannot by themselves establish a consistent historical series. Our selected challenge is **Harmonization of MODIS and VIIRS Hot Spots**.

We built an observation atlas and a reproducible scientific pipeline. Explore connects a global snapshot to geographic context and dated regional investigations. Users can compare the sensors and inspect original acquisition metadata. Report starts with the annual record, lets the user inspect and enter meaningful peaks, and reveals month, day and acquisition-hour detail where supported. Other lenses show repeating monthly timing, selected-period differences, sensor counts and geographic contributions. Curated NASA and Copernicus sources provide separately dated context rather than automatic incident identification.

A verified finding illustrates the workflow: in the Evros and Evia study rectangles, August contains 4,178 of 4,685 S-NPP VIIRS detections in 2023, or approximately 89%. This describes the bundled thermal-pixel record, not all of Greece, unique fires, burned area or risk. The newer global snapshot is a separate NOAA-20 VIIRS near-real-time dataset.

The scientific pipeline pins source provenance, matches satellite passes, estimates common usable coverage, retains verified zero targets and tests inference using historically available Aqua MODIS inputs. Geographic evaluation withholds entire study regions. Ten candidate pass pairs yielded 48 eligible cell-pass examples across Evia and Evros: 42 zero targets and six positive targets. Seasonal scaling had the lowest mean regional MAE, 2.620 hotspot pixels per 0.25-degree cell and paired pass; the unchanged-rate control scored 4.125, negative binomial 5.924 and LightGBM 11.221. The later-time diagnostic is exploratory. This small selected sample does not validate region-month history.

The working product supports observation exploration and descriptive historical discovery. Monthly harmonized estimates, calibrated anomalies, forecasts and gated investigation exports are not released. The next milestone is independent monthly validation with complete observation opportunities, a declared reference observing effort, broader regions/seasons and a frozen protocol. This makes the current result reviewable and the remaining scientific work concrete.

## Links to fill after authorization

- Project demo: local seven-slide deck/PDF or 29-second capture montage; accessible URL **not yet assigned**.
- Final project: local integrated repository/application; public URL **not yet assigned**.
- Team page and registered Local Event: **not inspected/verified in this session**.
- Team members and individual contributions: **user to supply or verify**; do not invent names.

## NASA data and imagery credits

- **NASA FIRMS**, the selected challenge's NASA resource: historical Aqua MODIS and S-NPP VIIRS active-fire observations, and a separate NOAA-20 VIIRS near-real-time global snapshot. [FIRMS](https://firms.modaps.eosdis.nasa.gov/) · [Archive](https://firms.modaps.eosdis.nasa.gov/download/). The pinned bundle is `20261114T172758Z`; exact source URLs/checksums are in `web/public/data/manifest.json`. Global snapshot: 74,304 observations, 13 Nov 2026 00:15 UTC through 14 Nov 2026 13:33 UTC. Regional records: Greek study areas 2003–2025; Gran Chaco 2020; sensor availability differs.
- **NASA LAADS / Earthdata standard swaths and geolocation** for the harmonization pilot: Aqua `MYD14.061` with `MYD03`, S-NPP `VNP14IMG.002` with `VNP03IMG`; pinned input inventory/configuration and checksums are in the repository. [Aqua MODIS L2 product](https://doi.org/10.5067/MODIS/MYD14.061) · [S-NPP product](https://ladsweb.modaps.eosdis.nasa.gov/missions-and-measurements/products/VNP14IMG).
- **NASA EOSDIS GIBS / Aqua MODIS** daily true-color browse imagery for Evros, 22 Aug 2023; Evia, 7 and 10 Aug 2021; Gran Chaco, 10 May 2020. These daily scenes may mosaic passes and do not identify an exact hotspot acquisition time. [GIBS](https://nasa-gibs.github.io/gibs-api-docs/access-basics/).
- **NASA Earth Observatory / Reto Stöckli, NASA GSFC**, Blue Marble: Next Generation with Topography, August 2004 monthly composite, resized as the globe texture. [Blue Marble source](https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/base-topography/).
- **NASA Earth Observatory / Landsat 8 OLI (USGS)**, northern Evia false-color image, 10 Aug 2021, resized as the case card. [Original article/image context](https://science.nasa.gov/earth/earth-observatory/fire-consumes-large-swaths-of-greece-148682/).
- Exact raster bounds, layer names, image dates and original download URLs: `web/public/assets/assets-manifest.json`.

## Other resources and tools

- **Natural Earth** geographic boundaries where included in the atlas; public domain. [Terms](https://www.naturalearthdata.com/about/terms-of-use/). Preserve the integrated boundary asset's source/version attribution; country outlines do not redefine analytical study rectangles.
- **Copernicus Atmosphere Monitoring Service / ECMWF** and **Copernicus Emergency Management Service** for curated Greek-fire reporting/context. [August 2023 context](https://atmosphere.copernicus.eu/august-wildfires-ravage-northern-central-greece). Context is not detection-level causal proof; no Copernicus live feed is claimed.
- Frontend: React, TypeScript, Vite, Three.js, Motion, Lucide, jsPDF, Fontsource DM Sans and IBM Plex Mono; Vitest for tests. Retain dependency license notices.
- Scientific pipeline: Python, uv, pandas, NumPy, DuckDB, SciPy, scikit-learn, LightGBM, earthaccess and the declared HDF/NetCDF readers. Cite the actual versions in the lockfile/environment rather than current online versions.
- Editable presentation and PDF: record final artifact-generation/render libraries used by the deck author in the delivery notes.
- Short capture montage, if rendered: macOS Swift, AVFoundation, CoreGraphics and AppKit; actual application screenshots captured through native Firefox controls. The montage is edited capture material, not a continuous interaction recording.

## AI/SI disclosure

OpenAI Codex assisted with research synthesis, interface implementation, tests, editable identity concepts, and presentation/script drafting. The final submission should identify which team members reviewed the code, visual design and scientific claims. Satellite observations and measured model diagnostics come from the cited data and reproducible pipeline; AI did not generate scientific observations or validation scores. The optional 29-second montage uses real application captures and an explicit “AI-assisted interface · real NASA observations · capture montage” label. No generated NASA logo, flag or mission identifier is used.

## Final human checks

Confirm the registered Local Event and its actual earlier cutoff/live slot. Review the current guide when reachable. Supply team credits and accessible project/demo links only after authorization. Ensure judges can open eventual links without requesting access. Keep the global seven-slide/30-second limit distinct from the local live presentation. See `docs/competition-research.md` for primary-source checks and unresolved facts.

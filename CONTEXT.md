# PyroBridge project context

PyroBridge is a NASA Space Apps 2026 fire observatory addressing the harmonization of MODIS and VIIRS hotspot records. It combines an interactive dashboard with a reproducible scientific pipeline. The intended user is a fire manager exploring reported activity, investigating a region, and eventually comparing a month with a validated historical seasonal baseline.

The current v0.1 publishes real satellite observations and exploratory model diagnostics. Historical harmonized estimates and investigation exports remain disabled because monthly validation is incomplete. Preserve that distinction in product copy, visualizations, demos, and future development.

Project snapshot: November 15, 2026. Repository: `NASA-Space-Apps-2026`. The working branch at the time of writing is `reports`.

## Product purpose and user experience

MODIS and VIIRS observe thermal activity with different detection characteristics and observation opportunities. Their raw counts cannot establish a continuous, comparable historical series by themselves. PyroBridge aims to estimate activity on a declared VIIRS-equivalent scale using historically available Aqua MODIS inputs, wherever independent validation supports that conversion.

The core experience connects a global view to a local investigation: explore a 3D hotspot globe, descend into a dated case scene, compare the satellites, inspect individual observations, and examine the longer calendar record. The interface includes time playback, a guided tour, methods, source attribution, and an interactive Report section. Motion supports exploration and must respect reduced-motion preferences.

## Current data and release status

The included public bundle lets the frontend run without Earthdata credentials or a new data download.

| Item | Bundled state |
| --- | --- |
| Observation bundle | `20261114T172758Z`, schema version 1 |
| Global snapshot | 74,304 NOAA-20 VIIRS detections; near-real-time processing |
| Global acquisition window | November 13, 2026 at 00:15 UTC through November 14, 2026 at 13:33 UTC |
| Regional historical series | Aqua MODIS and S-NPP VIIRS, retained separately |
| Scientific status | `observations_only`; exploratory fitted models |
| Monthly release | `false`; zero published estimates |

The three investigations use rectangular study boundaries, including records from neighboring countries where necessary.

| Case | Featured date | Event window | Raw calendar years |
| --- | --- | --- | --- |
| Evros | August 22, 2023 | August 19–31, 2023 | 2003–2025 |
| Evia | August 7, 2021 | August 3–14, 2021 | 2003–2025 |
| Gran Chaco | May 10, 2020 | May 5–16, 2020 | 2020 |

Report geography groups these study areas under Europe → Greece → Evros/Evia and South America → Gran Chaco. These aggregates describe the bundled studies; they do not represent complete continental or national totals. The global snapshot is a separate dataset from the regional historical record.

## Architecture and repository map

The frontend consumes generated JSON and local imagery. Data acquisition, coverage calculations, training, and release decisions run separately in Python. There is no application backend required for the dashboard.

| Location | Responsibility |
| --- | --- |
| `pipeline/catalog.py` | Case definitions, source locations, and output directories |
| `pipeline/build.py` | Public FIRMS ingestion, normalization, checksums, and dashboard partitions |
| `pipeline/acquire.py` | Authenticated acquisition of declared fire-mask and geolocation swaths |
| `pipeline/coverage.py` | Pass matching and common usable coverage |
| `pipeline/train.py` | Candidate fitting, evaluation, saved models, and diagnostic reports |
| `pipeline/inference.py` | Saved-model prediction from Aqua inputs |
| `pipeline/release.py` | Candidate qualification, fallback selection, and monthly publication gates |
| `pipeline/run.py` | Sequential batch execution, timing, memory measurement, and budget enforcement |
| `config/` | Pinned sources, swath pairs, coverage policy, and release policy |
| `models/` | Native model artifacts, held-out predictions, training report, and release assessment |
| `web/src/App.tsx` | Main navigation, exploration state, guided tour, and data loading |
| `web/src/Globe.tsx`, `RegionalMap.tsx`, `Dossier.tsx` | Global and regional exploration and observation details |
| `web/src/Calendar.tsx`, `Methods.tsx`, `Sources.tsx` | Calendar, scientific explanation, and provenance |
| `web/src/Report.tsx`, `web/src/report/` | Interactive reports, aggregation, and concept previews |
| `web/src/data.ts` | Shared TypeScript types, observation decoding, and map utilities |
| `web/src/exports.ts` | Gated CSV and PDF investigation exports |
| `web/public/data/` | Versioned public data contract and generated dashboard artifacts |
| `web/public/assets/` | Local imagery and attribution manifest |
| `web/scripts/build-offline.mjs` | Production offline bundle and service worker generation |
| `tests/` | Scientific invariants and release behavior |

The frontend uses React 19, TypeScript, Vite 7, Three.js, Motion, Lucide, and jsPDF. Regional maps use SVG; report visuals also use Canvas. Fonts are bundled locally through Fontsource. Frontend tests use Vitest.

The pipeline requires Python `>=3.12,<3.14` and uses uv, pandas, NumPy, DuckDB, SciPy, scikit-learn, LightGBM, Earthaccess, and HDF/NetCDF readers. Tests use pytest. This dataset runs on CPU; no GPU is required.

The batch flow is:

```text
Pinned public FIRMS sources → build → observation bundle
Pinned protected swaths → acquire → coverage → train → release
Generated JSON + local imagery + React source → Vite build → offline dashboard
```

Raw downloads live in `data/raw/`; intermediate artifacts live in `data/work/`. Both are ignored by Git. Public data and model artifacts are part of the reproducible project output.

## Data contract and scientific meaning

Read `web/public/data/schema.json` together with `web/src/data.ts` before changing the contract. Observations are compact tuples containing ID, longitude, latitude, UTC acquisition time, sensor, source confidence, FRP in MW, scan and track dimensions in km, processing version, day/night, and source type.

Monthly records carry separate `modis` and `viirs` counts, plus `estimate`, `interval`, `coverage`, `status`, and `eligible`. Validated records can also identify the selected model, artifact checksum, reference observing effort, unit, and historical comparison years.

The following distinctions govern interpretation:

- A hotspot is a detected thermal pixel. Counts do not measure unique fires, ignitions, fire perimeters, or burned area.
- Acquisition hours are UTC observation times, not ignition times.
- Missing data stay missing. An empty detection list cannot establish clear-sky, fire-free conditions; confirmed zeros require observation coverage evidence.
- Raw MODIS and VIIRS counts retain their sensor identity. Combining detections does not deduplicate physical fire events or create a harmonized series.
- Raw changes across periods are unadjusted for observation effort. Percentage comparisons require supported periods and a valid nonzero baseline.
- Background imagery retains its credited acquisition date as the observation selection changes. Daily composite imagery is not exact-time pass imagery.
- Model estimates, uncertainty, historical comparisons, and exports require the relevant release evidence. Do not substitute demonstration values into the public bundle.

## Modeling evidence and next scientific milestone

Ten candidate satellite-pass pairs produced 48 eligible examples across Evia and Evros: 42 verified zero target rows and six positive rows. The evaluation unit is **hotspot pixels per 0.25-degree cell and paired pass**. Geographic folds withhold entire case regions; the later-time diagnostic remains exploratory.

| Approach | Mean regional MAE in sampled cell-passes |
| --- | ---: |
| Unchanged MODIS rate control | 4.125 |
| Seasonal scaling | 2.620 |
| Negative binomial | 5.924 |
| LightGBM | 11.221 |

Seasonal scaling performs best in this selected feasibility sample. These results do not establish monthly historical accuracy or justify a generic accuracy percentage. Gran Chaco's tested passes exceed the five-minute actual scan-time tolerance; the ten-minute sensitivity analysis is separate from training.

The next scientific milestone is a monthly validation bundle:

1. Freeze the reference daytime observing effort, evaluation protocol, and release criteria before a fresh final holdout.
2. Inventory complete pass opportunities, usable area, cloud, missing coverage, failed matches, and confirmed zeros.
3. Expand across geography, seasons, and activity levels while keeping regions and fire episodes intact in evaluation splits.
4. Score the historical Aqua-only inference path and its conversion to region-months on withheld geography and later time.
5. Supply `monthlyValidation` evidence and complete monthly inputs to the release stage, with verified model checksums and eligible historical comparison years.

`config/release-policy.json` currently requires at least three independent regions, 24 held-out region-months, and three other eligible years for a same-month historical comparison. It also defines error and bias limits, validated reference effort, collection consistency, and independent interval coverage tests. The complex main model must improve MAE by at least 10% over the baseline. These are engineering requirements to freeze with the future protocol; the present experiment has not passed them. Fallback models require their own support evidence.

## Report development in progress

The working tree contains an uncommitted report direction called **A Year in Fire**. Current routing in `Report.tsx` opens it at `?tab=report` or `?tab=report&concept=journey`. It starts with the 2023 Greece study group and VIIRS, supports drilldown from years to acquisition hours, and uses a ribbon visualization with geography, satellite, and observation panels.

The existing preview gallery remains available at `?tab=report&concept=gallery`. Its nine registered concepts are `story`, `dashboard`, `timeline`, `mosaic`, `tapestry`, `sculpture`, `split`, `dispatch`, and `sequencer`. They share report aggregation and support browser-local picks and notes. Sound in the sequencer requires an explicit user action.

`use-report.ts` owns shared selection, loading, and aggregation. Reports use case-boundary observation partitions for day/hour detail; the exploration map can use wider `context/` partitions. Preserve that boundary distinction when reconciling counts.

Existing working changes when this context was written:

- Modified: `web/src/Report.tsx`, `web/src/report/report.css`, and `web/src/report/use-report.ts`.
- New, untracked: `JourneyRibbon.tsx`, `YearInFire.tsx`, `journey-data.ts`, `journey-data.test.ts`, and `journey.css` under `web/src/report/`.

Treat those files as ongoing work and preserve them. Their presence and routing do not establish that browser acceptance checks have passed. Existing handoff documentation describes the earlier gallery default; the current working source adds the journey default.

## Local setup and verification

For frontend development, use the project's documented Node.js 24 LTS setup:

```sh
cd web
npm ci
npm run dev
```

The development URL is `http://127.0.0.1:5173/`.

For a production rehearsal:

```sh
cd web
npm run build
npm run preview -- --port 4173
```

Open `http://127.0.0.1:4173/` online and wait for **OFFLINE BUNDLE READY** before disconnecting. The default cache includes the global snapshot, three featured case months, complete calendar summaries, imagery, and science reports. Other monthly point partitions need an initial online visit. A hard reload bypasses the offline cache. Development builds do not register the service worker.

To reproduce the scientific pipeline, run from the repository root:

```sh
uv sync
uv run python -c "import earthaccess; earthaccess.login(strategy='interactive', persist=True)"
uv run python -m pipeline.run
```

The login step belongs in a human terminal. Credentials remain in local Earthdata configuration outside the repository. The ignored raw-source cache occupies approximately 2.5 GB. `pipeline.run --refresh` intentionally updates the public-source lock and observation snapshot; rebuild the frontend after publishing new data artifacts.

Relevant project checks:

```sh
# Repository root
uv run pytest -q

# web/
npm test
npm run build
```

Python checks cover missing coverage, reference-data leakage, zeros, saved-model inference, support restrictions, and release gates. Frontend checks cover data decoding, aggregation, missing-versus-zero behavior, geography, time drilldown, and report layouts. UI changes also need browser checks for keyboard navigation, mobile overflow, reduced motion, observation selection, offline behavior, and gated features. The README specifies Chrome DevTools MCP for browser testing.

## Collaboration boundaries and supporting documents

Keep frontend exploration independent of Earthdata authentication and model training. Coordinate changes to the shared tuple schema, monthly units/status, reference effort, and release policy. Avoid concurrent regeneration of `web/public/data/`; commit generated artifacts with the configuration and model changes that produced them.

The project is local-only under the existing handoff instructions. Hosting, source/data uploads, and deployment require an explicit user request. Never place passwords or tokens in source files, frontend environment variables, shared fixtures, or chat.

Use [README.md](README.md) for setup and the current scientific summary, [DEVELOPMENT.md](DEVELOPMENT.md) for handoff and acceptance details, [PLAN.md](PLAN.md) for product and validation direction, and [RESEARCH.md](RESEARCH.md) for recorded challenge resources and source links. For current bundle facts, consult [manifest.json](web/public/data/manifest.json), [models.json](web/public/data/models.json), and [release.json](web/public/data/release.json). Plans and research notes include proposals; the generated release assessment determines what the current app may publish.

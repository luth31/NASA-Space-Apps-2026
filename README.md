# PyroBridge v0.1

A NASA Space Apps fire observatory with a separate, reproducible MODIS-to-VIIRS modeling pipeline.

The integrated version includes a globe that unfolds into a country atlas, analytical sectors and original detections; three dated investigations; sensor comparison; a temporal Report with concentration and recurring timing; monthly raw-count calendars; measured model diagnostics; source manifests; and an offline rehearsal bundle.

**Overnight delivery:** branch `overnight/integration`. Start with [MORNING_HANDOFF.md](MORNING_HANDOFF.md) for the running previews, seven-slide deck/PDF, 29-second demo package, pitches, brand choices, exact runbook and verification limits. PyroBridge remains provisional.

**Scientific release status:** observations are available; harmonized historical estimates and investigation exports are gated off. Ten candidate satellite-pass pairs produced 48 eligible cell-pass examples across Evia and Evros. That selected sample cannot validate a monthly historical calendar. The app makes this limitation explicit and never publishes a generic accuracy percentage.

## Run the dashboard

Use Node.js 24 LTS and npm. The included public bundle is sufficient; Earthdata credentials are not needed for frontend work.

```sh
cd web
npm ci
npm run dev
```

Open http://127.0.0.1:5173/. For the production/offline build:

```sh
npm run build
npm run preview -- --port 4173
```

Open http://127.0.0.1:4173/ while online and wait for **OFFLINE BUNDLE READY**. The approximately 20 MB rehearsal cache includes the global snapshot, featured month for all three cases, complete calendar summaries, imagery, and science reports. Other monthly point partitions are cached after viewing them online. A browser hard reload deliberately bypasses its offline cache; use normal navigation/reload when rehearsing offline.

## Reproduce the data and models

Use Python 3.12+ and [uv](https://docs.astral.sh/uv/). The full raw-source cache currently occupies approximately 2.5 GB. It is ignored by Git.

```sh
uv sync
uv run python -c "import earthaccess; earthaccess.login(strategy='interactive', persist=True)"
uv run python -m pipeline.run
```

The login command is for a human terminal. Credentials stay in the user's local Earthdata configuration, outside this repository. Never put a password or token in project files, chat, frontend environment variables, or shared developer fixtures.

The batch verifies pinned checksums, builds border-complete point partitions, acquires the 40 declared protected swath files, computes common usable coverage, fits the candidate models, and applies the release gate. The latest measured cached run took **40.7 seconds**, with **2.39 GB peak child-process RSS**, on the development machine. Candidate fitting and evaluation took **0.137 seconds** on CPU. These are cached-run measurements; the expanded 356 MB public archive initially fetched and processed in 76 seconds. No GPU is required for this dataset.

Individual stages:

```sh
uv run python -m pipeline.build
uv run python -m pipeline.acquire
uv run python -m pipeline.coverage
uv run python -m pipeline.train
uv run python -m pipeline.release
```

`pipeline.run --refresh` deliberately updates the public-source lock and creates a new observation snapshot. Protected standard swaths remain pinned by URL and SHA256. Rebuild the web app after changing the published bundle.

## Checks

```sh
uv run pytest -q
cd web
npm test
npm run build
```

Use supported browser/computer tools for app testing. The Chrome plugin had no connected browser during this run; native Firefox CUA provided the recorded browser checks. Development builds do not install a service worker. Production builds do. Readiness requires both the app-build identity and data-bundle version; use **Update and reload** when a newer installed build is offered.

## Layout

- `pipeline/`: public ingestion, authenticated swath acquisition, mask coverage, training, saved-model inference, release decisions, and batch measurements.
- `config/`: pinned NASA inputs and explicit coverage/release policies.
- `models/`: reproducible candidate artifacts, held-out predictions, scorecard, and release assessment.
- `web/src/`: React dashboard. Three.js globe; SVG regional maps; sensor-preserving clusters; local fonts and animations.
- `web/public/data/`: versioned, precomputed dashboard inputs. `schema.json` defines compact observation tuples.
- `web/public/assets/`: dated NASA imagery and attribution manifest.
- `tests/`: scientific invariants, source-independent inference, and release/fallback behavior.
- `PLAN.md` / `RESEARCH.md`: agreed product direction and primary resources.
- `DEVELOPMENT.md`: team handoff, ownership boundaries, and next scientific milestone.

## Interpreting the current benchmark

The reported unit is **hotspot pixels per 0.25-degree cell and paired pass**, not a complete region-month. Geographic folds withhold each whole case region. The later-time check is exploratory. There are 42 verified zero target rows and six positive rows; the sample is small and selected.

| Approach | Mean regional MAE in sampled cell-passes |
| --- | ---: |
| Unchanged MODIS rate control | 4.125 |
| Seasonal scaling | 2.620 |
| Negative binomial | 5.924 |
| LightGBM | 11.221 |

The seasonal baseline wins this feasibility sample. That result does not establish a deployable historical correction. Gran Chaco's tested passes exceed the five-minute actual scan-time tolerance. A ten-minute coverage sensitivity is retained separately and is not used for training.

## Data semantics

The latest pinned global snapshot contains 74,304 NOAA-20 VIIRS detections, with last acquisition on November 14, 2026 at 13:33 UTC. Historical case records keep Aqua MODIS and S-NPP VIIRS separate. Country files from both sides of each rectangular analysis boundary are included. Acquisition timestamps use UTC.

A reported hotspot is a detected thermal pixel. It is not necessarily a separate fire, ignition location, or perimeter. Empty point lists do not establish observed fire-free conditions. Original confidence, footprint, source type, processing version, and FRP units remain visible. Dated background scenes are daily composites, not exact-time pass imagery.

CSV and PDF code paths require a supported monthly comparison. CSV uses a rectangular schema with `record_type=calendar` or `observation`. PDF briefs include the map, dates, uncertainty when validated, method, and provenance. Test fixtures exercise these paths; no synthetic model values are shipped in the app.

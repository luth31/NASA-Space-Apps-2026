# PyroBridge · Mission dashboard

A NASA Space Apps fire observatory with a separate, reproducible MODIS-to-VIIRS modeling pipeline.

The dashboard opens on a rotating Earth with glowing fire signals. One continuous camera moves through continents, countries and individual satellite readings; red shading shows total reported signals, with hover summaries and a country locator. The interface uses nature greens and warm fire colors. Both MODIS and VIIRS remain selectable, with original locations and dates.

Models & validation contains the interactive MODIS → estimated VIIRS → observed VIIRS comparison. Apply calibration, reveal the withheld reading, switch landscape or model, and jump back before VIIRS. The calendar shows observed counts and experimental monthly estimates. Animated count tiles are explicitly nonspatial illustrations.

**Scientific scope:** the harmonized calendar is an experimental transfer of monthly reported counts, trained separately from the matched-pass experiment. It includes 648 overlapping region-months, 13 whole-year holdouts, two saved models, and measured regional errors. Cloud and overpass effort are not normalized; estimates do not reconstruct missing fire locations. The existing gate for a validated, coverage-normalized monthly product remains unchanged. There is no generic accuracy percentage.

## Showcase and presentation

Investigations opens with a MODIS/VIIRS comparison divider over the nominal 1 km / 375 m reference meshes. Drag the double-arrow divider directly: MODIS stays on the left, VIIRS on the right. The **Report** tab imports the Fire-Mesh branch’s seasonal story, comparisons, research drawer and gallery; its study groups are Evros, Evia and Gran Chaco. Calendar has a **Seasonal wheel** switch while retaining the monthly comparison. The original sensor records and cursor-anchored zoom remain available.

The [presentation package](deliverables/README.md) includes English/Romanian pitches, the demo runbook, seven-slide source, imported media and [submission copy](docs/submission-copy.md). Imported binary media are marked legacy. Recompute the verified August and October findings with `python3 deliverables/scripts/verify-claims.py`. See the [integration record](docs/showcase-integration.md).

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

Open http://127.0.0.1:4173/ while online. The dashboard reports **Saved for offline exploring** once the rehearsal cache is saved. It includes the global snapshot, atlas geography, featured month for all six cases, complete calendar summaries, imagery, and science reports; the build prints its measured size. Other monthly point partitions are cached after viewing them online. A browser hard reload deliberately bypasses its offline cache; use normal navigation/reload when rehearsing offline.

### Receiving preview updates

The preview server reads `web/dist`, so source edits alone do not update it. Before handing off changes, build the app, restart your local preview process, and verify the running page and its offline cache match the new build. Keep any service-manager commands in your local setup; developers may use different ports and process managers. Production tabs check for a new build every 30 seconds while visible, when returning to a tab, and when reconnecting. The new service worker saves the complete offline bundle before activating and refreshing open app tabs together. A failed download leaves the previous version usable. First visits do not reload themselves.

For a tab opened before this update mechanism existed, reload once while online to discover the updated worker. It then refreshes the tab after caching the new bundle. Closing every app tab or clearing site data is no longer part of the normal update workflow.

### Phone preview on Tailscale

Keep the private Tailscale preview enabled alongside localhost during development. Maintain a Serve mapping on your development machine so the production preview is also available from your phone. Find your hostname in `Self.DNSName` from `tailscale status --json` and drop the trailing dot. Use `tailscale serve status` to check existing mappings, then choose an unused local preview port and an unused Serve HTTPS port. The ports below are examples. [Tailscale Serve reference](https://tailscale.com/docs/reference/tailscale-cli/serve)

From `web/`, build and start the preview with your device's full DNS name as the allowed host. Use the hostname alone, without a scheme or port. [Vite host settings](https://vite.dev/config/server-options.html#server-allowedhosts)

```sh
npm run build
PYROBRIDGE_PREVIEW_PORT=4173
PYROBRIDGE_TAILSCALE_HOST=your-device.your-tailnet.ts.net
__VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS="$PYROBRIDGE_TAILSCALE_HOST" \
  npm run preview -- --port "$PYROBRIDGE_PREVIEW_PORT" --strictPort
```

In another terminal, use the same local preview port and your chosen HTTPS port.

```sh
PYROBRIDGE_PREVIEW_PORT=4173
PYROBRIDGE_SERVE_PORT=8443
tailscale serve --bg --https="$PYROBRIDGE_SERVE_PORT" "http://127.0.0.1:$PYROBRIDGE_PREVIEW_PORT"
tailscale serve status
```

Use the local URL printed by Vite on your computer and the HTTPS URL printed by Serve on your phone. The background mapping persists. The preview server must be running and the host must be awake and connected to Tailscale. Keep your hostname, ports, and any login-time service settings local to your machine.

## Reproduce the data and models

Use Python 3.12+ and [uv](https://docs.astral.sh/uv/). The full raw-source cache currently occupies approximately 2.5 GB. It is ignored by Git.

```sh
uv sync
uv run python -c "import earthaccess; earthaccess.login(strategy='interactive', persist=True)"
uv run python -m pipeline.run
```

The login command is for a human terminal. Credentials stay in the user's local Earthdata configuration, outside this repository. Never put a password or token in project files, chat, frontend environment variables, or shared developer fixtures.

The batch verifies pinned checksums, builds border-complete point partitions, acquires the 40 declared protected swath files, computes common usable coverage, fits the candidate models, applies the coverage-normalized release gate, and builds the separate experimental monthly calibration. Before the additional monthly stage, the measured cached run took **40.7 seconds**, with **2.39 GB peak child-process RSS**, on the development machine. Candidate fitting and evaluation took **0.137 seconds** on CPU. These are cached-run measurements; the expanded 356 MB public archive initially fetched and processed in 76 seconds. No GPU is required for this dataset.

Individual stages:

```sh
uv run python -m pipeline.build
uv run python -m pipeline.acquire
uv run python -m pipeline.coverage
uv run python -m pipeline.train
uv run python -m pipeline.release
uv run python -m pipeline.monthly
```

`pipeline.run --refresh` deliberately updates the public-source lock and creates a new observation snapshot. Protected standard swaths remain pinned by URL and SHA256. After updating the global snapshot, regenerate atlas assignments before rebuilding the app:

```sh
uv run --no-project --with shapely python web/scripts/build-geography.py
```

The generator pins Natural Earth v5.1.2, assigns observations using full map-unit polygons, and simplifies geometry only for display. The frontend build rejects geography generated for a different snapshot. Points outside mapped land remain available and counted.

## Reproduce map context

```sh
uv run --with pillow python web/scripts/build-map-context.py
```

This resamples the dated NASA browse scenes from EPSG:4326 to Web Mercator, pins 442 GIBS background tiles (4.45 MB), and records Natural Earth v5.1.2 place labels. Checksums, source URLs, bounds and resampling details are in `web/public/assets/map-context/provenance.json`. The global low-resolution base and backgrounds around all six cases are available offline. More detailed global background tiles require a connection. Enlarging context imagery does not create finer source resolution.

## Checks

```sh
uv run pytest -q
cd web
npm test
npm run build
```

Use Chrome DevTools MCP for browser interactions and app testing, as requested for this workspace. Development builds do not install a service worker. Production builds do.

## Layout

- `pipeline/`: public ingestion, authenticated swath acquisition, mask coverage, training, saved-model inference, release decisions, and batch measurements.
- `config/`: pinned NASA inputs and explicit coverage/release policies.
- `models/`: reproducible candidate artifacts, held-out predictions, scorecard, and release assessment.
- `web/src/orbital/`: persistent MapLibre globe/map, geographic context, dashboard story, precomputed geography, and keyboard-accessible place selection.
- `web/src/`: React dashboard and scientific views; sensor-preserving clusters, local fonts, and animations.
- `web/public/data/`: versioned, precomputed dashboard inputs. `schema.json` defines compact observation tuples.
- `web/public/assets/`: dated NASA imagery and attribution manifest.
- `tests/`: scientific invariants, source-independent inference, and release/fallback behavior.
- `PLAN.md` / `RESEARCH.md`: agreed product direction and primary resources.
- `DEVELOPMENT.md`: team handoff, ownership boundaries, and next scientific milestone.

## Experimental monthly calendar

Rebuild only this artifact with `uv run python -m pipeline.monthly`; the saved monthly archive is sufficient and no new NASA downloads are required. It fits seasonal scaling and LightGBM in about 0.3 seconds on CPU. Native fitted models and the evaluation artifact are saved in `models/monthly/`; `web/public/data/monthly-harmonization.json` is the app input and is included in the offline cache.

The fixed evaluation protocol excludes 2012 (a partial VIIRS year), withholds each entire year across all regions, and uses only MODIS, season and location as predictors. Every overlapping calendar value from 2013 onward is a held-out-year prediction. Earlier estimates come from the final fit on all overlapping years. This evaluates within-archive year transfer, not future operational or pre-VIIRS accuracy. Parameters were fixed before generating folds; these exploratory folds are not a locked prospective test.

| Landscape | Withheld months | Original MODIS MAE | Seasonal scaling MAE | LightGBM MAE |
| --- | ---: | ---: | ---: | ---: |
| Evros | 156 | 50.78 | 14.50 | 91.57 |
| Evia | 156 | 49.12 | 53.70 | 86.24 |
| Gran Chaco | 12 | 16,004.00 | 7,139.67 | 16,695.33 |
| Rhodes | 156 | 7.76 | 2.36 | 95.15 |
| Manavgat | 156 | 30.45 | 17.42 | 112.32 |
| Northern Pantanal | 12 | 10,351.83 | 1,069.44 | 10,293.18 |

Errors are detections per region-month across 648 overlap months and 13 whole-year folds. Gran Chaco and Northern Pantanal have only 2020, so excluding that year excludes both regions entirely. Their transfer is much less supported. Seasonal scaling is the transparent default; both approaches and the original MODIS baseline remain visible, including where calibration is worse. The demo is initialized to the case's dated event month, not selected by model improvement. All months, including zeros, are selectable.

Calendar CSVs include original readings, estimates, model, experimental status, withheld-year versus historical-fit provenance, local MAE, coverage caveat, and input hash. A null VIIRS value stays null; historical estimates never become observations.

## Separate matched-pass benchmark

The reported unit is **hotspot pixels per 0.25-degree cell and paired pass**, not a complete region-month. Geographic folds withhold each whole case region. The later-time check is exploratory. There are 42 verified zero target rows and six positive rows; the sample is small and selected.

| Approach | Mean regional MAE in sampled cell-passes |
| --- | ---: |
| Unchanged MODIS rate control | 4.125 |
| Seasonal scaling | 2.620 |
| Negative binomial | 5.924 |
| LightGBM | 11.221 |

The seasonal baseline wins this feasibility sample. That result does not establish a deployable historical correction. Gran Chaco's tested passes exceed the five-minute actual scan-time tolerance. A ten-minute coverage sensitivity is retained separately and is not used for training.

## Data semantics

The pinned global snapshot contains 74,304 NOAA-20 VIIRS detections and 7,031 Aqua MODIS detections from November 13, 2026 at 00:15 UTC through November 14 at 13:33 UTC. The build filters the FIRMS MODIS feed to the VIIRS snapshot's acquisition window and retains Aqua records. Explore can show either sensor or both. These are raw detections from different overpasses. Historical case records keep Aqua MODIS and S-NPP VIIRS separate. Country files from both sides of each rectangular analysis boundary are included. Acquisition timestamps use UTC.

A reported hotspot is a detected thermal pixel. It is not necessarily a separate fire, ignition location, or perimeter. Empty point lists do not establish observed fire-free conditions. Original confidence, footprint, source type, processing version, and FRP units remain visible. Dated background scenes are daily composites, not exact-time pass imagery.

The older validated investigation CSV/PDF code paths still require a supported coverage-normalized monthly comparison. The separate experimental calendar CSV above is available now. CSV uses a rectangular schema with `record_type=calendar` or `observation`. PDF briefs include the map, dates, uncertainty when validated, method, and provenance. Test fixtures exercise these paths; no synthetic model values are shipped in the app.

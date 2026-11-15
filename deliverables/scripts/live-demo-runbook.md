# Live-demo runbook — unified main-based showcase

Use only `nasa-unified/`, branch `feat/unified-showcase`, based on `main` at `c5b98ce`. Leave `NASA-Space-Apps-2026/` and the `nasa-main/` reference checkout untouched. Never merge `experience/fire-mesh`. The route below is a rehearsal plan; completed checks belong in the current verification/handoff.

## Start and prepare

1. From `nasa-unified/web/`, install dependencies if needed, run `npm run build` and `npm test`.
2. For the requested live development demo: `npm run dev -- --port 5185 --strictPort`. Open **http://127.0.0.1:5185/**. Keep this dedicated process running; do not use another agent's port or checkout.
3. A production rehearsal is separate: `npm run preview -- --port 4185 --strictPort`. Its URL is **http://127.0.0.1:4185/** after a fresh build. Offline service-worker claims apply only after the production app reports readiness and the actual route has been rehearsed. Do not claim offline readiness from the development server.
4. Use the visible navigation buttons. This main-based app does not require the feature branch's `?tab=report` or globe-to-atlas routes. Keep the console visible during rehearsal, then hide it for the pitch.
5. Keep the machine awake, connect power and silence notifications. Use the accurate seven-slide Markdown/notes. Imported PPTX/PDF, captures and MP4 are legacy feature-branch references, not a unified-build fallback recording. If live interaction fails, continue from the current script and describe the limitation.

## Stage route (about three minutes)

| Time | Operator action | What to show and say |
| --- | --- | --- |
| 0:00–0:20 | Open **Dashboard**, then **Explore**. | Name the six destinations. Explore is the persistent MapLibre canvas; pan/zoom and retain geographic context. |
| 0:20–0:40 | Inspect the global sensor controls; show NOAA-20 VIIRS, then optionally both sensors. | “74,304 NOAA-20 VIIRS detections, 13–14 Nov 2026.” Both sensors total 81,335, including 7,031 Aqua MODIS. These are raw detections from different overpasses. |
| 0:40–1:20 | Open **Investigations**, point to all six cards, enter **Evros**. Use **View entire month** if monthly context is desired, enable sensor comparison, move the divider, toggle the reference mesh and zoom for visible cell spacing. | Evros, Evia, Rhodes, Manavgat, Gran Chaco, Northern Pantanal are preserved. Rose MODIS / coral VIIRS; nominal reference cells 1 km / 375 m. “Actual scan footprints vary; these cells are not fire perimeters.” Select an observation to show original metadata. |
| 1:20–1:55 | Open **Fire calendar**. Use the seasonal-wheel panel, scrub a year, select a petal; switch **Observed counts** / **Harmonized** and keep the chart/table visible. Show the experimental model selector and CSV control. | “The twelve petals expose seasonal concentration; the original monthly values remain inspectable. The separate monthly experiment uses 648 overlap region-months and 13 whole-year folds. Seasonal scaling improves on raw MODIS in five of six landscapes; Evia is the exception.” |
| 1:55–2:35 | Open **Models & validation**. In the interactive calibration demo choose the case/month/model, move the calibration slider and use **Reveal VIIRS**. Then show the matched-pass scores. | The demo illustrates counts, not locations. The separate pilot has 48 cell-pass rows. MAE 2.620 seasonal scaling versus 4.125 unchanged-rate, in hotspot pixels per 0.25-degree cell and paired pass. Do not call these monthly errors. |
| 2:35–2:50 | Show the official release status and **Data & sources**. | Experimental monthly archive-count estimates are visible/exportable. Clouds and overpass effort are unnormalized; the official coverage-normalized product remains gated with `monthlyRelease: false` and zero official published estimates. |
| 2:50–3:00 | Return to **Dashboard** or the closing script. | “Choose a place. Follow a season. Test the bridge before trusting the comparison.” |

For a five-minute slot, inspect one original observation, compare two years on the wheel and show Evia's monthly score. Do not add a feature-branch Report page or replace MapLibre with its atlas. Avoid making a full data download part of the timed route.

## Handle a failure

- Loading failure: retry once, then continue from the script. Keep any missing-data label visible.
- Mesh invisible at a wide extent: zoom in. Do not enlarge the mesh to imply false resolution.
- Missing monthly value: describe it as unavailable, not zero. Experimental estimates remain labeled.
- Slow rendering: pause optional animation and use explicit controls. Shorten the route without changing scientific values or the release gate.
- Port conflict: choose another dedicated port with `--strictPort` and record the actual URL; do not stop another agent's server.

## Rehearsal record

Record date/time, worktree/branch/base, current revision plus uncommitted state, URL/port, browser/viewport, the six tabs exercised, console errors, mesh controls, wheel selection, CSV contents and calibration reveal. A visual check is different from a timed spoken rehearsal, offline rehearsal or physical-phone test. Report only checks actually completed.

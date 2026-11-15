# Live demo — integrated main

Use the current checkout and the ports chosen for your machine. The application keeps Dashboard/Explore, Investigations, Calendar, Models and Sources. No Report or contour-atlas route is required.

## Prepare

1. In `web/`, run `npm ci` if dependencies are missing, then `npm run build`.
2. Run `npm run preview -- --port 4173 --strictPort`, or restart your existing preview process after building. Open the actual localhost URL printed by your server. The development alternative is `npm run dev` (normally port 5173).
3. Keep your private Tailscale Serve preview enabled using your own hostname/ports; see the repository README. Share both localhost and Tailscale URLs when handing off the preview. No personal hostname is stored here.
4. Visit the required routes while online. The core bundle caches automatically; other observation months need one online visit. Confirm the app's offline-ready state before demonstrating without a connection. Development servers do not install the production service worker.
5. Keep the machine awake and silence notifications. Use `pitch-3-minutes.md` or `pitch-5-minutes.md` with `../deck/pyrobridge-seven-slides.md`. Imported binary slides/clips are marked legacy in `../README.md`; they are not evidence of this build.

## Three-minute live route

| Time | Action | Evidence |
| --- | --- | --- |
| 0:00–0:30 | Dashboard: explore the globe and select MODIS, VIIRS, then both. | Pinned 13–14 November 2026 snapshot: 7,031 Aqua MODIS + 74,304 NOAA-20 VIIRS = 81,335 detections. Not unique fires. |
| 0:30–1:10 | Investigations → Evros. Choose **Show whole month**. Move the MODIS/VIIRS comparison range control. Zoom under the cursor, toggle Resolution mesh, then inspect a reading. | August 2023: 625 MODIS / 4,175 S-NPP VIIRS detections. The fixed background is a 22 August daily composite. The grid is nominal 1 km / 375 m spacing, not actual footprints or burned area. |
| 1:10–1:50 | Calendar → Seasonal wheel. Select a petal; switch year and data source. Return to Monthly comparison. | The two views share the selected month and calibration model. Missing observations remain distinct from zeros. The combined Evros + Evia August finding is in the pitch; the wheel itself shows one selected study area. |
| 1:50–2:30 | Models: run the calibration and reveal VIIRS. | Evros August 2023: 625 → 3,359.9 estimated, versus 4,175 observed. Count tiles are nonspatial; the withheld year was excluded from training. |
| 2:30–3:00 | Sources and model evidence, then Dashboard. | 648 region-months, 13 withheld years. Seasonal scaling improves in five of six landscapes. Official coverage-normalized monthly release remains gated. |

For the five-minute version, inspect an original scan × track footprint, switch to Evia to show a worse calibration result, and download the experimental calendar CSV. Rehearse the flow aloud; these are timing targets, not verified event rules.

## Verified seasonal figure

Evros + Evia rectangular study areas: 4,178 / 4,685 S-NPP VIIRS detections in August 2023 = 89.18%. October is the sole peak in 9 of 13 full years (2013–2025). Counting 2012 yields 10/14, but 2012 is a partial observing year. Recompute with `python3 deliverables/scripts/verify-claims.py`.

## Failure fallback

Return to the last loaded route if a new month cannot load. Keep the current screenshots in `../captures/integrated/` available. Describe the limitation instead of presenting legacy footage as the current app. No submission or public deployment is part of this integration.

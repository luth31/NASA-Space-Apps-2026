# Unified showcase verification — 15 November 2026

Worktree: `nasa-unified/` · branch: `feat/unified-showcase` · base: `main` at `c5b98ce`. Changes are local and uncommitted. Development demo: <http://127.0.0.1:5185/>.

## Scope and preservation

Created the requested separate worktree through `nasa-main`. No commands modified or checked out the active `NASA-Space-Apps-2026/` checkout; no feature-branch merge was performed. Feature contents were read through `git show experience/fire-mesh:<path>` in the unified worktree, with `ls-tree` for discovery.

The final diff leaves `web/src/orbital/` (including the MapLibre Explore canvas), all public observations and calibration artifacts, the six-case catalog, investigation cards, interactive calibration demo, Methods, monthly calibration/CSV implementation, exports, pipeline, models, existing tests and global styles identical to `main`. `nasa-main` remains clean at `c5b98ce`.

- **Fire-Mesh:** nominal 1 km MODIS / 375 m VIIRS reference grids, rose/coral flames, mesh visibility and motion controls. Both sensor layers follow the existing case-map comparison divider. Geometry uses latitude-corrected longitude spacing; cells are explicitly not actual scan footprints or burned area.
- **Fire Calendar:** additive twelve-petal panel driven by the existing raw/experimental series. Year scrubbing, month keyboard selection, playback and locked/fitted scales accompany the unchanged monthly table and CSV. Area encodes count; missing values, zeros and incomplete-year concentration remain distinct.
- **Presentation:** imported deliverables and submission copy, updated three-/five-minute pitches, Romanian notes, runbook, seven-slide Markdown/speaker notes and two-speaker stage script. Imported binary slides/video/captures retain their original bytes and are labeled legacy feature-branch artifacts pending regeneration.

## Completed checks

- `npm install --no-audit --no-fund` succeeded; no lockfile changes.
- `npm run build` passed geography consistency, TypeScript, Vite and offline bundle generation (529 files / 57.1 MB). Vite reports a non-fatal large-chunk warning for the retained MapLibre atlas bundle.
- `npm test` passed **32 tests in 8 files**, including mesh scale/latitude/count conservation and seven wheel scientific/geometry checks.
- `git diff --check` passed.
- Clean in-app browser session at its default 1275 × 717 viewport rendered **Dashboard, Explore, Investigations, Fire calendar, Models & validation, Data & sources**. Captured console error list: **zero**.
- Investigations lists all six landscapes. Evros August 2023 retains **4,800 detections: 625 MODIS / 4,175 VIIRS**. Divider keyboard input moved 50 → 51. MODIS-only filtering retained only MODIS mesh/flames; hiding the mesh retained flames. Motion pause worked. Original observation dossier retained **4,612.2 MW** and **3.8 × 1.8 km** reported footprint.
- Calendar rendered twelve petals. Month selection and year scrubbing synchronized the existing selected table cell and detail. Observed mode changed the wheel series. S-NPP VIIRS in 2003 showed missing source and 0/12 available months, without a concentration claim.
- Downloaded experimental monthly CSV contained **276 Evros rows**, preserved `experimental_archive_count`, both historical-fit/withheld-year provenance, and `cloud_and_pass_effort_not_normalized`.
- Interactive calibration still applied 100% and revealed the independent VIIRS count: Evros August 2023, MODIS 625 → estimate 3,359.9 versus observed VIIRS 4,175.
- Verified bundle metrics: **74,304 NOAA-20 VIIRS + 7,031 Aqua MODIS = 81,335 total**, 13–14 November 2026; **648 overlap region-months**, seasonal improvement in **5/6** landscapes; separate **48-row** pilot MAE **2.620 vs 4.125**; official `monthlyRelease: false` unchanged.

This was a desktop browser check, not an offline/server-loss rehearsal, physical-phone test, binary-deck regeneration or timed spoken rehearsal. The development server does not install the production service worker.

## Captures and stage source

- [Fire-Mesh comparison](review/unified-fire-mesh.jpg)
- [Wheel and preserved monthly table](review/unified-calendar.jpg)
- [Live-demo runbook](../deliverables/scripts/live-demo-runbook.md)
- [Current seven-slide Markdown](../deliverables/deck/pyrobridge-seven-slides.md)
- [Two-speaker stage script](../deliverables/final/STAGE_SCRIPT.md)

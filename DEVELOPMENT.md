# First-version handoff

## Stable boundary for parallel development

The frontend reads generated JSON and local imagery. It never authenticates to Earthdata or trains a model. The scientific pipeline writes those artifacts independently. Start frontend work with the included bundle; a complete raw-data download is unnecessary.

| Workstream | Main ownership | Coordinate before changing |
| --- | --- | --- |
| Data and modeling | `pipeline/`, `config/`, `models/`, `tests/` | Tuple schema, month status/units, reference effort, release policy |
| Dashboard and motion | `web/src/`, `web/public/assets/` | Shared types in `web/src/data.ts`, global navigation/state, asset attribution |
| Build and verification | `web/scripts/`, build configuration, browser QA, documentation | Offline cache scope, data-bundle generation |

Use separate branches/worktrees once the team setup is chosen. Assign one integrator to shared schema and release changes. Do not have multiple developers regenerate `web/public/data/` concurrently. Commit generated artifacts with the configuration and model changes that produced them.

## What is ready in v0.1

- Real global and regional observations; cross-border counts; original source metadata and checksum manifests.
- Globe clustering, regional clustering for dense months, point selection, hover details, paginated observation lists, wider boundaries with a pinned point, and day/month playback.
- Dated satellite comparison with common camera/divider and explicit acquisition-time caveat.
- Raw-count calendar with stable color scale, sensor toggle, case selection, keyboard navigation, and honest missing/coverage states.
- Guided exploration using normal controls; pause, resume, step selection, replay, and reduced motion.
- Three fitted harmonization candidates plus an unchanged-rate control, geographic and exploratory chronological diagnostics, and native saved models.
- Aqua-only saved-model inference; candidate-specific geography/feature support; independently qualified fallback selection; monthly publication and export gates.
- Local production build and offline rehearsal cache; credential-free frontend.

## Scientific work that remains deliberately unreleased

The current sample has 48 eligible cell-passes across two Greek case regions. It cannot supply complete monthly effort, broad geographic transfer, calibrated intervals, or a defensible historical accuracy claim. Harmonized values, same-month historical comparison, and investigation exports remain unavailable in the public bundle.

The next data milestone is a **monthly validation bundle**, not a larger neural network:

1. Freeze a reference daytime observing-effort definition and evaluation protocol before a fresh final holdout.
2. Inventory complete pass opportunities; preserve clear-sky zeros, cloud, missing coverage, and failed acquisition matching. Keep standard Aqua C6.1 and S-NPP C2 inputs consistent.
3. Expand geographically and seasonally, including independent high-activity and quiet periods. Keep regions/fire episodes intact in splits.
4. Validate the historical Aqua-only path and conversion to region-months on withheld geography and later time. Compare all candidates on identical eligible rows.
5. Populate `monthlyValidation` evidence and complete monthly input rows for the release stage. Meet the explicit policy, verify the selected model SHA, and include only months with at least three other eligible same-month years.

`config/release-policy.json` contains conservative engineering thresholds for the future monthly protocol. They are not evidence that the present experiment passed. Revisit and freeze them before collecting/scoring that final benchmark; do not tune them to a reported final result. The current later-time diagnostic remains exploratory and must not be relabeled as a pristine final test.

Optional hurdle and active-cell-day experiments remain planned. The latter has a different unit and must not be substituted silently for hotspot counts.

## Practical boundaries

- The raw regional calendar currently spans 2003–2025 for Greece and 2020 for Gran Chaco. The global snapshot is separate and newer.
- Observation detail is global. Historical calibration is case-study research; no global historical claim is made.
- Background imagery stays at its credited date while the observation date changes. Both are displayed.
- Common coverage uses an approximate nearest-geolocated-pixel calculation and records tighter-distance and timing sensitivity. A footprint/coverage review is required before monthly release.
- The default offline bundle covers presentation routes. Previously unopened historical point partitions require a connection.
- This project is local-only. Do not register hosting, upload source or data, or deploy without an explicit user request.

## Rehearsal and acceptance

### Pattern discovery and direct interaction

The Report now emphasizes concentration, repeating timing, and measurement differences instead of repeating Explore’s headline fire count. Its three lenses are The season, Across years, and Two satellites. The default Greek study-area VIIRS view has 89% of 2023 detections in August; the recurring-peak analysis finds October as a busiest month in 10 of 14 years with complete monthly source records. Missing and partial years are excluded from that finding; ties count for each equally busiest month. These are descriptive source-record patterns, not calibrated trends or verified observing effort.

The ribbon uses a bounded monotone cubic visual guide through period totals. Its illustrative light is sampled under the same envelope and clipped to the animated profile, so rectangular particle columns and triangular interpolation are gone. Hover, tap, or horizontal drag inspect periods. Double-click/double-tap, Enter, wheel/trackpad zoom, and two-finger pinch navigate time; explicit zoom controls remain available. One-finger vertical scrolling stays available on mobile. Pinch thresholds have unit coverage; physical two-finger Safari gestures require a touch-device check.

`pattern-data.ts` computes recurrence and same-coverage satellite ratios; `PatternViews.tsx` renders the within-year share heat field, shared-scale satellite profiles, and curated reading cards. The recurring view uses a fixed 0–100% share scale. Satellite ratios are suppressed when source-period coverage differs or the MODIS baseline is zero. Source counts remain available for interpreting patterns.

Stories & research supplies region/time-matched NASA and Copernicus reporting, the Schroeder et al. (2014) VIIRS algorithm paper, and NASA product documentation. The primary-source links were verified on 2026-11-15. This is curated context, not a live feed or automatic incident linkage. Existing local satellite imagery retains its credited acquisition date. Unmatched selections show general measurement research and an explicit absence of curated reporting. Sources and models remain observations-only; no release gates, datasets, map, or Explore files are changed.

### A Year in Fire

The default Report tab (`?tab=report`, or `?tab=report&concept=journey`) is a screen-sized temporal journey. It starts with the complete 2023 VIIRS record for the two Greek study areas: 4,685 satellite detections. The annual ribbon has twelve selectable months; its suggested path follows August (4,178), 22 August (1,938), then 00:00–00:59 UTC (1,009). Every supported period remains freely selectable, including available zeros. The hourly view keeps the surrounding day visible and highlights the selected hour. Original acquisition details open on demand. Across years reveals the available historical record and explicitly marks missing sensor years.

`report/YearInFire.tsx` uses the existing `useReport` data layer with its own initial selection. `journey-data.ts` holds navigation and fixed-length, linear-scale ribbon geometry; `JourneyRibbon.tsx` seeds the next particle cloud from the selected period. The renderer caps illustrative light particles at 1,250 and pauses ambient frames when hidden, offscreen, manually paused, or reduced motion is enabled. Device reduced motion and an additional report-local reduced-motion option preserve the same controls and data. `journey.css` scopes the composition and hides the unrelated global-snapshot footer only while this report is mounted. Desktop uses the viewport; mobile, short windows, and enlarged text can scroll.

The Where panel ranks available study-area counts through the supported hierarchy. Unlike the older playground, geography changes preserve the exact selected date even when the destination has no records; the report offers an explicit action to visit an available year instead of silently changing time. Loading and unavailable data use a dash, never a temporary zero. Satellite controls, coverage, raw comparisons, uncertainty, and metric definitions live in the details panel. The report remains observations-only.

Run `cd web && npm test` and `npm run build`. Browser acceptance includes year → month → day → hour and return, source observations, geography retention and missing records, Across years and year selection, zero counts, both satellite counts, reset, keyboard arrows/Enter/Escape and focus restoration, pause/reduced motion, and desktop/mobile overflow. The quiet Prototype gallery link preserves all nine old concept URLs and local shortlists; its footer links back to the new report. No map, Explore, calendar, shared observation types, dependencies, or generated source data are changed.

### Report concept previews

The Report tab now opens a gallery of **nine independently previewable experiments**. Start the existing Vite app and open `http://127.0.0.1:5173/?tab=report&concept=gallery`. Each card has a same-tab preview, a new-tab link, strengths/tradeoffs, and a picker for the whole idea or individual parts (visuals, layout, motion, storytelling), with private browser-local notes. Picks synchronize between same-origin tabs through storage events. Nothing applies a final choice automatically. The concept switcher preserves the current time, geography, and satellite selection; separate preview tabs start with the same 2023 annual overview.

| `concept` parameter | Experience | Distinct interaction |
| --- | --- | --- |
| `story` | The Spark | Particle season dial; guided peak-to-hour discoveries |
| `dashboard` | The Observatory | The same weighted particles morph between columns, orbit, and river |
| `timeline` | Time Machine | Glowing waveform with scrubbing, replay, and temporal depth |
| `mosaic` | Signal Mosaic | Proportional treemap tiles; drill through time or place |
| `tapestry` | The Fire Loom | 23-year/month heat tapestry unfolds into days and acquisition hours |
| `sculpture` | Data Landscape | Orbit and enter a 3D count skyline, using WebGL or CSS 3D |
| `split` | Two Ways of Seeing | Reveal slider and shared-scale satellite comparison |
| `dispatch` | The Fire Dispatch | Light editorial layout with draggable, animated magazine pages |
| `sequencer` | Signal Symphony | Period pads, visual replay, and explicitly enabled Web Audio sonification |

Report implementation is isolated in `web/src/Report.tsx` and `web/src/report/`. `use-report.ts` owns shared selection, loading, and aggregation. `concepts.ts` is the experiment registry; `ReportGallery.tsx` and `use-idea-picks.ts` provide discovery and browser-local shortlisting. `Experiments.tsx` contains the six additional directions, with `DataLandscape.tsx` loaded separately. The landscape uses the existing Three.js dependency where WebGL2 is available and a fully interactive CSS 3D renderer otherwise. Its accessible period buttons remain available in either renderer. `FireField.tsx` uses Canvas, requestAnimationFrame, ResizeObserver, and IntersectionObserver; a deterministic weighted layout caps scenes at 1,500 illustrative particles and preserves period weights across shapes. It pauses offscreen, on hidden pages, with ambient pause, and with reduced motion. Native view transitions enhance switching where available. Sound is off by default, enabled only by a user action, normalized to the current chart maximum, and stopped on leaving the sequencer. No additional dependencies, credentials, or remote services are required. `App.tsx` only adds the lazy route, navigation entries, and report preview URL handling. Map, globe, calendar, data generation, and shared observation types are unchanged. The report uses monthly case summaries and lazily loads the original case-boundary observation partitions for days/hours. Uncached historical partitions still need a connection.

The geographic hierarchy describes the bundled study areas. Europe → Greece study group → Evros/Evia is not an administrative count: the rectangular study boundaries can include border pixels. South America → Gran Chaco skips country attribution, which is absent in the bundle. Missing areas and sensor-months remain visible, and incomplete or zero-baseline comparisons have no percentage change. Raw percentage changes are explicitly unadjusted for observing effort. Burned area, unique events, predictions, and calibrated intervals remain unavailable.

Run `cd web && npm test` for real-data aggregation integrity, missing versus zero, partial geography, previous periods, leap days, weighted particle layouts, treemap area conservation, independent MODIS/VIIRS series, preview route coverage, and shortlist parsing. The production build includes the report in the existing offline bundle. Browser checks should include all nine routes, real time drilldown, geographic filters, reset/breadcrumbs, keyboard navigation, mobile overflow, persisted picks, 3D controls, satellite reveal, magazine page turns, and sequencer replay/sound opt-in. Reduced motion follows MotionConfig and scoped CSS; autoplay is disabled with that preference while manual controls remain available.

Open the production preview online, wait for the offline-ready indicator, and disable networking. Run the tour, switch cases, open the calendar, select an observation, change boundaries, and inspect methods. Confirm unsupported estimates and exports stay disabled. Re-enable networking for uncached months and external official reports.

The recorded submission and live pitch remain separate from the app tour. Choose the team owners, final data cut, and presentation recording after the multi-developer setup.

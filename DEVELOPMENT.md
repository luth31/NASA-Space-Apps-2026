# Orbital Atlas release handoff

## v0.2 experience

Orbital Atlas is the single product direction. It opens as a photographic NASA Earth; selecting a region opens that region directly. Region → 2° area → satellite reading is the primary exploration path. Plain-language explanations and larger controls lead the interface; technical metadata is expandable. The menu retains calendars, methods, credits, historical investigations, and offline status. Respect reduced motion and provide the place picker alongside canvas interactions.

The three prototype alternatives are preserved in Git history, not in the release UI. Local preview and explicitly requested private Tailscale access are supported. Public hosting remains outside the authorized scope.

Regenerate `web/src/orbital/map-units.json` after replacing the global snapshot (see README). Its SHA256 guard prevents silently reusing stale spatial assignments. Flame symbols aggregate observations; they do not identify unique fires or incident perimeters. Region cells are degrees, not equal-area density estimates.

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

Open the production preview online, wait for the offline-ready indicator, and disable networking. Run the tour, switch cases, open the calendar, select an observation, change boundaries, and inspect methods. Confirm unsupported estimates and exports stay disabled. Re-enable networking for uncached months and external official reports.

The recorded submission and live pitch remain separate from the app tour. Choose the team owners, final data cut, and presentation recording after the multi-developer setup.

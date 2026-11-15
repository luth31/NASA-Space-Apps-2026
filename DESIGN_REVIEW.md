# Mission dashboard redesign

The current release loses geographic context at close zoom, swaps renderers during navigation, changes the page layout during selection, and hides the project's scientific purpose. The new design must explain why MODIS and VIIRS need harmonization while preserving the evidence needed to investigate it.

## Acceptance criteria

- A dashboard communicates the sensor difference, overlap-based modeling, held-out evaluation, and intended historical calendar within a recorded clip of at most 30 seconds.
- Dashboard, exploration, calendar, models, and sources have visible navigation. Existing investigation and scientific functionality remains accessible.
- Earth → region → area → observation uses one persistent geographic view. Camera motion, controls, breadcrumbs, and information panels retain their spatial relationship. Backtracking and interruptions work.
- Global hover includes count, geography, acquisition dates, and an additional useful statistic. Close zoom retains imagery, location context, scale, pan, zoom, and readable observation details.
- Satellite detections use restrained scientific marks. Sensor counts, confidence, footprint, time, source, and model evidence retain their actual meanings.
- The dashboard compares actual MODIS and VIIRS observations and exposes the current fitted models and held-out errors. Experimental scope and incomplete monthly validation are explicit.
- Desktop and phone layouts, keyboard controls, reduced motion, and the deepest supported zoom are inspected in Chrome DevTools. Both local and private Tailscale previews work.
- After implementation, commit and tag a savepoint, record and inspect a ≤30-second clip, and evaluate a 5–6 minute presentation against NASA judging guidance and comparable prior projects. Record weaknesses, iterate where progress is possible, and leave a PR open for review.

## Design decisions to test

Use a persistent MapLibre globe that transitions into the local map, with NASA imagery and real observation layers. Keep a stable navigation frame and four geographic levels. The dashboard's four scientific chapters use the same scene and real case data. Reserve a fixed information area so interaction changes its contents without moving the map or scrolling the user away from the selected location.

The current benchmark has 48 eligible cell-passes in two Greek regions. A winner-quality scientific claim needs stronger monthly validation than this sample provides. The dashboard must make the measured experiment understandable without presenting unsupported historical estimates.

## Review log

### Review 1 — persistent map and restored scientific navigation

Implemented a single MapLibre globe/map, stable four-depth navigation, richer hover, country locator, 7,342 Natural Earth place labels, reprojected dated NASA scenes, and an interactive four-chapter scientific introduction. Calendar preview cells now open their exact month. Six navigation destinations remain visible, including all three historical investigations. Removed the retired globe/map renderers and emoji-like fire symbols.

Verified in Chrome DevTools at 1440×960: the same canvas survives region → area → observation → area → region → Earth; its rectangle stays 1070×788 at (370,82), without page scrolling. Current breadcrumb is a no-op. Inspected the original reading at 42.362° N, 21.715° E (97.8 MW, NOAA-20, 13 Nov 2026 12:14 UTC), with a Serbia locator. Hover displays count, highest FRP, date range and daytime count. Keyboard Tab/Enter selects a region and arrow keys operate the map. June 2022 in the preview opens June 2022 in Evros's full calendar. All scientific destinations load without browser errors. Reduced-motion navigation is immediate. Phone inspection at 390×844 found chart controls overlapping the evidence panel; layering was corrected. Production and Tailscale HTTP checks return 200.

Validation: 12 pipeline tests and 8 frontend tests pass; TypeScript and production build pass. Core offline cache is 29.7 MB. The existing build-size warning now includes the MapLibre renderer. Global deep imagery is a context basemap, not reconstructed fine-resolution data.

Pending this checkpoint's recording and critique: judge whether the four chapters explain the concept within 30 seconds, inspect the animation itself, verify final phone and offline flows, and identify the next meaningful iteration.

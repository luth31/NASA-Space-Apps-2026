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

### Recording review and second iteration

Tagged `savepoint/mission-dashboard-review-1` at `612c28a` before review. Recorded the actual app, measured the first clip at **24.38 seconds**, and inspected a contact sheet and flight frames. The persistent camera and stable layout are a substantial improvement over swapping a globe for a separate map. The concept is present, but the benchmark bars alone leave the actual prediction process too abstract; long introductory prose also competes with the imagery.

The second iteration shortens the explanation and adds a held-out experiment viewer to Models & validation. It publishes the existing regional/time prediction artifact directly from training, allows all four fitted/control approaches and either withheld region, preserves all 48 rows including 42 zero targets, and exposes each prediction/target/error. The chart uses a shared scale across models. The regional MAE and nonzero-target MAE make the effect of zero-heavy sampling visible. Two artifact-consistency tests reproduce every regional score and check that the public download matches the original saved predictions. This is an inspection tool for measured experiments, not an invented demonstration dataset.

Also removed duplicate initial observation-source processing, added a loading indicator, and corrected world framing after viewport resizing. The second live recording is **25.77 seconds** (25.8 seconds after H.264 conversion) and uses ordinary buttons: Earth → Evros MODIS → VIIRS → mean holdout errors → withheld Evros → calendar preview → August 2023 in the full calendar. Inspected chapter frames and the final calendar frame. The H.264 deliverable is `artifacts/mission-review/pyrobridge-demo.mp4`; the original recordings remain local. Review images are in `docs/review/`.

Final verification: 12 pipeline tests and 10 frontend tests pass; production build passes. Tailscale was inspected in a fresh browser context at 390×844. The evidence card no longer overlaps map controls, the experiment viewer scrolls within its chart, and there is no horizontal page overflow. With Chrome DevTools set to Offline, a normal reload retained the featured imagery, sensor counts, evidence and experiment rows. This is browser emulation, not a physical-phone airplane-mode test. Core cache: **29.8 MB / 411 files**. No browser errors in the final online phone and desktop sessions.

### Five-to-six-minute presentation review

A rehearsable 5:30 sequence:

| Time | Interaction and point to establish |
| --- | --- |
| 0:00–0:30 | Dashboard: better sensors can create an apparent change in activity. |
| 0:30–1:20 | Evros: toggle 162 daytime MODIS and 929 VIIRS detections; explain separate sampling and why their ratio is not a calibration. |
| 1:20–2:00 | Explore region → area → observation; inspect UTC time, footprint, FRP and source. Explain that pixels are not incident perimeters. |
| 2:00–3:30 | Models: choose each withheld region, compare seasonal scaling with LightGBM, inspect a large error and a zero target. Show the complete prediction download and coverage audit. |
| 3:30–4:30 | Calendar: choose an actual historical month, investigate its original records, and show the disabled harmonized mode with its reason. |
| 4:30–5:30 | Sources and next milestone: explain reproducibility, common observation opportunity, geographic/time holdouts, and the evidence still needed for historical transfer. |

I would not award this first place on the current scientific evidence. The presentation is coherent and the reproducible, inspectable experiment is a credible differentiator. The central released output is still an observed calendar; a validated harmonized monthly record remains absent. More animation cannot close that gap.

For comparison, NASA describes 2024 Local Impact winner Team I.O./G.R.O.W. as making complex environmental GIS accessible. Its public repository documents satellite maps, historical context and a voice interface. Merely adding another globe would be weak differentiation; PyroBridge's inspectable cross-sensor calibration is the stronger contribution. [NASA 2024 winners](https://www.nasa.gov/learning-resources/stem-engagement-at-nasa/nasa-international-space-apps-challenge-announces-2024-global-winners/) · [G.R.O.W. repository](https://github.com/Florianopolis-NASA-Space-Apps/wildfires_chat_dashboard)

NASA's 2025 summary describes SkySense as supporting weather decisions, and SpaceGenes+ as an accessible research dashboard. My inference is that a clear user decision and visible analytical depth matter more than visual novelty alone; these summaries do not prove how complete or validated those applications were at judging time. [NASA 2025 winners](https://www.nasa.gov/learning-resources/stem-engagement-at-nasa/nasa-announces-2025-international-space-apps-challenge-global-winners/)

Using the **2025** published rubric as a historical reference, impact, creativity, validity, relevance and presentation all matter. The redesign improves presentation and usability; the scientific release gap primarily limits validity and challenge completion. This is a qualitative self-review, not an official score or a prediction of placement. [Published judging guidance](https://spaceapps-v2-staging.s3.amazonaws.com/media/documents/Final_Space_Apps_2025_Judging_Guidelines_for_web.pdf)

### Remaining evidence and decisions

- Historical harmonization needs a larger, geographically varied sample, a locked evaluation set and complete monthly observing-effort records. The current selected passes cannot answer that question, regardless of additional UI refinement. Dataset expansion and validation criteria are the next scientific workstream, not a cosmetic iteration.
- Test the revised hierarchy and motion with an actual fire manager and on the team's physical phones. Browser emulation cannot establish comprehension, operational usefulness or real-device smoothness. Record whether an unfamiliar person explains the sensor-change problem correctly after the short clip.
- Global deep background imagery remains coarse context; country locators, place labels and coordinates prevent loss of orientation. Higher-resolution global imagery would need a deliberate source/size/licensing choice. The three dated cases have local, georeferenced NASA scenes.
- The current visual review has reached a useful checkpoint. More solitary style iteration would provide weaker evidence than the above user and scientific tests. The PR stays open; no deployment or merge is part of this handoff.

## Sensor context and readability review — 15 November 2026

The country locator now follows the camera at zoom 4.5 and above. It appears without a selected pixel in Explore and in all three dashboard sensor comparisons. Its white viewport outline updates during zoom and pan. The same locator is available in the historical split comparison. The selected pixel keeps its sensor color with a white ring. MODIS is amber, VIIRS is blue, and only mixed-sensor groups are gray. Country outlines combine Natural Earth map units such as Belgium's constituent regions; distant overseas territories keep their local context. Source geometry and all observation assignments were verified unchanged.

The dashboard comparison now offers Evros (162 MODIS / 929 VIIRS daytime detections), Evia (54 / 153), and Gran Chaco (155 / 562). Each count was reconciled with the original dated scene rows and the case boundary. Separate overpasses remain explicit. Gran Chaco does not supply eligible five-minute calibration pairs; entering the model experiment moves to the supported Greek sample.

The model experiment compares the unchanged MODIS rate evaluated at common usable area, a selected model's held-out estimate, and the actual VIIRS target. Both regions, three fitted approaches, and every eligible cell-pass are selectable, including zero targets. Errors can improve or worsen. For example, the Evros 104-pixel target has a 44.8-pixel unchanged-rate control and a 119.1-pixel LightGBM estimate. On the Evia 80-pixel target, LightGBM estimates 4.3 and performs worse than the 21.9 control. These are existing regional-holdout predictions, not new fits or a monthly historical release.

All active pages share the blue interface theme. Body copy in the scientific workspace is 16 px, supporting text is generally 14–15 px, and calendar counts remain visible at 14 px. Calendar cells distinguish zero from unavailable sources and select black or white text from the actual fill luminance. All six case/sensor combinations were measured in Chrome: minimum count contrast ranged from 4.58:1 to 8.37:1. At 390 px width, only the calendar grid scrolls horizontally; the document remains 390 px wide. Larger historical comparison controls were repositioned to avoid overlapping the locator, captions, or source credits.

Verification used the official Chrome DevTools MCP server through a local stdio client, with desktop (1440 × 1000) and touch-phone (390 × 844) emulation. Browser checks covered sensor toggles without camera movement, all three landscapes, locator visibility without selection, MODIS and VIIRS selected-marker colors, live viewport changes on zoom and keyboard pan, hiding the locator at globe scale, historical split comparison, model changes and zero-target examples, calendar keyboard selection, and all page layouts. Normal-motion and reduced-motion sessions were inspected. The production preview reported no browser console errors. This does not substitute for a physical-phone usability session.

The 17 frontend tests, 12 pipeline tests, TypeScript, geography/source consistency check, and production build pass. Both localhost and the existing private Tailscale preview were verified against the production HTML and assets. The offline core remains 30.7 MB. No preview configuration or Earthdata credentials changed.

![Country context and sensor comparison](docs/review/sensor-context.jpeg)
![Calendar with visible counts](docs/review/calendar-readable.jpeg)
![Model experiment at phone width](docs/review/bridge-phone.jpeg)


## Cached-tab update regression — 15 November 2026

A fresh browser could see the blue interface while an existing browser stayed on the green build after refresh. Chrome DevTools MCP reproduced the exact upgrade from the previous commit: the server returned the new HTML, but the active worker served cached old HTML and the new worker remained installed/waiting. The old Models page retained `rgb(16, 21, 20)` and lacked the calibration experiment. Ordinary HTTP caching and an incorrect preview build directory were ruled out by inspecting the two stylesheet hashes and matching server files against `dist`.

Production updates now precache the entire bundle, activate immediately, and refresh existing app windows onto the complete bundle. Navigation is started without awaiting it inside activation because its fetch depends on activation finishing. First installation leaves the current page alone; failed core downloads keep the old worker active. Visible tabs check for updates every 30 seconds, and returning online or returning to a tab triggers another check.

The real cached-tab upgrade now loads `rgb(11, 19, 30)` and the calibration experiment after the same ordinary reload. Five worker lifecycle regression tests cover completed updates with old tabs open, every app window refreshing, activation without a navigation deadlock, first visits, and failed downloads.

A second browser test changed the served build with two upgraded tabs left open and no manual update or reload calls: both received the new build automatically in 17.3 seconds. The preview process on port 4188 was explicitly restarted, and both local and private preview endpoints returned the current build. All 22 frontend tests pass.
The restarted localhost preview was also tested with networking disabled: reloading the app, opening Models & validation, and opening the 276-cell Greek calendar all retained the new blue UI and saved experiment data.


## Interactive harmonization review — 15 November 2026

The dashboard now opens on a usable MODIS → model → VIIRS experiment. Drag the calibration slider or use Apply calibration, reveal the real VIIRS reading, switch month/region/model, and jump to a pre-VIIRS month. Counts are illustrated with nonspatial tiles; they are never presented as reconstructed fire locations. Explore has a direct route to this comparison alongside original global observations.

### Requirement audit

- **Model borders:** Chrome computed styles report 1 px on all four sides of the summary, scorecard, both detail sections, model table, matched-pass benchmark and coverage audit.
- **Remove empty status text:** removed the released-accuracy placeholder, publishing checklist, repeated unavailable labels, and redundant pass-level experiment. Monthly regional MAE and unchanged-MODIS comparison are the primary evidence. Technical scope lives with the scores and in expandable protocol details.
- **Harmonized calendar:** enabled by default, with seasonal scaling and LightGBM, original readings, individual-month error when VIIRS exists, prediction provenance and a downloadable experimental monthly CSV. All 276 Greek months and 12 Chaco months have saved estimates. Selecting historical October 2008 in the demo opens the same 348.8 estimate in the calendar; changing to LightGBM gives 400.5.
- **Locator jitter and lag:** the old browser reproduction showed Germany → Greece during a flight to Evros and 100–120 ms between rectangle updates. Country resolution now happens when the camera settles; its projection is fitted to the country only. Three rapid zooms retained Greece and one unchanged country SVG path, with 52 rectangle updates, median 16.7 ms and p90 18.2 ms. A Greece → Chaco flight showed only Greece → Argentina. The historical SVG map uses the same immediate transform for its image and viewport, avoiding its former independent 800 ms interpolation.
- **Dotted Evros rectangle:** removed the analysis-boundary layer from the continuous map and the rectangular overlay from historical scenes. Analysis bounds still constrain the underlying observations.
- **Real model demonstration:** Evros August 2023 uses MODIS 625 → seasonal estimate 3,359.9 → VIIRS 4,175; error falls from 3,550 to 815.1 detections. Evia August 2021 explicitly shows a worse seasonal prediction. Neither example is selected by model improvement: defaults follow the case event date. Every month, including zero-count months, is selectable.
- **Phone and keyboard:** Chrome DevTools MCP at 390 × 844 with touch and reduced motion: demo, model view and calendar have 390 px document width; the 848 px calendar grid scrolls within 350 px. The range input reaches 100% using End.

### Monthly model evidence

`pipeline.monthly` fits two distinct monthly-count models in 0.263 seconds on CPU using 324 region-months. It withholds all regions' records from one entire year, repeats over 13 years, and saves predictions plus native final models. Pre-2013 values use the full overlap fit; 2012 is excluded from fitting/scoring because the VIIRS year is partial. Input features exclude VIIRS. Saved predictions reproduce the displayed scores, and exports preserve null historical VIIRS readings and experimental status.

The monthly product predicts archive counts without cloud/overpass normalization. It does not claim a historical/global accuracy percentage, reconstruct fire locations, or change the separate coverage-normalized release policy. Gran Chaco has one year, so its year holdout also withholds the whole region. Full scope and regional errors are in README.

### Verification

Chrome DevTools MCP exercised the complete calibration/reveal/historical/calendar flow, model and case changes, all four border edges, rapid zooms, intercontinental flight, mobile layout and keyboard interaction. Automated checks: 21 frontend tests and 14 pipeline tests, TypeScript, geography consistency and production build. Existing MapLibre chunk-size advisory remains.

Production verification used the final `pyrobridge-b6084a9de26051a9` offline cache (412 files including its manifest; 30.8 MB). After a normal offline reload, the calibration reveal retained the 815.1 error and all three cases remained populated with both monthly models. The private preview showed the same result. Port 4188 was explicitly restarted; production Chrome reported no console warnings/errors. Phone checks above were completed before the instruction to skip further phone tests; no additional phone checks were run afterward.

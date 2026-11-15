# Verification evidence — 15 November 2026

**Historical overnight revision.** For the later original-globe / contour / seasonal-calendar / Report redesign, see [the current verification](contours-and-patterns-verification.md). The observations below describe the previous app and retained presentation artifacts.

This is the lead's record of observed checks, separate from planned acceptance. The reference specification is `OVERNIGHT_BRIEF.txt`.

## Environment

The Chrome plugin reported no connected browsers. CUA initially reported the Mac locked; the user unlocked it. Native Firefox computer-use controls then opened and inspected the actual local Vite app. No Chrome DevTools automation or physical phone gesture test is claimed. Desktop captures are generated through Firefox's built-in screenshot UI, not recreated mockups.

The LAN preview at `http://192.168.1.115:5174/?tab=report` loaded the actual 4,685-detection Report successfully in Firefox on the Mac. Physical iPhone reachability is not verified. Same-Wi-Fi devices need the Mac awake and firewall/router client access. LAN HTTP does not provide the secure context needed for service-worker offline rehearsal; use localhost on the Mac for that check.

## Observed browser checks

| Check | Actual evidence |
|---|---|
| Report overview | Greece study group, VIIRS, 2023; 4,685 annual detections, August 4,178, 89% rounded. Screenshot in `deliverables/captures/report-overview.png`. |
| Direct keyboard drilldown | Click August period + Enter → days; click 22 + Enter → hours; click 00 + Enter → selected hour. Counts 4,178 → 1,938 → 1,009. Heading receives focus after drilldown. |
| Reset | Reset report returned to annual 2023 overview. |
| Period comparison | Current2023=4,685 vs2022=735, +3,950 / +537.4%; explicit unadjusted source-record caveat visible. Escape closed modal. |
| Recurring timing | Across years displayed October10/14, fixed0–100% within-year-share legend; nine unsupported early years omitted with explicit notice, unverified effort caveat. |
| Sensor differences | Two satellites displayed independently selectable Aqua and S-NPP monthly values; same scale and raw ratio retained. |
| Mobile | Firefox responsive viewport390×844, device pixel ratio2. Initial header overflow found and fixed; all five routes visible, report body and chart scroll normally without sideways page overflow. This is emulation, not a physical phone. |
| Cross-section context | Evros August2023, both satellites: Explore4,800 → Report4,800 and same month/place/sensors → labelled return opens same Explore month. |
| Unsupported month | Explore chaco2023-08 VIIRS showed unavailable record, dash counts, disabled timeline, Retry + featured-month actions. Missing records not shown as zeros. |
| Existing regional map | Evros August2023 map rendered actual dated GIBS scene; comparison opened with625 MODIS /4,175 VIIRS, divider, imagery date, and distinct observation acquisition semantics. Screenshot saved. |
| Science page | Measured48 sampled cell-passes and monthly gate limitation rendered. Unit clarified from ambiguous “cells”; cached benchmark time labelled pinned run. |

## Final atlas, production and content checks

| Check | Actual evidence |
|---|---|
| Globe → atlas | Native Firefox showed the same textured globe and geographic anchors unfold into the world plane. Actual captures: `explore-globe.png`, `explore-atlas.png`. |
| Hierarchy and counts | Europe window 1,257 → Greece generalized polygon 86 → top 0.5° sector 24 → original point 39.118°N 22.382°E, 13 Nov 2026 12:14 UTC, 5.6 MW. Country counts remain distinct from continent windows and historical study rectangles. |
| Return and selection | Closing the point dossier retained the sector; Zoom atlas out restored Greece (86). Point selection did not replace the country scope. Sector filter updates are covered by a geographic regression test. |
| Atlas on phone viewport | Firefox 390×844, DPR 2: all five navigation entries fit; intro and scene scroll vertically. Unfold and explicit controls work with touch simulation enabled. Simulated drag rotated the paused globe. Wheel-out restored the globe from the world map. Touch simulation was disabled after checking. |
| Pause | Pause globe motion changed to Resume with pressed state; manual drag remained available. Hidden/offscreen/reduced-motion guards were source-reviewed. No physical multi-touch or OS reduced-motion browser test is claimed. |
| Zero versus missing | Report April 2023 displayed 0 recorded detections with available source data and “No peak available.” This differs from the unsupported-month dash/unavailable state checked earlier. |
| Curated reading | Annual 2023 showed NASA publication 24 Aug 2023 with context 22–23 Aug and separately dated 22 Aug imagery; Copernicus and measurement research retained their own dates. April explicitly said no curated reporting matches, while retaining general research. Escape closes the panel. |
| Retained experiments | All nine `concept` routes loaded their distinct heading/results through native browser navigation: story,dashboard,timeline,mosaic,tapestry,sculpture,split,dispatch,sequencer. No route error was observed. This is a smoke check, not exhaustive interaction coverage of every prototype. |
| Calendar and Sources | Production direct links rendered the observed calendar and withheld monthly-release explanation; Sources showed NOAA-20 versus Aqua/S-NPP scope, bundle ID, imagery dates and provenance links. |
| Offline rehearsal | Waited for OFFLINE BUNDLE READY on localhost 4173, stopped the owned preview server, then normal reload loaded globe 74,304; Evros August 2023 loaded 4,800; Report loaded 4,685 / 89%; playground and brand page loaded. Server restarted afterward. External networking was not disabled; this proves local-server loss recovery for the cached paths, not offline external publications. |
| Frontend update | Built another app with unchanged data, observed Update and reload, activated it, and observed the app reload with OFFLINE BUNDLE READY. Build identity now accompanies data version; stale/missing IDs fail focused tests. |
| LAN production preview | `http://192.168.1.115:4173/?tab=explore` loaded the actual globe in Firefox on the Mac. Physical phone reachability remains unverified. |
| Brand review | Browser loaded all three identities, SVG links and 16/24/32/64 px tests; Light toggle changed state. Separately rendered headers/covers/wordmarks inspected. Final name remains open. |
| Presentation | Exactly 7 editable PPTX slides and 7 rendered PDF pages; native table and four-control chart/workbook. All slide PNGs reviewed by lead and all PDF pages reviewed by presentation agent. Artifact hashes/structural evidence in `deliverables/deck/verification.json`. |
| Short video | Host AVFoundation encoded 870 frames; verification decoded 29.0 seconds, 1920×1080, 30 fps, one video track and no audio. Lead inspected scene-center frames at 1, 6, 11, 17, 23, 27.5 seconds. Captioned actual-capture montage is labelled as such; source hashes and output hash are in `deliverables/demo/render-manifest.json`. |

The runbook's constituent routes and controls were exercised across these checks. A spoken three/five-minute delivery was not timed; scripts include timing targets and need the presenter's own rehearsal.

## Automated checks

- Baseline: 28 frontend tests passed. Final integrated frontend: 44 tests passed in 10 files, including aggregation conservation, holes/multipolygons, spherical rectangle area, morph anchors, scoped filter changes, context/missing-data rules and offline-build identity.
- Final integrated TypeScript and Vite production build passed; 107 cached files including status metadata, approximately 20.5 MB. A second build intentionally exercised the frontend-update path.
- Scientific suite:12 tests passed unchanged using existing scikit-learn-wheel OpenMP; see `science-audit.md` for command and evidence.
- Independent scientific audit recomputed key pitch findings, all model MAEs and checksums, and checked all 564 monthly publication rows remain observations-only.

## Verification limits

No physical phone/Safari pinch test, screen-reader session, native PowerPoint rendering, measured FPS/heap benchmark, injected GPU/boundary-download failure, or spoken pitch timing was performed. Error/retry and reduced-motion paths have source/test review plus the observed unsupported-month and pause checks; do not present that as exhaustive fault injection. Generalized country boundaries omit fine coastal/island detail; dateline countries can use a wide view with an explanatory note. PDF is a raster-rendered companion; edit the PPTX. Data and release gates remain unchanged.

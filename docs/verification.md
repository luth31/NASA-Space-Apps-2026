# Verification evidence — 15 November 2026

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

## Automated checks completed so far

- Baseline:28 frontend tests passed. Integrated context and Report:34 frontend tests passed (8 files).
- Report worktree production build passed; main integration build passed before final atlas integration. Final full build must be run after remaining changes.
- Scientific suite:12 tests passed unchanged using existing scikit-learn-wheel OpenMP; see `science-audit.md` for command and evidence.
- Independent scientific audit recomputed key pitch findings, all model MAEs and checksums, and checked all564 monthly publication rows remain observations-only.

## Still to verify before completion

Atlas transition and hierarchy, atlas mobile/reduced-motion/performance; final production build and offline rehearsal; source/drawer/empty-state coverage; retained experiments and brand page; final deck seven slides/PDF rendering; video duration/captions; final live-demo runbook rehearsal and Git clean state.

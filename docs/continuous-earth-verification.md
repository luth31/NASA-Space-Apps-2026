# Continuous Earth and seasonal ridges

15 November 2026 · local branch `experience/continuous-earth`.

The user's clarified direction is **realistic Earth texture with crisp red boundaries and labels**, and a more visual **Report → Across years** experience. The existing study data, count definitions, calendar, comparison/evidence tools and release gates remain intact.

## Implementation

Explore retains the original Globe's lighting, atmosphere, rotation and controls. It now stays mounted during the transition. A shader interpolates the same geographic mesh from its spherical positions into the exact projected map coordinates, using unchanged texture coordinates. Points and atmosphere recede as the map opens; contours and labels blend in over the flattened surface. The reverse journey returns through the world extent before restoring the globe. The orbit and map no longer exchange unrelated canvases at the zoom threshold.

Subsequent geographic navigation animates the coordinate transform between fitted extents for 1.05 seconds. The initial unfolding takes 1.7 seconds with an eased start and finish. Reduced motion settles immediately. Offscreen/hidden render guards remain, and the globe stops rendering at the map endpoint. No measured frame-rate claim is made.

NASA Blue Marble shaded relief/bathymetry supplies the realistic texture on both sphere and map. Local world, Europe and Greece images are bundled; selected country/admin/sector views request finer static context from NASA GIBS and blend it in when available. If unavailable, the bundled texture stays visible. This is August 2004 geographic context, not current imagery or evidence about the fires. The on-demand layer is not promised offline. Provenance and exact asset hashes are in `web/public/assets/geography/terrain-sources.json`; `scripts/prepare-terrain.py` can reproduce the pinned downloads.

The display uses more detailed Natural Earth 1:50m country outlines, with the original 1:110m geometry as a loading/error fallback. Detection assignment retains the documented 1:110m polygons to avoid silently changing analytical scopes during a visual redesign. Greece admin polygons remain 1:10m. The map meaning disclosure explicitly describes that distinction. Continent/subregion outlines suppress internal country seams. An **Activity wash** toggle lets the user inspect the terrain while keeping outlines and counts. Hovered labels take priority in collision handling.

Across years is now a seasonal landscape. Each ridge represents one year; a highlighted month traces timing across the record. Users can inspect with pointer, tap, month/year selectors or keyboard arrows; Enter or **Open this month** opens that exact month in the existing report. **Season shape** uses a fixed 0–100% annual-share scale. **Detection count** uses one common raw-count maximum. Exact values, annual totals and scale definitions remain visible. Missing/partial months break the curve; incomplete annual denominators suppress shares; zero does not become missing. Linear segments avoid interpolation overshoot. Phone layouts show the complete annual pattern with abbreviated month labels and full selected month/year controls below.

## Validation

- **63 tests passed in 14 files.** Four new tests cover the bundled 4,178/4,685 August finding, incomplete annual shares, partial-month gaps, recorded zero, and ridge discontinuities without invented peaks.
- TypeScript and production build passed. The offline bundle contains **118 files / 24.7 MB**.
- Native Firefox rendered the original globe, an intermediate unfolding frame, the settled textured world and the new Across years view. Later verification used the in-app browser at 390×844 and 1280×900.
- The phone-width page fits its viewport. A discovered Report overflow/overlap was fixed by allowing the ridgeline plot to size its grid row naturally; the chart and report below no longer overlap.
- Globe → world → Europe (677) → Southern Europe (196) → Greece (86) retained counts. Detailed NASA terrain reached its ready state behind Greek administrative outlines. Thessalia still shows 62. Returning from Greece restored the original globe controls and opaque globe/transparent map state.
- Report selector/scale/keyboard interactions worked. Selecting August 2023 in the Greek study group showed **4,178 detections / 89.2%**; opening it produced **August, day by day** with the same total. Keyboard End moved to December. Both raw-count and share controls exposed their pressed states.
- Production preview at `http://localhost:4173/?tab=explore` was refreshed to the final build and visibly reported **OFFLINE BUNDLE READY**. A stale local cached shell initially showed a blank page; the local worker was temporarily activated to recover it, then the unchanged production worker was restored and its normal **Update and reload** control was verified. No recovery override remains in source or the served worker. The preview was left on the original globe with the temporary viewport override removed.
- Browser console review showed no application errors at the checked state. No physical phone, multi-touch pinch, OS reduced-motion session, GPU benchmark or exhaustive network-failure injection is claimed. The static fallback paths were source-reviewed; the previous offline server-loss rehearsal was not repeated.

This file supersedes the visual presentation details in `contours-and-patterns-verification.md`, while that file preserves earlier evidence. The prior PPTX, PDF and video remain unchanged and depict the earlier overnight design. Everything remains local; no remote push or publication was performed.

## Saved views

- [Detailed terrain and Greek regions](../deliverables/captures/continuous-terrain.jpg)
- [Across years seasonal ridgelines](../deliverables/captures/seasonal-ridges.jpg)

Both are captures of the running application.

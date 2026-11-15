# Fire mesh case views — 15 November 2026

Local branch: `experience/fire-mesh`. The Evros, Evia and Gran Chaco case maps share the redesigned component. The globe, contour atlas, analytical data, model gates, Report and Calendar are unchanged.

## Changes

- Replaced all circular case-map markers with small vector flame glyphs. Rose identifies MODIS and coral identifies VIIRS; the case sidebar uses matching colours. Gentle shape motion is illustrative, not fire behaviour or intensity.
- Added a transparent reference mesh at approximate nominal nadir spacing: MODIS 1 km and VIIRS 375 m. Longitude spacing uses the cosine of the study's middle latitude. These aligned local reference cells are not actual scan footprints, burned land or fire perimeters. Original scan/track dimensions remain in the observation dossier.
- Cells containing selected-period detections receive a light sensor-coloured wash. Grid lines fade when their true spacing becomes subpixel; a zoom hint appears. No mesh is enlarged to suggest false resolution.
- Both meshes follow zoom/pan, scope, satellite filtering and the comparison divider. The mesh can be hidden independently of detections. Dated NASA imagery and source credit remain visible.
- Initial framing moves towards the study rectangle. Screen-space grouping preserves sensor separation and counts; underlined flames indicate groups. Clicking a group zooms towards it; records remain individually available in the list. At maximum zoom, a group opens its representative record, with the tooltip describing this action.
- Flame motion has a pause control, respects reduced motion, pauses during dragging and when hidden/offscreen, and is bounded to 180 visible groups plus a selected record. Other retained markers stay static. Animation speed and glyph size do not encode severity, count or FRP.
- At phone width, the legend has its own area below the map. Existing record selection, date playback, FRP columns and comparison controls remain available.

## Verification

- **65 tests passed in 15 files.** The two new tests verify the nominal resolution ratio, latitude correction, repeated-record conservation and study boundary exclusion. Existing sensor-preserving clustering tests also pass.
- TypeScript and final production build passed. Offline core remains **118 files / 24.7 MB**.
- Desktop browser verification at 1280×900: Evros August 2023 retains **4,800 detections (625 MODIS / 4,175 VIIRS)**. Production rendered 148 grouped flame markers and no circle markers; motion was running. Counts remain detections, not unique fires.
- MODIS-only filtering rendered only the MODIS mesh/markers and conserved 625 records. The comparison divider moved from 50 to 51 using its arrow key. Pausing changed the computed animation state to paused. Hiding the mesh preserved the markers.
- Clicking a grouped flame zoomed without selecting an arbitrary record. Selecting the original 30 August 12:28 UTC MODIS record opened its dossier, including **4,612.2 MW** and **3.8 × 1.8 km** reported footprint.
- Selecting 1 August 2023 produced zero flames and the correct zero-detection label.
- At 390×844, Evia August 2021 retained 4,496 detections and Chaco May 2020 retained 10,125. Page width was 385 CSS pixels within the 390-pixel viewport. The phone map ended exactly where its 148-pixel legend began, avoiding overlay on the data. Wide Chaco views keep true subpixel mesh spacing and require zoom to see individual cells.
- The production update control completed normally and the final preview reported **OFFLINE BUNDLE READY**. No full offline/server-loss rehearsal, physical-phone touch session, OS reduced-motion setting change or GPU benchmark is claimed.

## Captures

- [Evros fire mesh](../deliverables/captures/evros-fire-mesh.jpg)
- [MODIS / VIIRS comparison](../deliverables/captures/evros-resolution-comparison.jpg)

The local preview is left on Evros. Temporary browser viewport settings were reset. No remote push or publication was performed.

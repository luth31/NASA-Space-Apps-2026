# Contours and patterns — integrated verification

Verified 15 November 2026 on local branch `experience/contours-and-patterns`. This supersedes the primary Explore, Calendar and Report experience described in the earlier overnight handoff. No publication or remote push was performed.

## Delivered experience

The original textured Globe is the default entry, with pause and zoom controls. Zooming in or choosing **Explore by place** opens actual filled geographic contours: continental country groups → named subregions → countries → Greece's administrative regions → analytical sectors → individual observations. The contour atlas has no broad-scale detection dots. The original Globe retains its existing hotspot appearance. Names and counts sit on the contours; crowded small-place labels appear on hover/focus and in the equivalent place list. Red classes encode recorded satellite-detection counts, not severity or unique fires.

Calendar now uses a twelve-petal season wheel, year playback/scrubbing, a fixed-scale option, and an interactive same-month historical profile. Petal area encodes counts. App controls its sensor so Calendar → Explore → Report retains the same record; combined-sensor Calendar routes select VIIRS explicitly in the URL.

Report adds a first-class Compare lens with two annual profiles, year/place/sensor selectors, raw and within-year-share scales, month detail, peak timing, seasonal concentration and study contributions. Dated reporting and research appear below the main visual, including attributed regional conditions. These are context for an event, not proof of why individual detections occurred.

## Automated checks

- `cd web && npm test`: **59 tests in 13 files passed** in the integrated checkout.
- `cd web && npm run build`: TypeScript and Vite production build passed after final responsive and context fixes. The offline core contains **112 files / 20.7 MB**.
- `git diff --check`: passed before the local delivery commit.
- Geographic tests cover unique polygon assignment, unmatched-point conservation, filtering, Greece admin membership, count color thresholds, and projection reversibility. Calendar and comparison tests cover missing/zero distinctions, incomplete annual records, tied peaks, area encoding, reference medians and real bundled comparisons.
- The published observations, scientific models and release gates were not regenerated or changed. The earlier 12-test scientific run remains recorded in the previous verification; it was not repeated for this UI pass.

## Observed native Firefox checks

The user unlocked the Mac. The lead inspected the actual application through native Firefox controls, including a 390×844 responsive viewport at DPR 2. Screenshots were downloaded through Firefox's screenshot UI.

| Area | Observed result |
|---|---|
| Original globe | Textured globe, atmosphere and original lighting restored; Pause changes the pressed state; explicit entry opens contours. |
| Geographic hierarchy | World snapshot 74,304 → Europe country group 677 → Southern Europe 196 → Greece 86 → Thessalia 62 → first 0.25° analytical sector 19 → original observations. Lists and actual filled-shape selection open the corresponding levels. |
| Map framing | Fit restores the selected extent. Responsive projection uses the actual SVG aspect ratio and includes Greece's detailed island bounds. Desktop and phone-width labels remain readable. Back/reset restore broader context. |
| Geographic accounting | Greece's parent sample is 86; administrative children account for 83, with 3 unmatched observations disclosed. Generalized country polygons and more detailed administrative polygons are not identical. |
| Calendar | August 2023 Evros VIIRS shows 4,175 of 4,664 annual detections. April 2023 is recorded zero; pre-VIIRS years are missing. Playback advanced years and paused; year/month selection and sensor handoff worked. Opening the August month in Explore preserved VIIRS and 4,175. |
| Report year comparison | Evros VIIRS 2023 total 4,664 versus 2022 total 691: +3,973 / +575.0%. August readout 4,175 versus 1. Peak timing August versus October; top-three-month shares 98.7% versus 87.7%. |
| Report place comparison | Evia VIIRS 2023 total 21, August 3; same-year comparison updates the second profile and readout. |
| Missing comparison | Chaco 2023 displays 0/12 source months, withholds comparison and disables the unavailable month's opening action. |
| Comparison keyboard | Month controls support keyboard navigation; End moved selection to December. |
| Mobile layout | Fixed a wide Report chart stretching the entire page. The page now fits the emulated phone; chart overflow is confined to its own scroll region. Calendar and Greece contours were visually checked at the same viewport. |
| Evidence trail | NASA/CAMS publication and context dates, separately dated imagery, attributed reported conditions and measurement research rendered. Official source pages were rechecked. |
| Retained atlas prototype | `?atlasMotion=ellipsoid` loaded the earlier unfolding atlas controls. Both earlier variants remain linked from the playground and load lazily. |
| Final production | localhost:4173 displayed the new calendar and full contour hierarchy with **OFFLINE BUNDLE READY**. Preview was left on the original globe. |

## Captures

- `deliverables/captures/redesign-globe.png`: original globe entry.
- `deliverables/captures/redesign-contours.png`: fitted Greece administrative contours, production build.
- `deliverables/captures/redesign-calendar.png`: full seasonal calendar, production build.
- `deliverables/captures/redesign-report.png`: full comparison and evidence experience.

The previous deck, PDF and 29-second video remain unchanged and show the earlier overnight revision. Their existing source captures and verification manifests were preserved.

## Scope and limits

Detailed administrative contours are currently bundled for Greece (13 regions plus Mount Athos). Other countries continue into explicitly labelled analytical sectors. Continental groups follow Natural Earth's whole-country grouping, including transcontinental and overseas territories. Country outlines are generalized at 1:110m; small islands and coastlines can leave records unassigned. Unassigned counts are disclosed rather than redistributed.

Historical comparisons cover the bundled study rectangles and their recorded sensor-month availability, not global or nationwide historical totals. Curated NASA/Copernicus reporting is a dated evidence collection, not a live news feed. Source completeness does not establish equal observing effort; raw count changes are not calibrated anomalies, burned area or risk.

No physical iPhone/Safari, multi-touch pinch, screen reader, measured performance benchmark or exhaustive error-injection suite was run. Horizontal chart layout and keyboard access were verified; native touch swiping is not claimed. Hidden/offscreen/reduced-motion guards were source-reviewed. The prior cached-server-loss check is in `verification.md`; this pass checked the updated bundle's ready state and production routes without repeating that full outage rehearsal.

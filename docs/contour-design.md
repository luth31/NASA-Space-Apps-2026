# Contour atlas correction

The requested primary experience now keeps the original Three.js Globe (lead integration) and reveals a filled geographic atlas only when the user zooms or chooses to enter it. The replacement `ExploreAtlas` is a static SVG renderer, not another opening globe. Broad geography has no detection dots: each visible geographic unit has a filled silhouette, name and count beneath. Colliding small-place labels remain available through a compact **All places** disclosure and keyboard focus.

## Integration contract

Existing `observations`, `cases`, `onSelect`, `onCase`, `snapshotStart`, `snapshotEnd`, `focus`, `zoom`, `reset` props remain accepted. Added `onBackToGlobe?: () => void`, called by root Back or Reset; `initialContinent?: string` optionally starts a named continent. `initialOpen?: boolean` remains accepted for compatibility but no globe is rendered by this component: mounting it opens the atlas. Lead mounts after the original globe's entry callback. No App, shared CSS, RegionalMap, Calendar or Report files are changed by this branch.

Hierarchy: original Globe → continent country groups → named Natural Earth SUBREGION groups (such as Southern Europe) → country → Greece's administrative regions → 0.25° analytical sectors → original observation points. Countries without bundled administrative boundaries go directly to explicitly labelled analytical sectors. Historical dated study links remain separate from this NOAA-20 snapshot.

## Geography, counts and color

- Existing Natural Earth 1:110m countries retain `SUBREGION` from the same official source. Continental and subregional shapes combine actual country polygons and receive a shared outer alpha outline, with no internal country strokes at those levels. Source groupings include whole transcontinental/overseas countries and are labelled **continental country groups**; they are not precise physical continent partitions.
- Greece's 13 regions and Mount Athos use Natural Earth 1:10m Admin 1 polygons. The source describes this product as beta and generalized. `scripts/prepare-greece-geography.py` produces the 141KB offline subset, preserving its names, subdivision type and identifiers. Exact source URL, license and SHA256 are in `web/public/assets/geography/greece-admin1-source.txt`. Data is public domain.
- Country assignment is first-containing-polygon, so overlapping generalized polygons never count a source record twice. The parent-country sample is partitioned into administrative children; unmatched observations remain unassigned and are disclosed. No source observations are invented or extrapolated. All levels recompute when the incoming Day/Night filter changes.
- Red shades encode **recorded detection counts**, never severity, risk, probability or burned area. One set of numeric equal-width thresholds is computed from all visible siblings and stays unchanged on hover/selection. Zero is neutral green-grey; missing geography has an explicit unavailable/retry state. Zero detections do not imply complete observing coverage.

## Interaction and performance

SVG shapes and the equivalent place list support keyboard activation. Pointer selection and wheel enter the hovered shape, wheel out restores broader context, and drag pans the map within bounded limits. Pinch expands the visual scale or returns to the parent; explicit buttons provide the same geographic progression. Fit restores the current viewport without losing the selected place; Reset returns to the original globe.

There is no ambient animation/render loop in the open atlas. SVG path geometry is memoized; broad-scale points are absent. Individual points render only inside one selected local sector and are capped at 4,000 with all observations retained in a paginated list. Reduced motion disables CSS transitions. The country/admin download uses one abortable fetch pair, an explicit loading state and retry after failure. The lead owns native browser and physical-device verification; none is claimed by the unit tests.

## Evidence

Production build passes. Tests cover unique polygon assignment, unassigned-point conservation, input filter reapplication, fixed numeric red classes with distinct zero/unknown states, reversible projection coordinates, actual Greece administrative membership, and parent/child conservation using the bundled global snapshot. Existing geographic tests are retained. This replaces the default open atlas; the earlier continuous globe-unwrapping source remains in `explore/AtlasSurface.tsx` as a retained prototype, not the current primary flow.

Primary sources checked 2026-11-15: https://www.naturalearthdata.com/downloads/10m-cultural-vectors/10m-admin-1-states-provinces/ and https://www.naturalearthdata.com/about/terms-of-use/ .

# Unfolding Earth implementation

## Shared contract

`ExploreAtlas` accepts `observations`, `cases`, `snapshotStart`, `snapshotEnd`, `onSelect(Observation)`, `onCase(CaseStudy)`, optional `focus`, and numeric `zoom`/`reset` signals. The lead integrates it into `App.tsx`. Existing `Globe.tsx` and `RegionalMap.tsx` are untouched. Dated historical cases call the existing region handoff; global snapshot observations use the existing dossier.

## Direction and alternatives

The primary direction is **continuous geographic unwrapping**. A 160 × 80 mesh shares longitude/latitude coordinates with country boundary segments, graticules, snapshot markers, and anchored labels. A vertex shader continuously interpolates a sphere into an equirectangular atlas; the scene does not crossfade between unrelated maps. The texture is existing NASA Blue Marble. On a narrow screen, the same projection fits the available width.

The comparison `?atlasMotion=ellipsoid` adds lateral ellipsoid expansion during the same morph. It is retained for quiet review. The default avoids extra deformation because it gives a clearer relationship between globe and projected longitude/latitude. The original satellite globe is preserved via the lead's `?explore=legacy` playground route. The equirectangular view is for geographic orientation; all area calculations use a sphere, never projected screen area.

## Geographic hierarchy and meaning

Earth → world atlas → named continent window → country polygon → analytical grid sector → original satellite observations. Clicks or wheel zoom over an ocean or an area without a containing country open a 12° × 10° rectangular map window around that location. The window stays within the atlas seam and polar limits; it is labeled as a map window rather than a country. Its empty state retains the unknown observing-coverage caveat. A dated historical study is an explicitly separate branch into the existing regional scene. The date and sensor stay visible in atlas context. Country counts use generalized Natural Earth polygons; they are not precise official national statistics. Continent views are bounding windows and state that they can include neighboring regions. The data is the bundled NOAA-20 NRT snapshot, not the historical MODIS/S-NPP record.

At broad scale, glowing marker size represents **raw detections per angular grid bin**, not density. The bin width changes explicitly (5°, 2°, 0.5°) with scale, so markers must not be compared across scales as an area-normalized quantity. Selected sectors display spherical rectangular area in km² using radius 6371.0088 km. A sector is an analytical rectangle, never an administrative boundary. Opening a sector retains the source-country polygon and original source-window bounds; changing the global day/night filter recomputes that scoped subset from the currently selected observations, including a valid empty result. A thermal detection is a satellite pixel, not a distinct fire, ignition, risk, probability or burned area. Unknown observing opportunity remains unknown even where there are zero detections.

Natural Earth `Admin 0 countries`, 1:110 million, was downloaded from the official maintainer's repository on 2026-11-15. The local source note includes the original checksum and exact transformation: keep three geographic attributes and round coordinates to four decimals. Boundaries use Natural Earth's de facto conventions, without adopting a geopolitical position. Their generalization omits small islands and precision at coasts. Seam-spanning countries can occupy most of the atlas width; sector shortcuts remain useful.

## Interaction and performance

Pointer drag rotates the sphere and pans the atlas. Wheel and two-pointer pinch move through meaningful geographic scales. Buttons provide the same hierarchy, plus geographic breadcrumbs, Wider view and Reset. Keyboard focus on the stage accepts `+`, `−`, Enter, Escape and Home; Tab reaches every explicit place and observation control. Hover identifies the country under the pointer. A single-finger gesture is reserved for map manipulation inside the stage; surrounding panels preserve page scrolling.

The shader updates one unfolding uniform, rather than rebuilding the mesh each frame. Global bins avoid 74,304 separate DOM nodes. Individual rendering is capped at 4,000 points in a selected sector; the paginated list retains access to every record. Device pixel ratio is capped at 1.65 and WebGL uses the low-power hint. The animation frame loop stops on a hidden tab or an offscreen canvas and stops for a static paused/reduced-motion view. Reduced motion changes projection directly and disables globe drift; all controls remain available. A WebGL failure keeps geographic and observation controls available. Boundary fetch failure offers retry while leaving snapshot points accessible.

## Primary references checked 2026-11-15

- [Natural Earth country boundaries](https://www.naturalearthdata.com/downloads/110m-cultural-vectors/): low-weight recognizable country geography for offline use.
- [Natural Earth terms](https://www.naturalearthdata.com/about/terms-of-use/): public-domain map data; source attribution retained despite no attribution condition.
- [Natural Earth maintained source](https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_110m_admin_0_countries.geojson): pinned derived geographic asset.
- [Three.js BufferGeometry](https://threejs.org/docs/pages/BufferGeometry.html): shared GPU geometry and vertex attributes, using the existing dependency.
- [NASA Worldview](https://worldview.earthdata.nasa.gov/): geographic context and source-date separation; existing dated historical maps remain unchanged.

## Verification record

TypeScript and production build passed for the initial implementation. Geographic tests cover grid conservation and boundary ownership, country polygon matching including holes, true spherical rectangle areas, and longitude/latitude anchor correspondence during the morph. Lead integration owns rendered desktop/phone, screenshot, focus, wheel/pan and physical-device limits. Do not infer browser or physical-touch verification from unit tests.

# Selective showcase integration

Source: `origin/feat/unified-showcase` at `67ea22e`. Integration retains `codex/compact-story-workspaces` through `fbff980`, including the compact forest-green workspaces, cursor-anchored investigation zoom and isolated historical-case hover. Base main was `c5b98ce`.

## Included

- Entire `deliverables/` package and `docs/submission-copy.md`. English and Romanian notes, runbook and seven-slide text now describe the integrated navigation and verified seasonal figures. Imported binary decks/clips remain explicitly labeled legacy, with their original provenance. Nothing was submitted or publicly deployed.
- Fire-Mesh reference-grid helper and its conservation/latitude tests. The comparison divider is adapted into the current `RegionalMap`, which already has flames, geographic context and the fixed camera. Both the mesh and real detections are clipped by source. Actual scan × track dimensions remain available. Opening a case starts in compare mode; source filtering and overlay mode remain available.
- Seasonal wheel and semantic helpers, accessible through **Calendar → Seasonal wheel**. The selected month/model stays synchronized with the monthly comparison. Null, zero, experimental estimates and the partial 2012 VIIRS year remain distinct.
- Reproducible `deliverables/scripts/verify-claims.py` and pinned output: August 2023 = 4,178 / 4,685 = 89.18% for combined Evros/Evia S-NPP VIIRS detections. October peaks in 9/13 complete years, 2013–2025. The quoted 10/14 includes partial 2012.

## Deliberately excluded

No showcase `Report.tsx`, `web/src/report/`, contour atlas, replacement globe, alternate FireMeshCaseMap/FireMeshInvestigation, navigation rewrites or duplicate resolution helper were brought over. The current MapLibre Explore, model artifacts, training pipeline, original observations, Methods and calibration animation are retained.

## Focused verification

- Frontend: 34 tests across eight files passed, including imported mesh/wheel checks and partial-2012 protection.
- Production build: TypeScript, geography consistency, Vite and offline bundle passed; existing MapLibre chunk warning remains. Core cache: 529 files, 57.2 MB.
- Chrome DevTools MCP: all six investigations present; Evros August 2023 retains 625 MODIS / 4,175 VIIRS; slider 50→72 updates both sensor clip paths; twelve wheel petals render; October selection synchronizes with the original monthly cards; no console errors.
- Current screenshots are in `deliverables/captures/integrated/`. Imported deck screenshots and verification records are not verification of this integrated build.

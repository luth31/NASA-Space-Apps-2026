# PyroBridge unified showcase

Stage source: the current checkout after the selective `feat/unified-showcase` integration into `main`, retaining the compact workspaces and cursor-anchored investigation zoom. No remote publication or competition submission is implied.

## Use these current scripts

- [Two-speaker 3:30 stage script](final/STAGE_SCRIPT.md)
- [Three-minute pitch](scripts/pitch-3-minutes.md)
- [Five-minute pitch](scripts/pitch-5-minutes.md)
- [Romanian presenter notes](scripts/pitch-ro-notes.md)
- [Live-demo runbook](scripts/live-demo-runbook.md)
- [Unified seven-slide source](deck/pyrobridge-seven-slides.md)
- [Unified speaker notes](deck/speaker-notes.txt)
- [Submission copy](../docs/submission-copy.md)

The unified product preserves `main`'s existing navigation, persistent MapLibre Explore canvas, six historical cases, monthly comparison, experimental calibration, CSV export and interactive model demo. It adds the nominal-resolution Fire-Mesh comparison and twelve-petal seasonal wheel.

## Verified pitch findings

- August 2023, Evros + Evia: **4,178 / 4,685 S-NPP VIIRS detections = 89.18%**.
- October peaks in **9 / 13 complete years (2013–2025)**. The partial 2012 record is excluded.
- Evros August 2023: **625 MODIS / 4,175 VIIRS**, not counts from 22 August alone.
- Recompute: `python3 deliverables/scripts/verify-claims.py`. See [pinned evidence](verified-claims.json).

## Imported media status

Original presentation assets were imported via `feat/unified-showcase` from `experience/fire-mesh`. Fresh integrated-app screenshots are in `captures/integrated/`; the archived assets below keep their original bytes. The existing PPTX, PDF, slide PNGs, captures, demo frames, MP4 and their asset/verification metadata are **legacy feature-branch artifacts**. They show that branch's globe/atlas/Report experience and older monthly-release wording. They have not been rebuilt or visually reverified for this unified product. Their source verification records apply to those imported files only. Do not present them as a recording, deck export or test result of the integrated main build.

Use the updated Markdown/notes and the current local application for this stage demo. A new exported deck or video requires new unified-app captures, rendering and a fresh visual review. Keep original binary media intact as provenance and visual references.

## Scientific scope

The separate global snapshot includes **74,304 NOAA-20 VIIRS** detections and **7,031 Aqua MODIS** detections, or **81,335 with both sensors**, from 13 November 2026 00:15 UTC to 14 November 2026 13:33 UTC. Counts are detections, not unique fires.

Experimental monthly archive-count calibration uses **648 overlap region-months** and **13 whole-year folds**. Seasonal scaling improves over raw MODIS in **five of six** landscapes; Evia is the exception. Cloud and overpass effort remain unnormalized. The independent matched-pass pilot has **48 rows**, with seasonal MAE **2.620** versus unchanged-rate **4.125** in hotspot pixels per 0.25-degree cell and paired pass. These units and evaluations must remain separate. The official coverage-normalized monthly product remains gated: `monthlyRelease: false`, with zero official published estimates.

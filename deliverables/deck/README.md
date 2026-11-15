# PyroBridge — Read the fire record

Local seven-slide presentation, using the provisional PyroBridge identity. No publication or submission is implied.

- `pyrobridge-seven-slides.pptx`: editable PowerPoint with native text, a sensor table on slide 2, and a four-control evidence chart with an embedded editable workbook on slide 5.
- `pyrobridge-seven-slides.pdf`: seven-page rendered companion. The PDF pages are images; use the PPTX to edit the content.
- `slides/`: individual slide PNGs.
- `speaker-notes.txt`: accessible copy of the notes, scientific scope, references and credits also embedded in the PPTX.
- `sources.json`: source bundle, exact and displayed model values, screenshot hashes and image attribution.
- `verification.json`: checked artifact hashes, structural results and the completed seven-slide / seven-page visual review. Recheck and update this record after rebuilding.
- `assets/`: actual application captures and dated NASA context imagery used in the slides.

The design uses Avenir Next. Install that typeface to preserve the PowerPoint appearance, or choose a replacement and recheck the layout. The exported PDF preserves the reviewed rendering.

## Evidence and scope

The 89% finding is 4,178 August detections out of 4,685 annual S-NPP VIIRS detections in the Evros and Evia rectangular studies during 2023. It describes the bundled source record. It is not a count of unique fires, a measure of burned area, or a calibrated risk estimate.

The model chart shows mean regional MAE for all four controls on 48 sampled cell-passes: 24 in each of two withheld regions, with 42 zero targets and six positive targets. Displayed values are rounded to three decimals; exact values are retained in the notes and source metadata. This is feasibility evidence. Monthly estimates remain unavailable under the release gate. See `docs/science-audit.md` for independent numeric checks and their limits.

Credits include NASA FIRMS, NASA EOSDIS GIBS / Aqua MODIS, Natural Earth, the implementation tools and OpenAI Codex assistance. NASA imagery is dated context imagery, separately scoped from the hotspot observations. No NASA insignia is used.

## Rebuild locally

Run `scripts/build-deck.mjs` with the bundled Codex Node runtime. Set `ARTIFACT_RUNTIME` to the bundled dependencies root and `PRESENTATIONS_SKILL` to the installed Presentations skill if their local paths differ. The generator uses `@oai/artifact-tool` and the skill's finalizer.

```sh
node scripts/build-deck.mjs
node scripts/build-deck.mjs --pdf-only
```

The default input directory is `deliverables/captures`; `CAPTURE_DIR` can point elsewhere. Inputs are `report-overview.png`, `regional-comparison.png`, `explore-atlas.png` and `explore-globe.png`. `ATLAS_CAPTURE` and `GLOBE_CAPTURE` can override the latter names. If the original capture directory is absent, the copied assets in this directory support rebuilding. A final build fails if a required capture is missing from both locations. `--draft` instead writes only to the ignored `.presentation-build/draft` area and permits a capture to be pending.

The bundled direct PDF exporter could not resolve its internal Helvetica dependency in this environment. `--pdf-only` therefore imports the finalized PPTX, renders all seven slides, and uses bundled ReportLab to assemble the PDF. It does not alter the PPTX.

The generator runs package integrity, slide geometry, font, slide count, native table/chart, embedded chart-workbook and first-party import checks. Private receipts are written to `.presentation-build`. Final delivery also requires visual inspection of every slide and rendered PDF page; this is not a claim of testing in Microsoft PowerPoint on a separate device.

For the delivered build on 15 November 2026, all checks passed with zero layout findings or warnings. All seven slide PNGs and all seven PDF pages were individually inspected. The atlas and globe are native slide crops of actual application captures; their full source images remain in `assets/`.

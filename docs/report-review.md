# Report integration and scientific review

Checked 15 November 2026. Worktree: `nasa-report`; branch: `overnight/report`; baseline: `2457593`.

## Preserved and improved

The existing A Year in Fire annual ribbon, month → day → hour path, recurring seasonal heat field, shared-scale sensor comparison, quiet nine-concept playground, and original data/release contract are preserved. The computer was locked during this work, so no claim is made that the baseline or changes received rendered-browser acceptance here. The lead coordinates that verification.

This increment adds:

- An explicit Explore → Report context, retaining the chosen study, month, and sensor. Unsupported years stay selected and use the existing honest gap state with an explicit available-year/MODIS action. Unknown locations or malformed months show a dedicated unsupported-context screen, with a named action to open the Greece 2023 overview.
- A Report → Explore action only for an individual bundled study. Its label names the month and year before navigation. Annual views choose their highest recorded month; archive/group views do not silently choose a place/date. A selected month is never replaced. The handoff intentionally has monthly resolution, stated by the action label.
- A secondary **Compare periods** panel for raw annual or monthly source records, with a user-selected comparison year/month and a common count scale. Day/hour views explicitly compare their surrounding month and keep the detailed selection until the user chooses to open the reference period. Missing or partial source records suppress differences; a zero reference allows the raw difference but suppresses percentages. These are descriptive counts, not gated harmonized estimates, trends, or anomalies.
- A visible fixed 0–100% legend for the recurring within-year shares, and an explicit common numeric count range for sensor profiles. Missing sensor periods are masked rather than drawn as zero.
- Context readings filtered by the day ranges actually discussed by the sources when a day/hour is selected. Annual/month views retain broader context. Local GIBS thumbnails are explicitly labelled as local context images, separate from original article imagery. The cards and panel state that the collection is curated, not a live feed or incident attribution.

## Integration contract

`Report.tsx` exports the `ReportContext` type:

```ts
interface ReportContext {
  caseId: string;
  month: string; // YYYY-MM; preserved even when unsupported
  sensor?: "all" | "modis" | "viirs";
}
```

Use `<Report manifest={manifest} context={optionalContext} onExplore={handleReturn} />`. Omitting context retains the original annual Greece 2023 VIIRS entry. The initial context is keyed so a new explicit handoff remounts the temporal journey. `onExplore` receives the exact month shown in the action label. App navigation and return-state handling remain the lead's responsibility.

Brand text remains PyroBridge pending the lead's shared brand configuration. Source data, model artifacts, schema, dependencies, map code, and release policies were not modified.

## Source checks

All links below were opened through the web tool on 15 November 2026. These short paraphrases describe context only.

| Primary source | Verified dates and scope | Product handling |
| --- | --- | --- |
| [NASA: Wildfires Rage in Greece](https://science.nasa.gov/earth/earth-observatory/wildfires-rage-in-greece-151736/) | Published 24 Aug 2023; original VIIRS image 22 Aug; reporting discusses 22–23 Aug in northeastern Greece. | Evros/Greece study context on 22–23 Aug, or the surrounding month/year. The app's thumbnail is a separately credited Aqua GIBS image, not the original VIIRS image. |
| [Copernicus CAMS: August wildfires](https://atmosphere.copernicus.eu/august-wildfires-ravage-northern-central-greece) | Dated 23 Aug 2023; describes activity starting about 20 Aug and subsequent smoke/atmospheric monitoring. | Context window 20–23 Aug. CAMS emissions and forecasts are not attributed to the app's detection counts. |
| [NASA: Fire Consumes Large Swaths of Greece](https://science.nasa.gov/earth/earth-observatory/fire-consumes-large-swaths-of-greece-148682/) | Published 12 Aug 2021; describes the first two weeks of August, including Evia; original images dated 10 and 8 Aug. | Context window 1–12 Aug; local thumbnail is Aqua GIBS 10 Aug with separate attribution. |
| [Schroeder et al., VIIRS 375 m algorithm](https://directreadout.sci.gsfc.nasa.gov/publications_documents/Schroeder_et_al_2014b_RSE.pdf) | Accessible paper; explains algorithm and initial assessment. | General measurement research. It does not validate the app's harmonization models. |
| [NASA VIIRS active fire documentation](https://viirsland.gsfc.nasa.gov/Products/NASA/FireESDR.html) | Accessible, no publication date presented; independent 375 m and 750 m products described. | Labelled undated, with check date. |

The [NASA Gran Chaco gallery page](https://modis.gsfc.nasa.gov/gallery/individual.php?db_date=2020-05-12) timed out twice. It was not added as verified reporting. Gran Chaco retains the explicit no-matching-reporting state, with general measurement sources available.

## Scientific evidence reviewed

`web/public/data/models.json` reports 48 coverage-eligible sampled cell-passes in two independent regions, with the evaluation unit explicitly not a full region-month. `release.json` has `monthlyRelease: false`, zero published estimates, and no computed months. Selected-pass diagnostics cannot establish monthly accuracy. The Report uses raw historical source records only and does not enable estimates, exports, predictions, burned area, or unique-fire counts.

The existing data tests retain the real Greece-study findings: 4,685 VIIRS detections in 2023; 4,178 in August (89% rounded); recurring October peak in 10 of 14 years with complete monthly source records. Complete source records do not establish complete observing effort. Peak-month ties are included in each tied month; zero-total and incomplete years do not establish a peak. Geographic totals cover study rectangles, not all of Greece or Europe.

## Verification

- `npm test`: 7 files, 32 tests passed, including real-data comparisons, missing/partial/zero safeguards, source matching, handoff invariants, ribbon geometry, temporal selection, and preserved experiment helpers.
- `npm run build`: TypeScript and Vite production build passed; offline rehearsal bundle produced (67 files, about 20.2 MB at this isolated Report build).
- `git diff --check`: passed.
- No physical phone gestures, browser layout, screen-reader interaction, or screenshots were verified by this agent. Those remain integration checks for the lead when computer access is available. The helper tests do not substitute for browser acceptance.

Browser acceptance to run after integration: annual → August → 22 Aug → 00 UTC and back/reset; all three lenses; Compare periods with 2021 and a missing VIIRS year; incoming Gran Chaco 2023 unsupported date; incoming VIIRS 2008 gap and explicit MODIS recovery; leaf return action's exact month; matching and unmatched reporting days; native dialog Escape/focus; narrow phone/short window at enlarged text; reduced motion; loader/retry; all nine prototype routes.

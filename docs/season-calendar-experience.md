# Season Calendar experience

Implemented 2026-11-15 on `experience/season-calendar`. Scope: Calendar, its scoped stylesheet and statistical helpers. No App, Report, shared data or global CSS changes. No new dependencies.

The default view is a twelve-petal seasonal wheel, accompanied by an editorial reading of the selected year's peak and a selectable same-month profile across years. The old matrix is replaced by a quiet, expandable twelve-row data table. Month selection, year stepping, native year scrubbing, year-range controls and a 1.6-second playback make the record explorable. Playback locks the scale across all bundled years; manual inspection can fit the scale to one year. Petals interpolate between years, with animation and playback disabled for reduced motion. Playback pauses when the page is hidden and when the user selects a month, year or sensor.

## Visual and scientific contract

- Equal-angle annular petal **area** is proportional to count: `r² = inner² + count/max × (outer² − inner²)`. This avoids a radial-length encoding exaggerating larger counts. The scale is explicitly labeled. Fixed low-opacity tracks provide clickable targets; only filled petals encode values.
- Null or absent source rows are hatched. A recorded zero has a baseline tick; it is not treated as missing. Source availability never claims verified observing effort.
- Peak-month share is calculated only when all twelve source values exist and the year's total is positive. An incomplete year reports the available-month total and withholds annual concentration. Peak ties are labeled.
- The same-month profile uses a linear height scale across the chosen year range. Its median excludes the selected year, nulls and all other months; zero is included. The raw median is explicitly an effort-unadjusted descriptive comparison, not validated historical anomaly or risk. Sensors are kept separate.
- Harmonized values additionally require each month's `eligible` flag. Controls and export buttons retain the prior release gates. Methods, scientific limitations and gated exports are under progressive disclosure.
- Changing investigation preserves the context month even if outside its bundled years, and shows that absence rather than silently selecting another date. Sensor choice survives Calendar remounts in session storage (with an in-memory fallback). The Props contract is unchanged.

## Accessibility and layout

SVG month controls have names, pressed states, visible focus, Enter/Space activation and arrow-key month navigation. All twelve can be reached by Tab. Native buttons/selects/range inputs provide alternative year navigation. The data table supplies a text alternative. The profile scrolls horizontally on small screens instead of compressing years into illegible columns. The wheel and insight panel stack below 760px. Missingness does not rely on color. No autoplay occurs on mount; the selected record's live region is muted during playback.

## Verification

`npm test`: 51 tests passed across 11 files, including seven new scientific tests for missing/zero semantics, incomplete-year concentration, ties, selected-year exclusion, range filtering, estimate eligibility and area encoding. `npm run build` and TypeScript checking pass. No generated data changed.

Integrated browser review is owned by the lead agent on the single shared desktop and is pending at this commit. Review the wheel at desktop and 390px widths; select an August petal, step years and play/pause; select a pre-VIIRS year and inspect hatching; compare a narrow year range; switch cases and ensure the selected date persists; inspect table and closed export gates; confirm reduced-motion playback is disabled. These UI actions have not been claimed as tested by this implementation agent.

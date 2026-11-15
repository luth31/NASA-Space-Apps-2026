# Report discovery pass

The main Report now has a fourth, first-class **Compare** lens. Its central visual overlays two monthly seasonal fingerprints on one calendar. The report supplies A's selected geography and year; the user independently chooses B's geography and year. Share-of-year and raw-count scales answer different questions. A visible sensor control uses the same instrument selection for both records.

The comparison includes exact month readouts and direct month-opening actions, peak timing, top-three-month concentration, months containing recorded detections, descriptive count changes, and contributions from the studies in A's scope. Peak and geographic contribution actions open the corresponding month in the existing ribbon. A tied peak is retained; opening its first month is explicitly labelled. Comparing a selected day/month uses its surrounding annual profile without silently replacing the original selection.

The visible evidence trail beneath the primary visual links the existing verified NASA/Copernicus reporting and research. It distinguishes publication dates, dates discussed by the source, and dates of local context imagery. Each source states what context it adds and its limits. It follows the selected geography and period, explicitly says when curated reporting is absent, and offers a route into the covered month. No new external sources or causal claims were introduced.

The lead reverified those source URLs during this pass. Attributed **Reported conditions** now appear in both the visible trail and original reading cards: NASA's 24 August 2023 article describes a hot/dry/windy forecast for 23 August; CAMS's 23 August article describes high winds and temperatures above 40°C in several places during the third August week; NASA's 12 August 2021 article describes a preceding heatwave and reduced moisture. Each is labelled as regional context, not individual ignition or detection attribution.

## Scientific boundaries

- Partial aggregate months are masked, even when one constituent study has a numeric count.
- Annual denominators, peak timing, concentration and deltas require complete source records. Share values also require a positive denominator; a complete zero year remains zero in raw mode and has no peak or annual shares.
- Unavailable VIIRS years stay unavailable; MODIS remains selectable for the earlier record. Unsupported regional years remain explicit gaps.
- Completeness refers to source sensor-month records, not cloud, swath, or observing effort. Counts depend on study area as well as sensor characteristics. They are not rates, unique fires or calibrated anomalies.
- No published data, models or release gates changed.

## Integration and validation

The initial Report implementation changes `web/src/report/**` and this document; the integrated branch also contains the contour and calendar work. `YearInFire` uses the existing manifest, selection and exact-month Explore contract. The ribbon, Across years, Two satellites, temporal keyboard/touch controls, pause, reduced motion, retry and missing-source states remain in place. New comparison month controls support click/tap, arrows, Home and End. On small screens the profile scrolls horizontally while readouts and controls stack.

`npm test -- src/report`: 31 tests across 7 files passed. New tests reconcile the 4,178/4,685 Greek VIIRS finding and regional contributions, compare Evros/Evia, retain unavailable Chaco/VIIRS years, mask partial aggregates, distinguish zero years, and preserve tied maxima. Production build passed, including the offline bundle (107 files, 20.5 MB in this branch). No browser or physical-device visual testing was performed by this agent; the lead owns rendered QA.


Integrated rendered QA and phone overflow fixes are complete; see [current verification](contours-and-patterns-verification.md). The final integrated suite has 59 passing tests in 13 files; the production offline core is 112 files / 20.7 MB. Earlier branch-only counts above are retained as implementation history.

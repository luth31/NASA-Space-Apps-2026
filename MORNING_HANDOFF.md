# Local handoff — 15 November 2026

The latest app is on **`experience/continuous-earth`**. The original globe now continuously unfolds into realistic NASA terrain with labelled red geographic contours; Calendar uses an interactive seasonal wheel; Report has seasonal ridgelines, year/place comparisons and dated evidence. The provisional identity remains **PyroBridge**. Everything remains local.

The [current visual verification](docs/continuous-earth-verification.md) records the redesign, browser observations, captures and limits. The deck, PDF and video below were preserved from the earlier overnight revision; they do not depict this latest redesign.

## Open the working preview

- Mac, production: **http://127.0.0.1:4173/**
- Same Wi-Fi phone: **http://192.168.1.115:4173/**
- Report: http://127.0.0.1:4173/?tab=report
- Quiet experiments and brand choices: http://127.0.0.1:4173/playground.html
- Development preview: http://127.0.0.1:5174/

The production and development processes were left running. The LAN address loaded successfully on the Mac; an actual iPhone was not tested. The phone must share the network and the Mac must remain awake. A temporary `caffeinate -di -t 7200` process was started around 08:52 EET, without changing lock/security settings. Keep the laptop awake for later review; LAN addresses may change.

To restart from this checkout:

```sh
cd '/Users/andramariasmarandache/Documents/Nasa Space Apps/NASA-Space-Apps-2026/web'
npm ci
npm run build
npm run preview -- --host 0.0.0.0 --port 4173 --strictPort
```

For development, use `npm run dev -- --host 0.0.0.0 --port 5174 --strictPort`. The pre-existing 5173 process was preserved. Do not start a second process on an occupied port. The public bundle is sufficient; no credentials or model rerun are required.

On localhost, wait for **OFFLINE BUNDLE READY**. The 118-file / ~24.7 MB core includes global observations, the three featured historical months, calendars, imagery, science, geography and the quiet review pages. Other point months cache after an online visit. Use **Update and reload** when offered after a new build. Offline readiness matches both app-build and data identities. LAN HTTP does not support service workers; use localhost for offline rehearsal. External articles need connectivity.

## Reviewable deliverables

| Deliverable | Local file |
|---|---|
| Editable seven-slide deck | [PowerPoint](deliverables/deck/pyrobridge-seven-slides.pptx) |
| Seven-page rendered companion | [PDF](deliverables/deck/pyrobridge-seven-slides.pdf) |
| Finished 29-second silent demo | [MP4](deliverables/demo/pyrobridge-29s.mp4) |
| Exact live route and fallback | [Runbook](deliverables/scripts/live-demo-runbook.md) |
| Three-minute English pitch | [Script](deliverables/scripts/pitch-3-minutes.md) |
| Five-minute English pitch | [Script](deliverables/scripts/pitch-5-minutes.md) |
| Romanian presentation notes | [Notes](deliverables/scripts/pitch-ro-notes.md) |
| 29-second interactive capture storyboard | [Storyboard](deliverables/scripts/short-demo-storyboard.md) |
| Actual application screenshots | [Captures](deliverables/captures/) |
| Six-name shortlist / three identities | [Brand review](docs/brand-review.md), [editable SVGs](web/public/brand/) |
| Submission text and credits | [Prepared copy](docs/submission-copy.md) |
| Competition evidence and unresolved rules | [Research](docs/competition-research.md) |
| Technology and visualization references | [Design references](docs/technology-references.md) |
| Numeric/scientific audit | [Evidence](docs/science-audit.md) |
| Current redesign evidence | [Verification](docs/continuous-earth-verification.md) |
| Earlier overnight / artifact evidence | [Verification](docs/verification.md) |

The MP4 is an explicitly labelled montage of actual still captures, with burned-in captions and an accompanying SRT. It is 1920×1080, 30 fps, 29.0 seconds, with no audio. It does not claim to be a continuous interaction recording. Six decoded scene-center frames were inspected. The separate storyboard supports recording the live interaction sequence later. The PPTX contains editable text, a native sensor table and a native four-control chart with an embedded workbook. Its PDF preserves the reviewed rendering but is raster-based. All seven slides and PDF pages were inspected; native Microsoft PowerPoint rendering was not tested.

## Design and evidence decisions

Explore starts with the original Globe and opens real filled geographic contours on zoom or **Explore by place**. Names and detection counts appear over continent country groups, named subregions, countries and Greece's administrative regions. Individual points appear after entering a local analytical sector in the contour atlas. Red shades represent counts, not severity or risk. Detailed administrative geography is currently bundled for Greece; other countries open analytical sectors. See [contour design](docs/contour-design.md). Earlier continuous unwrapping and ellipsoid transitions remain in the playground.

Calendar's twelve-petal wheel reveals seasonal shape, with year scrubbing/playback and a selectable historical profile for the same month. Report's new **Compare** lens overlays monthly profiles by year or study area, with raw/share scales, timing and concentration insights. The visible evidence trail adds publication/context/imagery dates and attributed reported conditions. These historical records describe study rectangles; they are not national totals or a live news feed.

Report's dominant ribbon uses one coherent envelope for the curve and illustrative light. The actual finding is **4,178 / 4,685 VIIRS detections in August 2023, 89% rounded**, across the Evros and Evia study rectangles. It is not a national total. Across years reports October as a busiest month in 10 of 14 complete monthly source-record years; this does not establish complete observing effort. Two satellites keeps sensors separate. Supported Explore↔Report transitions retain place, month and sensor; unsupported contexts explain the limitation and offer an explicit alternative.

The scientific bundle remains `20261114T172758Z`, observations-only. The global NOAA-20 snapshot covers 13 Nov 2026 00:15 UTC–14 Nov 13:33 UTC. Historical studies use Aqua MODIS and S-NPP VIIRS. The pilot has 48 eligible cell-passes,42 zero targets and 6 positive targets in 2 Greek regions. Mean regional MAEs are 4.125 unchanged,2.620 seasonal,5.924 negative binomial and11.221 LightGBM. Seasonal scaling wins this small feasibility sample. All 564 monthly rows remain gated; no harmonized estimates, intervals or investigation exports were unlocked. The next milestone is independently evaluated monthly observing effort and geographic/seasonal holdouts.

## Validation and known limits

- **63 frontend tests passed**, 14 files; TypeScript and the final production build passed. The offline core contains 118 files / 24.7 MB.
- Native Firefox checked the original globe, contour hierarchy, fitted Greece islands, Calendar playback/missing/zero/context, Report year/place comparison and dated evidence. The production preview displayed **OFFLINE BUNDLE READY** and was left on the globe.
- At 390×844 phone emulation, fixed Report page overflow and verified calendar/map layouts. No physical iPhone, Safari, multi-touch pinch or screen-reader session is claimed.
- Greece's generalized parent count is 86; the finer administrative polygons assign 83 of those observations, with 3 unmatched disclosed. Country borders and whole-country continent grouping are generalized.
- Earlier overnight verification includes 12 scientific tests and cached-server-loss recovery. Scientific inputs, models and gates were unchanged; the outage rehearsal was not repeated for this UI pass. See both verification records for precise scope.
- Presentation artifacts retain the earlier revision. Spoken pitch timings still need the presenter's rehearsal.

## Choices reserved for you

1. **Final brand.** Ashkey has the richest story and is the recommended visual direction, but a real software company already uses the name. Brasa and Vestige offer distinct alternatives. The shortlist also includes Ashchron, Cinder, Luma. None is cleared or selected.
2. **Registered-event rules.** The current NASA-hosted clarification says ≤30 seconds video **or** ≤7 slides including cover/closing. The direct guide was unavailable. Official GO answers establish the deadline as 15 Nov 23:59 in the Team Owner's registered-event timezone. If that event is Craiova, this is 23:59 EET / 21:59 UTC. Registration, current Craiova organizer/venue, earlier local cutoff and live pitch length remain unverified. Three/five minutes are working options, not confirmed local rules.
3. **Publication/submission.** Copy, credits and local files are ready for review; public URLs, final team details and any submission remain your decision. No external write is part of this delivery.

## Recovery and local Git milestones

Original branch `reports` remains at `f191f3a`. `2457593` preserves the in-scope uncommitted Report work and brief before implementation. Agent worktrees remain alongside the main checkout on `overnight/explore`, `overnight/report` and `overnight/research-brand`; no cleanup hides their history.

| Integrated commit | Milestone |
|---|---|
| `e5f1adf` | Report investigations and honest period comparisons |
| `eb8f150` | Scientific audit |
| `261677f` | Cross-section context and missing-source states |
| `11a3b3a` | Competition research and editable brand directions |
| `b3dab65`, `4768b8f` | Continuous atlas and geographic verification |
| `0055664`, `628ffbe` | Local ocean windows and scoped filter updates |
| `a724603` | Integrated app, offline review pages and actual captures |
| `375b25d` | Pitches, submission credits and storyboard |
| `648cf7c` | Final seven-slide PPTX/PDF |
| `ef31b8d` | Offline identity and controlled updates |
| `b1b72fb` | Verified 29-second MP4 and reproducible demo assets |

The final documentation commit adds this handoff and the [brief acceptance audit](docs/brief-acceptance.md); `git log --oneline` gives its exact ID. The integrated tree was checked for whitespace/conflict markers and deliberately staged. No remote push occurred.


## Latest redesign milestones

The redesign builds on the preserved overnight checkout. Integrated commits include `467f1c7` (original globe), `3d5e819` (season wheel), `39e5c88` (Report comparisons/evidence), `98b69cb` (filled contours), and `8f0d10c` (phone calendar controls). The final local commit adds responsive map/report fixes, shared sensor context, retained atlas prototypes, current captures and this verification. Use `git log --oneline` for its ID. No remote push or publication occurred.


The latest follow-up replaces the abrupt Globe/atlas swap with a reversible geographic mesh transition, adds detailed NASA terrain and 1:50m display outlines, and replaces Across years tiles with interactive seasonal ridgelines. See [continuous Earth verification](docs/continuous-earth-verification.md).

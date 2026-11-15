# Five-minute pitch — PyroBridge unified showcase

Working local slot, not a verified event rule. Rehearse with the seven-slide Markdown and `nasa-unified` live app. Imported binary slides/video show an earlier feature-branch product and are reference material only.

## 0:00–0:40 · Slide 1 · A longer record needs a fair comparison

A fire analyst reviewing a difficult season wants to know where observations concentrated, when activity was recorded and how that relates to earlier years. MODIS gives us a long archive; VIIRS sees with finer nominal resolution. Combining their raw counts can confuse a change in the instrument with a change in the landscape.

PyroBridge gives the analyst a connected investigation: geographic observations, historical cases, a seasonal calendar and an explicit test of calibration. It preserves each sensor's identity and makes the remaining limits visible.

## 0:40–1:20 · Slide 2 · Keep geographic context

Explore uses a persistent MapLibre canvas. Pan and zoom without changing mapping systems, select a location and inspect the observation record.

The current global snapshot contains 74,304 NOAA-20 VIIRS detections from 13 November 2026 at 00:15 UTC to 14 November at 13:33 UTC. Another 7,031 Aqua MODIS detections can be viewed separately or alongside them: 81,335 when both are displayed. This recent snapshot is separate from the historical study archive.

A marker is a thermal-pixel detection. It does not identify a unique incident, its cause or its ignition time.

## 1:20–2:05 · Slide 3 · Six investigations, two measurement scales

Investigations preserves six documented landscapes: Evros, Evia and Rhodes in Greece, Manavgat in Turkey, Gran Chaco in Argentina and Northern Pantanal in Brazil and Bolivia. These are rectangular study areas, not national inventories.

Open a case and move the Fire-Mesh comparison divider. Rose identifies Aqua MODIS and coral identifies S-NPP VIIRS. The toggleable meshes illustrate nominal one-kilometre versus 375-metre reference cells. Real scan footprints vary; the dossier retains the source scan and track dimensions. The mesh does not show a fire perimeter or burned land.

The original records, dated NASA context imagery, day/month filtering and individual observation selection stay available.

## 2:05–2:55 · Slide 4 · Follow the season and inspect the numbers

Fire Calendar adds a twelve-petal wheel alongside the existing monthly table and chart. A year scrubber makes seasonal concentration visible. Selecting a petal selects the month; observed counts and experimental harmonized counts use the same investigation context.

The monthly calibration experiment transfers reported MODIS archive counts toward a VIIRS-scale count. It has 648 overlapping region-months, thirteen whole-year holdouts, seasonal scaling and LightGBM. The transparent seasonal model beats raw MODIS in five of the six landscapes. Evia is the exception, so the app keeps regional errors and the raw baseline visible.

The labeled experimental CSV lets a reviewer inspect the numbers. Missing data remain different from zero. This is archive-count calibration: clouds and observation opportunities are not normalized, and no missing fire locations are reconstructed.

## 2:55–4:00 · Slide 5 · Try calibration, then examine the evidence

On Models and validation, choose a landscape, month and model. Move the calibration slider from the original MODIS count toward the estimated VIIRS-scale count. Reveal the actual VIIRS reading. The tiles illustrate counts, not estimated fire locations. The event month is the starting point; the presenter can choose any available month, including zeros and cases where calibration is worse.

A separate scientific pilot matches satellite passes, checks common usable coverage and withholds entire regions. It contains forty-eight eligible cell-pass rows across Evia and Evros: forty-two zero targets and six positive targets.

Seasonal scaling has a mean regional MAE of 2.620, versus 4.125 for the unchanged MODIS-rate control. Negative binomial scores 5.924 and LightGBM 11.221. The unit is hotspot pixels per 0.25-degree cell and paired pass. Those numbers must not be compared directly with monthly-count errors: they measure a different evaluation unit.

The result favors a simple baseline in this selected pilot. It does not establish global performance or a validated region-month history.

## 4:00–4:40 · Slide 6 · Useful today, with a strict release boundary

The working product has six destinations: Dashboard, Explore, Investigations, Fire calendar, Models and validation, and Data and sources. The unified build keeps the existing main architecture and adds the two visual investigation tools.

Experimental monthly estimates are available for transparent inspection and CSV export. The official coverage-normalized monthly product remains gated: monthlyRelease is false, with zero official published estimates. The next evidence is complete observation opportunities, a declared reference effort, wider regions and seasons, and independent monthly and later-time holdouts under a frozen protocol.

## 4:40–5:00 · Slide 7 · Invitation

NASA makes the observations available. Our contribution connects a readable geographic experience with seasonal inspection and reproducible, measured calibration.

Choose a place. Follow a season. Test the bridge before trusting the comparison.

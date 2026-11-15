# Five-minute expanded pitch — PyroBridge

Working live slot, not a verified Craiova rule. English; same seven slides. Target 5:00 at approximately 140 spoken words per minute, with roughly 20 seconds for pointing and transitions. Rehearse with the real laptop; cut the optional recurrence sentence first if time is short.

## 0:00–0:40 · Slide 1 · A user with a historical question

Imagine a fire manager reviewing a difficult season. They want to know where the observed activity concentrated, which months repeatedly stand out, and whether this year looks different from earlier years.

Satellites have recorded thermal activity for decades. Yet the longer record contains a difficult handover between instruments. Without understanding that handover, a dramatic chart can tell a misleading story.

PyroBridge is an investigation tool built around that problem. It makes the record and its limits understandable.

## 0:40–1:20 · Slide 2 · Why NASA data needs interpretation

The selected challenge asks for a burning-activity calendar that harmonizes MODIS and VIIRS hotspot records. NASA FIRMS supplies the observations at the center of our project.

MODIS and VIIRS differ in spatial resolution, sensitivity and observation schedules. Clouds and missing passes also change the opportunity to observe.

A hotspot is a detected thermal pixel. It is not necessarily one separate fire, a burned-area measurement, or an ignition time. Our interface preserves those distinctions instead of collapsing the records into one unexplained number.

## 1:20–2:00 · Slide 3 · A geographic journey

We start with a globe to create curiosity and orientation. It opens into an atlas, keeping geography recognizable as the user moves toward a place, a study region and individual observations.

Inspect the sensors side by side and open acquisition details. Back and Reset recover wider context.

The global snapshot and historical studies have separate dates and scopes. The three study rectangles do not represent complete continental or national inventories. That distinction remains visible as we move from Explore into Report.

## 2:00–2:50 · Slide 4 · Discovery in the observations

In the two Greek study rectangles, the 2023 VIIRS record contains 4,685 detections. August accounts for 4,178: about eighty-nine percent.

This is a useful concentration finding, and the visualization itself is the control. Inspect or select August, then move into a day and an acquisition hour. The surrounding time context remains visible.

Across years asks a different question. October is a busiest month in ten of fourteen years with complete monthly source records. Complete source records do not mean complete observing effort, so we describe recurring timing rather than a validated climate trend.

Two satellites keeps the instruments separate. Curated NASA and Copernicus reading gives context, with original dates and explicit limits on association.

## 2:50–3:55 · Slide 5 · A method and a measured result

Behind the interface is a reproducible scientific pipeline. We pin source files, match actual satellite pass times, estimate common usable coverage, and separate observed zero targets from unknown coverage.

We test the historical inference path using inputs available from Aqua MODIS. Geographic folds withhold whole study regions. We compare an unchanged-rate control, seasonal scaling, a negative-binomial model and LightGBM.

On this selected pilot, seasonal scaling has the lowest mean regional absolute error: about 2.62 hotspot pixels per quarter-degree cell and paired pass. LightGBM is worse, at about 11.22 in the same unit.

Complexity has not earned its place. It does not establish monthly accuracy. The sample contains forty-eight eligible examples across Evia and Evros, including forty-two zero targets and only six positive targets. The separate later-time check is exploratory.

## 3:55–4:35 · Slide 6 · Useful now, validation next

What works today is the real-data investigation: geography, temporal drilldown, source details, sensor comparison and an honest historical calendar. It helps analysts and educators form and investigate better questions.

Monthly harmonized estimates and their exports remain gated off. We have not demonstrated a forecasting system or operational fire-risk product.

The next milestone is a monthly validation bundle: complete observation opportunities, broader geography and seasons, a declared reference observing effort, and independent holdouts under a frozen protocol. The existing release policy then decides which outputs may be shown.

## 4:35–5:00 · Slide 7 · Invitation

Our goal is a continuous historical view people can trust. The first step is making both the observations and their limits understandable.

NASA provides the record. Our contribution is a coherent way to investigate it, plus a measured path toward harmonization.

Choose a place. Follow a season. See what the satellites actually recorded.

# Three-minute pitch — PyroBridge unified showcase

Working local slot; rehearse aloud. Seven-slide order matches `../deck/pyrobridge-seven-slides.md`. Use the live `nasa-unified` app. Imported PPTX/PDF/video are legacy feature-branch visuals. Say “detections,” not “individual fires.”

## 0:00–0:25 · Slide 1 · The problem

A fire analyst looking back at a difficult season needs a longer perspective. But a longer satellite record is not automatically a fair comparison. MODIS and VIIRS observe heat at different resolutions and with different opportunities to see the ground.

PyroBridge makes that difference visible, then tests how far we can bridge it.

## 0:25–0:50 · Slide 2 · Explore the observations

Our persistent MapLibre Explore map keeps geographic context as we pan, zoom and inspect observations. The separate global snapshot contains 74,304 NOAA-20 VIIRS detections from 13–14 November 2026. Aqua MODIS can be shown separately or alongside them.

These are satellite detections, not counts of distinct fires.

## 0:50–1:20 · Slide 3 · Investigate six landscapes

Investigations opens six historical cases: Evros, Evia, Rhodes, Manavgat, Gran Chaco and Northern Pantanal.

The Fire-Mesh slider compares rose MODIS markers with coral VIIRS markers over dated NASA imagery. The transparent cells show nominal one-kilometre and 375-metre reference spacing. They are not actual scan footprints or burned boundaries. Each observation keeps its original sensor, acquisition time and reported dimensions.

## 1:20–1:50 · Slide 4 · Read the season

Fire Calendar joins the existing monthly chart and table with a twelve-petal seasonal wheel. Scrub years and select a month to see seasonal concentration. Switch between observed counts and experimental harmonized counts, compare models and export the labeled CSV.

The monthly experiment uses 648 overlapping region-months. Seasonal scaling beats raw MODIS in five of six landscapes, with Evia showing why every regional score matters.

## 1:50–2:30 · Slide 5 · Test the bridge

Models and validation lets you move a calibration slider from the MODIS reading toward the estimated VIIRS-scale count, then reveal what VIIRS actually reported.

A separate matched-pass pilot evaluates 48 cell-pass rows across two held-out regions. Seasonal scaling scores a mean regional absolute error of 2.620, compared with 4.125 for the unchanged-rate control. The unit is hotspot pixels per quarter-degree cell and paired pass. That is feasibility evidence, not monthly validation.

## 2:30–2:50 · Slide 6 · Keep the release gate

Experimental monthly counts are visible and clearly labeled. Cloud and overpass effort are still unnormalized. The official monthly release stays false; no coverage-normalized historical series is approved by those experiments.

Data and sources makes provenance and limitations reviewable. Broader independent monthly validation is the next step.

## 2:50–3:00 · Slide 7 · Invitation

NASA provides the observations. PyroBridge connects geography, seasons and measured evidence.

Choose a place. Follow a season. Test the bridge before trusting the comparison.

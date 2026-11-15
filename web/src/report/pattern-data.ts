import type { CaseStudy } from "../data";
import { archiveBuckets, archiveCount } from "./report-data";
import type { ReportModel } from "./use-report";
import type { ReportSensor, Bucket } from "./report-data";

export interface PatternYear {
  year: number;
  buckets: Bucket[];
  total: number;
  complete: boolean;
  peak: number | null;
}

export function comparableSensorRatio(model: ReportModel) {
  const s = model.selection,
    prefix = s.record ? "" : (s.month ?? String(s.year));
  const a = archiveCount(model.cases, prefix, "modis"),
    b = archiveCount(model.cases, prefix, "viirs");
  return a.available === a.expected &&
    b.available === b.expected &&
    model.sensorCounts.modis &&
    model.sensorCounts.viirs !== null
    ? model.sensorCounts.viirs / model.sensorCounts.modis
    : null;
}
export function seasonalPatterns(cases: CaseStudy[], sensor: ReportSensor) {
  const years = [...new Set(cases.flatMap((c) => c.years))].sort(
    (a, b) => a - b,
  );
  const rows: PatternYear[] = years.map((year) => {
    const buckets = archiveBuckets(cases, {
      year,
      sensor,
      record: false,
      month: null,
      day: null,
      hour: null,
      geo: "all",
    });
    const total = buckets.reduce((n, b) => n + (b.value ?? 0), 0);
    // Twelve archive rows do not make S-NPP's partial 2012 observing year
    // complete. Match the calendar and monthly-calibration exclusion.
    const complete =
      !(year === 2012 && sensor !== "modis") &&
      buckets.every((b) => b.value !== null && b.available === b.expected);
    const peak =
      complete && total > 0
        ? buckets.reduce(
            (best, b, i) => (b.value! > buckets[best].value! ? i : best),
            0,
          )
        : null;
    return { year, buckets, total, complete, peak };
  });
  const eligible = rows.filter((r) => r.peak !== null);
  const frequencies = Array.from(
    { length: 12 },
    (_, month) =>
      eligible.filter(
        (r) =>
          r.buckets[month].value ===
          Math.max(...r.buckets.map((b) => b.value ?? 0)),
      ).length,
  );
  const peakMonth = eligible.length
    ? frequencies.indexOf(Math.max(...frequencies))
    : null;
  return {
    rows,
    eligible: eligible.length,
    peakMonth,
    frequency: peakMonth === null ? 0 : frequencies[peakMonth],
    frequencies,
  };
}

export interface Reading {
  id: string;
  title: string;
  publisher: string;
  date: string;
  kind: "Reporting" | "Research" | "Methods";
  url: string;
  summary: string;
  why: string;
  /** Attributed regional conditions reported by the source, never an ignition assignment. */
  conditions?: string;
  year?: number;
  month?: number;
  regions?: string[];
  image?: string;
  imageDate?: string;
  /** Dates discussed by the article, not an inferred incident/detection match. */
  contextFrom?: string;
  contextTo?: string;
}
// Curated primary sources, verified 2026-11-15. These are context, not linked incident classifications.
export const readings: Reading[] = [
  {
    id: "greece-2023",
    title: "Wildfires Rage in Greece",
    publisher: "NASA Earth Observatory",
    date: "24 Aug 2023",
    kind: "Reporting",
    year: 2023,
    month: 8,
    contextFrom: "2023-08-22",
    contextTo: "2023-08-23",
    regions: ["all", "europe", "greece", "evros"],
    url: "https://science.nasa.gov/earth/earth-observatory/wildfires-rage-in-greece-151736/",
    summary:
      "Satellite imagery documents the smoke plume from northeastern Greece on 22 August 2023.",
    why: "Adds regional context to the August peak. The article covers a wider area than our study boundaries.",
    conditions:
      "NASA's 24 August report describes a forecast of hot, dry and windy weather for 23 August. These are regional conditions, not a finding about what ignited a particular fire.",
    image: "/assets/evros-2023-08-22.jpg",
    imageDate: "Local context image · 22 Aug 2023 · NASA GIBS / Aqua MODIS",
  },
  {
    id: "cams-2023",
    title: "August wildfires ravage northern & central Greece",
    publisher: "Copernicus CAMS",
    date: "23 Aug 2023",
    kind: "Reporting",
    year: 2023,
    month: 8,
    contextFrom: "2023-08-20",
    contextTo: "2023-08-23",
    regions: ["all", "europe", "greece", "evros"],
    url: "https://atmosphere.copernicus.eu/august-wildfires-ravage-northern-central-greece",
    summary:
      "CAMS describes the August fires, smoke transport, and atmospheric monitoring in Greece.",
    why: "Emissions and smoke are separate measurements; this report’s detection counts do not estimate either.",
    conditions:
      "CAMS reported on 23 August that high winds and temperatures above 40°C in several places during the third week of August were conducive to increased fire activity. This does not identify the cause of any individual detection.",
  },
  {
    id: "evia-2021",
    title: "Fire Consumes Large Swaths of Greece",
    publisher: "NASA Earth Observatory",
    date: "12 Aug 2021",
    kind: "Reporting",
    year: 2021,
    month: 8,
    contextFrom: "2021-08-01",
    contextTo: "2021-08-12",
    regions: ["all", "europe", "greece", "evia"],
    url: "https://science.nasa.gov/earth/earth-observatory/fire-consumes-large-swaths-of-greece-148682/",
    summary:
      "NASA’s imagery and reporting document the fires on Evia in August 2021.",
    why: "A historical counterpart for exploring the timing of the recorded activity.",
    conditions:
      "NASA's 12 August report places the fires after a severe heatwave that reduced moisture. It provides regional background, not an attribution of an individual ignition.",
    image: "/assets/evia-2021-08-10.jpg",
    imageDate: "Local context image · 10 Aug 2021 · NASA GIBS / Aqua MODIS",
  },
  {
    id: "viirs-paper",
    title: "The New VIIRS 375 m Active Fire Detection Data Product",
    publisher: "Schroeder et al. · Remote Sensing of Environment",
    date: "2014",
    kind: "Research",
    url: "https://directreadout.sci.gsfc.nasa.gov/publications_documents/Schroeder_et_al_2014b_RSE.pdf",
    summary:
      "The peer-reviewed algorithm paper explains the VIIRS detection method and its initial assessment.",
    why: "Explains why satellite characteristics matter when interpreting the same scene. It does not validate this app’s harmonization models.",
  },
  {
    id: "viirs-methods",
    title: "How VIIRS sees active fire",
    publisher: "NASA Goddard",
    date: "Undated · checked 15 Nov 2026",
    kind: "Methods",
    url: "https://viirsland.gsfc.nasa.gov/Products/NASA/FireESDR.html",
    summary:
      "NASA describes its independent 375 m and 750 m active-fire products and their MODIS heritage.",
    why: "Provides the measurement context behind the satellite comparison.",
  },
];
export function relatedReadings(
  geo: string,
  year: number,
  month: string | null,
  archive: boolean,
  day: string | null = null,
) {
  return readings.filter(
    (r) =>
      !r.year ||
      (r.regions?.includes(geo) &&
        (archive || r.year === year) &&
        (!month || r.month === Number(month.slice(5))) &&
        (!day ||
          ((!r.contextFrom || day >= r.contextFrom) &&
            (!r.contextTo || day <= r.contextTo)))),
  );
}

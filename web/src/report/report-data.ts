import type { CaseStudy, Observation } from "../data";

export type ReportSensor = "all" | "modis" | "viirs";
export type Concept =
  | "gallery"
  | "story"
  | "dashboard"
  | "timeline"
  | "mosaic"
  | "tapestry"
  | "sculpture"
  | "split"
  | "dispatch"
  | "sequencer";
export type Experiment = Exclude<Concept, "gallery">;
export type Geography =
  | "all"
  | "europe"
  | "greece"
  | "evros"
  | "evia"
  | "south-america"
  | "chaco";
export interface Selection {
  year: number;
  record: boolean;
  month: string | null;
  day: string | null;
  hour: string | null;
  geo: Geography;
  sensor: ReportSensor;
}
export const initialSelection: Selection = {
  year: 2023,
  record: false,
  month: null,
  day: null,
  hour: null,
  geo: "all",
  sensor: "viirs",
};
export const geoNames: Record<Geography, string> = {
  all: "All Report study areas",
  europe: "Europe",
  greece: "Greece study group",
  evros: "Evros",
  evia: "Evia",
  "south-america": "South America",
  chaco: "Gran Chaco",
};
export const geoPaths: Record<Geography, Geography[]> = {
  all: ["all"],
  europe: ["all", "europe"],
  greece: ["all", "europe", "greece"],
  evros: ["all", "europe", "greece", "evros"],
  evia: ["all", "europe", "greece", "evia"],
  "south-america": ["all", "south-america"],
  chaco: ["all", "south-america", "chaco"],
};
export const geoChildren: Record<Geography, Geography[]> = {
  all: ["europe", "south-america"],
  europe: ["greece"],
  greece: ["evros", "evia"],
  evros: [],
  evia: [],
  "south-america": ["chaco"],
  chaco: [],
};
export function casesForGeo(cases: CaseStudy[], geo: Geography) {
  return cases.filter(
    (c) =>
      (geo === "all" && ["evros", "evia", "chaco"].includes(c.id)) ||
      ((geo === "europe" || geo === "greece") &&
        ["evros", "evia"].includes(c.id)) ||
      (geo === "south-america" && c.id === "chaco") ||
      c.id === geo,
  );
}
export function sensorMatches(row: Observation, sensor: ReportSensor) {
  return (
    sensor === "all" || row.sensor === (sensor === "modis" ? "MODIS" : "VIIRS")
  );
}
/** Keep the cached annual lens valid even when geography changes in archive mode. */
export function geographySelection(
  cases: CaseStudy[],
  selection: Selection,
  geo: Geography,
): Selection {
  const years = casesForGeo(cases, geo).flatMap((c) => c.years);
  return {
    ...selection,
    geo,
    ...(years.includes(selection.year)
      ? {}
      : { year: Math.max(...years), month: null, day: null, hour: null }),
  };
}
export interface Count {
  value: number | null;
  available: number;
  expected: number;
}
/** Preserve missing sensor/month records; never turn an absent archive into zero. */
export function archiveCount(
  cases: CaseStudy[],
  prefix: string,
  sensor: ReportSensor,
): Count {
  let value = 0,
    available = 0,
    expected = 0;
  const keys: ("modis" | "viirs")[] =
    sensor === "all" ? ["modis", "viirs"] : [sensor];
  for (const c of cases) {
    const months = c.months.filter((m) => m.month.startsWith(prefix));
    const expectedMonths =
      prefix.length === 7 ? 1 : prefix.length === 4 ? 12 : c.months.length;
    expected += expectedMonths * keys.length;
    for (const m of months)
      for (const key of keys) {
        if (m[key] != null) {
          value += m[key]!;
          available++;
        }
      }
  }
  return { value: available ? value : null, available, expected };
}
export interface Bucket extends Count {
  key: string;
  label: string;
}
export function archiveBuckets(
  cases: CaseStudy[],
  selection: Selection,
): Bucket[] {
  const keys = selection.record
    ? [...new Set(cases.flatMap((c) => c.years))]
        .sort((a, b) => a - b)
        .map(String)
    : Array.from(
        { length: 12 },
        (_, i) => `${selection.year}-${String(i + 1).padStart(2, "0")}`,
      );
  return keys.map((key) => ({
    key,
    label: key.length === 4 ? key : monthName(key),
    ...archiveCount(cases, key, selection.sensor),
  }));
}
export function observationBuckets(
  rows: Observation[],
  selection: Selection,
): Bucket[] {
  const isDay = !!selection.day;
  const count = isDay
    ? 24
    : new Date(
        Date.UTC(selection.year, Number(selection.month!.slice(5)), 0),
      ).getUTCDate();
  const values = new Map<string, number>();
  for (const row of rows) {
    if (!sensorMatches(row, selection.sensor)) continue;
    const key = row.time.slice(0, isDay ? 13 : 10);
    values.set(key, (values.get(key) ?? 0) + 1);
  }
  return Array.from({ length: count }, (_, i) => {
    const key = isDay
      ? `${selection.day}T${String(i).padStart(2, "0")}`
      : `${selection.month}-${String(i + 1).padStart(2, "0")}`;
    return {
      key,
      label: isDay ? `${String(i).padStart(2, "0")}` : `${i + 1}`,
      value: values.get(key) ?? 0,
      available: 1,
      expected: 1,
    };
  });
}
export function selectedRows(rows: Observation[], s: Selection) {
  return rows.filter(
    (r) =>
      sensorMatches(r, s.sensor) &&
      (!s.day || r.time.startsWith(s.day)) &&
      (!s.hour || r.time.startsWith(s.hour)),
  );
}
export function monthName(key: string, long = false) {
  return new Date(`${key}-01T12:00:00Z`).toLocaleDateString("en-GB", {
    month: long ? "long" : "short",
    timeZone: "UTC",
  });
}
export function periodLabel(s: Selection) {
  if (s.record) return "Full archive";
  if (s.hour)
    return `${s.day} · ${s.hour.slice(11)}:00–${s.hour.slice(11)}:59 UTC`;
  if (s.day)
    return new Date(`${s.day}T12:00:00Z`).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    });
  if (s.month) return `${monthName(s.month, true)} ${s.year}`;
  return `${s.year} annual overview`;
}
export function previousPrefix(s: Selection) {
  if (s.record) return null;
  if (s.hour)
    return new Date(new Date(`${s.hour}:00:00Z`).getTime() - 3600000)
      .toISOString()
      .slice(0, 13);
  if (s.day)
    return new Date(new Date(`${s.day}T12:00:00Z`).getTime() - 86400000)
      .toISOString()
      .slice(0, 10);
  if (s.month)
    return new Date(Date.UTC(s.year, Number(s.month.slice(5)) - 2, 1))
      .toISOString()
      .slice(0, 7);
  return String(s.year - 1);
}
export function rawChange(current: Count, previous: Count) {
  if (
    current.value == null ||
    previous.value == null ||
    previous.value === 0 ||
    current.available !== current.expected ||
    previous.available !== previous.expected
  )
    return null;
  return ((current.value - previous.value) / previous.value) * 100;
}

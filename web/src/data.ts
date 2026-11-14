export type Sensor = "MODIS" | "VIIRS" | "NOAA-20";
export type ObservationTuple = [
  string,
  number,
  number,
  string,
  Sensor,
  string,
  number | null,
  number,
  number,
  string,
  string,
  number,
];
export interface Observation {
  id: string;
  lon: number;
  lat: number;
  time: string;
  sensor: Sensor;
  confidence: string;
  frp: number | null;
  scan: number;
  track: number;
  version: string;
  daynight: string;
  type: number;
}
export interface MapMarker {
  key: string;
  o: Observation;
  x: number;
  y: number;
  count: number;
}
/** Cluster within one sensor; every retained observation contributes once. */
export function clusterMarkers(
  points: MapMarker[],
  cellSize: number,
  pinnedId?: string,
) {
  if (cellSize <= 0) return points;
  const groups = new Map<string, MapMarker>();
  for (const point of points) {
    const key =
      point.o.id === pinnedId
        ? point.o.id
        : `${point.o.sensor}:${Math.floor(point.x / cellSize)}:${Math.floor(point.y / cellSize)}`;
    const group = groups.get(key);
    if (!group) groups.set(key, { ...point, key });
    else {
      group.x =
        (group.x * group.count + point.x * point.count) /
        (group.count + point.count);
      group.y =
        (group.y * group.count + point.y * point.count) /
        (group.count + point.count);
      group.count += point.count;
      if ((point.o.frp ?? 0) > (group.o.frp ?? 0)) group.o = point.o;
    }
  }
  return [...groups.values()];
}
export interface Month {
  month: string;
  modis: number | null;
  viirs: number | null;
  estimate: number | null;
  interval: [number, number] | null;
  coverage: string;
  status: string;
  eligible: boolean;
  model?: string;
  modelSha256?: string;
  referenceEffortId?: string;
  unit?: string;
  historicalYears?: string[];
}
export interface CaseStudy {
  id: string;
  name: string;
  country: string;
  sourceCountries?: string[];
  eyebrow: string;
  date: string;
  window: [string, string];
  bbox: [number, number, number, number];
  sceneBounds: [number, number, number, number];
  center: [number, number];
  image: string;
  description: string;
  context: {
    title: string;
    publisher: string;
    url: string;
    relation: string;
  }[];
  months: Month[];
  contextMonths?: Pick<Month, "month" | "modis" | "viirs">[];
  years: number[];
  rawCount: number;
  sceneCount: number;
  harmonized: boolean;
  supportReason: string;
  versions: string[];
  coverage: string;
}
export interface Manifest {
  schemaVersion: number;
  bundleVersion: string;
  builtAt: string;
  snapshotStart: string;
  snapshotEnd: string;
  globalCount: number;
  globalSensor: string;
  globalSource: string;
  globalProcessing: string;
  sources: {
    url: string;
    file: string;
    bytes: number;
    sha256: string;
    seconds: number;
  }[];
  buildSeconds: number;
  validationStatus: string;
  cases: CaseStudy[];
}
export interface ModelReport {
  status: string;
  trainedAt: string;
  totalRows: number;
  requestedRows?: number;
  independentRegions?: number;
  episodeGroups?: number;
  unit?: string;
  seconds: number;
  label: string;
  limitation: string;
  models: {
    name: string;
    family: string;
    status: string;
    seconds?: number;
    mae?: number;
    bias?: number;
    skill?: number | null;
    folds?: { region: string; n: number; mae: number; bias: number }[];
    chronological?: { n: number; mae: number; bias: number } | null;
  }[];
  provenance?: Record<string, unknown>;
}
export interface CoverageReport {
  seconds: number;
  monthlyRelease: boolean;
  pairs: {
    id: string;
    region: string;
    date: string;
    commonAreaKM2?: number;
    commonFractionAOI?: number;
    eligibleCells?: number;
    requestedCells?: number;
    medianPassGapSeconds?: number | null;
    error?: string;
  }[];
  sources: Record<
    string,
    { product: string; url: string; bytes: number; sha256: string }
  >;
}

export const number = (n: number | null | undefined) =>
  n == null
    ? "—"
    : new Intl.NumberFormat("en", { maximumFractionDigits: 1 }).format(n);
export const integer = (n: number) =>
  new Intl.NumberFormat("en", { maximumFractionDigits: 0 }).format(n);
export const dateLabel = (
  date: string,
  options: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "short",
    year: "numeric",
  },
) =>
  new Date(date.length === 10 ? `${date}T12:00:00Z` : date).toLocaleDateString(
    "en-GB",
    { ...options, timeZone: "UTC" },
  );
export const timeLabel = (date: string) =>
  new Date(date).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  }) + " UTC";
export const coordinates = (lon: number, lat: number) =>
  `${Math.abs(lat).toFixed(3)}° ${lat >= 0 ? "N" : "S"}  ${Math.abs(lon).toFixed(3)}° ${lon >= 0 ? "E" : "W"}`;
export const sensorLabel = (sensor: Sensor) =>
  sensor === "MODIS"
    ? "Aqua · MODIS"
    : sensor === "VIIRS"
      ? "S-NPP · VIIRS"
      : "NOAA-20 · VIIRS";
export const typeLabel = (type: number) =>
  ({
    0: "Presumed vegetation fire",
    1: "Volcano",
    2: "Other static land source",
    3: "Offshore source",
  })[type] ?? "Source type not classified";
export const decode = (rows: ObservationTuple[]): Observation[] =>
  rows.map((r) => ({
    id: r[0],
    lon: r[1],
    lat: r[2],
    time: r[3],
    sensor: r[4],
    confidence: r[5],
    frp: r[6],
    scan: r[7],
    track: r[8],
    version: r[9],
    daynight: r[10],
    type: r[11],
  }));
const cache = new Map<string, Promise<Observation[]>>();
export function loadObservations(path: string) {
  if (!cache.has(path))
    cache.set(
      path,
      fetch(path)
        .then((r) => {
          if (!r.ok)
            throw new Error(`Observation data unavailable (${r.status})`);
          return r.json();
        })
        .then(decode)
        .catch((e) => {
          cache.delete(path);
          throw e;
        }),
    );
  return cache.get(path)!;
}
export function project(
  lon: number,
  lat: number,
  bounds: [number, number, number, number],
) {
  return [
    ((lon - bounds[0]) / (bounds[2] - bounds[0])) * 1000,
    ((bounds[3] - lat) / (bounds[3] - bounds[1])) * 1000,
  ];
}
export function within(o: Observation, bbox: [number, number, number, number]) {
  return (
    o.lon >= bbox[0] && o.lon < bbox[2] && o.lat >= bbox[1] && o.lat < bbox[3]
  );
}
export function distance(a: Observation, b: Observation) {
  const r = Math.PI / 180;
  const p = (b.lat - a.lat) * r;
  const l = (b.lon - a.lon) * r;
  const h =
    Math.sin(p / 2) ** 2 +
    Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(l / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.min(1, Math.sqrt(h)));
}
export function historicalMedian(
  months: Month[],
  selected: string,
  field: "modis" | "viirs" | "estimate",
) {
  const v = months
    .filter(
      (m) =>
        m.month.slice(5) === selected.slice(5) &&
        m.month.slice(0, 4) !== selected.slice(0, 4) &&
        m.eligible &&
        m[field] !== null,
    )
    .map((m) => m[field] as number)
    .sort((a, b) => a - b);
  return {
    value: v.length
      ? (v[Math.floor((v.length - 1) / 2)] + v[Math.ceil((v.length - 1) / 2)]) /
        2
      : null,
    n: v.length,
  };
}

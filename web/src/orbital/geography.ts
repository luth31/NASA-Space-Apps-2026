import type { MultiPolygon } from "geojson";
import type { Observation } from "../data";

export type Point = [number, number];
export type Bounds = [number, number, number, number];
type MapUnit = {
  id: string;
  name: string;
  continent: string;
  region: string;
  point: Point;
  polygons: MultiPolygon["coordinates"];
};
export type Geography = {
  features: MapUnit[];
  land: MultiPolygon["coordinates"];
  motionLand: MultiPolygon["coordinates"];
  assignments: Record<string, number>;
};

export type Area = {
  id: string;
  name: string;
  kind: "continent" | "region" | "country" | "sector";
  parent?: string;
  point: Point;
  geometry?: MultiPolygon;
  bounds?: Bounds;
  rows: Observation[];
  peak: Observation | null;
  daytime: number;
};

const continents: Record<string, Point> = {
  Africa: [20, 6],
  Asia: [89, 36],
  Europe: [20, 51],
  "North America": [-105, 41],
  "South America": [-60, -15],
  Oceania: [142, -22],
  Antarctica: [0, -79],
  "Seven seas (open ocean)": [0, -30],
};
const regions: Record<string, Point> = {
  "Eastern Africa": [38, -7],
  "Middle Africa": [23, 4],
  "Northern Africa": [13, 26],
  "Southern Africa": [24, -28],
  "Western Africa": [-5, 12],
  "Central Asia": [66, 44],
  "Eastern Asia": [115, 37],
  "South-Eastern Asia": [109, 5],
  "Southern Asia": [78, 22],
  "Western Asia": [44, 30],
  "Eastern Europe": [39, 55],
  "Northern Europe": [11, 62],
  "Southern Europe": [17, 42],
  "Western Europe": [4, 49],
  Caribbean: [-74, 18],
  "Central America": [-94, 18],
  "Northern America": [-111, 47],
  "Australia and New Zealand": [136, -25],
  Melanesia: [151, -8],
  Micronesia: [149, 11],
  Polynesia: [-156, -16],
};

function area(
  id: string,
  name: string,
  kind: Area["kind"],
  point: Point,
  parent?: string,
): Area {
  return {
    id,
    name,
    kind,
    point,
    parent,
    rows: [],
    peak: null,
    daytime: 0,
  };
}

function add(group: Area, observation: Observation) {
  group.rows.push(observation);
  if (observation.daynight === "D") group.daytime += 1;
  if (!group.peak || (observation.frp ?? -1) > (group.peak.frp ?? -1)) {
    group.peak = observation;
  }
}

const ocean = "Outside mapped land";
const geometry = (coordinates: MultiPolygon["coordinates"]): MultiPolygon => ({
  type: "MultiPolygon",
  coordinates,
});

export function groupGeography(data: Geography, rows: Observation[]) {
  const continentGroups = new Map<string, Area>();
  const regionGroups = new Map<string, Area>();
  const countries = data.features.map((unit) => {
    const continent =
      continentGroups.get(unit.continent) ??
      area(
        unit.continent,
        unit.continent,
        "continent",
        continents[unit.continent] ?? unit.point,
      );
    const region =
      regionGroups.get(unit.region) ??
      area(
        unit.region,
        unit.region,
        "region",
        regions[unit.region] ?? unit.point,
      );
    (continent.geometry ??= geometry([])).coordinates.push(...unit.polygons);
    (region.geometry ??= geometry([])).coordinates.push(...unit.polygons);
    continentGroups.set(continent.id, continent);
    regionGroups.set(region.id, region);
    return {
      ...area(unit.id, unit.name, "country", unit.point, continent.id),
      geometry: geometry(unit.polygons),
    };
  });
  const unmatched = area(ocean, ocean, "region", [0, -25]);
  for (const row of rows) {
    const index = data.assignments[row.id];
    const unit = data.features[index];
    if (!unit) {
      add(unmatched, row);
      continue;
    }
    add(countries[index], row);
    add(continentGroups.get(unit.continent)!, row);
    add(regionGroups.get(unit.region)!, row);
  }
  function byCount(a: Area, b: Area) {
    return b.rows.length - a.rows.length || a.name.localeCompare(b.name);
  }
  return {
    continents: [...continentGroups.values()].sort(byCount),
    regions: [...regionGroups.values(), unmatched].sort(byCount),
    countries: countries.sort(byCount),
    land: geometry(data.land),
    motionLand: geometry(data.motionLand),
    unmatched,
  };
}

function gridStart(value: number, size: number, limit: number) {
  return Math.min(limit - size, Math.floor(value / size) * size);
}
function axis(value: number, positive: string, negative: string) {
  return value === 0
    ? "0°"
    : `${Math.abs(value)}°${value > 0 ? positive : negative}`;
}

export function grid(rows: Observation[], size: number) {
  const cells = new Map<string, Area>();
  for (const row of rows) {
    const west = gridStart(row.lon, size, 180);
    const south = gridStart(row.lat, size, 90);
    const id = `${size}:${west}:${south}`;
    let cell = cells.get(id);
    if (!cell) {
      const name = `${axis(south, "N", "S")}  ${axis(west, "E", "W")}`;
      cell = area(id, name, "sector", [west + size / 2, south + size / 2]);
      cell.bounds = [west, south, west + size, south + size];
      cells.set(id, cell);
    }
    add(cell, row);
  }
  return [...cells.values()].sort((a, b) => b.rows.length - a.rows.length);
}

export function cellOutline([w, s, e, n]: Bounds): MultiPolygon {
  const ring: Point[] = [[w, s]];
  // Sample latitude edges so geodesic rendering does not bow the grid.
  const steps = Math.ceil((e - w) / 0.5);
  for (let i = 0; i <= steps; i++) ring.push([w + ((e - w) * i) / steps, n]);
  for (let i = steps; i >= 0; i--) ring.push([w + ((e - w) * i) / steps, s]);
  return geometry([[ring]]);
}

export function signalClusters(rows: Observation[], size: number) {
  return grid(rows, size).map((cell) => {
    let lon = 0;
    let lat = 0;
    for (const row of cell.rows) {
      lon += row.lon;
      lat += row.lat;
    }
    const count = cell.rows.length;
    return { ...cell, point: [lon / count, lat / count] as Point };
  });
}

export function boundsOf(area: Area): Bounds {
  if (area.bounds) return [...area.bounds];
  if (!area.geometry) return [-180, -65, 180, 85];
  const longitudes = new Set<number>();
  let south = 90;
  let north = -90;
  for (const polygon of area.geometry.coordinates) {
    for (const [lon, lat] of polygon[0]) {
      longitudes.add((lon + 360) % 360);
      south = Math.min(south, lat);
      north = Math.max(north, lat);
    }
  }
  const ordered = [...longitudes].sort((a, b) => a - b);
  let gap = -1;
  let west = ordered[0];
  for (let i = 0; i < ordered.length; i++) {
    const next = ordered[i + 1] ?? ordered[0] + 360;
    if (next - ordered[i] > gap) {
      gap = next - ordered[i];
      west = next % 360;
    }
  }
  if (west > 180) west -= 360;
  return [west, south, west + 360 - gap, north];
}

export function frameFor(area: Area | null): Bounds {
  if (!area) return [-180, -90, 180, 90];
  const [w, s, e, n] = boundsOf(area);
  const px = Math.min(Math.max(0.3, (e - w) * 0.12), (360 - (e - w)) / 2);
  const py = Math.max(0.25, (n - s) * 0.14);
  return [w - px, Math.max(-90, s - py), e + px, Math.min(90, n + py)];
}

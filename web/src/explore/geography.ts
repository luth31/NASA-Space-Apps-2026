import type { Observation } from "../data";

export type Bounds = [number, number, number, number];
export interface Country {
  type: "Feature";
  properties: {
    NAME_EN: string;
    CONTINENT: string;
    ISO_A3: string;
    SUBREGION?: string;
  };
  geometry: {
    type: "Polygon" | "MultiPolygon";
    coordinates: number[][][] | number[][][][];
  };
}
export interface GeoData {
  features: Country[];
}
export interface Sector {
  key: string;
  lon: number;
  lat: number;
  count: number;
  bounds: Bounds;
  rows: Observation[];
}
export const RAD = Math.PI / 180;
export const WORLD: Bounds = [-180, -80, 180, 85];
export const continents: {
  name: string;
  bounds: Bounds;
  center: [number, number];
}[] = [
  { name: "Europe", bounds: [-15, 32, 45, 72], center: [17, 51] },
  { name: "Africa", bounds: [-20, -36, 53, 38], center: [18, 2] },
  { name: "Asia", bounds: [26, -10, 180, 75], center: [95, 40] },
  { name: "South America", bounds: [-83, -57, -33, 14], center: [-59, -21] },
  { name: "North America", bounds: [-170, 5, -50, 75], center: [-105, 42] },
  { name: "Oceania", bounds: [110, -48, 180, 10], center: [139, -25] },
];
export function inBounds(o: { lon: number; lat: number }, b: Bounds) {
  return o.lon >= b[0] && o.lon < b[2] && o.lat >= b[1] && o.lat < b[3];
}
/** A local map window, shifted within the atlas seam and polar limits. */
export function localWindow(lon: number, lat: number): Bounds {
  const wrapped = ((((lon + 180) % 360) + 360) % 360) - 180;
  const west = Math.max(-180, Math.min(168, wrapped - 6));
  const south = Math.max(-90, Math.min(80, lat - 5));
  return [west, south, west + 12, south + 10];
}
export function polygons(country: Country): number[][][][] {
  return country.geometry.type === "Polygon"
    ? [country.geometry.coordinates as number[][][]]
    : (country.geometry.coordinates as number[][][][]);
}
export function countryBounds(country: Country): Bounds {
  const points = polygons(country).flat(2);
  return [
    Math.min(...points.map((p) => p[0])),
    Math.min(...points.map((p) => p[1])),
    Math.max(...points.map((p) => p[0])),
    Math.max(...points.map((p) => p[1])),
  ];
}
function inRing(lon: number, lat: number, ring: number[][]) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i],
      b = ring[j];
    if (
      a[1] > lat !== b[1] > lat &&
      lon < ((b[0] - a[0]) * (lat - a[1])) / (b[1] - a[1]) + a[0]
    )
      inside = !inside;
  }
  return inside;
}
export function contains(country: Country, lon: number, lat: number) {
  return polygons(country).some(
    (p) =>
      inRing(lon, lat, p[0]) && !p.slice(1).some((r) => inRing(lon, lat, r)),
  );
}
/** Reapply current sensor/day-night rows without widening the selected source scope. */
export function observationsInScope(
  rows: Observation[],
  bounds: Bounds,
  country?: Country,
  sourceBounds?: Bounds,
) {
  return rows.filter(
    (o) =>
      inBounds(o, bounds) &&
      (!sourceBounds || inBounds(o, sourceBounds)) &&
      (!country || contains(country, o.lon, o.lat)),
  );
}
/** A spherical rectangle area, not a map-projection area. */
export function areaKm2(b: Bounds) {
  return (
    6371.0088 ** 2 *
    (b[2] - b[0]) *
    RAD *
    Math.abs(Math.sin(b[3] * RAD) - Math.sin(b[1] * RAD))
  );
}
export function sectors(rows: Observation[], degrees: number): Sector[] {
  const bins = new Map<string, Sector>();
  for (const o of rows) {
    const w = Math.floor(o.lon / degrees) * degrees,
      s = Math.floor(o.lat / degrees) * degrees;
    const key = `${w.toFixed(4)}:${s.toFixed(4)}`;
    const bin = bins.get(key);
    if (bin) {
      bin.count++;
      bin.rows.push(o);
    } else
      bins.set(key, {
        key,
        lon: w + degrees / 2,
        lat: s + degrees / 2,
        count: 1,
        bounds: [w, s, w + degrees, s + degrees],
        rows: [o],
      });
  }
  return [...bins.values()];
}
export function coordinate(
  lon: number,
  lat: number,
  unfold: number,
  meridian = 0,
  radius = 1.45,
): [number, number, number] {
  const l = (lon - meridian) * RAD,
    p = lat * RAD;
  return [
    radius * Math.cos(p) * Math.sin(l) * (1 - unfold) + lon * RAD * unfold,
    radius * Math.sin(p) * (1 - unfold) + p * unfold,
    radius * Math.cos(p) * Math.cos(l) * (1 - unfold),
  ];
}

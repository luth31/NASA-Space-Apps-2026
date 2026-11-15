import type { Observation } from "../data";
import type { Bounds, Country } from "./geography";
import { contains, countryBounds, inBounds, polygons } from "./geography";

export interface CountRegion {
  id: string;
  name: string;
  features: Country[];
  rows: Observation[];
  kind: "continent" | "subregion" | "country" | "admin" | "sector";
  center?: [number, number];
  bounds?: Bounds;
}
/** Stable first-containing-polygon ownership; no detection is counted twice. */
export function partitionRegions(rows: Observation[], features: Country[]) {
  const indexed = features.map((feature) => ({
    feature,
    bounds: countryBounds(feature),
  }));
  const groups = new Map(features.map((f) => [f, [] as Observation[]]));
  const unassigned: Observation[] = [];
  for (const row of rows) {
    const match = indexed.find(
      ({ feature, bounds }) =>
        inBounds(row, bounds) && contains(feature, row.lon, row.lat),
    );
    if (match) groups.get(match.feature)!.push(row);
    else unassigned.push(row);
  }
  return { groups, unassigned };
}
export const redScale = ["#fae5d8", "#f6b39b", "#e87967", "#c94b4a", "#8d2838"];
/** One threshold set for all siblings; zero and unknown never share a class. */
export function countThresholds(max: number): number[] {
  if (max <= 0) return [1, 2, 3, 4, 5];
  const step = Math.max(1, Math.ceil(max / 5));
  return Array.from({ length: 5 }, (_, i) => step * (i + 1));
}
export function countFill(count: number | null, thresholds: number[]) {
  if (count === null) return "url(#atlas-missing)";
  if (count === 0) return "#34463f";
  return redScale[
    Math.max(
      0,
      Math.min(
        4,
        thresholds.findIndex((t) => count <= t) < 0
          ? 4
          : thresholds.findIndex((t) => count <= t),
      ),
    )
  ];
}
export function fitProjection(bounds: Bounds, width = 1000, height = 570) {
  const cosine = Math.max(
    0.25,
    Math.cos((((bounds[1] + bounds[3]) / 2) * Math.PI) / 180),
  );
  const dx = Math.max(0.001, (bounds[2] - bounds[0]) * cosine),
    dy = Math.max(0.001, bounds[3] - bounds[1]);
  const scale = Math.min((width - 90) / dx, (height - 70) / dy);
  const offsetX = (width - dx * scale) / 2,
    offsetY = (height - dy * scale) / 2;
  return {
    project: (lon: number, lat: number): [number, number] => [
      offsetX + (lon - bounds[0]) * cosine * scale,
      offsetY + (bounds[3] - lat) * scale,
    ],
    invert: (x: number, y: number): [number, number] => [
      (x - offsetX) / scale / cosine + bounds[0],
      bounds[3] - (y - offsetY) / scale,
    ],
  };
}
export function contourPath(
  features: Country[],
  project: (lon: number, lat: number) => [number, number],
) {
  return features
    .flatMap((feature) =>
      polygons(feature).flatMap((p) =>
        p.map(
          (ring) =>
            ring
              .map((p, i) => {
                const [x, y] = project(p[0], p[1]);
                return `${i ? "L" : "M"}${x.toFixed(2)},${y.toFixed(2)}`;
              })
              .join("") + "Z",
        ),
      ),
    )
    .join("");
}
/** Interior label of the largest outer ring, avoiding oceans between distant islands. */
export function labelPoint(features: Country[]): [number, number] {
  const feature = [...features].sort((a, b) => {
    const x = countryBounds(a),
      y = countryBounds(b);
    return (y[2] - y[0]) * (y[3] - y[1]) - (x[2] - x[0]) * (x[3] - x[1]);
  })[0];
  const rings = polygons(feature).map((p) => p[0]);
  const ring = [...rings].sort((a, b) => b.length - a.length)[0];
  const mean: [number, number] = [
    ring.reduce((s, p) => s + p[0], 0) / ring.length,
    ring.reduce((s, p) => s + p[1], 0) / ring.length,
  ];
  if (contains(feature, ...mean)) return mean;
  const b = countryBounds(feature);
  for (let y = 1; y < 10; y++)
    for (let x = 1; x < 10; x++) {
      const candidate: [number, number] = [
        b[0] + ((b[2] - b[0]) * x) / 10,
        b[1] + ((b[3] - b[1]) * y) / 10,
      ];
      if (contains(feature, ...candidate)) return candidate;
    }
  return ring[0] as [number, number];
}

import { describe, expect, it } from "vitest";
import {
  areaKm2,
  contains,
  coordinate,
  countryBounds,
  inBounds,
  sectors,
} from "./geography";
import type { Country } from "./geography";
import type { Observation } from "../data";
import countries from "../../public/assets/geography/countries-110m.json";

const o = (lon: number, lat: number, id = "a") =>
  ({ id, lon, lat }) as Observation;
describe("atlas geographic invariants", () => {
  it("preserves every source detection exactly once in half-open grid bins", () => {
    const observations = [
      o(-0.01, -0.01, "a"),
      o(0, 0, "b"),
      o(0.5, 0.5, "c"),
      o(-0.5, -0.5, "d"),
      o(179.99, 89.99, "e"),
    ];
    const bins = sectors(observations, 0.5);
    expect(bins.reduce((sum, b) => sum + b.count, 0)).toBe(observations.length);
    expect(new Set(bins.flatMap((b) => b.rows.map((r) => r.id))).size).toBe(
      observations.length,
    );
    for (const bin of bins)
      for (const row of bin.rows) expect(inBounds(row, bin.bounds)).toBe(true);
  });
  it("calculates spherical rectangular area and latitude contraction", () => {
    expect(areaKm2([-180, -90, 180, 90])).toBeCloseTo(510065880.973, 0);
    expect(areaKm2([0, 60, 1, 61])).toBeLessThan(areaKm2([0, 0, 1, 1]) * 0.51);
    expect(areaKm2([0, 0, 0, 1])).toBe(0);
  });
  it("keeps projection anchors on the same geographic coordinates throughout morph", () => {
    for (const [lon, lat] of [
      [23.7, 38],
      [-60, -25],
      [0, 0],
      [90, 45],
    ]) {
      const sphere = coordinate(lon, lat, 0);
      expect(Math.hypot(...sphere)).toBeCloseTo(1.45, 10);
      const flat = coordinate(lon, lat, 1);
      expect(flat[0]).toBeCloseTo((lon * Math.PI) / 180, 10);
      expect(flat[1]).toBeCloseTo((lat * Math.PI) / 180, 10);
      expect(flat[2]).toBe(0);
      const halfway = coordinate(lon, lat, 0.5);
      halfway.forEach((value, i) =>
        expect(value).toBeCloseTo((sphere[i] + flat[i]) / 2, 10),
      );
    }
  });
  it("uses country polygons rather than their enclosing rectangles", () => {
    const greece = countries.features.find(
      (c) => c.properties.NAME_EN === "Greece",
    ) as Country;
    expect(contains(greece, 23.73, 37.98)).toBe(true);
    expect(contains(greece, 26.1, 44.43)).toBe(false);
    expect(countryBounds(greece)[0]).toBeLessThan(23.73);
  });
  it("excludes polygon holes and supports multiple polygons", () => {
    const country: Country = {
      type: "Feature",
      properties: { NAME_EN: "test", CONTINENT: "test", ISO_A3: "t" },
      geometry: {
        type: "MultiPolygon",
        coordinates: [
          [
            [
              [0, 0],
              [4, 0],
              [4, 4],
              [0, 4],
              [0, 0],
            ],
            [
              [1, 1],
              [3, 1],
              [3, 3],
              [1, 3],
              [1, 1],
            ],
          ],
          [
            [
              [10, 10],
              [12, 10],
              [12, 12],
              [10, 12],
              [10, 10],
            ],
          ],
        ],
      },
    };
    expect(contains(country, 0.5, 0.5)).toBe(true);
    expect(contains(country, 2, 2)).toBe(false);
    expect(contains(country, 11, 11)).toBe(true);
  });
});

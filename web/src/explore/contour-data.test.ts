import { describe, expect, it } from "vitest";
import {
  countFill,
  countThresholds,
  fitProjection,
  partitionRegions,
  redScale,
} from "./contour-data";
import type { Country } from "./geography";
import type { Observation } from "../data";
import countries from "../../public/assets/geography/countries-110m.json";
import greekRegions from "../../public/assets/geography/greece-admin1.json";
import snapshot from "../../public/data/global.json";
import { decode } from "../data";
const box = (name: string, x: number): Country => ({
  type: "Feature",
  properties: { NAME_EN: name, CONTINENT: "test", ISO_A3: name },
  geometry: {
    type: "Polygon",
    coordinates: [
      [
        [x, 0],
        [x + 2, 0],
        [x + 2, 2],
        [x, 2],
        [x, 0],
      ],
    ],
  },
});
describe("filled-contour counts", () => {
  it("assigns overlapping polygons once, preserves unassigned points and reapplies filtered input", () => {
    const a = box("A", 0),
      b = box("B", 1);
    const rows = [
      { id: "day", lon: 1.5, lat: 1, daynight: "D" },
      { id: "night", lon: 2.5, lat: 1, daynight: "N" },
      { id: "outside", lon: 8, lat: 1, daynight: "D" },
    ] as Observation[];
    const result = partitionRegions(rows, [a, b]);
    expect(result.groups.get(a)?.map((o) => o.id)).toEqual(["day"]);
    expect(result.groups.get(b)?.map((o) => o.id)).toEqual(["night"]);
    expect(result.unassigned.map((o) => o.id)).toEqual(["outside"]);
    const night = partitionRegions(
      rows.filter((o) => o.daynight === "N"),
      [a, b],
    );
    expect(night.groups.get(a)).toHaveLength(0);
    expect(night.groups.get(b)).toHaveLength(1);
  });
  it("has a monotone numeric sibling scale and distinct zero/unknown encodings", () => {
    const t = countThresholds(86);
    expect(t).toEqual([18, 36, 54, 72, 90]);
    expect(countFill(0, t)).not.toBe(countFill(null, t));
    expect(countFill(18, t)).toBe(redScale[0]);
    expect(countFill(19, t)).toBe(redScale[1]);
    expect(countFill(86, t)).toBe(redScale[4]);
  });
  it("maps projected interaction coordinates back to original geographic coordinates", () => {
    const p = fitProjection([19, 34, 30, 42]);
    const xy = p.project(23.73, 37.98);
    const ll = p.invert(...xy);
    expect(ll[0]).toBeCloseTo(23.73, 10);
    expect(ll[1]).toBeCloseTo(37.98, 10);
  });
  it("ships real Greek administrative regions and conserves the parent source sample", () => {
    expect(
      countries.features.find((f) => f.properties.NAME_EN === "Greece")
        ?.properties.SUBREGION,
    ).toBe("Southern Europe");
    expect(greekRegions.features).toHaveLength(14);
    expect(
      greekRegions.features.filter((f) => f.properties.TYPE === "Region"),
    ).toHaveLength(13);
    expect(
      greekRegions.features.some((f) => f.properties.NAME_EN === "Mount Athos"),
    ).toBe(true);
    const greek = countries.features.find(
      (c) => c.properties.NAME_EN === "Greece",
    ) as Country;
    const rows = decode(snapshot as Parameters<typeof decode>[0]);
    const parent = partitionRegions(rows, [greek]).groups.get(greek)!;
    const children = partitionRegions(
      parent,
      greekRegions.features as Country[],
    );
    const counts = [...children.groups.values()].reduce(
      (n, group) => n + group.length,
      0,
    );
    expect(counts + children.unassigned.length).toBe(parent.length);
    expect(parent.length).toBeGreaterThan(0);
    expect(
      new Set([...children.groups.values()].flat().map((o) => o.id)).size,
    ).toBe(counts);
  });
});

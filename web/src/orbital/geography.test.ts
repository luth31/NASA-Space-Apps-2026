import { describe, expect, it } from "vitest";
import { decode } from "../data";
import type { ObservationTuple } from "../data";
import { boundsOf, grid, groupGeography, signalClusters } from "./geography";
import type { Area, Geography } from "./geography";
import geography from "./map-units.json";
import snapshot from "../../public/data/global.json";
import manifest from "../../public/data/manifest.json";

const rows = decode(snapshot as ObservationTuple[]);
const groups = groupGeography(geography as unknown as Geography, rows);
const ids = (areas: Area[]) =>
  areas.flatMap((a) => a.rows.map((r) => r.id)).sort();
const sourceIds = rows.map((r) => r.id).sort();

describe("atlas observation accounting", () => {
  it("publishes both sensors within the snapshot window and reconciles their counts", () => {
    const counts = { MODIS: 0, "NOAA-20": 0, VIIRS: 0 };
    for (const row of rows) {
      counts[row.sensor]++;
      expect(
        row.time >= manifest.snapshotStart && row.time <= manifest.snapshotEnd,
      ).toBe(true);
    }
    expect(counts.MODIS).toBeGreaterThan(0);
    expect(counts["NOAA-20"]).toBeGreaterThan(0);
    expect(counts.VIIRS).toBe(0);
    expect(manifest.globalSensorCounts).toEqual({
      MODIS: counts.MODIS,
      "NOAA-20": counts["NOAA-20"],
    });
    expect(manifest.globalCount).toBe(rows.length);
  });
  it("retains every observation exactly once, including points outside mapped land", () => {
    expect(ids(groups.regions)).toEqual(sourceIds);
    expect(ids([...groups.countries, groups.unmatched])).toEqual(sourceIds);
    expect(groups.unmatched.rows.length).toBeGreaterThan(0);
  });
  it("preserves counts and source IDs at both globe and regional scales", () => {
    expect(ids(signalClusters(rows, 7))).toEqual(sourceIds);
    for (const region of groups.regions) {
      expect(ids(grid(region.rows, 2))).toEqual(
        region.rows.map((r) => r.id).sort(),
      );
    }
  });
  it("frames regions across the date line without zooming out to the whole world", () => {
    const region = groups.regions.find(
      (a) => a.id === "Australia and New Zealand",
    )!;
    const [west, south, east, north] = boundsOf(region);
    expect(east - west).toBeLessThan(90);
    for (const { lon, lat } of region.rows) {
      const wrapped = west + ((((lon - west) % 360) + 360) % 360);
      expect(wrapped).toBeLessThanOrEqual(east + 0.1);
      expect(lat).toBeGreaterThanOrEqual(south - 0.1);
      expect(lat).toBeLessThanOrEqual(north + 0.1);
    }
  });
});

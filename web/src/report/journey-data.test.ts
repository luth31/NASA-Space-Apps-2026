import { describe, expect, it } from "vitest";
import {
  journeyInitial,
  journeySelection,
  ribbonGeometry,
} from "./journey-data";
import { archiveBuckets, casesForGeo, archiveCount } from "./report-data";
import manifestData from "../../public/data/manifest.json";
import type { Manifest } from "../data";

const cases = casesForGeo(
  (manifestData as unknown as Manifest).cases,
  "greece",
);
describe("A Year in Fire journey", () => {
  it("starts with complete study-area coverage and conserves the annual count", () => {
    const count = archiveCount(cases, "2023", journeyInitial.sensor);
    expect(count).toEqual({ value: 4685, available: 24, expected: 24 });
    expect(
      archiveBuckets(cases, journeyInitial).reduce(
        (n, b) => n + (b.value ?? 0),
        0,
      ),
    ).toBe(count.value);
  });
  it("drills to an hour, returns through each parent, and restores the selected annual lens from the archive", () => {
    const month = journeySelection(journeyInitial, {
      type: "period",
      key: "2023-08",
    });
    const day = journeySelection(month, { type: "period", key: "2023-08-22" });
    const hour = journeySelection(day, {
      type: "period",
      key: "2023-08-22T10",
    });
    expect(hour).toMatchObject({
      year: 2023,
      month: "2023-08",
      day: "2023-08-22",
      hour: "2023-08-22T10",
      record: false,
    });
    expect(journeySelection(hour, { type: "back" })).toEqual(day);
    expect(journeySelection(day, { type: "back" })).toEqual(month);
    expect(journeySelection(month, { type: "back" })).toEqual(journeyInitial);
    const archive = journeySelection(hour, { type: "archive" });
    expect(archive).toMatchObject({
      record: true,
      year: 2023,
      month: null,
      day: null,
      hour: null,
    });
    expect(journeySelection(archive, { type: "year", year: 2023 })).toEqual(
      journeyInitial,
    );
  });
  it("retains the exact time when geography has no record instead of silently replacing it", () => {
    const hour = journeySelection(journeyInitial, {
      type: "period",
      key: "2023-08-22T10",
    });
    const changed = journeySelection(hour, { type: "geo", geo: "chaco" });
    expect(changed).toEqual({ ...hour, geo: "chaco" });
    const chaco = casesForGeo(
      (manifestData as unknown as Manifest).cases,
      changed.geo,
    );
    expect(
      archiveCount(chaco, changed.month!, changed.sensor).value,
    ).toBeNull();
    expect(journeySelection(changed, { type: "reset" })).toEqual(
      journeyInitial,
    );
  });
  it("keeps count heights linear and paths compatible across temporal resolutions", () => {
    const buckets = [
      { key: "a", label: "A", value: 100, available: 1, expected: 1 },
      { key: "b", label: "B", value: 50, available: 1, expected: 1 },
    ];
    const geometry = ribbonGeometry(buckets);
    expect(geometry.points[0].y).toBe(54);
    expect(geometry.points.at(-1)!.y).toBe(151.5);
    expect(249 - geometry.points[0].y).toBe(
      (249 - geometry.points.at(-1)!.y) * 2,
    );
    expect(geometry.points).toHaveLength(
      ribbonGeometry(archiveBuckets(cases, journeyInitial)).points.length,
    );
    expect(ribbonGeometry([]).line).not.toMatch(/NaN|Infinity/);
  });
});

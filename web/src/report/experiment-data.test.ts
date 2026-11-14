import { describe, it, expect } from "vitest";
import { treemap, sensorBuckets } from "./experiment-data";
import { concepts, parseConcept } from "./concepts";
import { readPicks } from "./use-idea-picks";
import type { ReportModel } from "./use-report";
import { decode, within } from "../data";
import type { Manifest, ObservationTuple } from "../data";
import manifestData from "../../public/data/manifest.json";
import evros from "../../public/data/observations/evros/2023-08.json";
import evia from "../../public/data/observations/evia/2023-08.json";
import { casesForGeo, initialSelection } from "./report-data";
describe("report experiment integrity", () => {
  it("gives each positive count its proportional area without inventing area for missing or zero counts", () => {
    const tiles = treemap([
      { key: "a", label: "A", value: 900 },
      { key: "b", label: "B", value: 100 },
      { key: "zero", label: "Zero", value: 0 },
      { key: "gap", label: "Missing", value: null },
    ]);
    expect(tiles.map((t) => t.key)).toEqual(["a", "b"]);
    expect(tiles.reduce((n, t) => n + t.w * t.h, 0)).toBeCloseTo(10000);
    expect(tiles[0].w * tiles[0].h).toBeCloseTo(9000);
    expect(tiles[1].w * tiles[1].h).toBeCloseTo(1000);
    expect(
      tiles.every(
        (t) =>
          t.x >= 0 &&
          t.y >= 0 &&
          t.x + t.w <= 100.00001 &&
          t.y + t.h <= 100.00001,
      ),
    ).toBe(true);
    expect(treemap([{ key: "none", label: "None", value: null }])).toEqual([]);
  });
  it("keeps both satellite series when the main lens selects just VIIRS", () => {
    const manifest = manifestData as unknown as Manifest,
      cases = casesForGeo(manifest.cases, "greece");
    const rows = [evros, evia].flatMap((raw, i) =>
      decode(raw as ObservationTuple[]).filter((o) => within(o, cases[i].bbox)),
    );
    const model = {
      selection: {
        ...initialSelection,
        geo: "greece",
        month: "2023-08",
        day: "2023-08-22",
      },
      cases,
      allRows: rows,
      ready: true,
      sensorCounts: { modis: 346, viirs: 1938 },
    } as ReportModel;
    expect(
      sensorBuckets(model, "modis").reduce((n, b) => n + (b.value ?? 0), 0),
    ).toBe(346);
    expect(
      sensorBuckets(model, "viirs").reduce((n, b) => n + (b.value ?? 0), 0),
    ).toBe(1938);
    expect(
      sensorBuckets(
        { ...model, sensorCounts: { modis: null, viirs: 1938 } },
        "modis",
      ).every((b) => b.value === null),
    ).toBe(true);
  });
  it("exposes nine distinct preview routes and opens unrecognized routes in the gallery", () => {
    expect(concepts).toHaveLength(9);
    expect(new Set(concepts.map((c) => c.id)).size).toBe(9);
    for (const c of concepts) expect(parseConcept(c.id)).toBe(c.id);
    expect(parseConcept(null)).toBe("gallery");
    expect(parseConcept("unknown")).toBe("gallery");
  });
  it("loads only known picks and bounds private notes without choosing anything by default", () => {
    expect(readPicks(null)).toEqual({});
    expect(readPicks("broken")).toEqual({});
    const picks = readPicks(
      JSON.stringify({
        mosaic: {
          parts: ["Visuals", "Visuals", "bad"],
          note: "x".repeat(2500),
        },
        unknown: { parts: ["Whole idea"] },
      }),
    );
    expect(picks.mosaic?.parts).toEqual(["Visuals"]);
    expect(picks.mosaic?.note).toHaveLength(2000);
    expect(Object.keys(picks)).toEqual(["mosaic"]);
  });
});

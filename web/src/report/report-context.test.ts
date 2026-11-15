import { describe, expect, it } from "vitest";
import type { Manifest } from "../data";
import manifestData from "../../public/data/manifest.json";
import {
  selectionFromContext,
  exploreContextForSelection,
} from "./report-context";
import { journeyInitial } from "./journey-data";
import { comparePeriods } from "./comparison-data";
import { casesForGeo, archiveCount } from "./report-data";

const cases = (manifestData as unknown as Manifest).cases;

describe("Report context and descriptive period comparisons", () => {
  it("retains explicit unsupported dates and sensor selections in a known study", () => {
    expect(
      selectionFromContext(cases, {
        caseId: "chaco",
        month: "2023-08",
        sensor: "modis",
      }),
    ).toMatchObject({
      geo: "chaco",
      year: 2023,
      month: "2023-08",
      sensor: "modis",
    });
    expect(
      selectionFromContext(cases, {
        caseId: "evros",
        month: "2008-02",
        sensor: "viirs",
      }),
    ).toMatchObject({
      geo: "evros",
      year: 2008,
      month: "2008-02",
      sensor: "viirs",
    });
    expect(selectionFromContext(cases)).toEqual(journeyInitial);
    expect(
      selectionFromContext(cases, { caseId: "france", month: "2023-08" }),
    ).toBeNull();
    expect(
      selectionFromContext(cases, { caseId: "evros", month: "2023-99" }),
    ).toBeNull();
  });
  it("only offers an explicit map handoff for one supported study and a named month", () => {
    expect(exploreContextForSelection(cases, journeyInitial)).toBeNull();
    expect(
      exploreContextForSelection(cases, { ...journeyInitial, geo: "evros" }),
    ).toEqual({ caseId: "evros", month: "2023-08", sensor: "viirs" });
    expect(
      exploreContextForSelection(cases, {
        ...journeyInitial,
        geo: "evia",
        month: "2023-02",
        day: "2023-02-01",
      }),
    ).toEqual({ caseId: "evia", month: "2023-02", sensor: "viirs" });
    expect(
      exploreContextForSelection(cases, { ...journeyInitial, geo: "chaco" }),
    ).toBeNull();
    expect(
      exploreContextForSelection(cases, {
        ...journeyInitial,
        geo: "evros",
        record: true,
      }),
    ).toBeNull();
  });
  it("compares raw counts only across complete same-resolution source records", () => {
    const greek = casesForGeo(cases, "greece");
    const result = comparePeriods(greek, "2023-08", "2021-08", "viirs");
    expect(result.current.value).toBe(4178);
    const reference = archiveCount(greek, "2021-08", "viirs");
    expect(result.difference).toBe(4178 - reference.value!);
    expect(result.percent).toBeCloseTo((4178 / reference.value! - 1) * 100);
    expect(
      comparePeriods(cases, "2023", "2021", "viirs").difference,
    ).toBeNull();
    expect(comparePeriods(greek, "2023", "2011", "viirs").percent).toBeNull();
    expect(
      comparePeriods(greek, "2023-08", "2021", "viirs").percent,
    ).toBeNull();
  });
  it("retains zero reference records without manufacturing a percentage", () => {
    const evia = cases.find((c) => c.id === "evia")!;
    const zero = evia.months.find((m) => m.viirs === 0)!;
    const result = comparePeriods([evia], "2021-08", zero.month, "viirs");
    expect(result.reference.value).toBe(0);
    expect(result.difference).toBe(result.current.value);
    expect(result.percent).toBeNull();
    expect(result.reason).toContain("undefined");
  });
});

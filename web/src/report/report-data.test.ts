import { describe, expect, it } from "vitest";
import type { CaseStudy, Manifest, ObservationTuple } from "../data";
import { decode, within } from "../data";
import manifestData from "../../public/data/manifest.json";
import evrosAugust from "../../public/data/observations/evros/2023-08.json";
import eviaAugust from "../../public/data/observations/evia/2023-08.json";
import {
  archiveBuckets,
  archiveCount,
  casesForGeo,
  geographySelection,
  initialSelection,
  observationBuckets,
  previousPrefix,
  rawChange,
  selectedRows,
} from "./report-data";

const manifest = manifestData as unknown as Manifest;
const greekCases = casesForGeo(manifest.cases, "greece");
const augustRows = [evrosAugust, eviaAugust].flatMap((tuples, i) =>
  decode(tuples as ObservationTuple[]).filter((o) =>
    within(o, greekCases[i].bbox),
  ),
);

describe("report data integrity", () => {
  it("keeps the Report aggregate consistent with its supported geography drill-down", () => {
    const supported = casesForGeo(manifest.cases, "all");
    expect(supported.map((study) => study.id)).toEqual([
      "evros",
      "evia",
      "chaco",
    ]);
    const children = [
      ...casesForGeo(manifest.cases, "europe"),
      ...casesForGeo(manifest.cases, "south-america"),
    ];
    expect(archiveCount(supported, "2020", "viirs")).toEqual(
      archiveCount(children, "2020", "viirs"),
    );
  });
  it("keeps an unavailable sensor distinct from a reported zero", () => {
    expect(archiveCount(greekCases, "2005", "viirs").value).toBeNull();
    expect(archiveCount(greekCases, "2023-04", "viirs").value).toBe(0);
    expect(
      archiveBuckets(greekCases, { ...initialSelection, year: 2005 }).every(
        (b) => b.value === null,
      ),
    ).toBe(true);
  });
  it("marks partial geography and suppresses incomplete previous-period comparisons", () => {
    const originalStudies = manifest.cases.filter((study) =>
      ["evros", "evia", "chaco"].includes(study.id),
    );
    const current = archiveCount(originalStudies, "2023", "viirs");
    expect(current).toEqual({ value: 4685, available: 24, expected: 36 });
    expect(
      rawChange(current, archiveCount(originalStudies, "2022", "viirs")),
    ).toBeNull();
    expect(
      rawChange(
        archiveCount(greekCases, "2023", "viirs"),
        archiveCount(greekCases, "2022", "viirs"),
      ),
    ).toBeCloseTo(537.4149, 3);
  });
  it("conserves real detections from monthly summaries through daily and hourly buckets", () => {
    const s = { ...initialSelection, geo: "greece" as const, month: "2023-08" };
    const days = observationBuckets(augustRows, s);
    expect(days.reduce((n, b) => n + (b.value ?? 0), 0)).toBe(
      archiveCount(greekCases, "2023-08", "viirs").value,
    );
    expect(days.find((b) => b.key === "2023-08-22")?.value).toBe(1938);
    const day = { ...s, day: "2023-08-22" };
    const hours = observationBuckets(augustRows, day);
    expect(hours).toHaveLength(24);
    expect(hours.reduce((n, b) => n + (b.value ?? 0), 0)).toBe(1938);
    expect(
      selectedRows(augustRows, { ...day, hour: "2023-08-22T10" }),
    ).toHaveLength(545);
  });
  it("respects UTC boundaries, leap days, and the previous period", () => {
    const feb = { ...initialSelection, year: 2024, month: "2024-02" };
    expect(observationBuckets([], feb)).toHaveLength(29);
    expect(previousPrefix({ ...feb, day: "2024-03-01" })).toBe("2024-02-29");
    expect(
      previousPrefix({ ...feb, day: "2024-02-01", hour: "2024-02-01T00" }),
    ).toBe("2024-01-31T23");
    expect(previousPrefix({ ...initialSelection, month: "2023-01" })).toBe(
      "2022-12",
    );
  });
  it("does not invent country assignments for the cross-border case", () => {
    const chaco = casesForGeo(manifest.cases, "south-america");
    expect(chaco.map((c: CaseStudy) => c.id)).toEqual(["chaco"]);
    expect(archiveCount(chaco, "2023", "all").value).toBeNull();
  });
  it("keeps archive mode and a valid annual lens when moving to a one-year geography", () => {
    const next = geographySelection(
      manifest.cases,
      { ...initialSelection, record: true, year: 2005 },
      "chaco",
    );
    expect(next).toMatchObject({
      record: true,
      year: 2020,
      geo: "chaco",
      month: null,
      day: null,
      hour: null,
    });
    const narrowed = geographySelection(
      manifest.cases,
      { ...initialSelection, month: "2023-08", day: "2023-08-22" },
      "evros",
    );
    expect(narrowed).toMatchObject({
      year: 2023,
      month: "2023-08",
      day: "2023-08-22",
      geo: "evros",
    });
  });
});

import { describe, it, expect } from "vitest";
import type { Manifest } from "../data";
import data from "../../public/data/manifest.json";
import { seasonalPatterns } from "./pattern-data";
import { casesForGeo } from "./report-data";
import { seasonalValues, ridgePath } from "./ridge-data";
const manifest = data as unknown as Manifest;
const row = seasonalPatterns(
  casesForGeo(manifest.cases, "greece"),
  "viirs",
).rows.find((r) => r.year === 2023)!;
describe("seasonal ridgelines", () => {
  it("reconciles the observed Greek August share and count", () => {
    expect(seasonalValues(row, "count")[7]).toBe(4178);
    expect(seasonalValues(row, "share")[7]).toBeCloseTo(4178 / 4685);
    expect(
      seasonalValues(row, "share").reduce<number>((s, v) => s + (v ?? 0), 0),
    ).toBeCloseTo(1);
  });
  it("withholds annual shape for incomplete years and breaks partial monthly counts", () => {
    const partial = {
      ...row,
      complete: false,
      buckets: row.buckets.map((b, i) =>
        i === 4 ? { ...b, available: 0 } : b,
      ),
    };
    expect(seasonalValues(partial, "share").every((v) => v === null)).toBe(
      true,
    );
    expect(seasonalValues(partial, "count")[4]).toBeNull();
    expect(seasonalValues(partial, "count")[7]).toBe(4178);
  });
  it("retains recorded zero and leaves its undefined annual share empty", () => {
    const zero = {
      ...row,
      total: 0,
      buckets: row.buckets.map((b) => ({ ...b, value: 0 })),
    };
    expect(seasonalValues(zero, "count")).toEqual(Array(12).fill(0));
    expect(seasonalValues(zero, "share")).toEqual(Array(12).fill(null));
  });
  it("does not draw through a missing month or overshoot an observed peak", () => {
    const paths = ridgePath([0, 1, null, 0.5, 0], 1, 100);
    expect(paths).toHaveLength(2);
    expect(paths[0]).toContain("L174,48");
    expect(paths[1]).toContain("L312,74");
    expect(paths.join(" ")).not.toContain("243,");
    expect(ridgePath([null, null], 1, 100)).toEqual([]);
  });
});

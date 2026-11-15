import { describe, expect, it } from "vitest";
import { particleLayout } from "./particle-layout";
import type { Bucket } from "./report-data";
const buckets = [null, 0, 100, 900].map((value, i) => ({
  key: String(i),
  label: String(i),
  value,
  available: value === null ? 0 : 1,
  expected: 1,
})) as Bucket[];
describe("particle visualization semantics", () => {
  it("assigns no particles to missing data or reported zero", () => {
    const points = particleLayout(buckets, "orbit");
    expect(points).toHaveLength(1000);
    expect(points.filter((p) => p.group === 2)).toHaveLength(100);
    expect(points.filter((p) => p.group === 3)).toHaveLength(900);
    expect(points.every((p) => p.group >= 2)).toBe(true);
  });
  it("preserves data weights while morphing between visual forms", () => {
    const orbit = particleLayout(buckets, "orbit");
    for (const shape of ["columns", "river"] as const) {
      const points = particleLayout(buckets, shape);
      expect(points.map((p) => p.group)).toEqual(orbit.map((p) => p.group));
      expect(
        points.every(
          (p) =>
            Number.isFinite(p.x) &&
            Number.isFinite(p.y) &&
            p.x >= 0 &&
            p.x <= 1 &&
            p.y >= 0 &&
            p.y <= 1,
        ),
      ).toBe(true);
    }
  });
  it("caps dense scenes while retaining their relative volume", () => {
    const points = particleLayout(
      buckets.map((b) => ({
        ...b,
        value: b.value === null ? null : b.value * 1000,
      })),
      "orbit",
    );
    expect(points).toHaveLength(1500);
    expect(points.filter((p) => p.group === 3)).toHaveLength(1350);
  });
  it("leaves an unavailable or empty archive visibly empty", () => {
    expect(particleLayout(buckets.slice(0, 2), "river")).toEqual([]);
  });
});

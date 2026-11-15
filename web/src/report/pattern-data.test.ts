import { describe, expect, it } from "vitest";
import type { Manifest } from "../data";
import manifestData from "../../public/data/manifest.json";
import { casesForGeo, archiveBuckets, initialSelection } from "./report-data";
import {
  seasonalPatterns,
  relatedReadings,
  comparableSensorRatio,
} from "./pattern-data";
import { ribbonGeometry, ribbonParticles } from "./journey-data";
import { zoomDirection } from "./use-chart-zoom";
import type { ReportModel } from "./use-report";

const manifest = manifestData as unknown as Manifest;
const cases = casesForGeo(manifest.cases, "greece");
describe("report patterns and direct exploration", () => {
  it("finds the observed recurring peak without counting missing or partial years", () => {
    const patterns = seasonalPatterns(cases, "viirs");
    expect(patterns).toMatchObject({
      eligible: 14,
      peakMonth: 9,
      frequency: 10,
    });
    expect(patterns.rows.find((r) => r.year === 2005)?.peak).toBeNull();
    expect(patterns.rows.find((r) => r.year === 2023)?.peak).toBe(7);
    const all = seasonalPatterns(manifest.cases, "viirs");
    expect(all.rows.find((r) => r.year === 2023)?.complete).toBe(false);
    expect(all.eligible).toBe(1);
  });
  it("keeps a rounded profile bounded by the actual count maxima and its light inside the envelope", () => {
    const buckets = archiveBuckets(cases, initialSelection),
      g = ribbonGeometry(buckets),
      lights = ribbonParticles(buckets);
    expect(g.points.every((p) => p.y >= 54 - 1e-8 && p.y <= 249 + 1e-8)).toBe(
      true,
    );
    expect(lights.length).toBeGreaterThan(0);
    expect(lights.length).toBeLessThanOrEqual(1250);
    for (const p of lights) {
      const x = p.x * 1000;
      const i = Math.max(
        0,
        g.points.findIndex(
          (point, index) =>
            index < g.points.length - 1 &&
            x >= point.x &&
            x <= g.points[index + 1].x,
        ),
      );
      const a = g.points[i],
        b = g.points[i + 1],
        top = a.y + ((b.y - a.y) * (x - a.x)) / (b.x - a.x);
      expect(p.y * 300).toBeGreaterThanOrEqual(top - 1e-7);
      expect(p.y * 300).toBeLessThanOrEqual(249);
      expect(buckets[p.group].value).toBeGreaterThan(0);
    }
    expect(
      ribbonParticles(buckets.map((b) => ({ ...b, value: null }))),
    ).toEqual([]);
  });
  it("uses a common sensor scale and suppresses a ratio when source periods differ", () => {
    const model = {
      cases,
      selection: initialSelection,
      sensorCounts: { modis: 708, viirs: 4685 },
    } as ReportModel;
    expect(comparableSensorRatio(model)).toBeCloseTo(4685 / 708);
    expect(
      comparableSensorRatio({
        ...model,
        selection: { ...initialSelection, record: true },
      }),
    ).toBeNull();
    const a = archiveBuckets(cases, { ...initialSelection, sensor: "modis" });
    const b = archiveBuckets(cases, { ...initialSelection, sensor: "viirs" });
    const max = Math.max(...[...a, ...b].map((b) => b.value ?? 0));
    expect(ribbonGeometry(a, max).max).toBe(ribbonGeometry(b, max).max);
  });
  it("matches curated reporting to region and period and keeps general research available", () => {
    expect(
      relatedReadings("evros", 2023, "2023-08", false).map((r) => r.id),
    ).toContain("greece-2023");
    expect(
      relatedReadings("evia", 2021, "2021-08", false).map((r) => r.id),
    ).toContain("evia-2021");
    expect(
      relatedReadings("evros", 2023, "2023-02", false).every(
        (r) => r.kind !== "Reporting",
      ),
    ).toBe(true);
    expect(
      relatedReadings("chaco", 2020, null, false).every(
        (r) => r.kind !== "Reporting",
      ),
    ).toBe(true);
    expect(
      relatedReadings("greece", 2023, null, true).filter(
        (r) => r.kind === "Reporting",
      ),
    ).toHaveLength(3);
  });
  it("requires a deliberate pinch and supports both zoom directions", () => {
    expect(zoomDirection(1.1)).toBe(0);
    expect(zoomDirection(1.3)).toBe(1);
    expect(zoomDirection(0.7)).toBe(-1);
  });
});

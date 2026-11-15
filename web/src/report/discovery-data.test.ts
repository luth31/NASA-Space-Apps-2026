import { describe, expect, it } from "vitest";
import type { Manifest } from "../data";
import manifestData from "../../public/data/manifest.json";
import { seasonalFingerprint, fingerprintDifference } from "./discovery-data";

const cases = (manifestData as unknown as Manifest).cases;
describe("seasonal fingerprint comparisons", () => {
  it("reconciles the verified Greek concentration and its study contributions", () => {
    const a = seasonalFingerprint(cases, "greece", 2023, "viirs");
    expect(a.complete).toBe(true);
    expect(a.total).toBe(4685);
    expect(a.months[7].value).toBe(4178);
    expect(a.peaks).toEqual([7]);
    expect(a.concentration).toBeCloseTo((4178 / 4685) * 100);
    expect(a.months.reduce((n, m) => n + (m.share ?? 0), 0)).toBeCloseTo(100);
    expect(a.contributions.reduce((n, c) => n + (c.share ?? 0), 0)).toBeCloseTo(
      100,
    );
  });
  it("compares different regions on one calendar without treating unavailable years as zero", () => {
    const a = seasonalFingerprint(cases, "evros", 2023, "viirs");
    const b = seasonalFingerprint(cases, "evia", 2023, "viirs");
    expect(a.months[7].value).toBe(4175);
    expect(b.months[7].value).toBe(3);
    expect(fingerprintDifference(a, b).pairedMonths).toBe(12);
    const chaco = seasonalFingerprint(cases, "chaco", 2023, "viirs");
    expect(chaco.total).toBeNull();
    expect(
      chaco.months.every((m) => m.value === null && m.share === null),
    ).toBe(true);
    expect(fingerprintDifference(a, chaco)).toMatchObject({
      count: null,
      percent: null,
      peakMonthDistance: null,
      pairedMonths: 0,
    });
  });
  it("retains MODIS-before-VIIRS and masks a partial aggregate instead of plotting it as complete", () => {
    expect(seasonalFingerprint(cases, "greece", 2005, "modis").complete).toBe(
      true,
    );
    expect(
      seasonalFingerprint(cases, "greece", 2005, "viirs").total,
    ).toBeNull();
    const partial = cases.map((c) =>
      c.id !== "evia"
        ? c
        : {
            ...c,
            months: c.months.map((m) =>
              m.month !== "2023-08" ? m : { ...m, viirs: null },
            ),
          },
    );
    const a = seasonalFingerprint(partial, "greece", 2023, "viirs");
    expect(a.months[7].source.value).toBe(4175);
    expect(a.months[7].value).toBeNull();
    expect(a.total).toBeNull();
    expect(a.peaks).toEqual([]);
    expect(a.months.every((m) => m.share === null)).toBe(true);
  });
  it("keeps complete zero years distinct from gaps and preserves tied peaks", () => {
    const synthetic = cases.map((c) => ({
      ...c,
      months: c.months.map((m) =>
        m.month.startsWith("2023") ? { ...m, viirs: 0 } : m,
      ),
    }));
    const zero = seasonalFingerprint(synthetic, "greece", 2023, "viirs");
    expect(zero.total).toBe(0);
    expect(zero.activeMonths).toBe(0);
    expect(zero.peaks).toEqual([]);
    expect(zero.months.every((m) => m.value === 0 && m.share === null)).toBe(
      true,
    );
    expect(
      fingerprintDifference(
        seasonalFingerprint(cases, "greece", 2023, "viirs"),
        zero,
      ).percent,
    ).toBeNull();
    const tied = synthetic.map((c) => ({
      ...c,
      months: c.months.map((m) =>
        ["2023-07", "2023-08"].includes(m.month) ? { ...m, viirs: 2 } : m,
      ),
    }));
    const a = seasonalFingerprint(tied, "greece", 2023, "viirs");
    expect(a.peaks).toEqual([6, 7]);
    expect(
      fingerprintDifference(
        a,
        seasonalFingerprint(cases, "greece", 2023, "viirs"),
      ).peakMonthDistance,
    ).toBeNull();
  });
});

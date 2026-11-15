import { describe, expect, it } from "vitest";
import {
  monthKey,
  petalRadius,
  seasonSummary,
  sectorPath,
  sourceValue,
  type SeasonRow,
} from "./season";

const row = (
  month: string,
  value: number | null,
  extras: Partial<SeasonRow> = {},
): SeasonRow => ({
  month,
  modis: value,
  viirs: value,
  experimentalEstimate: value,
  ...extras,
});

describe("seasonal wheel scientific semantics", () => {
  it("does not call the partial 2012 VIIRS record a complete observing year", () => {
    const months = Array.from({ length: 12 }, (_, i) =>
      row(monthKey(2012, i), i === 9 ? 90 : 1),
    );
    expect(seasonSummary(months, 2012, "viirs").complete).toBe(false);
    expect(seasonSummary(months, 2012, "viirs").concentration).toBeNull();
    expect(seasonSummary(months, 2012, "modis").complete).toBe(true);
  });
  it("keeps missing rows and sources distinct from recorded zero", () => {
    const summary = seasonSummary(
      [row("2023-01", 0), row("2023-02", null), row("2023-08", 90)],
      2023,
      "viirs",
    );
    expect(summary.months[0].value).toBe(0);
    expect(summary.months[1].value).toBeNull();
    expect(summary.months[2].value).toBeNull();
    expect(summary.available).toBe(2);
    expect(summary.total).toBe(90);
    expect(summary.concentration).toBeNull();
  });
  it("calculates annual concentration only for twelve available months", () => {
    const months = Array.from({ length: 12 }, (_, i) =>
      row(monthKey(2023, i), i === 7 ? 89 : 1),
    );
    expect(seasonSummary(months, 2023, "modis")).toMatchObject({
      complete: true,
      total: 100,
      concentration: 0.89,
      peak: { month: "2023-08", value: 89 },
    });
    expect(
      seasonSummary(months.slice(1), 2023, "modis").concentration,
    ).toBeNull();
  });
  it("labels peak ties and withholds a peak/share for all-zero years", () => {
    expect(
      seasonSummary([row("2020-01", 10), row("2020-02", 10)], 2020, "viirs")
        .peakTies,
    ).toBe(2);
    const zero = seasonSummary(
      Array.from({ length: 12 }, (_, i) => row(monthKey(2020, i), 0)),
      2020,
      "viirs",
    );
    expect(zero).toMatchObject({
      complete: true,
      total: 0,
      peak: null,
      concentration: null,
    });
  });
  it("keeps both sensor records and explicitly experimental estimates separate", () => {
    const months = [
      row("2023-08", 10, { viirs: 80, experimentalEstimate: 70 }),
    ];
    expect(seasonSummary(months, 2023, "modis").total).toBe(10);
    expect(seasonSummary(months, 2023, "viirs").total).toBe(80);
    expect(seasonSummary(months, 2023, "experimentalEstimate").total).toBe(70);
    expect(
      sourceValue(
        { ...months[0], experimentalEstimate: null },
        "experimentalEstimate",
      ),
    ).toBeNull();
  });
  it("does not substitute another year when a selected date is outside the record", () => {
    expect(seasonSummary([row("2023-08", 90)], 2003, "viirs")).toMatchObject({
      available: 0,
      total: 0,
      peak: null,
      concentration: null,
    });
  });
  it("rejects invalid source values without converting them to zeros", () => {
    for (const value of [-1, Number.NaN, Infinity]) {
      expect(sourceValue(row("2023-08", value), "viirs")).toBeNull();
    }
    expect(sourceValue(undefined, "viirs")).toBeNull();
  });
  it("encodes filled area in proportion to count and produces twelve finite sectors", () => {
    const area = (count: number) => petalRadius(count, 100) ** 2 - 81 ** 2;
    expect(area(50) / area(100)).toBeCloseTo(0.5, 10);
    expect(area(25) / area(100)).toBeCloseTo(0.25, 10);
    expect(petalRadius(0, 0)).toBe(81);
    expect(petalRadius(100, 100)).toBe(192);
    const paths = Array.from({ length: 12 }, (_, i) => sectorPath(i, 81, 192));
    expect(new Set(paths).size).toBe(12);
    expect(
      paths.every((path) => !path.includes("NaN") && path.endsWith("Z")),
    ).toBe(true);
  });
});

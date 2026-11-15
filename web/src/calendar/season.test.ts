import { describe, expect, it } from "vitest";
import type { Month } from "../data";
import {
  monthKey,
  monthProfile,
  petalRadius,
  seasonSummary,
  sourceValue,
} from "./season";

const row = (
  month: string,
  value: number | null,
  extras: Partial<Month> = {},
): Month => ({
  month,
  modis: value,
  viirs: value,
  estimate: value,
  interval: null,
  coverage: "unverified",
  status: "observations_only",
  eligible: false,
  ...extras,
});

describe("season calendar scientific semantics", () => {
  it("distinguishes an absent row, a missing source, and a recorded zero", () => {
    const result = seasonSummary(
      [row("2023-01", 0), row("2023-02", null), row("2023-08", 90)],
      2023,
      "viirs",
    );
    expect(result.months[0].value).toBe(0);
    expect(result.months[1].value).toBeNull();
    expect(result.months[2].value).toBeNull();
    expect(result.available).toBe(2);
    expect(result.total).toBe(90);
    expect(result.concentration).toBeNull();
  });
  it("computes whole-year concentration only when all twelve source months exist", () => {
    const months = Array.from({ length: 12 }, (_, i) =>
      row(monthKey(2023, i), i === 7 ? 89 : 1),
    );
    const result = seasonSummary(months, 2023, "modis");
    expect(result.complete).toBe(true);
    expect(result.total).toBe(100);
    expect(result.peak?.month).toBe("2023-08");
    expect(result.concentration).toBe(0.89);
    expect(
      seasonSummary(
        months.map((m) => ({ ...m, modis: 0 })),
        2023,
        "modis",
      ).concentration,
    ).toBeNull();
  });
  it("identifies peak ties and does not invent a peak for all-zero years", () => {
    expect(
      seasonSummary([row("2020-01", 10), row("2020-02", 10)], 2020, "viirs")
        .peakTies,
    ).toBe(2);
    expect(seasonSummary([row("2020-01", 0)], 2020, "viirs").peak).toBeNull();
  });
  it("raw reference excludes the selected year, other months and missing sources but includes zero", () => {
    const rows = [
      row("2019-08", null),
      row("2020-08", 0),
      row("2021-08", 10),
      row("2022-08", 20),
      row("2023-08", 900),
      row("2020-07", 9999),
    ];
    const result = monthProfile(
      rows,
      [2023, 2022, 2021, 2020, 2019],
      "2023-08",
      "viirs",
      [2019, 2023],
    );
    expect(result.median).toBe(10);
    expect(result.n).toBe(3);
    expect(result.points[0]).toEqual({
      year: 2019,
      month: "2019-08",
      value: null,
    });
    expect(result.points.at(-1)?.value).toBe(900);
  });
  it("comparison ranges affect reference only and remain empty when no sources exist", () => {
    const rows = [
      row("2020-08", 0),
      row("2021-08", 10),
      row("2022-08", 30),
      row("2023-08", 900),
    ];
    expect(
      monthProfile(
        rows,
        [2020, 2021, 2022, 2023],
        "2023-08",
        "modis",
        [2021, 2022],
      ),
    ).toMatchObject({ median: 20, n: 2 });
    expect(
      monthProfile(rows, [2003, 2004], "2023-08", "viirs", [2003, 2004]),
    ).toMatchObject({ median: null, n: 0 });
  });
  it("never releases an ineligible estimate even if a numeric value exists", () => {
    expect(sourceValue(row("2023-08", 100), "estimate")).toBeNull();
    expect(sourceValue(row("2023-08", 0, { eligible: true }), "estimate")).toBe(
      0,
    );
    const result = monthProfile(
      [
        row("2020-08", 1),
        row("2021-08", 20, { eligible: true }),
        row("2023-08", 100, { eligible: true }),
      ],
      [2020, 2021, 2023],
      "2023-08",
      "estimate",
      [2020, 2023],
    );
    expect(result).toMatchObject({ median: 20, n: 1 });
  });
  it("encodes count in petal area, not misleading radial length", () => {
    const area = (count: number) => petalRadius(count, 100) ** 2 - 81 ** 2;
    expect(area(50) / area(100)).toBeCloseTo(0.5, 10);
    expect(area(25) / area(100)).toBeCloseTo(0.25, 10);
    expect(petalRadius(0, 0)).toBe(81);
    expect(petalRadius(100, 100)).toBe(192);
  });
});

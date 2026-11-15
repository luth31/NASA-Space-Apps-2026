import { describe, expect, it } from "vitest";
import saved from "../public/data/monthly-harmonization.json";
import manifest from "../public/data/manifest.json";
import { monthlyCsv, monthlyModels, type MonthlyCalibration } from "./monthly";
import type { CaseStudy } from "./data";

describe("monthly calibration evidence", () => {
  it("reproduces displayed errors using only complete withheld years", () => {
    let n = 0;
    for (const study of manifest.cases) {
      const caseData = saved.cases[study.id as keyof typeof saved.cases];
      const rows = caseData.months.filter(
        (r) => r.evaluation === "withheld-year",
      );
      n += rows.length;
      for (const model of monthlyModels) {
        const error =
          rows.reduce(
            (sum, r) =>
              sum +
              Math.abs(
                r.estimates[model] -
                  study.months.find((m) => m.month === r.month)!.viirs!,
              ),
            0,
          ) / rows.length;
        expect(error).toBeCloseTo(caseData.scores[model].mae, 1);
      }
      for (const row of rows) {
        const year = Number(row.month.slice(0, 4));
        expect(year).toBeGreaterThanOrEqual(2013);
        expect(
          saved.folds.find((f) => f.withheldYear === year)!.trainingYears,
        ).not.toContain(year);
      }
    }
    expect(n).toBe(saved.trainingMonths);
  });
  it("exports historical estimates without inventing VIIRS observations or validated status", () => {
    const study = manifest.cases[0] as unknown as CaseStudy;
    const csv = monthlyCsv(
      study,
      saved as MonthlyCalibration,
      "Seasonal scaling",
    );
    const row = csv.split("\r\n").find((r) => r.includes('"2003-01"'))!;
    expect(row).toContain('"0","","0"');
    expect(row).toContain('"experimental_archive_count","historical-fit"');
    expect(csv.split("\r\n")).toHaveLength(study.months.length + 1);
    expect(csv).not.toContain('"validated"');
  });
});

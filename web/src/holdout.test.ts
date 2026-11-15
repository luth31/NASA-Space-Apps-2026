import { describe, expect, it } from "vitest";
import publicRows from "../public/data/held-out-predictions.json";
import savedRows from "../../models/held-out-predictions.json";
import report from "../public/data/models.json";

describe("published experiment evidence", () => {
  it("publishes the original prediction artifact, including all zero targets", () => {
    expect(publicRows).toEqual(savedRows);
    const rows = publicRows.filter(
      (r: { holdout: string; model: string }) =>
        r.holdout === "region" && r.model === "Seasonal scaling",
    );
    expect(rows).toHaveLength(report.totalRows);
    expect(
      rows.filter((r: { observed: number }) => r.observed === 0),
    ).toHaveLength(report.provenance.zeroRows);
  });
  it("reproduces every reported regional error from the downloadable predictions", () => {
    for (const model of report.models)
      for (const fold of model.folds ?? []) {
        const rows = publicRows.filter(
          (r: { holdout: string; model: string; region: string }) =>
            r.holdout === "region" &&
            r.model === model.name &&
            r.region === fold.region,
        );
        expect(rows).toHaveLength(fold.n);
        const mae =
          rows.reduce(
            (sum: number, r: { predicted: number; observed: number }) =>
              sum + Math.abs(r.predicted - r.observed),
            0,
          ) / rows.length;
        expect(mae).toBeCloseTo(fold.mae, 10);
      }
  });
});

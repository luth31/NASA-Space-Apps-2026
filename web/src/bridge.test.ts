import { describe, expect, it } from "vitest";
import { bridgeExamples, type Prediction } from "./BridgeExperiment";
import predictions from "../public/data/held-out-predictions.json";
const data = predictions as Prediction[];
describe("inspectable calibration examples", () => {
  it("joins only the same region-held-out cell and pass with the unchanged-rate control", () => {
    for (const region of ["evia", "evros"]) {
      for (const model of [
        "Seasonal scaling",
        "Negative binomial",
        "LightGBM",
      ]) {
        const rows = bridgeExamples(data, region, model);
        expect(rows).toHaveLength(24);
        for (const row of rows) {
          const baseline = data.find(
            (r) =>
              r.model === "Unchanged MODIS rate" &&
              r.holdout === "region" &&
              r.region === row.region &&
              r.pair === row.pair &&
              r.cell === row.cell,
          )!;
          expect(row.before).toBe(baseline.predicted);
          expect(row.observed).toBe(baseline.observed);
          expect(row.holdout).toBe("region");
        }
      }
    }
  });
  it("keeps zero targets and exposes the actual largest Evros example", () => {
    const rows = bridgeExamples(data, "evros", "Seasonal scaling");
    expect(rows.filter((r) => r.observed === 0)).toHaveLength(21);
    expect(rows[0].observed).toBe(104);
    expect(rows[0].predicted).toBeCloseTo(161.82664143107712);
    expect(bridgeExamples(data, "chaco", "Seasonal scaling")).toEqual([]);
  });
  it("refuses an unmatched or inconsistent comparison", () => {
    const sample = data.find(
      (r) => r.model === "Seasonal scaling" && r.holdout === "region",
    )!;
    expect(bridgeExamples([sample], sample.region, sample.model)).toEqual([]);
    expect(
      bridgeExamples(
        [
          sample,
          {
            ...sample,
            model: "Unchanged MODIS rate",
            observed: sample.observed + 1,
          },
        ],
        sample.region,
        sample.model,
      ),
    ).toEqual([]);
  });
});

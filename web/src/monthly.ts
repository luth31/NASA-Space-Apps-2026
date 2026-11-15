import { useEffect, useState } from "react";
import type { CaseStudy } from "./data";

export const monthlyModels = ["Seasonal scaling", "LightGBM"] as const;
export type MonthlyModel = (typeof monthlyModels)[number];

/** Relative count agreement, bounded to 0–100; unavailable counts stay missing. */
export function countAccuracy(
  estimate: number | null,
  observed: number | null,
): number | null {
  if (
    estimate === null ||
    observed === null ||
    !Number.isFinite(estimate) ||
    !Number.isFinite(observed) ||
    estimate < 0 ||
    observed < 0
  )
    return null;
  if (observed === 0) return estimate === 0 ? 100 : 0;
  return Math.max(0, 1 - Math.abs(estimate - observed) / observed) * 100;
}

export type MonthlyScore = {
  n: number;
  mae: number;
  bias: number;
  activeMae: number | null;
  baselineMae: number;
  observedTotal: number;
};
export type MonthlyRecord = {
  month: string;
  estimates: Record<MonthlyModel, number | null>;
  evaluation: "withheld-year" | "historical-fit";
};
export type MonthlyCalibration = {
  status: "experimental";
  sourceSha256: string;
  trainingMonths: number;
  seconds: number;
  years: number[];
  models: (MonthlyScore & { name: MonthlyModel })[];
  cases: Record<
    string,
    {
      overlapYears: number;
      months: MonthlyRecord[];
      scores: Record<MonthlyModel, MonthlyScore>;
    }
  >;
};
let saved: Promise<MonthlyCalibration> | null = null;
export function useMonthlyCalibration() {
  const [data, setData] = useState<MonthlyCalibration | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    saved ??= fetch("/data/monthly-harmonization.json")
      .then((r) => {
        if (!r.ok) throw Error("Monthly calibration unavailable");
        return r.json();
      })
      .catch((e) => {
        saved = null;
        throw e;
      });
    saved
      .then((v) => {
        if (active) setData(v);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, []);
  return { data, failed };
}

export function monthlyCsv(
  study: CaseStudy,
  data: MonthlyCalibration,
  model: MonthlyModel,
) {
  const c = data.cases[study.id];
  const rows = c.months.map((r) => {
    const observed = study.months.find((m) => m.month === r.month)!;
    return [
      study.id,
      r.month,
      observed.modis ?? "",
      observed.viirs ?? "",
      r.estimates[model] ?? "",
      model,
      "experimental_archive_count",
      r.evaluation,
      c.scores[model].mae,
      "cloud_and_pass_effort_not_normalized",
      data.sourceSha256,
    ];
  });
  return [
    [
      "region",
      "month",
      "modis_reported",
      "viirs_reported",
      "viirs_count_estimate",
      "model",
      "status",
      "prediction_type",
      "withheld_year_mae",
      "coverage",
      "source_sha256",
    ],
    ...rows,
  ]
    .map((r) => r.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(","))
    .join("\r\n");
}

export function downloadMonthly(
  study: CaseStudy,
  data: MonthlyCalibration,
  model: MonthlyModel,
) {
  const url = URL.createObjectURL(
    new Blob([monthlyCsv(study, data, model)], {
      type: "text/csv;charset=utf-8",
    }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = `pyrobridge-${study.id}-experimental-monthly.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

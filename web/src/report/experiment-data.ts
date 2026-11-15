import { archiveBuckets, observationBuckets } from "./report-data";
import type { ReportModel } from "./use-report";
export interface Tile {
  key: string;
  label: string;
  value: number | null;
  x: number;
  y: number;
  w: number;
  h: number;
}
/** Proportional area; zero and missing data deliberately receive no rectangle. */
export function treemap(
  items: Pick<Tile, "key" | "label" | "value">[],
): Tile[] {
  const positive = items.filter((i) => i.value !== null && i.value > 0);
  const result: Tile[] = [];
  function split(
    rows: typeof positive,
    x: number,
    y: number,
    w: number,
    h: number,
  ) {
    if (!rows.length) return;
    if (rows.length === 1) {
      result.push({ ...rows[0], x, y, w, h });
      return;
    }
    const sum = rows.reduce((n, r) => n + r.value!, 0);
    let left = 0,
      index = 0;
    while (index < rows.length - 1 && left < sum / 2) {
      left += rows[index].value!;
      index++;
    }
    const ratio = left / sum;
    if (w >= h) {
      split(rows.slice(0, index), x, y, w * ratio, h);
      split(rows.slice(index), x + w * ratio, y, w * (1 - ratio), h);
    } else {
      split(rows.slice(0, index), x, y, w, h * ratio);
      split(rows.slice(index), x, y + h * ratio, w, h * (1 - ratio));
    }
  }
  split(
    positive.sort((a, b) => b.value! - a.value!),
    0,
    0,
    100,
    100,
  );
  return result;
}
export function sensorBuckets(model: ReportModel, sensor: "modis" | "viirs") {
  const selection = { ...model.selection, sensor };
  return model.selection.month
    ? model.ready
      ? observationBuckets(model.allRows, selection).map((b) => ({
          ...b,
          value: model.sensorCounts[sensor] === null ? null : b.value,
        }))
      : []
    : archiveBuckets(model.cases, selection);
}

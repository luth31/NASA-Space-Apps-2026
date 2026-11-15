import type { PatternYear } from "./pattern-data";
/** Missing/partial monthly sources break a ridge; annual shares need a complete denominator. */
export function seasonalValues(
  row: PatternYear,
  scale: "share" | "count",
): (number | null)[] {
  return row.buckets.map((b) => {
    if (b.value === null || b.available !== b.expected) return null;
    if (scale === "count") return b.value;
    if (!row.complete || row.total <= 0) return null;
    return b.value / row.total;
  });
}
/** Monotone linear segments preserve exact peaks without spline overshoot or invented observations. */
export function ridgePath(
  values: (number | null)[],
  max: number,
  baseline: number,
): string[] {
  const paths: string[] = [];
  let points: [number, number][] = [];
  const flush = () => {
    if (points.length) {
      paths.push(
        `M${points[0][0]},${baseline} ` +
          points.map(([x, y]) => `L${x},${y}`).join(" ") +
          ` L${points.at(-1)![0]},${baseline} Z`,
      );
      points = [];
    }
  };
  values.forEach((value, i) => {
    if (value === null) flush();
    else
      points.push([105 + i * 69, baseline - (value / Math.max(1, max)) * 52]);
  });
  flush();
  return paths;
}

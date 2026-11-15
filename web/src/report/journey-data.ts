import { initialSelection, monthName } from "./report-data";
import type { Bucket, Geography, Selection } from "./report-data";

export const journeyInitial: Selection = { ...initialSelection, geo: "greece" };
export type JourneyAction =
  | { type: "period"; key: string }
  | { type: "geo"; geo: Geography }
  | { type: "year"; year: number }
  | { type: "back" }
  | { type: "archive" }
  | { type: "reset" };

/** Geography changes retain the date, including an explicitly unsupported date. */
export function journeySelection(
  s: Selection,
  action: JourneyAction,
): Selection {
  if (action.type === "reset") return { ...journeyInitial };
  if (action.type === "geo") return { ...s, geo: action.geo };
  if (action.type === "archive")
    return { ...s, record: true, month: null, day: null, hour: null };
  if (action.type === "year")
    return {
      ...s,
      year: action.year,
      record: false,
      month: null,
      day: null,
      hour: null,
    };
  if (action.type === "back") {
    if (s.hour) return { ...s, hour: null };
    if (s.day) return { ...s, day: null };
    if (s.month) return { ...s, month: null };
    return { ...s, record: true };
  }
  const key = action.key;
  if (key.length === 4)
    return journeySelection(s, { type: "year", year: Number(key) });
  if (key.length === 7)
    return {
      ...s,
      year: Number(key.slice(0, 4)),
      record: false,
      month: key,
      day: null,
      hour: null,
    };
  if (key.length === 10)
    return {
      ...s,
      year: Number(key.slice(0, 4)),
      record: false,
      month: key.slice(0, 7),
      day: key,
      hour: null,
    };
  return {
    ...s,
    year: Number(key.slice(0, 4)),
    record: false,
    month: key.slice(0, 7),
    day: key.slice(0, 10),
    hour: key,
  };
}

export function shortPeriod(key: string) {
  return key.length === 4
    ? key
    : key.length === 7
      ? monthName(key, true)
      : key.length === 10
        ? `${Number(key.slice(8))} ${monthName(key.slice(0, 7))}`
        : `${key.slice(11)}:00 UTC`;
}

/** Monotone cubic interpolation rounds peaks without overshooting period totals. */
export function ribbonGeometry(buckets: Bucket[], scaleMax?: number) {
  const max = Math.max(1, scaleMax ?? 0, ...buckets.map((b) => b.value ?? 0));
  const values = buckets.map((b) => b.value ?? 0);
  const deltas = values.slice(1).map((v, i) => v - values[i]);
  const slopes = values.map((_, i) => {
    if (i === 0 || i === values.length - 1) return 0;
    const a = deltas[i - 1],
      b = deltas[i];
    return a * b <= 0 ? 0 : (2 * a * b) / (a + b);
  });
  const points = Array.from({ length: 193 }, (_, i) => {
    const t = i / 192;
    const p = t * Math.max(0, buckets.length - 1);
    const index = Math.min(Math.floor(p), Math.max(0, values.length - 2));
    const u = p - index;
    const a = values[index] ?? 0,
      b = values[index + 1] ?? a;
    const value = Math.max(
      0,
      (2 * u ** 3 - 3 * u ** 2 + 1) * a +
        (u ** 3 - 2 * u ** 2 + u) * (slopes[index] ?? 0) +
        (-2 * u ** 3 + 3 * u ** 2) * b +
        (u ** 3 - u ** 2) * (slopes[index + 1] ?? 0),
    );
    const x =
      buckets.length > 1
        ? 70 + ((0.5 + t * (buckets.length - 1)) / buckets.length) * 860
        : 500;
    return { x, y: 249 - (value / max) * 195 };
  });
  const line = points
    .map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(2)},${p.y.toFixed(2)}`)
    .join(" ");
  return {
    max,
    points,
    line,
    area: `${line} L${points.at(-1)!.x},249 L${points[0].x},249 Z`,
  };
}

/** A bounded illustrative cloud sampled inside the exact visible envelope. */
export function ribbonParticles(buckets: Bucket[], limit = 1250) {
  const geometry = ribbonGeometry(buckets);
  const strips = geometry.points.slice(0, -1).map((p, i) => {
    const next = geometry.points[i + 1];
    const group = Math.min(
      buckets.length - 1,
      Math.floor((((p.x + next.x) / 2 - 70) / 860) * buckets.length),
    );
    return {
      p,
      next,
      group,
      area:
        (buckets[group]?.value ?? 0) > 0
          ? (next.x - p.x) * (249 - (p.y + next.y) / 2)
          : 0,
    };
  });
  const total = strips.reduce((n, s) => n + s.area, 0);
  const count = Math.min(
    limit,
    buckets.reduce((n, b) => n + (b.value ?? 0), 0),
  );
  if (!total || !count) return [];
  const random = (n: number) => {
    const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  };
  let index = 0,
    cumulative = strips[0].area;
  return Array.from({ length: count }, (_, i) => {
    const weight = ((i + 0.5) / count) * total;
    while (cumulative < weight && index < strips.length - 1)
      cumulative += strips[++index].area;
    const strip = strips[index],
      t = random(i + 9);
    const top = strip.p.y + (strip.next.y - strip.p.y) * t;
    return {
      x: (strip.p.x + (strip.next.x - strip.p.x) * t) / 1000,
      y: (249 - (249 - top) * random(i + 29)) / 300,
      group: strip.group,
      phase: random(i + 71) * Math.PI * 2,
      size: 0.5 + random(i + 89) * 1.1,
    };
  });
}

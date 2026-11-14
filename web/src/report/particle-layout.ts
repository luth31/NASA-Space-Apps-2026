import type { Bucket } from "./report-data";

export type ParticleShape = "orbit" | "columns" | "river";
export interface FireParticle {
  x: number;
  y: number;
  size: number;
  group: number;
  phase: number;
}
function random(seed: number) {
  const v = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return v - Math.floor(v);
}
/** A bounded, weighted visual sample. These points never imply unique fire events. */
export function particleLayout(
  buckets: Bucket[],
  shape: ParticleShape,
  limit = 1500,
): FireParticle[] {
  const total = buckets.reduce((n, b) => n + (b.value ?? 0), 0);
  if (!total) return [];
  const count = Math.min(limit, total);
  const cumulative: number[] = [];
  buckets.reduce((n, b, i) => (cumulative[i] = n + (b.value ?? 0)), 0);
  const max = Math.max(1, ...buckets.map((b) => b.value ?? 0));
  return Array.from({ length: count }, (_, i) => {
    const weight = ((i + 0.5) / count) * total;
    const group = Math.max(
      0,
      cumulative.findIndex((n) => n > weight),
    );
    const value = buckets[group]?.value ?? 0;
    const a = random(i + 3),
      b = random(i + 41),
      c = random(i + 79);
    let x: number, y: number;
    if (shape === "orbit") {
      const angle =
        ((group + 0.12 + a * 0.76) / buckets.length) * Math.PI * 2 -
        Math.PI / 2;
      const radius =
        0.25 + Math.pow(b, 0.7) * (0.07 + 0.16 * Math.sqrt(value / max));
      x = 0.5 + Math.cos(angle) * radius;
      y = 0.5 + Math.sin(angle) * radius;
    } else if (shape === "columns") {
      x = 0.07 + ((group + 0.14 + a * 0.72) / buckets.length) * 0.86;
      y = 0.83 - Math.pow(b, 0.8) * (0.04 + (0.65 * value) / max);
    } else {
      x = 0.055 + ((group + a) / buckets.length) * 0.89;
      y =
        0.63 -
        Math.sin(x * 6.2) * 0.05 -
        (b - 0.2) * (0.05 + 0.49 * Math.sqrt(value / max));
    }
    return {
      x,
      y,
      size: 0.65 + c * 1.15,
      group,
      phase: random(i + 133) * Math.PI * 2,
    };
  });
}

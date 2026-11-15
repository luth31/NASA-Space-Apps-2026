import type { Month } from "../data";

export type SeasonField = "modis" | "viirs" | "estimate";
export const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
export const monthKey = (year: number, index: number) =>
  `${year}-${String(index + 1).padStart(2, "0")}`;

/** Null is absence of a published source value; recorded zero remains zero.
 * Estimates additionally require their monthly release gate. */
export function sourceValue(
  row: Month | undefined,
  field: SeasonField,
): number | null {
  if (!row || (field === "estimate" && !row.eligible)) return null;
  const value = row[field];
  return value != null && Number.isFinite(value) && value >= 0 ? value : null;
}

export function seasonSummary(rows: Month[], year: number, field: SeasonField) {
  const index = new Map(rows.map((row) => [row.month, row]));
  const months = monthNames.map((_, i) => ({
    month: monthKey(year, i),
    value: sourceValue(index.get(monthKey(year, i)), field),
  }));
  const available = months.filter((m) => m.value !== null);
  const total = available.reduce((sum, m) => sum + m.value!, 0);
  const peak =
    total > 0
      ? available.reduce((best, m) => (m.value! > best.value! ? m : best))
      : null;
  const peakTies = peak
    ? available.filter((m) => m.value === peak.value).length
    : 0;
  return {
    months,
    total,
    available: available.length,
    complete: available.length === 12,
    peak,
    peakTies,
    // A partial year cannot support a whole-year concentration claim.
    concentration:
      available.length === 12 && total > 0 && peak ? peak.value! / total : null,
  };
}

export function monthProfile(
  rows: Month[],
  years: number[],
  selected: string,
  field: SeasonField,
  range: [number, number],
) {
  const suffix = selected.slice(5, 7);
  const index = new Map(rows.map((row) => [row.month, row]));
  const points = [...years]
    .sort((a, b) => a - b)
    .filter((y) => y >= range[0] && y <= range[1])
    .map((year) => ({
      year,
      month: `${year}-${suffix}`,
      value: sourceValue(index.get(`${year}-${suffix}`), field),
    }));
  const reference = points
    .filter((p) => p.month !== selected && p.value !== null)
    .map((p) => p.value!)
    .sort((a, b) => a - b);
  const mid = Math.floor(reference.length / 2);
  const median = reference.length
    ? reference.length % 2
      ? reference[mid]
      : (reference[mid - 1] + reference[mid]) / 2
    : null;
  return { points, median, n: reference.length };
}

/** Equal-angle annular sectors: filled AREA, not radial length, encodes count. */
export function petalRadius(
  value: number,
  maximum: number,
  inner = 81,
  outer = 192,
) {
  return Math.sqrt(
    inner * inner +
      Math.min(1, Math.max(0, value / Math.max(1, maximum))) *
        (outer * outer - inner * inner),
  );
}
export function sectorPath(index: number, inner: number, outer: number) {
  const start = ((index * 30 - 105 + 1.6) * Math.PI) / 180;
  const end = ((index * 30 - 75 - 1.6) * Math.PI) / 180;
  const at = (r: number, angle: number) =>
    `${(240 + r * Math.cos(angle)).toFixed(3)},${(240 + r * Math.sin(angle)).toFixed(3)}`;
  return `M${at(inner, start)}L${at(outer, start)}A${outer},${outer} 0 0 1 ${at(outer, end)}L${at(inner, end)}A${inner},${inner} 0 0 0 ${at(inner, start)}Z`;
}

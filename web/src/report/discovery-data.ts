import type { CaseStudy } from "../data";
import { archiveCount, casesForGeo, monthName } from "./report-data";
import type { Geography, ReportSensor } from "./report-data";

export function seasonalFingerprint(
  cases: CaseStudy[],
  geo: Geography,
  year: number,
  sensor: ReportSensor,
) {
  const group = casesForGeo(cases, geo);
  const source = archiveCount(group, String(year), sensor);
  const complete =
    source.expected > 0 &&
    source.available === source.expected &&
    source.value !== null;
  const total = complete ? source.value : null;
  const months = Array.from({ length: 12 }, (_, index) => {
    const key = `${year}-${String(index + 1).padStart(2, "0")}`;
    const count = archiveCount(group, key, sensor);
    const usable =
      count.expected > 0 &&
      count.available === count.expected &&
      count.value !== null;
    return {
      key,
      label: monthName(key),
      value: usable ? count.value : null,
      source: count,
      share:
        usable && total !== null && total > 0
          ? (count.value! / total) * 100
          : null,
    };
  });
  const maximum =
    complete && total! > 0 ? Math.max(...months.map((m) => m.value!)) : null;
  const peaks =
    maximum === null
      ? []
      : months.flatMap((m, i) => (m.value === maximum ? [i] : []));
  return {
    geo,
    year,
    source,
    complete,
    total,
    months,
    peaks,
    concentration: maximum !== null ? (maximum / total!) * 100 : null,
    topThreeShare:
      complete && total! > 0
        ? ([...months]
            .sort((a, b) => b.value! - a.value!)
            .slice(0, 3)
            .reduce((sum, m) => sum + m.value!, 0) /
            total!) *
          100
        : null,
    activeMonths: complete ? months.filter((m) => m.value! > 0).length : null,
    contributions: group.map((c) => {
      const count = archiveCount([c], String(year), sensor);
      return {
        id: c.id,
        count,
        share:
          complete && total! > 0 && count.value !== null
            ? (count.value / total!) * 100
            : null,
      };
    }),
  };
}
export type Fingerprint = ReturnType<typeof seasonalFingerprint>;
export function fingerprintDifference(a: Fingerprint, b: Fingerprint) {
  const ready = a.complete && b.complete;
  return {
    count: ready ? a.total! - b.total! : null,
    percent:
      ready && b.total! > 0 ? ((a.total! - b.total!) / b.total!) * 100 : null,
    peakMonthDistance:
      a.peaks.length === 1 && b.peaks.length === 1
        ? a.peaks[0] - b.peaks[0]
        : null,
    concentrationPoints:
      a.concentration !== null && b.concentration !== null
        ? a.concentration - b.concentration
        : null,
    pairedMonths: a.months.filter(
      (m, i) => m.value !== null && b.months[i].value !== null,
    ).length,
  };
}

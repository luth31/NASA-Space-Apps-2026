import type { CaseStudy } from "./data";
export type View = "explore" | "report" | "calendar" | "methods" | "sources";
export const sectionPurpose: Record<View, string> = {
  explore:
    "Find a place, unfold its geography, and inspect the original satellite detections.",
  report:
    "Discover concentration, recurring timing, and differences between sensors.",
  calendar:
    "Compare the available monthly source records and see where harmonization is withheld.",
  methods:
    "Inspect the working method, measured feasibility evidence, and next validation gate.",
  sources: "Trace each observation, image, and scientific claim to its source.",
};
export function readRoute(search: string) {
  const p = new URLSearchParams(search);
  const tab = p.get("tab") ?? "explore";
  const view: View = Object.hasOwn(sectionPurpose, tab)
    ? (tab as View)
    : "explore";
  const month = p.get("month");
  return {
    view,
    caseId: p.get("case"),
    month: month && /^\d{4}-(0[1-9]|1[0-2])$/.test(month) ? month : undefined,
    sensor:
      p.get("sensor") === "modis"
        ? ("modis" as const)
        : p.get("sensor") === "all"
          ? ("all" as const)
          : ("viirs" as const),
  };
}
/** A missing source record must never become an observed zero. */
export function monthlyAvailability(
  study: CaseStudy,
  month: string,
  sensor: string,
) {
  const row = (study.contextMonths ?? study.months).find(
    (m) => m.month === month,
  );
  if (!row) return "missing";
  const values =
    sensor === "MODIS"
      ? [row.modis]
      : sensor === "VIIRS"
        ? [row.viirs]
        : [row.modis, row.viirs];
  if (values.every((v) => v === null)) return "missing";
  if (values.some((v) => v === null)) return "partial";
  return values.every((v) => v === 0) ? "zero" : "available";
}

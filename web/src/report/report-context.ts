import type { CaseStudy } from "../data";
import { archiveBuckets, archiveCount, casesForGeo } from "./report-data";
import type { ReportSensor, Selection } from "./report-data";
import { journeyInitial } from "./journey-data";

/** An explicit handoff between the historical study map and Report. */
export interface ReportContext {
  caseId: string;
  month: string;
  sensor?: ReportSensor;
}

export function selectionFromContext(
  cases: CaseStudy[],
  context?: ReportContext,
): Selection | null {
  if (!context) return { ...journeyInitial };
  if (
    !["evros", "evia", "chaco"].includes(context.caseId) ||
    !cases.some((c) => c.id === context.caseId) ||
    !/^\d{4}-(0[1-9]|1[0-2])$/.test(context.month)
  )
    return null;
  // Keep unsupported years visible. Never replace an unavailable date with a
  // nearby available date, nor change the sensor to manufacture coverage.
  return {
    ...journeyInitial,
    geo: context.caseId as Selection["geo"],
    year: Number(context.month.slice(0, 4)),
    month: context.month,
    sensor: context.sensor ?? "viirs",
  };
}

/** The UI must display the chosen month before invoking this handoff. */
export function exploreContextForSelection(
  cases: CaseStudy[],
  selection: Selection,
): ReportContext | null {
  const group = casesForGeo(cases, selection.geo);
  if (group.length !== 1 || selection.record) return null;
  const month =
    selection.month ??
    archiveBuckets(group, selection)
      .filter((b) => b.value !== null)
      .sort((a, b) => (b.value ?? -1) - (a.value ?? -1))[0]?.key;
  if (!month || archiveCount(group, month, selection.sensor).value === null)
    return null;
  return { caseId: group[0].id, month, sensor: selection.sensor };
}

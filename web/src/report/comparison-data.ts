import type { CaseStudy } from "../data";
import { archiveCount, rawChange } from "./report-data";
import type { ReportSensor } from "./report-data";

/** Descriptive comparison of same-resolution archive periods in one study scope. */
export function comparePeriods(
  cases: CaseStudy[],
  currentPeriod: string,
  referencePeriod: string,
  sensor: ReportSensor,
) {
  const current = archiveCount(cases, currentPeriod, sensor);
  const reference = archiveCount(cases, referencePeriod, sensor);
  const validPeriod = /^(\d{4}|\d{4}-(0[1-9]|1[0-2]))$/;
  const sameResolution =
    validPeriod.test(currentPeriod) &&
    validPeriod.test(referencePeriod) &&
    currentPeriod.length === referencePeriod.length;
  const complete =
    sameResolution &&
    current.value !== null &&
    reference.value !== null &&
    current.available === current.expected &&
    reference.available === reference.expected;
  return {
    current,
    reference,
    difference: complete ? current.value! - reference.value! : null,
    percent: complete ? rawChange(current, reference) : null,
    reason: !sameResolution
      ? "Choose two annual records or two monthly records."
      : !complete
        ? "A comparison needs complete source records for the same study areas and sensor. Missing data is not zero."
        : reference.value === 0
          ? "The reference contains zero detections; a percentage change is undefined."
          : null,
  };
}

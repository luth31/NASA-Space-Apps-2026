import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { integer } from "../data";
import { monthName, geoNames } from "./report-data";
import type { ReportModel } from "./use-report";
import { comparePeriods } from "./comparison-data";

export default function PeriodComparison({
  model,
  onOpen,
}: {
  model: ReportModel;
  onOpen: () => void;
}) {
  const s = model.selection;
  const [year, setYear] = useState(s.year - 1);
  const [month, setMonth] = useState(s.month?.slice(5) ?? "01");
  const currentPeriod = s.month ?? String(s.year);
  const referencePeriod = s.month ? `${year}-${month}` : String(year);
  const comparison = comparePeriods(
    model.cases,
    currentPeriod,
    referencePeriod,
    s.sensor,
  );
  const years = [...new Set([...model.years, s.year, s.year - 1])].sort(
    (a, b) => b - a,
  );
  const label = (period: string) =>
    period.length === 7
      ? `${monthName(period, true)} ${period.slice(0, 4)}`
      : period;
  const max = Math.max(
    1,
    comparison.current.value ?? 0,
    comparison.reference.value ?? 0,
  );
  return (
    <div className="jy-comparison">
      <p className="jy-panel-intro">
        {geoNames[s.geo]} ·{" "}
        {s.sensor === "all"
          ? "Aqua MODIS + S-NPP VIIRS"
          : s.sensor === "viirs"
            ? "S-NPP VIIRS"
            : "Aqua MODIS"}
      </p>
      {s.day && (
        <p className="jy-reading-scope">
          This comparison uses the surrounding month, {label(currentPeriod)}.
          Your day or hour remains selected in the report.
        </p>
      )}
      {s.record && (
        <p className="jy-reading-scope">
          Comparing the selected year, {s.year}, within the available archive.
        </p>
      )}
      <div className="jy-comparison-controls">
        <label>
          Compare with year
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>
        {s.month && (
          <label>
            Month
            <select value={month} onChange={(e) => setMonth(e.target.value)}>
              {Array.from({ length: 12 }, (_, i) =>
                String(i + 1).padStart(2, "0"),
              ).map((m) => (
                <option key={m} value={m}>
                  {monthName(`2023-${m}`, true)}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      <div
        className="jy-comparison-bars"
        aria-label="Raw recorded detections on the same count scale"
      >
        {[
          { period: currentPeriod, count: comparison.current, role: "Current" },
          {
            period: referencePeriod,
            count: comparison.reference,
            role: "Reference",
          },
        ].map(({ period, count, role }) => (
          <div key={role}>
            <span>
              {role} · {label(period)}{" "}
              <strong>
                {count.value === null ? "—" : integer(count.value)}
              </strong>
            </span>
            <div className="jy-comparison-bar">
              <i style={{ width: `${((count.value ?? 0) / max) * 100}%` }} />
            </div>
            <small>
              {count.available}/{count.expected} sensor-month source records
              {count.available !== count.expected ? " · incomplete" : ""}
            </small>
          </div>
        ))}
      </div>
      <div className="jy-comparison-result" aria-live="polite">
        {comparison.difference !== null && (
          <p>
            <strong>
              {comparison.difference > 0 ? "+" : ""}
              {integer(comparison.difference)}
            </strong>{" "}
            detections in the current period
            {comparison.percent !== null && (
              <>
                {" "}
                ({comparison.percent > 0 ? "+" : ""}
                {comparison.percent.toFixed(1)}%)
              </>
            )}
            .
          </p>
        )}
        {comparison.reason && <p>{comparison.reason}</p>}
      </div>
      <p>
        These are raw recorded thermal pixels. Equal source-record availability
        does not establish equal cloud, overpass opportunities, or observing
        effort. Differences are descriptive, not calibrated anomalies or changes
        in unique fires.
      </p>
      <button
        className="jy-text-action"
        onClick={() => {
          model.update({
            year,
            record: false,
            month: s.month ? referencePeriod : null,
            day: null,
            hour: null,
          });
          onOpen();
        }}
      >
        Open {label(referencePeriod)} in the report <ArrowRight size={15} />
      </button>
    </div>
  );
}

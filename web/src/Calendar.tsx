import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { ArrowDownToLine, ArrowUpRight, Info, ShieldCheck } from "lucide-react";
import type { CaseStudy, Month } from "./data";
import { dateLabel, historicalMedian, number } from "./data";

const names = [
  "JAN",
  "FEB",
  "MAR",
  "APR",
  "MAY",
  "JUN",
  "JUL",
  "AUG",
  "SEP",
  "OCT",
  "NOV",
  "DEC",
];
interface Props {
  study: CaseStudy;
  cases: CaseStudy[];
  onStudy: (study: CaseStudy) => void;
  selectedMonth: string;
  onMonth: (m: string) => void;
  onExplore: () => void;
  onExport: (format: "csv" | "pdf") => void;
  onMethods: () => void;
}
export default function Calendar({
  study,
  cases,
  onStudy,
  selectedMonth,
  onMonth,
  onExplore,
  onExport,
  onMethods,
}: Props) {
  const [sensor, setSensor] = useState<"modis" | "viirs">("modis");
  const [harmonized, setHarmonized] = useState(study.harmonized);
  const [tip, setTip] = useState<Month | null>(null);
  const field = harmonized ? "estimate" : sensor;
  const max = useMemo(
    () =>
      Math.max(
        1,
        ...study.months.flatMap((m) => [
          m.modis ?? 0,
          m.viirs ?? 0,
          m.estimate ?? 0,
        ]),
      ),
    [study],
  );
  const selected = study.months.find((m) => m.month === selectedMonth);
  const orderedMonths = [...study.years]
    .reverse()
    .flatMap((y) =>
      names.map((_, m) => `${y}-${String(m + 1).padStart(2, "0")}`),
    );
  const median = harmonized
    ? historicalMedian(study.months, selectedMonth, "estimate")
    : { value: null, n: 0 };
  const color = (n: number | null) => {
    if (n === null) return "#1c2525";
    if (n === 0) return "#232e2c";
    const t = Math.log1p(n) / Math.log1p(max);
    return `hsl(${46 - t * 24} ${22 + t * 55}% ${19 + t * 48}%)`;
  };
  return (
    <motion.div
      className="calendar-view"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="page-heading">
        <div>
          <span className="eyebrow">THE FIRE ACTIVITY CALENDAR</span>
          <h1>
            A longer perspective<span>.</span>
          </h1>
          <p>
            <select
              className="case-picker"
              aria-label="Calendar investigation"
              value={study.id}
              onChange={(e) =>
                onStudy(cases.find((c) => c.id === e.target.value)!)
              }
            >
              {cases.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}, {c.country}
                </option>
              ))}
            </select>{" "}
            <span className="muted">/</span> Monthly satellite detections · UTC
          </p>
        </div>
        <button className="text-button" onClick={onExplore}>
          Back to the scene <ArrowUpRight size={16} />
        </button>
      </div>
      <div className="calendar-top">
        <div className="mode-control">
          <button
            className={!harmonized ? "selected" : ""}
            onClick={() => setHarmonized(false)}
          >
            Observed counts
          </button>
          <button
            className={harmonized ? "selected" : ""}
            disabled={!study.harmonized}
            title={
              study.harmonized
                ? "Validated reference-sensor estimates"
                : "Requires verified paired coverage and a passing model benchmark"
            }
            onClick={() => setHarmonized(true)}
          >
            Harmonized <ShieldCheck size={13} />
          </button>
        </div>
        <div className="sensor-options" aria-label="Calendar sensor">
          <button
            className={sensor === "modis" ? "selected" : ""}
            onClick={() => setSensor("modis")}
            disabled={harmonized}
          >
            <i className="dot aqua" />
            Aqua MODIS
          </button>
          <button
            className={sensor === "viirs" ? "selected" : ""}
            onClick={() => setSensor("viirs")}
            disabled={harmonized}
          >
            <i className="dot fire" />
            S-NPP VIIRS
          </button>
        </div>
      </div>
      <div className="calendar-layout">
        <div className="heatmap-panel">
          <div className="heatmap-title">
            <h2>
              {harmonized ? "VIIRS-equivalent activity" : "The observed record"}
            </h2>
            <span className="mono">
              {study.years.length} YEARS IN THIS BUNDLE
            </span>
          </div>
          <div
            className="heatmap"
            role="grid"
            aria-label="Monthly hotspot count calendar"
          >
            <div className="heatmap-row month-labels" role="row">
              <span role="columnheader" aria-label="Year" />{" "}
              {names.map((n) => (
                <span key={n} role="columnheader">
                  {n}
                </span>
              ))}
            </div>
            {[...study.years].reverse().map((y, i) => (
              <motion.div
                key={y}
                className="heatmap-row"
                role="row"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.018 }}
              >
                <span className="year-label" role="rowheader">
                  {y}
                </span>
                {names.map((_, m) => {
                  const key = `${y}-${String(m + 1).padStart(2, "0")}`;
                  const cell = study.months.find((v) => v.month === key)!;
                  const n = cell[field];
                  return (
                    <button
                      key={key}
                      role="gridcell"
                      data-month={key}
                      tabIndex={selectedMonth === key ? 0 : -1}
                      className={`heat-cell ${selectedMonth === key ? "selected" : ""} ${n === null ? "missing" : ""}`}
                      style={{
                        backgroundColor: color(n),
                        transitionDelay: `${m * 13}ms`,
                      }}
                      onClick={() => onMonth(key)}
                      onKeyDown={(e) => {
                        const offsets: Record<string, number> = {
                          ArrowLeft: -1,
                          ArrowRight: 1,
                          ArrowUp: -12,
                          ArrowDown: 12,
                        };
                        const current = orderedMonths.indexOf(key);
                        const offset =
                          e.key === "Home"
                            ? -m
                            : e.key === "End"
                              ? 11 - m
                              : offsets[e.key];
                        if (offset === undefined) return;
                        e.preventDefault();
                        const next =
                          orderedMonths[
                            Math.max(
                              0,
                              Math.min(
                                orderedMonths.length - 1,
                                current + offset,
                              ),
                            )
                          ];
                        onMonth(next);
                        document
                          .querySelector<HTMLButtonElement>(
                            `[data-month="${next}"]`,
                          )
                          ?.focus();
                      }}
                      onMouseEnter={() => setTip(cell)}
                      onMouseLeave={() => setTip(null)}
                      onFocus={() => setTip(cell)}
                      onBlur={() => setTip(null)}
                      aria-label={`${names[m]} ${y}: ${n === null ? "data unavailable" : `${n} ${harmonized ? "estimated VIIRS-equivalent hotspots" : "reported detections"}; usable coverage ${cell.coverage}`}`}
                      aria-selected={selectedMonth === key}
                    >
                      <span>{n === null ? "—" : number(n)}</span>
                    </button>
                  );
                })}
              </motion.div>
            ))}
          </div>
          <div className="heatmap-footer">
            <span className="mono">
              {tip
                ? `${dateLabel(tip.month + "-01", { month: "short", year: "numeric" })} · ${tip[field] === null ? "Source unavailable" : number(tip[field]) + " detections"}`
                : "SELECT A MONTH TO INVESTIGATE"}
            </span>
            <div className="scale">
              <span>0</span>
              <div
                style={{
                  background:
                    "linear-gradient(90deg,#232e2c,#706d36,#ce9b51,#edb56c)",
                }}
              />
              <span>{number(max)}</span>
              <span className="missing-swatch" />
              No source
            </div>
          </div>
        </div>
        <aside className="month-detail">
          <span className="eyebrow">SELECTED MONTH</span>
          <h2>
            {dateLabel(selectedMonth + "-01", {
              month: "long",
              year: "numeric",
            })}
          </h2>
          <div className="big-number">{number(selected?.[field])}</div>
          <p>
            {harmonized
              ? "Estimated VIIRS-equivalent hotspots"
              : "Reported hotspot detections"}
          </p>
          <dl>
            <div>
              <dt>Platform</dt>
              <dd>
                {harmonized
                  ? "S-NPP VIIRS reference"
                  : sensor === "modis"
                    ? "Aqua MODIS"
                    : "S-NPP VIIRS"}
              </dd>
            </div>
            <div>
              <dt>Analysis area</dt>
              <dd>{study.name} case boundary</dd>
            </div>
            <div>
              <dt>Usable coverage</dt>
              <dd>{selected?.eligible ? "Verified" : "Not yet verified"}</dd>
            </div>
            <div>
              <dt>Historical median</dt>
              <dd>{number(median.value)}</dd>
            </div>
            <div>
              <dt>Eligible comparison years</dt>
              <dd>{median.n}</dd>
            </div>
            {harmonized && (
              <>
                <div>
                  <dt>90% prediction interval</dt>
                  <dd>
                    {selected?.interval
                      ? selected.interval.map(number).join(" – ")
                      : "Unreleased"}
                  </dd>
                </div>
                <div>
                  <dt>Selected approach</dt>
                  <dd>{selected?.model ?? "Unavailable"}</dd>
                </div>
                <div>
                  <dt>Observation effort</dt>
                  <dd>{selected?.referenceEffortId ?? "Unavailable"}</dd>
                </div>
              </>
            )}
          </dl>
          <button className="primary-button" onClick={onExplore}>
            Investigate this month <ArrowUpRight size={16} />
          </button>
          <div className="export-row">
            <button
              disabled={!selected?.eligible}
              onClick={() => onExport("csv")}
            >
              <ArrowDownToLine size={14} />
              CSV
            </button>
            <button
              disabled={!selected?.eligible}
              onClick={() => onExport("pdf")}
            >
              <ArrowDownToLine size={14} />
              PDF brief
            </button>
          </div>
          <p className="micro-copy">
            Exports unlock for supported historical comparisons.
          </p>
          <div className="calendar-note">
            <Info size={16} />
            <p>
              {selected?.eligible
                ? "Comparable observation effort verified."
                : "Counts describe what the satellite reported. Cloud and pass coverage are unverified; an empty month does not establish no fire."}
            </p>
          </div>
        </aside>
      </div>
      {!study.harmonized && (
        <div className="evidence-strip">
          <div className="evidence-icon">
            <ShieldCheck size={19} />
          </div>
          <div>
            <strong>The next step is a comparable record.</strong>
            <p>
              Training is separate from release. Harmonized values appear only
              when paired coverage and independent validation support them.
            </p>
          </div>
          <button className="text-button" onClick={onMethods}>
            View the evidence <ArrowUpRight size={15} />
          </button>
        </div>
      )}
    </motion.div>
  );
}

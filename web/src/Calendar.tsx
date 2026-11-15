import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { ArrowDownToLine, ArrowUpRight, Info, Sparkles } from "lucide-react";
import { calendarColors } from "./calendar-colors";
import type { CaseStudy, Month } from "./data";
import { dateLabel, number } from "./data";
import SeasonWheel from "./calendar/SeasonWheel";

import {
  downloadMonthly,
  monthlyModels,
  useMonthlyCalibration,
  type MonthlyModel,
} from "./monthly";

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
  onMethods,
}: Props) {
  const [sensor, setSensor] = useState<"modis" | "viirs">("viirs");
  const [harmonized, setHarmonized] = useState(false);
  const [model, setModel] = useState<MonthlyModel>("Seasonal scaling");
  const { data: calibration, failed } = useMonthlyCalibration();
  const monthly = calibration?.cases[study.id];
  const months = useMemo(
    () =>
      study.months.map((m) => ({
        ...m,
        estimate:
          monthly?.months.find((r) => r.month === m.month)?.estimates[model] ??
          null,
      })),
    [study, monthly, model],
  );
  const score = monthly?.scores[model];
  const [tip, setTip] = useState<Month | null>(null);
  const field = harmonized ? "estimate" : sensor;
  const max = useMemo(
    () =>
      Math.max(
        1,
        ...months.flatMap((m) => [m.modis ?? 0, m.viirs ?? 0, m.estimate ?? 0]),
      ),
    [months],
  );
  const selected = months.find((m) => m.month === selectedMonth);
  const orderedMonths = [...study.years]
    .reverse()
    .flatMap((y) =>
      names.map((_, m) => `${y}-${String(m + 1).padStart(2, "0")}`),
    );
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
      <SeasonWheel
        key={study.id}
        study={study}
        months={months}
        field={field}
        model={model}
        selectedMonth={selectedMonth}
        onMonth={onMonth}
        onField={(next) => {
          setHarmonized(next === "estimate");
          if (next !== "estimate") setSensor(next);
        }}
        onExplore={onExplore}
      />
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
            onClick={() => setHarmonized(true)}
          >
            Harmonized <Sparkles size={13} />
          </button>
        </div>
        {!harmonized && (
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
        )}
      </div>
      {harmonized && (
        <div className="calendar-calibration-bar">
          <label>
            Calibration{" "}
            <select
              aria-label="Calendar calibration model"
              value={model}
              onChange={(e) => setModel(e.target.value as MonthlyModel)}
            >
              {monthlyModels.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </label>
          <span className="experiment-badge">Experimental estimates</span>
          {score && (
            <span>
              <strong>{number(score.mae)}</strong> average error / month ·{" "}
              {score.n} withheld months
            </span>
          )}
          <button className="text-button" onClick={onMethods}>
            Compare model scores <ArrowUpRight size={15} />
          </button>
        </div>
      )}
      {harmonized && !calibration && (
        <p role="status">
          {failed
            ? "Calibration data could not load. Reload to retry."
            : "Loading monthly estimates…"}
        </p>
      )}
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
          <p className="calendar-reading-guide">
            {harmonized
              ? "Estimated monthly counts on the VIIRS scale, including years before VIIRS. Switch to Observed counts to see the original record."
              : "Monthly counts reported by the selected satellite. 0 = no detections in the source; — = source unavailable."}
          </p>
          <div
            className="heatmap-scroll"
            tabIndex={0}
            aria-label="Monthly calendar, scroll horizontally for all months"
          >
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
                    const cell = months.find((v) => v.month === key)!;
                    const n = cell[field];
                    return (
                      <button
                        key={key}
                        role="gridcell"
                        data-month={key}
                        tabIndex={selectedMonth === key ? 0 : -1}
                        className={`heat-cell ${selectedMonth === key ? "selected" : ""} ${n === null ? "missing" : ""}`}
                        style={{
                          ...calendarColors(n, max),
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
                        aria-label={`${names[m]} ${y}: ${n === null ? "data unavailable" : `${n} ${harmonized ? "estimated VIIRS-equivalent hotspots" : "reported detections"}`}`}
                        aria-selected={selectedMonth === key}
                      >
                        <span>{n === null ? "—" : number(n)}</span>
                      </button>
                    );
                  })}
                </motion.div>
              ))}
            </div>
          </div>
          <div className="heatmap-footer">
            <span className="mono">
              {tip
                ? `${dateLabel(tip.month + "-01", { month: "short", year: "numeric" })} · ${tip[field] === null ? "Source unavailable" : number(tip[field]) + " detections"}`
                : "Select a month to investigate"}
            </span>
            <div className="scale">
              <span>0</span>
              <div
                style={{
                  background:
                    "linear-gradient(90deg,#1b2d20,hsl(8 55% 36%),hsl(8 70% 55%),hsl(8 80% 78%))",
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
            {harmonized && (
              <>
                <div>
                  <dt>Original MODIS</dt>
                  <dd>{number(selected?.modis)}</dd>
                </div>
                <div>
                  <dt>Observed VIIRS</dt>
                  <dd>
                    {selected?.viirs == null
                      ? "Before VIIRS"
                      : number(selected.viirs)}
                  </dd>
                </div>
                {selected?.viirs != null && selected.estimate != null && (
                  <div>
                    <dt>This month's error</dt>
                    <dd>
                      {number(Math.abs(selected.estimate - selected.viirs))}{" "}
                      detections
                    </dd>
                  </div>
                )}
                <div>
                  <dt>Model</dt>
                  <dd>{model}</dd>
                </div>
                <div>
                  <dt>Prediction</dt>
                  <dd>
                    {monthly?.months.find((r) => r.month === selectedMonth)
                      ?.evaluation === "withheld-year"
                      ? "Year excluded from training"
                      : "Historical estimate"}
                  </dd>
                </div>
              </>
            )}
          </dl>
          <button className="primary-button" onClick={onExplore}>
            Investigate this month <ArrowUpRight size={16} />
          </button>
          {calibration && (
            <div className="export-row">
              <button
                onClick={() => downloadMonthly(study, calibration, model)}
              >
                <ArrowDownToLine size={14} /> Download monthly CSV
              </button>
            </div>
          )}
          <div className="calendar-note">
            <Info size={16} />
            <p>
              {harmonized
                ? "Estimates of reported counts, not fire locations. Cloud and overpass effort are not normalized."
                : "Clouds and satellite passes affect reported counts. Zero detections does not establish no fire."}
            </p>
          </div>
        </aside>
      </div>
    </motion.div>
  );
}

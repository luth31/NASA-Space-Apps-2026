import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { ArrowRight, Eye, RotateCcw } from "lucide-react";
import { dateLabel, number, type CaseStudy } from "./data";
import {
  monthlyModels,
  useMonthlyCalibration,
  type MonthlyModel,
} from "./monthly";

export default function CalibrationDemo({
  cases,
  initialCase = "evros",
  onCase,
  onCalendar,
}: {
  cases: CaseStudy[];
  initialCase?: string;
  onCase?: (id: string) => void;
  onCalendar?: (study: CaseStudy, month: string) => void;
}) {
  const { data, failed } = useMonthlyCalibration();
  const [caseId, setCaseId] = useState(initialCase);
  const [month, setMonth] = useState("");
  const [model, setModel] = useState<MonthlyModel>("Seasonal scaling");
  const [progress, setProgress] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const reduced = useReducedMotion();
  const study = cases.find((c) => c.id === caseId) ?? cases[0];
  const selectedMonth = month || study.date.slice(0, 7);
  const original = study.months.find((m) => m.month === selectedMonth)!;
  const calibration = data?.cases[study.id];
  const record = calibration?.months.find((m) => m.month === selectedMonth);
  const estimate = record?.estimates[model];
  const source = original?.modis;
  const truth = original?.viirs;
  const score = calibration?.scores[model];
  const ready = source != null && estimate != null;
  const max = Math.max(source ?? 0, estimate ?? 0, truth ?? 0, 1);
  const unit =
    Math.max(1, 10 ** Math.floor(Math.log10(max / 240))) *
    Math.ceil(max / 480 / Math.max(1, 10 ** Math.floor(Math.log10(max / 240))));
  const drawn =
    revealed && truth != null
      ? truth
      : (source ?? 0) + (((estimate ?? 0) - (source ?? 0)) * progress) / 100;
  const color = revealed ? "#ff665c" : progress > 0 ? "#d9c585" : "#f7a16b";
  const earlier = [...study.months]
    .filter((m) => m.month < "2012-01" && m.modis != null)
    .sort((a, b) => (b.modis ?? 0) - (a.modis ?? 0))[0];
  function changeMonth(next: string) {
    setMonth(next);
    setRevealed(false);
    setProgress(0);
  }
  return (
    <section
      className="calibration-demo"
      aria-label="Interactive MODIS calibration"
    >
      <header>
        <span className="eyebrow">THE BRIDGE IN ACTION</span>
        <h2>What could MODIS have seen?</h2>
        <p>
          Turn the older reading into a VIIRS-scale count. Then reveal what
          VIIRS actually reported.
        </p>
      </header>
      <div className="demo-selectors">
        <label>
          Landscape
          <select
            aria-label="Calibration landscape"
            value={study.id}
            onChange={(e) => {
              setCaseId(e.target.value);
              setMonth("");
              setProgress(0);
              setRevealed(false);
              onCase?.(e.target.value);
            }}
          >
            {cases.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Month
          <select
            aria-label="Calibration month"
            value={selectedMonth}
            onChange={(e) => changeMonth(e.target.value)}
          >
            {[...study.months].reverse().map((m) => (
              <option key={m.month} value={m.month}>
                {dateLabel(m.month + "-01", {
                  month: "short",
                  year: "numeric",
                })}
                {m.viirs == null ? " · before VIIRS" : ""}
              </option>
            ))}
          </select>
        </label>
        <label>
          Model
          <select
            aria-label="Monthly calibration model"
            value={model}
            onChange={(e) => {
              setModel(e.target.value as MonthlyModel);
              setRevealed(false);
            }}
          >
            {monthlyModels.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </label>
      </div>
      {ready ? (
        <>
          <div className="demo-counts" aria-live="polite">
            <div className="modis">
              <span>MODIS recorded</span>
              <strong>{number(source)}</strong>
              <small>Original count</small>
            </div>
            <ArrowRight aria-hidden="true" />
            <div className="estimate">
              <span>Model estimates</span>
              <strong>{number(estimate)}</strong>
              <small>VIIRS-scale count</small>
            </div>
            <ArrowRight aria-hidden="true" />
            <div className="viirs">
              <span>VIIRS recorded</span>
              <strong>
                {truth == null ? "—" : revealed ? number(truth) : "?"}
              </strong>
              <small>
                {truth == null
                  ? "Before VIIRS existed"
                  : revealed
                    ? "Independent reading"
                    : "Reveal to compare"}
              </small>
            </div>
          </div>
          <div
            className="demo-visual"
            style={{ "--demo-color": color } as React.CSSProperties}
          >
            <div className="demo-grid-title">
              <span>
                {revealed
                  ? "VIIRS · observed"
                  : progress === 0
                    ? "MODIS · observed"
                    : progress === 100
                      ? "VIIRS scale · estimated"
                      : "Applying calibration"}
              </span>
              <span>1 tile = {number(unit)} detections</span>
            </div>
            <svg
              viewBox="0 0 640 220"
              role="img"
              aria-label={`Count illustration: ${number(drawn)} detections. Tiles are counts, not fire locations.`}
            >
              {Array.from({ length: 480 }, (_, i) => (
                <motion.rect
                  key={i}
                  x={10 + (i % 40) * 15.6}
                  y={10 + Math.floor(i / 40) * 16.5}
                  width="10"
                  height="10"
                  rx="2"
                  initial={false}
                  animate={{
                    opacity: Math.min(1, Math.max(0.06, drawn / unit - i)),
                    fill: color,
                    scale: drawn / unit > i ? 1 : 0.55,
                  }}
                  transition={{
                    duration: reduced ? 0 : 0.22,
                    delay: reduced ? 0 : (i % 40) * 0.002,
                  }}
                />
              ))}
            </svg>
            <span className="demo-visual-note">
              Count illustration · no inferred fire locations
            </span>
          </div>
          <label className="calibration-slider">
            <span>
              Original MODIS <strong>{progress}% calibrated</strong> VIIRS-scale
              estimate
            </span>
            <input
              type="range"
              min="0"
              max="100"
              value={progress}
              aria-label="Apply MODIS calibration"
              onChange={(e) => {
                setProgress(Number(e.target.value));
                setRevealed(false);
              }}
            />
          </label>
          <div className="demo-actions">
            <button
              className="primary-button"
              onClick={() => {
                setProgress(100);
                setRevealed(false);
              }}
            >
              Apply calibration <ArrowRight size={16} />
            </button>
            {truth != null && (
              <button
                className="text-button"
                onClick={() => {
                  setRevealed(true);
                  setProgress(100);
                }}
              >
                <Eye size={16} /> Reveal VIIRS
              </button>
            )}
            <button
              className="demo-reset"
              aria-label="Reset calibration"
              onClick={() => {
                setProgress(0);
                setRevealed(false);
              }}
            >
              <RotateCcw size={17} />
            </button>
          </div>
          {revealed && truth != null && (
            <motion.div
              className="demo-result"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              role="status"
            >
              <strong>
                {number(Math.abs(estimate - truth))} detections off
              </strong>
              <span>
                Original MODIS was {number(Math.abs(source - truth))} off.{" "}
                {Math.abs(estimate - truth) < Math.abs(source - truth)
                  ? "Calibration brings this month closer."
                  : "The model is worse for this month."}
              </span>
            </motion.div>
          )}
          <footer>
            <span>
              {record?.evaluation === "withheld-year"
                ? `${selectedMonth.slice(0, 4)} was excluded from training.`
                : "Historical estimate from the complete overlap fit."}{" "}
              Experimental monthly counts.
            </span>
            <span>
              Average error in {study.name}:{" "}
              <strong>{number(score?.mae)}</strong> detections / month ·{" "}
              {score?.n} withheld months.
            </span>
          </footer>
          <div className="demo-time-actions">
            {earlier && (
              <button
                className="text-button"
                onClick={() => {
                  changeMonth(earlier.month);
                  setProgress(100);
                }}
              >
                Go back to {earlier.month.slice(0, 4)} · before VIIRS{" "}
                <ArrowRight size={16} />
              </button>
            )}
            {onCalendar && (
              <button
                className="text-button"
                onClick={() => onCalendar(study, selectedMonth)}
              >
                See the harmonized calendar <ArrowRight size={16} />
              </button>
            )}
          </div>
        </>
      ) : (
        <p role="status">
          {failed
            ? "Calibration data could not load. Reload to retry."
            : "Loading precomputed calibration…"}
        </p>
      )}
    </section>
  );
}

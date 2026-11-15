import { memo, useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { ArrowRight, Eye, Info, Pause, Play, RotateCcw } from "lucide-react";
import { dateLabel, number, type CaseStudy } from "./data";
import {
  countAccuracy,
  monthlyModels,
  useMonthlyCalibration,
  type MonthlyModel,
} from "./monthly";
import "./calibration-animation.css";

const DURATION = 4800;
const TILES = 96;
const ACCURACY_DEFINITION =
  "Count accuracy = max(0, 1 − |estimate − observed VIIRS| / observed VIIRS) × 100. If observed VIIRS is zero, an estimate of zero scores 100%; any nonzero estimate scores 0%. Missing observations have no score.";

// Static tiles render only when counts change. Native animations reveal eight rows
// per panel; the progress bar stays independent of React reconciliation.
const CountPanel = memo(function CountPanel({
  name,
  kind,
  count,
  unit,
  revealed,
  detail,
}: {
  name: string;
  kind: "modis" | "estimate" | "viirs";
  count: number | null | undefined;
  unit: number;
  revealed: boolean;
  detail: string;
}) {
  const rect = (index: number, opacity: number) => (
    <rect
      key={index}
      x={3 + (index % 12) * 20}
      y={3 + Math.floor(index / 12) * 20}
      width="14"
      height="14"
      rx="2"
      fill="currentColor"
      opacity={opacity}
    />
  );
  return (
    <div className={`calibration-panel calibration-panel-${kind}`}>
      <span className="calibration-panel-label">
        <span aria-hidden="true" /> {name}
      </span>
      <strong>{count == null ? "—" : revealed ? number(count) : "…"}</strong>
      <small>{detail}</small>
      <svg
        viewBox="0 0 240 160"
        role="img"
        aria-label={
          count == null
            ? `${name}: no observation available`
            : `${name}: ${number(count)} monthly detections. Each full tile represents ${number(unit)} detections.`
        }
      >
        <g aria-hidden="true">
          {Array.from({ length: TILES }, (_, i) => rect(i, 0.065))}
        </g>
        {Array.from({ length: 8 }, (_, row) => (
          <g
            key={row}
            className="calibration-tile-row"
            data-reveal-sensor={kind}
            data-reveal-row={row}
          >
            {Array.from({ length: 12 }, (_, column) => {
              const index = row * 12 + column;
              const fill = Math.min(
                1,
                Math.max(0, (count ?? 0) / unit - index),
              );
              return fill > 0 ? rect(index, fill) : null;
            })}
          </g>
        ))}
      </svg>
    </div>
  );
});

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
  const [phase, setPhase] = useState(0);
  const [playing, setPlaying] = useState(false);
  const root = useRef<HTMLElement>(null);
  const animation = useRef<Animation[]>([]);
  const driver = useRef<Animation | null>(null);
  const currentPhase = useRef(0);
  const reduced = useReducedMotion();
  const study = cases.find((c) => c.id === caseId) ?? cases[0];
  const selectedMonth = month || study.date.slice(0, 7);
  const original = study.months.find((m) => m.month === selectedMonth);
  const calibration = data?.cases[study.id];
  const record = calibration?.months.find((m) => m.month === selectedMonth);
  const estimate = record?.estimates[model];
  const source = original?.modis;
  const truth = original?.viirs;
  const score = calibration?.scores[model];
  const ready = source != null && estimate != null;
  const unit = Math.max(
    1,
    Math.ceil(Math.max(source ?? 0, estimate ?? 0, truth ?? 0) / TILES),
  );
  const revealed = phase >= 2;
  const accuracy = countAccuracy(estimate ?? null, truth ?? null);
  const originalAccuracy = countAccuracy(source ?? null, truth ?? null);
  const earlier = [...study.months]
    .filter((m) => m.month < "2012-01" && m.modis != null)
    .sort((a, b) => (b.modis ?? 0) - (a.modis ?? 0))[0];

  function publishPhase(value: number) {
    if (currentPhase.current === value) return;
    currentPhase.current = value;
    setPhase(value);
  }

  useEffect(() => {
    if (!ready || !root.current) {
      setPlaying(false);
      return;
    }
    const bar = root.current.querySelector<HTMLElement>(
      ".calibration-timeline > span",
    )!;
    const clock = bar.animate(
      [{ transform: "scaleX(0)" }, { transform: "scaleX(1)" }],
      { duration: DURATION, fill: "both", easing: "linear" },
    );
    const rows = [
      ...root.current.querySelectorAll<SVGGElement>(
        "[data-reveal-sensor]:not([data-reveal-sensor=modis])",
      ),
    ];
    const reveals = rows.map((row) => {
      const start = row.dataset.revealSensor === "estimate" ? 0.12 : 0.57;
      const offset = start + Number(row.dataset.revealRow) * 0.04;
      return row.animate(
        [
          { opacity: 0, transform: "translateY(4px)", offset: 0 },
          {
            opacity: 0,
            transform: "translateY(4px)",
            offset,
            easing: "cubic-bezier(.2,.7,.2,1)",
          },
          { opacity: 1, transform: "translateY(0)", offset: offset + 0.09 },
          { opacity: 1, transform: "translateY(0)", offset: 1 },
        ],
        { duration: DURATION, fill: "both" },
      );
    });
    animation.current = [clock, ...reveals];
    driver.current = clock;
    publishPhase(reduced ? 3 : 0);
    if (reduced)
      animation.current.forEach((item) => {
        item.pause();
        item.currentTime = DURATION;
      });
    setPlaying(!reduced);
    clock.onfinish = () => {
      publishPhase(3);
      setPlaying(false);
    };
    return () => {
      clock.onfinish = null;
      animation.current.forEach((item) => item.cancel());
      animation.current = [];
      driver.current = null;
    };
  }, [
    ready,
    study.id,
    selectedMonth,
    model,
    reduced,
    source,
    estimate,
    truth,
    unit,
  ]);

  useEffect(() => {
    if (!playing) return;
    let frame = 0;
    const tick = () => {
      const progress = Number(driver.current?.currentTime ?? 0) / DURATION;
      // No per-frame DOM writes or React renders: only three phase transitions.
      publishPhase(
        progress >= 1 ? 3 : progress >= 0.57 ? 2 : progress >= 0.12 ? 1 : 0,
      );
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing]);

  function replay() {
    const time = reduced ? DURATION : 0;
    animation.current.forEach((item) => {
      item.pause();
      item.currentTime = time;
      if (!reduced) item.play();
    });
    publishPhase(reduced ? 3 : 0);
    setPlaying(!reduced);
  }

  function togglePlayback() {
    if (phase === 3) {
      replay();
      return;
    }
    animation.current.forEach((item) => (playing ? item.pause() : item.play()));
    setPlaying(!playing);
  }

  function revealAll() {
    animation.current.forEach((item) => {
      item.pause();
      item.currentTime = DURATION;
    });
    publishPhase(3);
    setPlaying(false);
  }

  return (
    <section
      ref={root}
      data-animation-phase={phase}
      className="calibration-demo calibration-animation"
      aria-label="Interactive MODIS calibration"
    >
      <header className="calibration-heading">
        <div>
          <h2>What could MODIS have seen?</h2>
        </div>
        <span className="calibration-month-label">
          {dateLabel(selectedMonth + "-01", {
            month: "short",
            year: "numeric",
          })}
        </span>
      </header>
      <div className="calibration-controls">
        <label>
          Landscape
          <select
            aria-label="Calibration landscape"
            value={study.id}
            onChange={(e) => {
              setCaseId(e.target.value);
              setMonth("");
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
            onChange={(e) => setMonth(e.target.value)}
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
            onChange={(e) => setModel(e.target.value as MonthlyModel)}
          >
            {monthlyModels.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </label>
      </div>
      {ready ? (
        <>
          <div className="calibration-stage">
            <CountPanel
              name="MODIS observed"
              kind="modis"
              count={source}
              unit={unit}
              revealed={true}
              detail="Original monthly count"
            />
            <CountPanel
              name="Model estimate"
              kind="estimate"
              count={estimate}
              unit={unit}
              revealed={phase >= 1}
              detail="VIIRS-scale monthly count"
            />
            <CountPanel
              name="VIIRS observed"
              kind="viirs"
              count={truth}
              unit={unit}
              revealed={phase >= 2}
              detail={
                truth == null
                  ? "Before VIIRS · no observation"
                  : "Independent monthly count"
              }
            />
          </div>
          <div className="calibration-scale">
            <span>1 tile = {number(unit)} detections</span>
            <span>Same count scale · tiles do not mark locations</span>
          </div>
          <div className="calibration-playback">
            <button
              className="calibration-play"
              aria-label={
                playing
                  ? "Pause calibration animation"
                  : phase === 3
                    ? "Replay calibration animation"
                    : "Play calibration animation"
              }
              onClick={togglePlayback}
              disabled={!!reduced}
              title={reduced ? "Reduced motion is enabled" : undefined}
            >
              {playing ? <Pause size={15} /> : <Play size={15} />}
              {playing ? "Pause" : phase === 3 ? "Replay" : "Play"}
            </button>
            <div className="calibration-timeline" aria-hidden="true">
              <span />
              <i />
              <i />
              <i />
            </div>
            <span className="calibration-phase" aria-live="polite">
              {phase === 3
                ? "Compare all three"
                : phase === 0
                  ? "Start with MODIS"
                  : phase === 1
                    ? "Apply calibration"
                    : "Reveal VIIRS"}
            </span>
            <button
              className="calibration-icon-button"
              onClick={replay}
              aria-label="Restart calibration animation"
              title="Restart animation"
            >
              <RotateCcw size={15} />
            </button>
            <button className="calibration-reveal" onClick={revealAll}>
              <Eye size={15} /> Compare now
            </button>
          </div>
          <div className="calibration-comparison" aria-live="polite">
            <div className="calibration-accuracy">
              <span
                title={ACCURACY_DEFINITION}
                tabIndex={0}
                aria-label={ACCURACY_DEFINITION}
              >
                Count accuracy <Info size={12} aria-hidden="true" />
              </span>
              <strong>
                {revealed && accuracy != null ? `${number(accuracy)}%` : "—"}
              </strong>
              <small>
                {truth == null
                  ? "No VIIRS comparison"
                  : revealed
                    ? `MODIS ${number(originalAccuracy)}%`
                    : "Revealed with VIIRS"}
              </small>
            </div>
            <div className="calibration-error">
              <span>Model count error</span>
              <strong>
                {revealed && truth != null
                  ? number(Math.abs(estimate - truth))
                  : "—"}{" "}
                <small>detections</small>
              </strong>
              <small>
                {truth != null && revealed
                  ? `Original MODIS: ${number(Math.abs(source - truth))} off`
                  : truth == null
                    ? "Historical estimate"
                    : "Waiting for observed count"}
              </small>
            </div>
            <div className="calibration-evaluation">
              <span>
                {record?.evaluation === "withheld-year"
                  ? `${selectedMonth.slice(0, 4)} held out from training`
                  : "Fit to the full overlap period"}
              </span>
              <small>
                {number(score?.mae)} mean count error · {score?.n ?? "—"}{" "}
                held-out months
              </small>
            </div>
          </div>
          <div className="calibration-links">
            {earlier && (
              <button onClick={() => setMonth(earlier.month)}>
                Back to {earlier.month.slice(0, 4)} · before VIIRS{" "}
                <ArrowRight size={13} />
              </button>
            )}
            {onCalendar && (
              <button onClick={() => onCalendar(study, selectedMonth)}>
                Open fire calendar <ArrowRight size={13} />
              </button>
            )}
          </div>
        </>
      ) : (
        <p className="calibration-loading" role="status">
          {failed
            ? "Calibration data could not load. Reload to retry."
            : "Loading precomputed calibration…"}
        </p>
      )}
    </section>
  );
}

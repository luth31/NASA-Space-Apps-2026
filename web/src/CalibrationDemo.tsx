import { useEffect, useRef, useState, type CSSProperties } from "react";
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

function revealProgress(progress: number, start: number, end: number) {
  const fraction = Math.min(1, Math.max(0, (progress - start) / (end - start)));
  return 1 - (1 - fraction) ** 3;
}

function CountPanel({
  name,
  kind,
  count,
  unit,
  progress,
  detail,
}: {
  name: string;
  kind: "modis" | "estimate" | "viirs";
  count: number | null | undefined;
  unit: number;
  progress: number;
  detail: string;
}) {
  const visibleCount = (count ?? 0) * progress;
  return (
    <div className={`calibration-panel calibration-panel-${kind}`}>
      <span className="calibration-panel-label">
        <span aria-hidden="true" /> {name}
      </span>
      <strong>
        {count == null ? "—" : progress > 0 ? number(count) : "…"}
      </strong>
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
        {Array.from({ length: TILES }, (_, i) => {
          const fill = Math.min(1, Math.max(0, visibleCount / unit - i));
          return (
            <rect
              key={i}
              x={3 + (i % 12) * 20}
              y={3 + Math.floor(i / 12) * 20}
              width="14"
              height="14"
              rx="2"
              fill="currentColor"
              opacity={0.065 + fill * 0.935}
              style={{ transform: `scale(${0.72 + fill * 0.28})` }}
            />
          );
        })}
      </svg>
    </div>
  );
}

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
  const [playing, setPlaying] = useState(false);
  const elapsed = useRef(0);
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
  const estimateProgress = revealProgress(progress, 0.12, 0.52);
  const viirsProgress = revealProgress(progress, 0.57, 0.94);
  const revealed = progress >= 0.57;
  const accuracy = countAccuracy(estimate ?? null, truth ?? null);
  const originalAccuracy = countAccuracy(source ?? null, truth ?? null);
  const earlier = [...study.months]
    .filter((m) => m.month < "2012-01" && m.modis != null)
    .sort((a, b) => (b.modis ?? 0) - (a.modis ?? 0))[0];

  useEffect(() => {
    elapsed.current = reduced ? DURATION : 0;
    setProgress(reduced ? 1 : 0);
    setPlaying(ready && !reduced);
  }, [study.id, selectedMonth, model, ready, reduced]);

  useEffect(() => {
    if (!playing || !ready || reduced) return;
    let frame = 0;
    let previous = performance.now();
    let lastDraw = previous;
    const tick = (now: number) => {
      elapsed.current = Math.min(DURATION, elapsed.current + now - previous);
      previous = now;
      if (now - lastDraw >= 40 || elapsed.current >= DURATION) {
        setProgress(elapsed.current / DURATION);
        lastDraw = now;
      }
      if (elapsed.current >= DURATION) {
        setPlaying(false);
      } else {
        frame = requestAnimationFrame(tick);
      }
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, ready, reduced, study.id, selectedMonth, model]);

  function replay() {
    elapsed.current = reduced ? DURATION : 0;
    setProgress(reduced ? 1 : 0);
    setPlaying(!reduced);
  }

  function revealAll() {
    elapsed.current = DURATION;
    setProgress(1);
    setPlaying(false);
  }

  return (
    <section
      className="calibration-demo calibration-animation"
      aria-label="Interactive MODIS calibration"
    >
      <header className="calibration-heading">
        <div>
          <span className="eyebrow">THE BRIDGE IN ACTION</span>
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
              progress={1}
              detail="Original monthly count"
            />
            <CountPanel
              name="Model estimate"
              kind="estimate"
              count={estimate}
              unit={unit}
              progress={estimateProgress}
              detail="VIIRS-scale monthly count"
            />
            <CountPanel
              name="VIIRS observed"
              kind="viirs"
              count={truth}
              unit={unit}
              progress={viirsProgress}
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
                  : progress >= 1
                    ? "Replay calibration animation"
                    : "Play calibration animation"
              }
              onClick={() => {
                if (progress >= 1) replay();
                else setPlaying(!playing);
              }}
              disabled={!!reduced}
              title={reduced ? "Reduced motion is enabled" : undefined}
            >
              {playing ? <Pause size={15} /> : <Play size={15} />}
              {playing ? "Pause" : progress >= 1 ? "Replay" : "Play"}
            </button>
            <div
              className="calibration-timeline"
              style={
                {
                  "--calibration-progress": `${progress * 100}%`,
                } as CSSProperties
              }
              aria-hidden="true"
            >
              <span />
              <i />
              <i />
              <i />
            </div>
            <span className="calibration-phase" aria-live="polite">
              {progress >= 1
                ? "Compare all three"
                : progress < 0.12
                  ? "Start with MODIS"
                  : progress < 0.57
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

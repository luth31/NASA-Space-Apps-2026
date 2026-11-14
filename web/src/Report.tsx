import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Clock3,
  Flame,
  Grid2X2,
  Heart,
  Layers3,
  LoaderCircle,
  Pause,
  Play,
  RotateCcw,
  Satellite,
  Sparkles,
  X,
} from "lucide-react";
import type { Manifest } from "./data";
import { integer } from "./data";
import {
  geoChildren,
  geoNames,
  geoPaths,
  monthName,
} from "./report/report-data";
import type {
  Bucket,
  Concept,
  Geography,
  ReportSensor,
} from "./report/report-data";
import FireField from "./report/FireField";
import type { ParticleShape } from "./report/particle-layout";
import { useReport } from "./report/use-report";
import type { ReportModel } from "./report/use-report";
import "./report/report.css";
import "./report/experiments.css";
import { concepts, parseConcept } from "./report/concepts";
import { Counter, bucketName, readout } from "./report/primitives";
import { useIdeaPicks } from "./report/use-idea-picks";
import ReportGallery, { IdeaPicker } from "./report/ReportGallery";
const Experiments = lazy(() => import("./report/Experiments"));

const sensors: Record<ReportSensor, string> = {
  viirs: "VIIRS",
  modis: "MODIS",
  all: "Both sensors",
};
function Modal({
  kind,
  onClose,
  children,
}: {
  kind: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current!;
    const previous =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    dialog.showModal();
    return () => {
      dialog.close();
      previous?.focus({ preventScroll: true });
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="x-dialog"
      aria-label={kind}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div>
        <button className="x-close" aria-label="Close dialog" onClick={onClose}>
          <X size={20} />
        </button>
        {children}
      </div>
    </dialog>
  );
}

function Periods({
  model,
  onSelect,
  preview,
  onPreview,
}: {
  model: ReportModel;
  onSelect: (key: string) => void;
  preview?: number;
  onPreview?: (index: number) => void;
}) {
  const max = Math.max(1, ...model.buckets.map((b) => b.value ?? 0));
  return (
    <div
      className={`x-periods ${model.buckets.length > 12 ? "dense" : ""}`}
      role="group"
      aria-label={`Choose a ${model.resolution}`}
    >
      {model.buckets.map((b, i) => (
        <button
          key={b.key}
          className={`x-period ${model.selection.hour === b.key || preview === i ? "selected" : ""} ${b.value === null ? "missing" : ""}`}
          aria-label={`${onPreview ? "Preview" : "Explore"} ${bucketName(b)} · ${readout(b)}`}
          aria-pressed={model.selection.hour === b.key || preview === i}
          onClick={() => (onPreview ? onPreview(i) : onSelect(b.key))}
          onKeyDown={(e) => {
            const next =
              e.key === "ArrowRight"
                ? i + 1
                : e.key === "ArrowLeft"
                  ? i - 1
                  : e.key === "Home"
                    ? 0
                    : e.key === "End"
                      ? model.buckets.length - 1
                      : null;
            if (next !== null) {
              e.preventDefault();
              e.currentTarget.parentElement
                ?.querySelectorAll<HTMLButtonElement>("button")
                [
                  Math.max(0, Math.min(model.buckets.length - 1, next))
                ]?.focus();
            }
          }}
          title={`${bucketName(b)} · ${readout(b)}`}
        >
          <span className="x-period-line">
            <motion.i
              initial={false}
              animate={{
                height: `${b.value === null ? 0 : Math.max(b.value ? 8 : 0, (b.value / max) * 100)}%`,
              }}
            />
          </span>
          <span>
            {b.label}
            {model.resolution === "hour" ? "h" : ""}
          </span>
          <small>{b.value === null ? "—" : integer(b.value)}</small>
        </button>
      ))}
    </div>
  );
}

function Dial({
  model,
  paused,
  onSelect,
}: {
  model: ReportModel;
  paused: boolean;
  onSelect: (key: string) => void;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const reduced = useReducedMotion();
  const active =
    hover !== null && model.buckets[hover] ? model.buckets[hover] : model.peak;
  const fraction =
    active?.value && model.total ? active.value / model.total : 0;
  const peakIndex = model.buckets.findIndex((b) => b.key === model.peak?.key);
  return (
    <div
      className={`x-dial ${model.buckets.length > 16 ? "dense" : ""}`}
      role="group"
      aria-label="Interactive fire season dial"
    >
      <FireField
        buckets={model.buckets}
        shape="orbit"
        active={hover ?? -1}
        paused={paused}
      />
      <svg className="x-dial-ring" viewBox="0 0 500 500" aria-hidden="true">
        <circle
          cx="250"
          cy="250"
          r="105"
          fill="none"
          stroke="#ffffff0b"
          strokeWidth="1"
        />
        <motion.circle
          cx="250"
          cy="250"
          r="105"
          fill="none"
          stroke="url(#season-ring)"
          strokeWidth="2"
          strokeLinecap="round"
          initial={{ pathLength: reduced ? fraction : 0 }}
          animate={{ pathLength: fraction }}
          transition={{ duration: reduced ? 0 : 1.1 }}
          style={{ rotate: -90, transformOrigin: "250px 250px" }}
        />
        <defs>
          <linearGradient id="season-ring">
            <stop stopColor="#fce3ae" />
            <stop offset="1" stopColor="#ff6e42" />
          </linearGradient>
        </defs>
      </svg>
      <div className="x-dial-core">
        <span className="x-eyebrow">
          {active?.value ? "THE STANDOUT" : "THE REPORTED RECORD"}
        </span>
        <div>
          <Counter
            value={
              active?.value
                ? Math.round(fraction * 100)
                : model.count.value === null
                  ? null
                  : 0
            }
          />
          <span className="x-percent">%</span>
        </div>
        <p>
          {active?.value
            ? `in ${active.label}${model.resolution === "hour" ? ":00 UTC" : ""}`
            : "No reported detections"}
        </p>
        {active?.value ? (
          <button
            onClick={() => onSelect(active.key)}
            disabled={model.busy}
            aria-label={`Explore peak ${bucketName(active)}`}
          >
            {model.resolution === "hour" ? "Inspect this hour" : "Go closer"}{" "}
            <ArrowUpRight size={15} />
          </button>
        ) : null}
      </div>
      {model.buckets.map((b, i) => {
        const angle =
          ((i + 0.5) / model.buckets.length) * Math.PI * 2 - Math.PI / 2;
        const radius = model.buckets.length > 16 && i % 2 ? 37 : 46;
        return (
          <button
            key={b.key}
            className={`x-dial-label x-period ${i === peakIndex ? "peak" : ""} ${hover === i ? "hovered" : ""} ${b.key === model.selection.hour ? "selected" : ""}`}
            disabled={model.busy}
            aria-pressed={b.key === model.selection.hour}
            style={{
              left: `${50 + Math.cos(angle) * radius}%`,
              top: `${50 + Math.sin(angle) * radius}%`,
            }}
            onPointerEnter={() => setHover(i)}
            onPointerLeave={() => setHover(null)}
            onFocus={() => setHover(i)}
            onBlur={() => setHover(null)}
            onClick={() => onSelect(b.key)}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
                e.preventDefault();
                const nodes =
                  e.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>(
                    ".x-dial-label",
                  );
                nodes?.[
                  (i +
                    (e.key === "ArrowRight" ? 1 : model.buckets.length - 1)) %
                    model.buckets.length
                ]?.focus();
              }
            }}
            aria-label={`Explore ${bucketName(b)} · ${readout(b)}`}
            title={readout(b)}
          >
            {b.label}
            {model.resolution === "hour" ? "h" : ""}
            {i === peakIndex && <i />}
          </button>
        );
      })}
      <span className="x-dial-tag">
        <i /> {model.buckets.length} {model.resolution}s. One connected story.
      </span>
    </div>
  );
}

function Places({
  model,
  manifest,
}: {
  model: ReportModel;
  manifest: Manifest;
}) {
  const children = geoChildren[model.selection.geo],
    items = children.length ? children : [model.selection.geo];
  return (
    <section className="x-places">
      <div className="x-section-head">
        <div>
          <span className="x-eyebrow">CHANGE YOUR PERSPECTIVE</span>
          <h3>Every place has a different story.</h3>
        </div>
        <span className="x-small">Study areas, not national totals</span>
      </div>
      <nav className="x-geo-trail" aria-label="Geography breadcrumb">
        {geoPaths[model.selection.geo].map((geo, i) => (
          <span key={geo}>
            {i > 0 && <ChevronRight size={12} />}
            <button
              onClick={() => model.selectGeo(geo)}
              aria-current={
                geo === model.selection.geo ? "location" : undefined
              }
            >
              {geoNames[geo]}
            </button>
          </span>
        ))}
      </nav>
      <div className="x-place-grid">
        {items.map((geo) => {
          const c = model.geoCount(geo),
            study =
              manifest.cases.find((c) => c.id === geo) ??
              manifest.cases.find(
                (c) => c.id === (geo === "south-america" ? "chaco" : "evros"),
              )!;
          return (
            <button
              className="x-place-card"
              key={geo}
              onClick={() => model.selectGeo(geo)}
              disabled={!children.length}
              aria-label={`Explore ${geoNames[geo]} · ${c.value === null ? "open available record" : `${integer(c.value)} detections`}`}
            >
              <img src={`/assets/${study.image}`} alt="" loading="lazy" />
              <span className="x-place-shade" />
              <span className="x-place-top">
                <span>
                  {geo === "europe" || geo === "south-america"
                    ? "CONTINENT LENS"
                    : geo === "greece"
                      ? "COUNTRY STUDY GROUP"
                      : "REGION LENS"}
                </span>
                <ArrowUpRight size={18} />
              </span>
              <span className="x-place-name">{geoNames[geo]}</span>
              <span className="x-place-count">
                {c.value === null
                  ? geo === "south-america"
                    ? "Explore 2020 →"
                    : "Open available record"
                  : `${integer(c.value)} detections`}
                <small>
                  Imagery: {study.date} · {study.name}
                </small>
              </span>
            </button>
          );
        })}
      </div>
      <p className="x-place-scope">
        {model.selection.geo === "south-america" ||
        model.selection.geo === "chaco"
          ? "Gran Chaco crosses borders. Country attribution is unavailable, so we go straight to the study region."
          : "The Greece study group contains Evros and Evia. These rectangular study areas can include border pixels."}
      </p>
    </section>
  );
}

function SatelliteLens({ model }: { model: ReportModel }) {
  return (
    <section className="x-lens">
      <div className="x-lens-illustration" aria-hidden="true">
        <span />
        <span />
        <span />
        <Satellite size={27} />
      </div>
      <div className="x-lens-copy">
        <span className="x-eyebrow">SAME WORLD. DIFFERENT EYES.</span>
        <h3>More pixels ≠ more fires.</h3>
        <p>
          One fire can light up many pixels. Change the satellite and see how
          the reported count changes.
        </p>
      </div>
      <div className="x-lens-controls">
        {(["modis", "viirs"] as const).map((sensor) => (
          <button
            key={sensor}
            className={model.selection.sensor === sensor ? "active" : ""}
            onClick={() => model.update({ sensor })}
            aria-pressed={model.selection.sensor === sensor}
          >
            <span>
              {sensor === "modis" ? "Aqua MODIS" : "S-NPP VIIRS"}
              {model.selection.sensor === sensor && <Check size={12} />}
            </span>
            <strong>
              <Counter value={model.sensorCounts[sensor]} />
            </strong>
            <small>
              {sensor === "modis" ? "1 km" : "375 m"} nominal pixels ·
              detections
            </small>
          </button>
        ))}
      </div>
    </section>
  );
}

function Status({ model }: { model: ReportModel }) {
  return (
    <div className="x-empty" role={model.failed ? "alert" : "status"}>
      {model.busy ? (
        <LoaderCircle size={32} className="x-spin" />
      ) : (
        <Satellite size={32} />
      )}
      <h3>
        {model.busy
          ? "Zooming into the record…"
          : model.failed
            ? "This moment is out of reach."
            : "A gap in the view."}
      </h3>
      <p>
        {model.busy
          ? "Opening the original satellite timestamps."
          : model.failed
            ? "The monthly summary is here, but this detailed file could not load."
            : "This satellite has no source data for this selection. A missing record doesn’t mean no fire."}
      </p>
      {model.failed ? (
        <button className="x-primary" onClick={model.retry}>
          Try again <RotateCcw size={15} />
        </button>
      ) : !model.busy ? (
        <button
          className="x-primary"
          onClick={() => model.update({ sensor: "modis" })}
        >
          Try the MODIS record <ArrowRight size={16} />
        </button>
      ) : null}
    </div>
  );
}

function Wave({ buckets, active }: { buckets: Bucket[]; active: number }) {
  const reduced = useReducedMotion(),
    max = Math.max(1, ...buckets.map((b) => b.value ?? 0));
  const points = buckets.map((b, i) => ({
    x: 45 + (i / Math.max(1, buckets.length - 1)) * 910,
    y: 240 - ((b.value ?? 0) / max) * 185,
  }));
  let path = points.length ? `M${points[0].x},${points[0].y}` : "";
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1],
      b = points[i],
      mx = (a.x + b.x) / 2;
    path += ` C${mx},${a.y} ${mx},${b.y} ${b.x},${b.y}`;
  }
  const p = points[active];
  return (
    <svg
      className="x-wave"
      viewBox="0 0 1000 290"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="wave-fill" x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#f5a977" stopOpacity=".28" />
          <stop offset="1" stopColor="#f5a977" stopOpacity="0" />
        </linearGradient>
        <filter id="wave-glow">
          <feGaussianBlur stdDeviation="5" />
        </filter>
      </defs>
      <path d={`${path} L955,275 L45,275 Z`} fill="url(#wave-fill)" />
      <path
        d={path}
        stroke="#ff9a66"
        strokeWidth="5"
        fill="none"
        filter="url(#wave-glow)"
        opacity=".5"
      />
      <motion.path
        d={path}
        stroke="#f7c792"
        strokeWidth="1.6"
        fill="none"
        initial={{ pathLength: reduced ? 1 : 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: reduced ? 0 : 1.2 }}
      />
      {p && (
        <>
          <motion.line
            initial={false}
            animate={{ x1: p.x, x2: p.x }}
            y1="12"
            y2="275"
            stroke="#f8d6aa"
            strokeDasharray="3 6"
            opacity=".5"
            transition={{ duration: reduced ? 0 : 0.35 }}
          />
          <motion.circle
            initial={false}
            animate={{ cx: p.x, cy: p.y }}
            r="5"
            fill="#ffe1b3"
            transition={{ duration: reduced ? 0 : 0.35 }}
          />
        </>
      )}
    </svg>
  );
}

export default function Report({ manifest }: { manifest: Manifest }) {
  const model = useReport(manifest);
  const [concept, setConcept] = useState<Concept>(() => {
    return parseConcept(new URLSearchParams(location.search).get("concept"));
  });
  useEffect(() => {
    const original = "PyroBridge — A continuous view of fire";
    document.title =
      concept === "gallery"
        ? "Report Playground — PyroBridge"
        : `${concepts.find((c) => c.id === concept)?.name} — PyroBridge`;
    return () => {
      document.title = original;
    };
  }, [concept]);
  const [modal, setModal] = useState<"compare" | "data" | null>(null),
    [paused, setPaused] = useState(false),
    [shape, setShape] = useState<ParticleShape>("columns"),
    [preview, setPreview] = useState(0),
    [resetToken, setResetToken] = useState(0),
    [playing, setPlaying] = useState(false);
  const reduced = useReducedMotion(),
    stageRef = useRef<HTMLDivElement>(null),
    conceptNavRef = useRef<HTMLDivElement>(null),
    pendingFocus = useRef(false);
  useEffect(() => {
    conceptNavRef.current
      ?.querySelector<HTMLElement>('[aria-pressed="true"]')
      ?.scrollIntoView({
        block: "nearest",
        inline: "nearest",
        behavior: reduced ? "instant" : "smooth",
      });
  }, [concept, reduced]);
  const signature = model.buckets.map((b) => b.key).join(",");
  useEffect(() => {
    setPreview(
      Math.max(
        0,
        model.buckets.findIndex((b) => b.key === model.peak?.key),
      ),
    );
    setPlaying(false);
  }, [signature]);
  useEffect(() => {
    if (!playing || paused || reduced || !model.buckets.length) return;
    const id = setInterval(
      () => setPreview((i) => (i + 1) % model.buckets.length),
      1600,
    );
    return () => clearInterval(id);
  }, [playing, paused, reduced, model.buckets.length]);
  useEffect(() => {
    if (!pendingFocus.current || model.busy) return;
    pendingFocus.current = false;
    const selected =
      stageRef.current?.querySelector<HTMLButtonElement>(
        ".x-period.selected",
      ) ??
      stageRef.current?.querySelector<HTMLButtonElement>(
        ".x-dial-label.peak",
      ) ??
      stageRef.current?.querySelector<HTMLButtonElement>(".x-period");
    selected?.focus({ preventScroll: true });
  }, [signature, model.busy, model.selection.hour]);
  const picks = useIdeaPicks();
  const current = concepts.find((c) => c.id === concept) ?? concepts[0],
    inspected = model.buckets[preview] ?? model.peak;
  const hasData =
    model.buckets.some((b) => b.value !== null) && !model.failed && !model.busy;
  const lastChart = useRef<Pick<
    ReportModel,
    "buckets" | "peak" | "total" | "share"
  > | null>(null);
  if (hasData)
    lastChart.current = {
      buckets: model.buckets,
      peak: model.peak,
      total: model.total,
      share: model.share,
    };
  const drawing =
    model.busy && lastChart.current
      ? { ...model, ...lastChart.current }
      : model;
  const showField = hasData || (model.busy && lastChart.current !== null);
  const yearsLabel =
    model.years.length > 1
      ? `${model.years[0]}–${model.years.at(-1)}`
      : String(model.years[0]);
  const peakLabel = model.peak ? bucketName(model.peak) : "this period",
    periodWord = model.selection.record
      ? "record"
      : model.selection.day
        ? "day"
        : model.selection.month
          ? "month"
          : "year";
  const peakHeadline = model.selection.hour
    ? "A moment.\nCaught from space."
    : model.selection.day
      ? "One day.\nHour by hour."
      : model.selection.month
        ? model.share >= 40
          ? "A month in motion.\nOne day stands out."
          : "A month in motion.\nFind its rhythm."
        : model.selection.record
          ? "Years change.\nPatterns emerge."
          : model.share >= 50
            ? "A whole year.\nOne blazing month."
            : "A year of signals.\nFind its rhythm.";
  const headline = model.busy
    ? "A closer look.\nThe story unfolds."
    : model.count.value === null
      ? "A gap in the view.\nNot the whole story."
      : model.count.value === 0
        ? "A quieter record.\nLook a little closer."
        : peakHeadline;
  const takeaway = model.busy
    ? "Opening the original satellite timestamps. A finer story is taking shape."
    : model.peak?.value
      ? `${model.share}% of this ${periodWord}’s reported detections fall in ${peakLabel}.`
      : model.count.value === null
        ? "There is no source data for this view."
        : "No detections were reported in this selection.";
  function selectPeriod(key: string) {
    pendingFocus.current = true;
    setPlaying(false);
    model.selectPeriod(key);
  }
  function switchConcept(id: Concept) {
    if (id === concept) {
      setModal(null);
      return;
    }
    setPlaying(false);
    const change = () => {
      setConcept(id);
      setModal(null);
      const url = new URL(location.href);
      url.searchParams.set("concept", id);
      url.searchParams.set("tab", "report");
      history.replaceState(null, "", url);
      window.scrollTo({ top: 0, behavior: "instant" });
    };
    if (!reduced && document.startViewTransition) {
      const t = document.startViewTransition(() => flushSync(change));
      t.finished.catch(() => {});
    } else change();
  }
  function restart() {
    model.reset();
    setPlaying(false);
    setPreview(
      Math.max(
        0,
        model.buckets.findIndex((b) => b.key === model.peak?.key),
      ),
    );
    setResetToken((n) => n + 1);
  }

  return (
    <div className={`report-experience x-${concept}`}>
      <header className="x-report-nav">
        <a href="#report-stage" className="x-report-label">
          <Flame size={17} />
          <span>THE FIRE STORIES</span>
          <i /> REPORT
        </a>
        <div
          className="x-concept-switch"
          ref={conceptNavRef}
          role="group"
          aria-label="Report concept"
        >
          <button
            className={concept === "gallery" ? "active" : ""}
            aria-pressed={concept === "gallery"}
            onClick={() => switchConcept("gallery")}
          >
            <Grid2X2 size={14} /> All ideas
          </button>
          {concepts.map((c, i) => (
            <button
              key={c.id}
              className={concept === c.id ? "active" : ""}
              aria-pressed={concept === c.id}
              onClick={() => switchConcept(c.id)}
            >
              <span>0{i + 1}</span>
              <c.icon size={14} />
              {c.name}
            </button>
          ))}
        </div>
        <button
          className="x-shortlist-nav"
          onClick={() => switchConcept("gallery")}
          aria-label={`Open gallery and shortlist, ${picks.count} saved ideas`}
        >
          <Heart size={15} />
          <span>{picks.count}</span>
        </button>
        <button
          className="x-icon-button"
          onClick={() => setModal("compare")}
          aria-label="Compare report concepts"
        >
          <Layers3 size={18} />
        </button>
      </header>
      <div className="x-controls">
        <div className="x-filters">
          <label>
            <span>Year</span>
            <select
              aria-label="Report year"
              value={model.selection.year}
              onChange={(e) =>
                model.update({
                  year: Number(e.target.value),
                  record: false,
                  month: null,
                  day: null,
                  hour: null,
                })
              }
            >
              {model.years.map((y) => (
                <option key={y}>{y}</option>
              ))}
            </select>
            <ChevronDown size={12} />
          </label>
          <label>
            <span>Place</span>
            <select
              aria-label="Report geography"
              value={model.selection.geo}
              onChange={(e) => model.selectGeo(e.target.value as Geography)}
            >
              {Object.entries(geoNames).map(([key, name]) => (
                <option key={key} value={key}>
                  {name}
                </option>
              ))}
            </select>
            <ChevronDown size={12} />
          </label>
          <label>
            <Satellite size={13} />
            <select
              aria-label="Report satellite"
              value={model.selection.sensor}
              onChange={(e) =>
                model.update({ sensor: e.target.value as ReportSensor })
              }
            >
              {Object.entries(sensors).map(([key, name]) => (
                <option key={key} value={key}>
                  {name}
                </option>
              ))}
            </select>
            <ChevronDown size={12} />
          </label>
          <button className="x-counting" onClick={() => setModal("data")}>
            Counting detections <CircleHelp size={13} />
          </button>
        </div>
        <div className="x-control-actions">
          <button
            aria-pressed={model.selection.record}
            onClick={() =>
              model.update({
                record: !model.selection.record,
                month: null,
                day: null,
                hour: null,
              })
            }
          >
            <Clock3 size={14} />
            {model.selection.record ? "Annual view" : `${yearsLabel} archive`}
          </button>
          <button
            onClick={() => {
              setPaused((v) => !v);
              setPlaying(false);
            }}
            aria-pressed={paused}
            aria-label={
              paused ? "Resume ambient animation" : "Pause ambient animation"
            }
          >
            {paused ? <Play size={14} /> : <Pause size={14} />}
          </button>
          <button onClick={restart} aria-label="Reset report">
            <RotateCcw size={14} />
          </button>
        </div>
      </div>
      <div className="x-context-line">
        <nav aria-label="Report time navigation">
          <button
            onClick={model.back}
            disabled={model.selection.record}
            aria-label="Back to wider time range"
          >
            <ArrowLeft size={14} />
          </button>
          <button
            onClick={() =>
              model.update({ record: true, month: null, day: null, hour: null })
            }
            aria-current={model.selection.record ? "step" : undefined}
          >
            Archive
          </button>
          <ChevronRight size={11} />
          <button
            onClick={() =>
              model.update({
                record: false,
                month: null,
                day: null,
                hour: null,
              })
            }
            aria-current={
              !model.selection.record && !model.selection.month
                ? "step"
                : undefined
            }
          >
            {model.selection.year}
          </button>
          {model.selection.month && (
            <>
              <ChevronRight size={11} />
              <button onClick={() => model.update({ day: null, hour: null })}>
                {monthName(model.selection.month, true)}
              </button>
            </>
          )}
          {model.selection.day && (
            <>
              <ChevronRight size={11} />
              <button onClick={() => model.update({ hour: null })}>
                {Number(model.selection.day.slice(8))}
              </button>
            </>
          )}
          {model.selection.hour && (
            <>
              <ChevronRight size={11} />
              <strong>{model.selection.hour.slice(11)}:00 UTC</strong>
            </>
          )}
        </nav>
        <span>
          {geoNames[model.selection.geo]} <i />{" "}
          {sensors[model.selection.sensor]} <i />{" "}
          {model.selection.record ? "Full archive" : model.label}
        </span>
      </div>
      {concept !== "gallery" && (
        <div className="experiment-selection-strip">
          <button onClick={() => switchConcept("gallery")}>
            <ArrowLeft size={13} /> All nine ideas
          </button>
          <span>
            {current.type} · experiment {concepts.indexOf(current) + 1} of{" "}
            {concepts.length}
          </span>
          <IdeaPicker id={current.id} picks={picks} compact />
        </div>
      )}
      <main
        id="report-stage"
        className="x-stage"
        ref={stageRef}
        tabIndex={-1}
        aria-label="Interactive report results"
        aria-busy={model.busy}
      >
        {concept === "gallery" && (
          <ReportGallery model={model} picks={picks} onOpen={switchConcept} />
        )}
        {!["gallery", "story", "dashboard", "timeline"].includes(concept) && (
          <Suspense
            fallback={
              <div className="exp-loading" role="status">
                <LoaderCircle className="x-spin" size={22} /> Opening the
                experiment…
              </div>
            }
          >
            <Experiments
              key={`${current.id}:${resetToken}`}
              id={current.id}
              model={model}
              manifest={manifest}
              paused={paused}
              onSelect={selectPeriod}
            />
          </Suspense>
        )}
        {concept === "story" && (
          <>
            <section className="x-story-hero">
              <div className="x-story-copy">
                <motion.div
                  className="x-kicker"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <i />{" "}
                  {model.selection.record
                    ? "THE LONGER STORY"
                    : `THE ${model.selection.year} FIRE STORY`}
                  <span>01 — THE SPARK</span>
                </motion.div>
                <AnimatePresence mode="wait" initial={false}>
                  <motion.h1
                    key={headline}
                    initial={{
                      opacity: 0,
                      y: reduced ? 0 : 20,
                      filter: reduced ? "none" : "blur(8px)",
                    }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    exit={{ opacity: 0, y: reduced ? 0 : -12 }}
                    transition={{ duration: reduced ? 0 : 0.45 }}
                  >
                    {headline.split("\n").map((line, i) => (
                      <span key={line} className={i ? "x-warm-text" : ""}>
                        {line}
                      </span>
                    ))}
                  </motion.h1>
                </AnimatePresence>
                <div className="x-hero-number">
                  <Counter
                    value={
                      model.busy && model.selection.day
                        ? null
                        : model.count.value
                    }
                  />
                  <span>
                    fire detections
                    <br />
                    <small>reported hotspot pixels</small>
                  </span>
                </div>
                <p className="x-hero-insight">
                  {takeaway}{" "}
                  <span>
                    {model.peak?.value
                      ? "Follow the glow to find out when."
                      : "A missing or empty record does not establish an absence of fire."}
                  </span>
                </p>
                <button
                  className="x-primary"
                  disabled={!model.peak?.value || !hasData}
                  onClick={() => model.peak && selectPeriod(model.peak.key)}
                >
                  {model.selection.hour
                    ? "Inspect the busiest hour"
                    : model.selection.record
                      ? "Step into the standout year"
                      : "Follow the spark"}
                  <ArrowRight size={18} />
                </button>
                <a className="x-explore-link" href="#report-discoveries">
                  Or explore the bigger picture <ArrowDown size={13} />
                </a>
              </div>
              <div className="x-story-sculpture">
                {showField ? (
                  <Dial
                    model={drawing}
                    paused={paused}
                    onSelect={selectPeriod}
                  />
                ) : (
                  <Status model={model} />
                )}
                {model.busy && showField && (
                  <div className="x-loading-veil" role="status">
                    <LoaderCircle size={22} className="x-spin" /> Pulling this
                    moment closer…
                  </div>
                )}
                <p className="x-visual-note">
                  A scaled particle view of reported detections.
                  <br />
                  One glow does not mean one individual fire.
                </p>
              </div>
              <span className="x-hero-index" aria-hidden="true">
                {String(model.depth + 1).padStart(2, "0")}
              </span>
            </section>
            <div className="x-story-rail">
              <span>
                <i /> YOUR NEXT DISCOVERY
              </span>
              <strong>
                {model.selection.hour
                  ? "Satellite time is not ignition time."
                  : `A ${model.resolution} is just the beginning.`}
              </strong>
              <span>
                {model.selection.hour
                  ? "You’ve reached the finest time resolution in this record."
                  : `Select any ${model.resolution} around the dial to open its story.`}
              </span>
              <ArrowUpRight size={18} />
            </div>
            <div className="x-exact-series">
              <div className="x-section-head">
                <span className="x-eyebrow">
                  THE SAME STORY, IN EXACT COUNTS
                </span>
                <span className="x-small">
                  {model.selection.hour
                    ? "Chart: selected day · metrics: selected hour"
                    : `Detections per ${model.resolution} · select to go closer`}
                </span>
              </div>
              <Periods model={model} onSelect={selectPeriod} />
            </div>
          </>
        )}
        {concept === "dashboard" && (
          <>
            <div className="x-lab-heading">
              <div>
                <span className="x-kicker">
                  <i /> 02 — THE OBSERVATORY
                </span>
                <h1>Play with perspective.</h1>
                <p>
                  Same signals. New shapes. A different way to see the story.
                </p>
              </div>
              <div className="x-lab-total">
                <Counter value={model.count.value} />
                <span>fire detections · {model.label}</span>
              </div>
            </div>
            <section className="x-lab">
              <div className="x-lab-top">
                <span className="x-eyebrow">
                  <span className="x-live-dot" /> A LIVING VIEW OF THE RECORD
                </span>
                <div role="group" aria-label="Visualization shape">
                  {(
                    [
                      { id: "columns", name: "Spark columns" },
                      { id: "orbit", name: "Season orbit" },
                      { id: "river", name: "Signal river" },
                    ] as const
                  ).map((s) => (
                    <button
                      key={s.id}
                      className={shape === s.id ? "active" : ""}
                      aria-pressed={shape === s.id}
                      onClick={() => setShape(s.id)}
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
              </div>
              <div
                className={`x-lab-canvas ${shape === "orbit" ? "orbit" : ""}`}
              >
                {showField ? (
                  <>
                    <FireField
                      buckets={drawing.buckets}
                      shape={shape}
                      paused={paused}
                    />
                    <div className="x-lab-annotation">
                      <span className="x-eyebrow">THE STANDOUT</span>
                      <strong>
                        {model.share}
                        <small>%</small>
                      </strong>
                      <p>
                        of the chart’s detections
                        <br />
                        in {model.peak?.label}
                      </p>
                      <button
                        onClick={() =>
                          model.peak && selectPeriod(model.peak.key)
                        }
                        disabled={!model.peak?.value}
                      >
                        Go into {model.peak?.label} <ArrowUpRight size={14} />
                      </button>
                    </div>
                  </>
                ) : (
                  <Status model={model} />
                )}
                {model.busy && showField && (
                  <div className="x-loading-veil" role="status">
                    <LoaderCircle size={22} className="x-spin" /> Opening the
                    next layer…
                  </div>
                )}
              </div>
              <Periods model={model} onSelect={selectPeriod} />
              <p className="x-lab-note">
                Particles are weighted to reported detections, not individual
                fire events. Choose a period below the sculpture to go closer.
              </p>
            </section>
            <div className="x-lab-insights">
              <div>
                <Sparkles size={20} />
                <p>{takeaway}</p>
              </div>
              <div>
                <Layers3 size={19} />
                <p>
                  {model.change === null
                    ? "A comparable previous-period percentage isn’t available for this lens."
                    : `${model.change > 0 ? "+" : ""}${model.change.toFixed(1)}% reported pixels vs. the previous period.`}
                  <small>
                    Satellite coverage and observing effort can affect raw
                    counts.
                  </small>
                </p>
              </div>
            </div>
          </>
        )}
        {concept === "timeline" && (
          <>
            <div className="x-time-heading">
              <span className="x-kicker">
                <i /> 03 — TIME MACHINE
              </span>
              <h1>
                What if you could
                <br />
                <span className="x-warm-text">
                  {model.selection.record
                    ? "feel the record unfold?"
                    : `feel a ${periodWord} unfold?`}
                </span>
              </h1>
              <p>
                Scrub through the signals. Replay the rhythm. Dive into a
                moment.
              </p>
            </div>
            <nav className="x-time-depth" aria-label="Temporal depth">
              {["Archive", "Year", "Month", "Day", "Hour"].map((name, i) => (
                <button
                  key={name}
                  className={
                    model.depth === i
                      ? "active"
                      : i < model.depth
                        ? "visited"
                        : ""
                  }
                  disabled={i > model.depth}
                  onClick={() =>
                    i === 0
                      ? model.update({
                          record: true,
                          month: null,
                          day: null,
                          hour: null,
                        })
                      : i === 1
                        ? model.update({
                            record: false,
                            month: null,
                            day: null,
                            hour: null,
                          })
                        : i === 2
                          ? model.update({ day: null, hour: null })
                          : model.update({ hour: null })
                  }
                >
                  <span>{i < model.depth ? <Check size={12} /> : i + 1}</span>
                  {name}
                </button>
              ))}
            </nav>
            <section className="x-time-console">
              <div className="x-time-readout">
                <div>
                  <span className="x-eyebrow">
                    {playing ? "REPLAYING" : "PREVIEWING"} ·{" "}
                    {model.label.toUpperCase()}
                  </span>
                  <h3>{inspected ? bucketName(inspected) : "No record"}</h3>
                </div>
                <div>
                  <Counter value={inspected?.value ?? null} />
                  <span>fire detections in this {model.resolution}</span>
                </div>
                <button
                  className="x-primary"
                  disabled={!hasData || !inspected || inspected.value === null}
                  onClick={() => inspected && selectPeriod(inspected.key)}
                >
                  Enter this {model.resolution}
                  <ArrowRight size={17} />
                </button>
              </div>
              <div className="x-time-wave">
                {showField ? (
                  <>
                    <FireField
                      buckets={drawing.buckets}
                      shape="river"
                      active={preview}
                      paused={paused}
                    />
                    <Wave buckets={drawing.buckets} active={preview} />
                  </>
                ) : (
                  <Status model={model} />
                )}
                {model.busy && showField && (
                  <div className="x-loading-veil" role="status">
                    <LoaderCircle size={22} className="x-spin" /> Opening the
                    next layer…
                  </div>
                )}
              </div>
              <div className="x-scrubber">
                <button
                  className="x-play"
                  aria-label={
                    playing ? "Pause timeline replay" : "Play timeline replay"
                  }
                  aria-pressed={playing}
                  disabled={!hasData || !!reduced || paused}
                  onClick={() => setPlaying((v) => !v)}
                >
                  {playing ? (
                    <Pause size={19} />
                  ) : (
                    <Play size={19} fill="currentColor" />
                  )}
                </button>
                <input
                  type="range"
                  aria-label="Preview time period"
                  aria-valuetext={
                    inspected
                      ? `${bucketName(inspected)}: ${readout(inspected)}`
                      : "No source data"
                  }
                  min={0}
                  max={Math.max(0, model.buckets.length - 1)}
                  value={Math.min(
                    preview,
                    Math.max(0, model.buckets.length - 1),
                  )}
                  onChange={(e) => {
                    setPreview(Number(e.target.value));
                    setPlaying(false);
                  }}
                  disabled={!hasData}
                />
                <span>
                  {String(preview + 1).padStart(2, "0")} /{" "}
                  {model.buckets.length}
                </span>
              </div>
              <Periods
                model={model}
                onSelect={selectPeriod}
                preview={preview}
                onPreview={(i) => {
                  setPreview(i);
                  setPlaying(false);
                }}
              />
              <p className="x-lab-note">
                Scrubbing previews a period. “Enter” changes your time
                selection. Hours are satellite acquisition times in UTC, not
                fire ignition times.
              </p>
            </section>
            <div className="x-time-caption">
              <span>
                <Clock3 size={16} />{" "}
                {model.selection.hour
                  ? "The finest moment in this record."
                  : `Every ${model.resolution} opens another layer.`}
              </span>
              <p>{takeaway}</p>
            </div>
          </>
        )}
      </main>
      {concept !== "gallery" && (
        <div className="x-understanding" id="report-discoveries">
          <div className="x-understanding-intro">
            <span className="x-eyebrow">KEEP THE CURIOSITY GOING</span>
            <h2>
              The story changes
              <br />
              <span>when you change the lens.</span>
            </h2>
            <p>
              Pick a place. Look through a different satellite.
              <br />
              Everything above follows your choice.
            </p>
          </div>
          <Places model={model} manifest={manifest} />
          <SatelliteLens model={model} />
        </div>
      )}
      {concept !== "gallery" && model.selection.hour && (
        <section className="x-acquisitions">
          <span className="x-eyebrow">YOU MADE IT TO THE ORIGINAL SIGNAL</span>
          <h3>{model.label}</h3>
          <p>
            {integer(model.rows.length)} hotspot pixels. These timestamps tell
            us when a satellite saw a thermal anomaly—not when a fire started.
          </p>
          <div>
            {model.rows.slice(0, 4).map((o) => (
              <article key={o.id}>
                <Satellite size={16} />
                <strong>{o.time.slice(11, 16)} UTC</strong>
                <span>{o.sensor}</span>
                <small>
                  {o.frp === null
                    ? "Radiative power unavailable"
                    : `${o.frp} MW radiative power`}
                </small>
              </article>
            ))}
          </div>
        </section>
      )}
      <section className="x-data-ribbon">
        <div>
          <span className="x-live-dot" />
          <strong>Real satellite data. Real stories.</strong>
          <span>
            NASA FIRMS · {model.represented}/{model.cases.length} study areas ·{" "}
            {model.summary.available}/{model.summary.expected} sensor-months
            available
          </span>
          {model.change !== null && (
            <span className="x-raw-change">
              Raw count change: {model.change > 0 ? "+" : ""}
              {model.change.toFixed(1)}% vs previous period · observing effort
              unverified
            </span>
          )}
        </div>
        <button onClick={() => setModal("data")}>
          How to read this <CircleHelp size={15} />
        </button>
      </section>
      <footer className="x-report-footer">
        <span>
          {concept === "gallery" ? (
            <Grid2X2 size={14} />
          ) : (
            <current.icon size={14} />
          )}{" "}
          {concept === "gallery" ? "The Report Playground" : current.name}
          <small>
            {concept === "gallery"
              ? `${concepts.length} directions · mix freely`
              : `${current.type} · concept ${concepts.findIndex((c) => c.id === concept) + 1} of ${concepts.length}`}
          </small>
        </span>
        <button onClick={() => switchConcept("gallery")}>
          All ideas & your picks <ArrowUpRight size={14} />
        </button>
        <a href="#main-content">Back to top ↑</a>
      </footer>
      {modal && (
        <Modal
          kind={
            modal === "compare"
              ? "Compare report concepts"
              : "How to read the fire stories"
          }
          onClose={() => setModal(null)}
        >
          {modal === "compare" ? (
            <>
              <span className="x-eyebrow">
                ONE RECORD. THREE WAYS TO FEEL IT.
              </span>
              <h2>Pick your kind of curiosity.</h2>
              <p>
                Switching experiences keeps your time, place, and satellite
                selection.
              </p>
              <div className="x-compare-grid">
                {concepts.map((c, i) => (
                  <button
                    key={c.id}
                    onClick={() => switchConcept(c.id)}
                    className={concept === c.id ? "active" : ""}
                  >
                    <span className="x-eyebrow">
                      0{i + 1} · {c.type}
                    </span>
                    <c.icon size={27} />
                    <h3>{c.name}</h3>
                    <p>{c.description}</p>
                    <strong>{c.strength}</strong>
                    <small>{c.tradeoff}</small>
                    <span className="x-compare-cta">
                      {concept === c.id ? "You’re here" : "Step inside"}
                      <ArrowRight size={15} />
                    </span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <span className="x-eyebrow">
                THE SCIENCE, WITHOUT THE MYSTERY
              </span>
              <h2>
                A glow is a clue.
                <br />
                It isn’t a fire count.
              </h2>
              <p>
                A satellite reports a thermal anomaly in a pixel. The same fire
                may be seen many times, across many pixels and passes. Some
                hotspots have other causes.
              </p>
              <div className="x-metric-notes">
                <article>
                  <span>What you’re seeing</span>
                  <h3>Reported detections</h3>
                  <p>
                    The real bundled Aqua MODIS and S-NPP VIIRS observations.
                    Particle density follows these counts, capped at 1,500
                    visual particles. They illustrate relative volume, not
                    individual events or locations.
                  </p>
                </article>
                <article>
                  <span>What isn’t in this record</span>
                  <h3>Area, events & forecasts</h3>
                  <p>
                    Unique fire events and burned area in km² are unavailable.
                    Pixel footprints cannot be added to calculate burned land.
                    Predictions and calibrated uncertainty intervals remain
                    unreleased.
                  </p>
                </article>
                <article>
                  <span>Where the gaps are</span>
                  <h3>Defined study areas</h3>
                  <p>
                    Evros and Evia: 2003–2025. Gran Chaco: 2020 only. VIIRS
                    starts in 2012. Rectangular study areas are not national or
                    continental totals; border pixels may be included. Gran
                    Chaco has no country attribution.
                  </p>
                </article>
                <article>
                  <span>What changes can mean</span>
                  <h3>A view with limits</h3>
                  <p>
                    Clouds, passes, sensor resolution and unverified monthly
                    observing effort affect counts. Raw changes do not measure
                    fire risk. Empty periods are not verified fire-free periods.
                    Missing sources remain gaps.
                  </p>
                </article>
              </div>
              <div className="x-source-note">
                <a
                  href="https://firms.modaps.eosdis.nasa.gov/download/"
                  target="_blank"
                  rel="noreferrer"
                >
                  NASA FIRMS archive <ArrowUpRight size={13} />
                </a>
                <span>
                  Bundle {manifest.bundleVersion} · UTC · no sample data
                </span>
                <p>
                  The separate 2026 global snapshot is excluded. Background
                  imagery retains its original date. Historical point files need
                  a connection unless previously cached.
                </p>
              </div>
            </>
          )}
        </Modal>
      )}
    </div>
  );
}

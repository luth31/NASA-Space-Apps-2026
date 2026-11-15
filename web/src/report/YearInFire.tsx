import { useEffect, useMemo, useRef, useState } from "react";
import {
  AnimatePresence,
  MotionConfig,
  motion,
  useReducedMotion,
} from "motion/react";
import {
  ArrowDownRight,
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Clock3,
  MapPin,
  MoreHorizontal,
  Pause,
  Play,
  RotateCcw,
  Satellite,
  X,
  Flame,
  Repeat2,
  ScanLine,
  BookOpen,
  ZoomIn,
  ZoomOut,
  MoveHorizontal,
  Layers3,
} from "lucide-react";
import type { Manifest } from "../data";
import { integer } from "../data";
import { useReport } from "./use-report";
import { geoChildren, geoNames, geoPaths, monthName } from "./report-data";
import type { Bucket, Geography, ReportSensor } from "./report-data";
import { Counter, bucketName } from "./primitives";
import {
  journeyInitial,
  journeySelection,
  ribbonGeometry,
  shortPeriod,
} from "./journey-data";
import type { JourneyAction } from "./journey-data";
import JourneyRibbon from "./JourneyRibbon";
import type { RibbonOrigin } from "./JourneyRibbon";
import {
  seasonalPatterns,
  relatedReadings,
  comparableSensorRatio,
} from "./pattern-data";
import { PatternWeave, SatelliteFlow, ReadingCards } from "./PatternViews";
import { useChartZoom } from "./use-chart-zoom";
import "./journey.css";
import "./patterns.css";

type Drawer =
  | "where"
  | "details"
  | "observations"
  | "reading"
  | "patterns"
  | null;
const placeLabels: Record<Geography, string> = {
  all: "All study areas",
  europe: "Europe · study areas",
  greece: "Greece · study areas",
  evros: "Evros",
  evia: "Evia",
  "south-america": "South America · study area",
  chaco: "Gran Chaco",
};

function Panel({
  title,
  children,
  close,
}: {
  title: string;
  children: React.ReactNode;
  close: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current!;
    const previous = document.activeElement as HTMLElement | null;
    dialog.showModal();
    return () => {
      dialog.close();
      previous?.focus({ preventScroll: true });
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="jy-dialog"
      aria-label={title}
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <motion.div
        initial={{ opacity: 0, x: 24 }}
        animate={{ opacity: 1, x: 0 }}
        className="jy-panel"
      >
        <header>
          <span className="jy-eyebrow">A YEAR IN FIRE</span>
          <button
            className="jy-icon"
            onClick={close}
            aria-label="Close panel"
            autoFocus
          >
            <X size={20} />
          </button>
        </header>
        <h2>{title}</h2>
        {children}
      </motion.div>
    </dialog>
  );
}

export default function YearInFire({ manifest }: { manifest: Manifest }) {
  const model = useReport(manifest, journeyInitial);
  const s = model.selection;
  const prefersReduced = useReducedMotion();
  const [reduceMotion, setReduceMotion] = useState(false);
  const reduced = prefersReduced || reduceMotion;
  const [paused, setPaused] = useState(false);
  const [drawer, setDrawer] = useState<Drawer>(null);
  const [lens, setLens] = useState<"season" | "satellites">("season");
  const [focusedKey, setFocusedKey] = useState<string | null>(null);
  const lastTap = useRef({ key: "", at: 0 });
  const [hovered, setHovered] = useState<string | null>(null);
  const [returnedKey, setReturnedKey] = useState<string | null>(null);
  const [origin, setOrigin] = useState<RibbonOrigin | null>(null);
  const [notice, setNotice] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);
  const pendingFocus = useRef(false);
  const plot = useRef<HTMLDivElement>(null);
  const lastBuckets = useRef<Bucket[]>([]);
  if (!model.busy && !model.failed) lastBuckets.current = model.buckets;
  const buckets =
    model.busy || model.failed ? lastBuckets.current : model.buckets;
  const geometry = useMemo(() => ribbonGeometry(buckets), [buckets]);
  const peak = model.peak?.value ? model.peak : null;
  const peakIndex = buckets.findIndex((b) => b.key === peak?.key);
  const activeIndex = buckets.findIndex(
    (b) => b.key === (hovered ?? focusedKey ?? s.hour ?? returnedKey),
  );
  const inspected =
    buckets[activeIndex] ?? (peak ? buckets[peakIndex] : undefined);
  const hasSource =
    lens === "satellites" && !s.record
      ? model.sensorCounts.modis !== null || model.sensorCounts.viirs !== null
      : model.count.value !== null;
  const noSource = !model.busy && !model.failed && !hasSource;
  const patterns = useMemo(
    () => seasonalPatterns(model.cases, s.sensor),
    [model.cases, s.sensor],
  );
  const reading = relatedReadings(s.geo, s.year, s.month, s.record);
  const patternMonth =
    patterns.peakMonth === null
      ? null
      : monthName(
          `2023-${String(patterns.peakMonth + 1).padStart(2, "0")}`,
          true,
        );
  const sensorRatio = comparableSensorRatio(model);
  const mode = s.record ? "rhythm" : lens;
  const yearList = [...new Set([...model.years, s.year])].sort((a, b) => a - b);
  const yearSpan = `${model.years[0]}–${model.years.at(-1)}`;
  const signature = `${s.record}:${s.year}:${s.month}:${s.day}:${s.hour}:${s.geo}:${s.sensor}`;

  useEffect(() => {
    const original = document.title;
    document.title = "A Year in Fire — PyroBridge";
    return () => {
      document.title = original;
    };
  }, []);
  useEffect(() => {
    setHovered(null);
    if (pendingFocus.current && !model.busy) {
      heading.current?.focus({ preventScroll: true });
      if (window.matchMedia("(max-width: 760px)").matches) {
        heading.current
          ?.closest(".fire-journey")
          ?.scrollIntoView({
            block: "start",
            behavior: reduced ? "instant" : "smooth",
          });
      }
      pendingFocus.current = false;
    }
  }, [signature, model.busy, lens, reduced]);

  function navigate(action: JourneyAction) {
    setFocusedKey(null);
    setReturnedKey(
      action.type === "back"
        ? (s.hour ?? s.day ?? s.month ?? String(s.year))
        : null,
    );
    if (action.type === "period") {
      const index = buckets.findIndex((b) => b.key === action.key);
      if (index >= 0 && !s.day)
        setOrigin({
          key: action.key,
          index,
          fraction: 0.07 + ((index + 0.5) / buckets.length) * 0.86,
          serial: Date.now(),
        });
      else setOrigin(null);
    } else setOrigin(null);
    pendingFocus.current = true;
    setHovered(null);
    model.update(journeySelection(s, action));
  }
  function changePlace(geo: Geography) {
    navigate({ type: "geo", geo });
    setNotice(`Showing ${placeLabels[geo]}. Your time selection is unchanged.`);
    setDrawer(null);
  }
  function setMode(next: "season" | "rhythm" | "satellites") {
    if (next === mode) return;
    pendingFocus.current = true;
    if (next === "rhythm") navigate({ type: "archive" });
    else {
      setLens(next);
      if (s.record) navigate({ type: "year", year: s.year });
    }
  }
  function zoom(direction: number, fraction = -1) {
    if (model.busy) return;
    if (direction < 0) {
      navigate({ type: "back" });
      return;
    }
    if (s.hour) {
      setDrawer("observations");
      return;
    }
    const index =
      fraction < 0
        ? -1
        : Math.max(
            0,
            Math.min(
              buckets.length - 1,
              Math.floor(((fraction - 0.07) / 0.86) * buckets.length),
            ),
          );
    const target = buckets[index] ?? inspected ?? peak;
    if (target?.value !== null && target)
      navigate({ type: "period", key: target.key });
  }
  useChartZoom(
    plot,
    hasSource && !s.record && lens === "season" && !model.failed && !drawer,
    zoom,
  );
  const title = s.record
    ? "Does the season repeat?"
    : lens === "satellites"
      ? "Same scene. Different eyes."
      : s.hour
        ? "Seen from orbit."
        : s.day
          ? "The rhythm of a day."
          : s.month
            ? `${monthName(s.month, true)}, day by day.`
            : "A season in the signal.";
  const context = s.record
    ? `${yearSpan} · THE AVAILABLE RECORD`
    : s.hour
      ? `${s.day} · ${s.hour.slice(11)}:00–${s.hour.slice(11)}:59 UTC`
      : s.day
        ? `${model.label.toUpperCase()} · UTC`
        : s.month
          ? `${monthName(s.month, true).toUpperCase()} ${s.year} · DAY BY DAY`
          : `${s.year} · THE YEAR AT A GLANCE`;
  const takeaway = model.failed
    ? "The observation file couldn’t be loaded. You can retry."
    : model.busy
      ? "Opening the original satellite observations…"
      : noSource
        ? "This selection has no source data. That doesn’t mean no fire."
        : s.record
          ? patterns.eligible >= 2
            ? `${patternMonth} is the busiest month in ${patterns.frequency} of ${patterns.eligible} years with complete monthly source records.`
            : "There are not enough complete monthly source records to establish a repeating peak."
          : lens === "satellites"
            ? "Raw satellite counts can tell different stories. Compare the same periods before interpreting a change."
            : s.hour
              ? "Acquisition times reveal when the satellite observed thermal anomalies, rather than when fires began."
              : peak
                ? `${shortPeriod(peak.key)} concentrates ${model.share}% of this ${s.day ? "day’s" : s.month ? "month’s" : "year’s"} recorded detections. Follow the shape to see how it unfolds.`
                : "No detections were recorded in the available source data for this period.";
  const primary = s.record
    ? ""
    : s.hour
      ? "View observations"
      : inspected
        ? `Zoom into ${shortPeriod(inspected.key)}`
        : "";
  const concentration = s.hour
    ? Math.round(((model.count.value ?? 0) / Math.max(1, model.total)) * 100)
    : model.share;
  const unit =
    model.resolution === "hour"
      ? "UTC HOURS"
      : model.resolution === "day"
        ? "DAYS"
        : model.resolution === "year"
          ? "YEARS"
          : "MONTHS";
  const duration = reduced || paused ? 0 : 0.85;
  const coveragePartial = model.summary.available !== model.summary.expected;
  const children = geoChildren[s.geo];
  const placeRows = (children.length ? children : [s.geo])
    .map((geo) => ({ geo, ...model.geoCount(geo) }))
    .sort((a, b) => (b.value ?? -1) - (a.value ?? -1));
  const placeMax = Math.max(1, ...placeRows.map((p) => p.value ?? 0));

  return (
    <MotionConfig reducedMotion={reduced ? "always" : "user"}>
      <section
        className={`fire-journey ${paused ? "jy-paused" : ""}`}
        aria-label="A Year in Fire interactive report"
        data-pattern={mode}
        data-reduced-motion={reduced ? "true" : "false"}
      >
        <div className="jy-topline">
          <nav className="jy-trail" aria-label="Report time navigation">
            <button
              className="jy-icon jy-back"
              onClick={() => navigate({ type: "back" })}
              disabled={s.record}
              aria-label="Back to wider time range"
            >
              <ArrowLeft size={18} />
            </button>
            <button
              onClick={() => navigate({ type: "archive" })}
              aria-current={s.record ? "step" : undefined}
            >
              Years
            </button>
            <ChevronRight size={12} />
            <>
              {s.record ? (
                <span className="jy-record-range">{yearSpan}</span>
              ) : (
                <label className="jy-year">
                  <span className="jy-sr">Report year</span>
                  <select
                    aria-label="Report year"
                    value={s.year}
                    onChange={(e) =>
                      navigate({ type: "year", year: Number(e.target.value) })
                    }
                  >
                    {yearList.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={12} />
                </label>
              )}
            </>
            {s.month && (
              <>
                <ChevronRight size={12} />
                <button
                  onClick={() => navigate({ type: "period", key: s.month! })}
                  aria-current={!s.day ? "step" : undefined}
                >
                  {monthName(s.month)}
                </button>
              </>
            )}
            {s.day && (
              <>
                <ChevronRight size={12} />
                <button
                  onClick={() => navigate({ type: "period", key: s.day! })}
                  aria-current={!s.hour ? "step" : undefined}
                >
                  {Number(s.day.slice(8))}
                </button>
              </>
            )}
            {s.hour && (
              <>
                <ChevronRight size={12} />
                <span aria-current="step">{s.hour.slice(11)}:00 UTC</span>
              </>
            )}
          </nav>
          <div className="jy-context-tools">
            <button
              className="jy-place"
              onClick={() => setDrawer("where")}
              aria-label={`Where? Current place: ${placeLabels[s.geo]}`}
              aria-haspopup="dialog"
            >
              <MapPin size={15} />
              <span>{placeLabels[s.geo]}</span>
              <ChevronDown size={12} />
            </button>
            <button
              className="jy-icon"
              aria-label="Report details and satellite settings"
              aria-haspopup="dialog"
              onClick={() => setDrawer("details")}
            >
              <MoreHorizontal size={21} />
            </button>
          </div>
        </div>

        <div className="jy-scene" aria-busy={model.busy}>
          <nav className="jy-lenses" aria-label="Report pattern lenses">
            {(
              [
                { id: "season", label: "The season", icon: Flame },
                { id: "rhythm", label: "Across years", icon: Repeat2 },
                { id: "satellites", label: "Two satellites", icon: ScanLine },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                aria-pressed={mode === item.id}
                onClick={() => setMode(item.id)}
              >
                <item.icon size={15} />
                <span>{item.label}</span>
                {mode === item.id && (
                  <motion.i
                    layoutId="jy-active-lens"
                    transition={{ duration: reduced ? 0 : 0.3 }}
                  />
                )}
              </button>
            ))}
            <button
              className="jy-pattern-explain"
              onClick={() => setDrawer("patterns")}
              aria-label="What can these patterns tell us?"
            >
              <CircleHelp size={16} />
            </button>
          </nav>
          <div className="jy-storyline">
            <div className="jy-story">
              <span className="jy-eyebrow">
                <i />
                {context}
              </span>
              <h1 ref={heading} tabIndex={-1}>
                {title}
              </h1>
              <p className="jy-takeaway" aria-live="polite">
                {takeaway}
              </p>
            </div>
            <div className="jy-kpi jy-pattern-kpi">
              <div className="jy-pattern-value">
                {s.record ? (
                  <>
                    {patterns.eligible >= 2 ? (
                      <>
                        {patterns.frequency}
                        <em>/{patterns.eligible}</em>
                      </>
                    ) : (
                      "—"
                    )}
                  </>
                ) : lens === "satellites" ? (
                  <>
                    {sensorRatio === null ? "—" : sensorRatio.toFixed(1)}
                    {sensorRatio !== null && <em>×</em>}
                  </>
                ) : (
                  <>
                    <Counter
                      value={hasSource ? concentration : null}
                      instant={reduced}
                    />
                    {hasSource && <em>%</em>}
                  </>
                )}
              </div>
              <span>
                {s.record
                  ? patterns.eligible >= 2
                    ? `years peak in ${patternMonth}`
                    : "More history needed"
                  : lens === "satellites"
                    ? "VIIRS / MODIS detection count"
                    : s.hour
                      ? "of this day’s detections"
                      : peak
                        ? `concentrated in ${shortPeriod(peak.key)}`
                        : "of available detections"}
              </span>
              <small className="jy-raw-total">
                {lens === "satellites" && !s.record
                  ? "Raw observations · not harmonized"
                  : model.count.value === null
                    ? "Source unavailable"
                    : `${integer(model.count.value)} recorded detections in view`}
              </small>
              {coveragePartial && (
                <button
                  onClick={() => setDrawer("details")}
                  className="jy-partial"
                >
                  {lens === "satellites" && !s.record
                    ? "Sensor coverage differs"
                    : model.summary.available === 0
                      ? "No source coverage"
                      : "Partial source coverage"}
                  <CircleHelp size={12} />
                </button>
              )}
            </div>
          </div>

          <div
            ref={plot}
            onPointerMove={(e) => {
              if (
                mode !== "season" ||
                (e.pointerType === "touch" && !e.buttons) ||
                (e.target as HTMLElement).closest(".jy-zoom-controls")
              )
                return;
              const r = e.currentTarget.getBoundingClientRect();
              const i = Math.floor(
                (((e.clientX - r.left) / r.width - 0.07) / 0.86) *
                  buckets.length,
              );
              if (buckets[i]) setHovered(buckets[i].key);
            }}
            onPointerLeave={() => setHovered(null)}
            className={`jy-plot ${model.busy || model.failed ? "jy-loading" : ""} ${noSource ? "jy-empty" : ""}`}
          >
            {s.record ? (
              <PatternWeave
                rows={patterns.rows}
                selectedYear={s.year}
                onSelect={(key) => {
                  setLens("season");
                  navigate({ type: "period", key });
                }}
              />
            ) : lens === "satellites" ? (
              <SatelliteFlow
                model={model}
                reduced={!!reduced}
                onSelect={(key, sensor) => {
                  navigate({ type: "period", key });
                  model.update({ sensor });
                }}
              />
            ) : (
              <>
                <div className="jy-plot-caption">
                  <span>
                    {s.hour
                      ? `${shortPeriod(s.day!)} · 24 UTC HOURS`
                      : `${unit} · INSPECT THE SIGNAL`}
                  </span>
                  <span>
                    {buckets.some((b) => b.value === null)
                      ? "— Missing source · "
                      : ""}
                    Height = detections · smooth visual guide
                  </span>
                </div>
                <div className="jy-plot-art" aria-hidden="true">
                  <svg
                    className="jy-ribbon-svg"
                    viewBox="0 0 1000 300"
                    preserveAspectRatio="none"
                  >
                    <defs>
                      <linearGradient id="jy-fill" x1="0" y1="0" x2="0" y2="1">
                        <stop
                          offset="0"
                          stopColor="#f9bf79"
                          stopOpacity=".27"
                        />
                        <stop
                          offset="1"
                          stopColor="#f9bf79"
                          stopOpacity=".015"
                        />
                      </linearGradient>
                      <linearGradient id="jy-line">
                        <stop stopColor="#b3865c" stopOpacity=".25" />
                        <stop offset=".6" stopColor="#f5c68c" />
                        <stop offset="1" stopColor="#c5945f" stopOpacity=".4" />
                      </linearGradient>
                      <mask id="jy-source-mask">
                        <rect width="1000" height="300" fill="white" />
                        {buckets.map((b, i) =>
                          b.value === null ? (
                            <rect
                              key={b.key}
                              x={70 + (i / buckets.length) * 860}
                              width={860 / buckets.length}
                              height="300"
                              fill="black"
                            />
                          ) : null,
                        )}
                      </mask>
                      <clipPath
                        id="jy-ribbon-clip"
                        clipPathUnits="objectBoundingBox"
                      >
                        <motion.path
                          initial={false}
                          animate={{ d: geometry.area }}
                          transition={{ duration, ease: [0.2, 0.8, 0.2, 1] }}
                          transform="scale(.001 .0033333333)"
                        />
                      </clipPath>
                    </defs>
                    {[0, 1, 2, 3].map((n) => (
                      <line
                        key={n}
                        x1="70"
                        x2="930"
                        y1={54 + n * 65}
                        y2={54 + n * 65}
                        stroke="#d9e0c9"
                        strokeOpacity={n === 3 ? ".18" : ".045"}
                        strokeDasharray={n === 3 ? undefined : "2 7"}
                      />
                    ))}
                    <motion.path
                      initial={false}
                      animate={{ d: geometry.area, opacity: hasSource ? 1 : 0 }}
                      transition={{ duration, ease: [0.2, 0.8, 0.2, 1] }}
                      fill="url(#jy-fill)"
                      mask="url(#jy-source-mask)"
                    />
                    <motion.path
                      initial={false}
                      animate={{ d: geometry.line, opacity: hasSource ? 1 : 0 }}
                      transition={{ duration, ease: [0.2, 0.8, 0.2, 1] }}
                      fill="none"
                      stroke="url(#jy-line)"
                      strokeWidth="1.3"
                      vectorEffect="non-scaling-stroke"
                      mask="url(#jy-source-mask)"
                    />
                  </svg>
                  <JourneyRibbon
                    buckets={buckets}
                    paused={paused || model.busy || model.failed}
                    active={activeIndex}
                    origin={origin}
                    reduceMotion={!!reduced}
                  />
                </div>
                {!noSource && (
                  <>
                    <span className="jy-axis jy-axis-top">
                      {integer(geometry.max)}
                    </span>
                    <span className="jy-axis jy-axis-zero">0</span>
                  </>
                )}
                <div
                  className="jy-bin-layer"
                  role="group"
                  aria-label={`${unit.toLowerCase()} in the current report`}
                  onPointerLeave={() => setHovered(null)}
                >
                  {buckets.map((b, i) => (
                    <button
                      key={b.key}
                      className={`jy-bin ${b.key === s.hour ? "jy-selected" : ""} ${b.key === inspected?.key ? "jy-inspected" : ""} ${b.value === null ? "jy-missing" : ""}`}
                      style={{
                        left: `${7 + (i / buckets.length) * 86}%`,
                        width: `${86 / buckets.length}%`,
                      }}
                      disabled={b.value === null || model.busy || model.failed}
                      aria-label={`${bucketName(b)}: ${b.value === null ? "source data unavailable" : `${integer(b.value)} satellite detections`}${b.value !== null ? ". Double-click, scroll up, or press Enter to zoom" : ""}`}
                      aria-pressed={b.key === s.hour}
                      onPointerEnter={() => setHovered(b.key)}
                      onFocus={() => setHovered(b.key)}
                      onBlur={() => setHovered(null)}
                      onClick={(e) => {
                        const now = performance.now();
                        if (
                          e.detail === 0 ||
                          e.detail >= 2 ||
                          (lastTap.current.key === b.key &&
                            now - lastTap.current.at < 360)
                        ) {
                          lastTap.current = { key: "", at: 0 };
                          navigate({ type: "period", key: b.key });
                        } else {
                          setFocusedKey(b.key);
                          lastTap.current = { key: b.key, at: now };
                        }
                      }}
                      onKeyDown={(e) => {
                        if (
                          !["ArrowLeft", "ArrowRight", "Home", "End"].includes(
                            e.key,
                          )
                        )
                          return;
                        e.preventDefault();
                        const enabled = [
                          ...(plot.current?.querySelectorAll<HTMLButtonElement>(
                            ".jy-bin:not(:disabled)",
                          ) ?? []),
                        ];
                        const current = enabled.indexOf(e.currentTarget);
                        const index =
                          e.key === "Home"
                            ? 0
                            : e.key === "End"
                              ? enabled.length - 1
                              : (current +
                                  (e.key === "ArrowRight" ? 1 : -1) +
                                  enabled.length) %
                                enabled.length;
                        enabled[index]?.focus();
                      }}
                    >
                      <span className="jy-bin-guide" />
                      <span
                        className={`jy-bin-label ${buckets.length > 20 && i % (model.resolution === "year" ? 4 : 5) !== 0 && i !== buckets.length - 1 ? "jy-minor-label" : ""}`}
                      >
                        {b.label}
                        {b.value === null && <small>—</small>}
                      </span>
                    </button>
                  ))}
                </div>
                <AnimatePresence>
                  {origin && !model.busy && !reduced && !paused && (
                    <motion.div
                      key={origin.serial}
                      className="jy-zoom-wash"
                      style={{
                        transformOrigin: `${origin.fraction * 100}% 80%`,
                      }}
                      initial={{ scaleX: 0.03, opacity: 0.65 }}
                      animate={{ scaleX: 1, opacity: 0 }}
                      transition={{ duration: 1, ease: [0.2, 0.8, 0.2, 1] }}
                      aria-hidden="true"
                    />
                  )}
                </AnimatePresence>
                {inspected && !model.busy && !model.failed && !noSource && (
                  <div
                    className="jy-inspect"
                    style={{
                      left: `${Math.max(14, Math.min(86, 7 + ((buckets.indexOf(inspected) + 0.5) / buckets.length) * 86))}%`,
                    }}
                    aria-hidden="true"
                  >
                    <span>
                      {shortPeriod(inspected.key)}
                      {inspected.key === peak?.key && !s.hour ? " · peak" : ""}
                    </span>
                    <strong>
                      {inspected.value === null
                        ? "No source"
                        : integer(inspected.value)}
                    </strong>
                  </div>
                )}
                <div className="jy-gesture-help">
                  <MoveHorizontal size={13} />
                  <span className="jy-mouse-help">
                    Hover or drag to inspect · Double-click or scroll to zoom
                  </span>
                  <span className="jy-touch-help">
                    Tap or slide to inspect · Pinch out to zoom
                  </span>
                </div>
                <div className="jy-zoom-controls">
                  <button
                    className="jy-icon"
                    aria-label="Zoom out of the chart"
                    onClick={() => zoom(-1)}
                  >
                    <ZoomOut size={18} />
                  </button>
                  <button
                    className="jy-icon"
                    aria-label="Zoom into the inspected period"
                    disabled={!hasSource || model.busy}
                    onClick={() => zoom(1)}
                  >
                    <ZoomIn size={18} />
                  </button>
                </div>
              </>
            )}
            {(model.busy || model.failed || noSource) && (
              <div className="jy-plot-state" role="status">
                <span className="jy-state-symbol">
                  {model.failed ? "!" : model.busy ? "↗" : "—"}
                </span>
                <strong>
                  {model.failed
                    ? "Let’s try that again."
                    : model.busy
                      ? `Opening ${s.month ? monthName(s.month, true) : "observations"}…`
                      : "An honest gap in the record."}
                </strong>
                <p>
                  {model.failed
                    ? "The source file is unavailable right now."
                    : model.busy
                      ? "Moving from monthly summaries to original observations."
                      : `Available years for this area: ${yearSpan}. Missing data is never counted as zero.`}
                </p>
                {model.failed ? (
                  <button className="jy-text-action" onClick={model.retry}>
                    Retry observations <ArrowRight size={15} />
                  </button>
                ) : noSource &&
                  (!model.years.includes(s.year) ||
                    (s.sensor === "viirs" && s.year < 2012)) ? (
                  <button
                    className="jy-text-action"
                    onClick={() => {
                      if (
                        s.sensor === "viirs" &&
                        s.year < 2012 &&
                        model.years.includes(s.year)
                      )
                        model.update({ sensor: "modis" });
                      else
                        navigate({ type: "year", year: model.years.at(-1)! });
                    }}
                  >
                    {s.sensor === "viirs" &&
                    s.year < 2012 &&
                    model.years.includes(s.year)
                      ? "View MODIS for this year"
                      : `View ${model.years.at(-1)}`}{" "}
                    <ArrowRight size={15} />
                  </button>
                ) : null}
              </div>
            )}
          </div>

          <div className="jy-next">
            <div className="jy-insights">
              <button
                onClick={() => {
                  setMode("season");
                  if (peak) setFocusedKey(peak.key);
                }}
              >
                <Flame size={16} />
                <span>
                  <small>CONCENTRATION</small>
                  <strong>
                    {peak
                      ? `${model.share}% in ${shortPeriod(peak.key)}`
                      : "No peak available"}
                  </strong>
                </span>
              </button>
              <button onClick={() => setMode("rhythm")}>
                <Repeat2 size={16} />
                <span>
                  <small>REPEATING RHYTHM</small>
                  <strong>
                    {patterns.eligible >= 2
                      ? `${patternMonth} · ${patterns.frequency}/${patterns.eligible} years`
                      : "More history needed"}
                  </strong>
                </span>
              </button>
              <button onClick={() => setMode("satellites")}>
                <ScanLine size={16} />
                <span>
                  <small>DIFFERENT EYES</small>
                  <strong>
                    {sensorRatio === null
                      ? "Compare the sources"
                      : `${sensorRatio.toFixed(1)}× VIIRS / MODIS`}
                  </strong>
                </span>
              </button>
            </div>
            <div className="jy-next-actions">
              <button
                className="jy-wider"
                onClick={() =>
                  navigate(
                    s.record
                      ? { type: "year", year: s.year }
                      : { type: "archive" },
                  )
                }
              >
                {s.record ? <ArrowLeft size={15} /> : <Clock3 size={15} />}
                {s.record ? `Return to ${s.year}` : "Across years"}
              </button>
              {primary && hasSource && !model.failed && (
                <button
                  className="jy-primary"
                  disabled={model.busy}
                  onClick={() =>
                    s.hour
                      ? setDrawer("observations")
                      : inspected &&
                        navigate({ type: "period", key: inspected.key })
                  }
                >
                  {primary}
                  <ArrowDownRight size={19} />
                </button>
              )}
            </div>
          </div>
        </div>

        <footer className="jy-footer">
          <button className="jy-source" onClick={() => setDrawer("details")}>
            <span className="jy-source-dot" />
            NASA FIRMS <i />
            {s.sensor === "all" ? "MODIS + VIIRS" : s.sensor.toUpperCase()}
            <span className="jy-coverage">
              {" "}
              · {model.summary.available}/{model.summary.expected} sensor-months
            </span>
            <CircleHelp size={12} />
          </button>
          <div>
            <button
              className="jy-reading-trigger"
              onClick={() => setDrawer("reading")}
            >
              <BookOpen size={14} />
              <span>Stories & research</span>
              <b>{reading.length}</b>
            </button>
            <a href="?tab=report&concept=gallery">
              Prototype gallery <ArrowRight size={12} />
            </a>
            <button
              className="jy-icon"
              aria-label={
                paused ? "Resume ambient animation" : "Pause ambient animation"
              }
              aria-pressed={paused}
              onClick={() => setPaused((v) => !v)}
            >
              {paused ? <Play size={14} /> : <Pause size={14} />}
            </button>
            <button
              className="jy-icon"
              aria-label="Reset report"
              onClick={() => {
                setLens("season");
                navigate({ type: "reset" });
                setPaused(false);
                setNotice("");
              }}
            >
              <RotateCcw size={14} />
            </button>
          </div>
        </footer>
        <span className="jy-sr" role="status">
          {notice}
        </span>

        {drawer === "where" && (
          <Panel title="Where does it stand out?" close={() => setDrawer(null)}>
            <p className="jy-panel-intro">
              Keep your time selection. Follow a place.
            </p>
            <nav
              className="jy-place-path"
              aria-label="Report geographic navigation"
            >
              {geoPaths[s.geo].map((geo, i) => (
                <span key={geo}>
                  {i > 0 && <ChevronRight size={12} />}
                  <button
                    onClick={() => changePlace(geo)}
                    aria-current={geo === s.geo ? "location" : undefined}
                  >
                    {geo === "all" ? "Study areas" : geoNames[geo]}
                  </button>
                </span>
              ))}
            </nav>
            <div className="jy-place-list">
              {placeRows.map((p) => (
                <button key={p.geo} onClick={() => changePlace(p.geo)}>
                  <span>
                    <strong>{geoNames[p.geo]}</strong>
                    <b>{p.value === null ? "No source" : integer(p.value)}</b>
                  </span>
                  <span className="jy-place-bar">
                    <i
                      style={{ width: `${((p.value ?? 0) / placeMax) * 100}%` }}
                    />
                  </span>
                  <small>
                    {p.value === null
                      ? "No record for this time and satellite"
                      : `${p.available}/${p.expected} sensor-months · detections`}
                    <ArrowRight size={15} />
                  </small>
                </button>
              ))}
            </div>
            <div className="jy-panel-note">
              <MapPin size={17} />
              <p>
                These are the bundled study areas, not continent or national
                totals. Greek study boundaries may include border pixels. Gran
                Chaco crosses borders; country attribution is unavailable.
              </p>
            </div>
            {s.geo !== "all" && (
              <button
                className="jy-text-action"
                onClick={() => changePlace("all")}
              >
                Show all study areas <ArrowRight size={15} />
              </button>
            )}
          </Panel>
        )}
        {drawer === "details" && (
          <Panel title="Behind the signal." close={() => setDrawer(null)}>
            <p className="jy-panel-intro">
              {model.label} · {placeLabels[s.geo]}
            </p>
            <section className="jy-panel-section">
              <h3>
                <Satellite size={17} />
                Choose your satellite
              </h3>
              <div
                className="jy-sensors"
                role="group"
                aria-label="Report satellite"
              >
                {(["viirs", "modis", "all"] as ReportSensor[]).map((sensor) => (
                  <button
                    key={sensor}
                    aria-pressed={s.sensor === sensor}
                    onClick={() => model.update({ sensor })}
                  >
                    {s.sensor === sensor && <Check size={12} />}
                    {sensor === "all" ? "Both" : sensor.toUpperCase()}
                  </button>
                ))}
              </div>
              <div className="jy-sensor-counts">
                {(["modis", "viirs"] as const).map((sensor) => (
                  <div key={sensor}>
                    <span>{sensor.toUpperCase()}</span>
                    <strong>
                      {model.sensorCounts[sensor] === null
                        ? "—"
                        : integer(model.sensorCounts[sensor]!)}
                    </strong>
                    <small>
                      {model.sensorCounts[sensor] === null
                        ? "No source data"
                        : "detections"}
                    </small>
                  </div>
                ))}
              </div>
              <p>
                Different pixels and overpass times can yield different counts.
                More detections do not necessarily mean more fires. “Both”
                combines observations and can include the same fire seen by each
                sensor.
              </p>
            </section>
            <section className="jy-panel-section">
              <h3>What is being counted?</h3>
              <p>
                NASA FIRMS active-fire satellite detections: thermal anomaly
                pixels observed during an overpass. A detection is not a unique
                fire event or a measure of burned area.
              </p>
              <p>
                Unique fire events, burned area, predictions, and validated
                uncertainty intervals are unavailable in this bundle.
              </p>
            </section>
            <section className="jy-panel-section">
              <h3>Coverage & confidence</h3>
              <p>
                <strong>
                  {model.summary.available} of {model.summary.expected} expected
                  sensor-month records
                </strong>{" "}
                are available for this selection. A dash means missing source
                data; zero means an available record contains no detections.
              </p>
              <p>
                Counts are unadjusted for cloud, satellite coverage, and
                observing effort. Hourly views show acquisition time in UTC, not
                when fires began. Light particles are a bounded visual sample;
                chart heights use a linear count scale.
              </p>
              {model.change !== null && (
                <p className="jy-change">
                  Raw count change: {model.change > 0 ? "+" : ""}
                  {model.change.toFixed(1)}% versus the previous period. This is
                  not an adjusted fire-trend estimate.
                </p>
              )}
            </section>
            <section className="jy-panel-section">
              <h3>Motion</h3>
              <label className="jy-motion-option">
                <input
                  type="checkbox"
                  checked={!!reduced}
                  disabled={!!prefersReduced}
                  onChange={(e) => setReduceMotion(e.target.checked)}
                />
                Reduce motion
              </label>
              <p>
                {prefersReduced
                  ? "Your device’s reduced-motion preference is active."
                  : "Keep the same data and interactions with immediate transitions and still particles."}
              </p>
            </section>
            <a
              className="jy-text-action"
              href="https://firms.modaps.eosdis.nasa.gov/"
              target="_blank"
              rel="noreferrer"
            >
              NASA FIRMS source <ArrowRight size={15} />
            </a>
          </Panel>
        )}
        {drawer === "reading" && (
          <Panel title="Beyond the pattern." close={() => setDrawer(null)}>
            <p className="jy-panel-intro">
              Curated reporting and research, matched to your study area and
              period. Links open the original publication.
            </p>
            <p className="jy-reading-scope">
              Reporting supplies context, not automatic confirmation that a
              detection belongs to a specific incident. Imagery keeps its
              original date.
            </p>
            <ReadingCards
              items={reading}
              onPeriod={(year, month) => {
                setDrawer(null);
                setLens("season");
                navigate({
                  type: "period",
                  key: `${year}-${String(month).padStart(2, "0")}`,
                });
              }}
            />
          </Panel>
        )}
        {drawer === "patterns" && (
          <Panel title="What can we learn?" close={() => setDrawer(null)}>
            <section className="jy-panel-section">
              <h3>
                <Flame size={17} />
                Concentration
              </h3>
              <p>
                {peak
                  ? `${shortPeriod(peak.key)} contains ${model.share}% of the recorded detections in this view.`
                  : "This selection has no available peak."}{" "}
                Zoom into a concentration to see whether activity spans many
                days or a few acquisition windows.
              </p>
            </section>
            <section className="jy-panel-section">
              <h3>
                <Repeat2 size={17} />A repeating season?
              </h3>
              <p>
                {patterns.eligible >= 2
                  ? `${patternMonth} leads in ${patterns.frequency} of ${patterns.eligible} years with complete monthly source records.`
                  : "There are not enough complete monthly source records for a recurring-peak finding."}{" "}
                The heat field shows each month’s share of its own year, on a
                fixed 0–100% color scale. Bright columns reveal timing that
                recurs.
              </p>
              <p>
                Source-month completeness does not verify observing effort.
                These are descriptive patterns, not a calibrated baseline,
                causal explanation, or prediction.
              </p>
            </section>
            <section className="jy-panel-section">
              <h3>
                <Layers3 size={17} />
                Why PyroBridge matters
              </h3>
              <p>
                A sensor change can interrupt a historical story. PyroBridge
                keeps Aqua MODIS and S-NPP VIIRS separate so the measurement gap
                stays visible while cross-sensor harmonization is researched.
              </p>
              <p>
                Validated monthly harmonized estimates remain unreleased. The
                satellite lens compares raw recorded pixels using a common count
                scale; a larger count does not establish more unique fires.
              </p>
            </section>
            <button
              className="jy-text-action"
              onClick={() => setDrawer("reading")}
            >
              <BookOpen size={15} />
              Explore the reporting and methods
              <ArrowRight size={15} />
            </button>
          </Panel>
        )}
        {drawer === "observations" && (
          <Panel title="Seen from orbit." close={() => setDrawer(null)}>
            <p className="jy-panel-intro">
              {model.label} · {integer(model.rows.length)} detections
            </p>
            <p>
              Original acquisition timestamps from the selected study
              boundaries. These pixels can belong to the same fire.
            </p>
            <div className="jy-observations">
              {model.rows.slice(0, 12).map((o) => (
                <article key={o.id}>
                  <Satellite size={17} />
                  <div>
                    <strong>{o.time.slice(11, 19)} UTC</strong>
                    <span>
                      {o.sensor} ·{" "}
                      {o.frp === null
                        ? "Radiative power unavailable"
                        : `${o.frp} MW radiative power`}
                    </span>
                  </div>
                </article>
              ))}
            </div>
            <p className="jy-panel-note">
              Showing {Math.min(12, model.rows.length)} of{" "}
              {integer(model.rows.length)} original detections. Radiative power
              is not burned area or a prediction.
            </p>
          </Panel>
        )}
      </section>
    </MotionConfig>
  );
}

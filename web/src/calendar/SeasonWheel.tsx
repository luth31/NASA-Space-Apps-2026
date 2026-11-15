// Wheel and insight markup copied from experience/fire-mesh's Calendar.tsx.
// The estimate channel uses main's explicitly experimental monthly calibration.
import { useEffect, useId, useMemo, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import {
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
} from "lucide-react";
import type { CaseStudy, Month } from "../data";
import { dateLabel, number } from "../data";
import {
  monthKey,
  monthNames,
  monthProfile,
  petalRadius,
  seasonSummary,
  sectorPath,
  sourceValue,
  type SeasonField,
} from "./season";
import "./calendar.css";

export default function SeasonWheel({
  study,
  months,
  field,
  model,
  selectedMonth,
  onMonth,
  onField,
  onExplore,
}: {
  study: CaseStudy;
  months: Month[];
  field: "modis" | "viirs" | "estimate";
  model: string;
  selectedMonth: string;
  onMonth: (month: string) => void;
  onField: (field: "modis" | "viirs" | "estimate") => void;
  onExplore: () => void;
}) {
  const [playing, setPlaying] = useState(false);
  const [recordScale, setRecordScale] = useState(false);
  const [hovered, setHovered] = useState<number | null>(null);
  const reducedMotion = useReducedMotion();
  const patternId = `season-missing-${useId().replace(/:/g, "")}`;
  const years = useMemo(
    () => [...study.years].sort((a, b) => a - b),
    [study.years],
  );
  const firstYear = years[0] ?? Number(selectedMonth.slice(0, 4));
  const lastYear = years.at(-1) ?? firstYear;
  const range: [number, number] = [firstYear, lastYear];
  const year = Number(selectedMonth.slice(0, 4));
  const monthIndex = Math.max(
    0,
    Math.min(11, Number(selectedMonth.slice(5, 7)) - 1),
  );
  const rows = useMemo(
    () =>
      months.map((m) => ({
        month: m.month,
        modis: m.modis,
        viirs: m.viirs,
        experimentalEstimate: m.estimate,
      })),
    [months],
  );
  const seasonField: SeasonField =
    field === "estimate" ? "experimentalEstimate" : field;
  const sensor = field === "modis" ? "modis" : "viirs";
  const summary = useMemo(
    () => seasonSummary(rows, year, seasonField),
    [rows, year, seasonField],
  );
  const profile = monthProfile(rows, years, selectedMonth, seasonField, range);
  const yearIndex = years.indexOf(year);
  const selectedValue = sourceValue(
    rows.find((m) => m.month === selectedMonth),
    seasonField,
  );
  const peakIndex = summary.peak
    ? Number(summary.peak.month.slice(5, 7)) - 1
    : null;
  const maximum = Math.max(
    1,
    ...(recordScale
      ? rows.map((m) => sourceValue(m, seasonField) ?? 0)
      : summary.months.map((m) => m.value ?? 0)),
  );
  const focusedIndex = hovered ?? monthIndex;
  const focused = summary.months[focusedIndex];
  const sensorLabel =
    field === "estimate"
      ? `Experimental · ${model}`
      : field === "modis"
        ? "Aqua MODIS · observed"
        : "S-NPP VIIRS · observed";
  const unit =
    field === "estimate"
      ? "experimental estimated detections"
      : "recorded hotspot pixels";
  const selectMonth = (index: number) => {
    setPlaying(false);
    setHovered(null);
    onMonth(monthKey(year, index));
  };
  const selectYear = (next: number) => {
    setPlaying(false);
    setHovered(null);
    onMonth(monthKey(next, monthIndex));
  };
  const stepYear = (direction: -1 | 1) => {
    const next =
      yearIndex < 0
        ? direction > 0
          ? firstYear
          : lastYear
        : years[Math.max(0, Math.min(years.length - 1, yearIndex + direction))];
    selectYear(next);
  };
  useEffect(() => {
    if (!playing || reducedMotion || years.length < 2) return;
    const timer = window.setTimeout(() => {
      if (document.hidden) {
        setPlaying(false);
        return;
      }
      onMonth(monthKey(years[(yearIndex + 1) % years.length], monthIndex));
    }, 1600);
    return () => window.clearTimeout(timer);
  }, [playing, reducedMotion, years, yearIndex, monthIndex, onMonth]);
  useEffect(() => {
    const pause = () => {
      if (document.hidden) setPlaying(false);
    };
    document.addEventListener("visibilitychange", pause);
    return () => document.removeEventListener("visibilitychange", pause);
  }, []);
  useEffect(() => {
    setPlaying(false);
    setHovered(null);
  }, [field, model]);

  return (
    <section
      className="season-calendar fire-mesh-season-wheel"
      data-sensor={sensor}
      data-field={field}
      aria-label="12-petal seasonal wheel"
    >
      <header className="sc-unified-heading">
        <div>
          <span className="sc-kicker">12 MONTHS / ONE SEASON</span>
          <h2>12-petal seasonal wheel</h2>
          <p>
            Every year has a shape. Select a petal to update the monthly record
            below.
          </p>
        </div>
        <div
          className="sc-sensors"
          role="group"
          aria-label="Seasonal wheel data"
        >
          {(["modis", "viirs", "estimate"] as const).map((value) => (
            <button
              key={value}
              aria-pressed={field === value}
              onClick={() => onField(value)}
            >
              <i className={value} />
              {value === "modis"
                ? "Aqua MODIS"
                : value === "viirs"
                  ? "S-NPP VIIRS"
                  : "Experimental estimate"}
            </button>
          ))}
        </div>
      </header>
      <div className="sc-main">
        <div className="sc-wheel-panel">
          <div className="sc-panel-heading">
            <div>
              <span className="sc-kicker">01 / SEASON SHAPE</span>
              <h2>
                {sensorLabel} · {year}
              </h2>
            </div>
            <label className="sc-scale">
              <input
                type="checkbox"
                checked={recordScale}
                onChange={(e) => setRecordScale(e.target.checked)}
              />
              Lock scale across years
            </label>
          </div>
          <div className="sc-wheel-wrap">
            <svg
              className="sc-wheel"
              viewBox="0 0 480 480"
              role="group"
              aria-label={`${year} season wheel, ${sensorLabel}. Select a month. Petal area represents count.`}
            >
              <defs>
                <pattern
                  id={patternId}
                  width="7"
                  height="7"
                  patternUnits="userSpaceOnUse"
                  patternTransform="rotate(40)"
                >
                  <line
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="7"
                    stroke="#819289"
                    strokeWidth="1"
                    opacity=".45"
                  />
                </pattern>
              </defs>
              {[81, 132, 192].map((r) => (
                <circle key={r} cx="240" cy="240" r={r} className="sc-orbit" />
              ))}
              {summary.months.map((m, i) => {
                const selectedArc = i === monthIndex;
                const angle = ((i * 30 - 90) * Math.PI) / 180;
                const labelX = 240 + 216 * Math.cos(angle),
                  labelY = 240 + 216 * Math.sin(angle);
                const radius =
                  m.value === null ? 192 : petalRadius(m.value, maximum);
                const label = `${monthNames[i]} ${year}: ${m.value === null ? "source unavailable" : `${number(m.value)} ${unit}`}${selectedArc ? ", selected" : ""}`;
                return (
                  <g
                    key={i}
                    role="button"
                    tabIndex={0}
                    aria-label={label}
                    aria-pressed={selectedArc}
                    className={`sc-month ${selectedArc ? "is-selected" : ""} ${m.value === null ? "is-missing" : ""}`}
                    onMouseEnter={() => setHovered(i)}
                    onMouseLeave={() => setHovered(null)}
                    onFocus={() => setHovered(i)}
                    onBlur={() => setHovered(null)}
                    onClick={() => selectMonth(i)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        selectMonth(i);
                      }
                      if (
                        [
                          "ArrowRight",
                          "ArrowDown",
                          "ArrowLeft",
                          "ArrowUp",
                        ].includes(e.key)
                      ) {
                        e.preventDefault();
                        const next =
                          (i +
                            (["ArrowRight", "ArrowDown"].includes(e.key)
                              ? 1
                              : 11)) %
                          12;
                        selectMonth(next);
                        e.currentTarget.parentElement
                          ?.querySelectorAll<SVGGElement>(".sc-month")
                          [next]?.focus();
                      }
                    }}
                  >
                    <title>{label}</title>
                    <path
                      className="sc-petal-track"
                      d={sectorPath(i, 81, 192)}
                    />
                    {m.value === null ? (
                      <path
                        d={sectorPath(i, 86, 192)}
                        fill={`url(#${patternId})`}
                        pointerEvents="none"
                      />
                    ) : m.value > 0 ? (
                      <motion.path
                        className={`sc-petal sc-petal-${field}`}
                        initial={false}
                        animate={{ d: sectorPath(i, 81, radius) }}
                        transition={{
                          duration: reducedMotion ? 0 : 0.35,
                          ease: "easeOut",
                        }}
                        pointerEvents="none"
                      />
                    ) : (
                      <path
                        className="sc-zero"
                        d={sectorPath(i, 82, 87)}
                        pointerEvents="none"
                      />
                    )}
                    <path
                      className="sc-petal-edge"
                      d={sectorPath(i, 79, 195)}
                      pointerEvents="none"
                    />
                    <text
                      x={labelX}
                      y={labelY}
                      textAnchor="middle"
                      dominantBaseline="central"
                      className="sc-month-label"
                    >
                      {monthNames[i].slice(0, 3).toUpperCase()}
                    </text>
                    {peakIndex === i && (
                      <circle
                        cx={240 + 202 * Math.cos(angle)}
                        cy={240 + 202 * Math.sin(angle)}
                        r="3"
                        className="sc-peak-dot"
                      />
                    )}
                  </g>
                );
              })}
              <g pointerEvents="none" className="sc-wheel-center">
                <text x="240" y="209" className="sc-center-month">
                  {monthNames[focusedIndex].toUpperCase()}
                </text>
                <text x="240" y="248" className="sc-center-value">
                  {focused.value === null ? "—" : number(focused.value)}
                </text>
                <text x="240" y="270" className="sc-center-unit">
                  {focused.value === null
                    ? "SOURCE UNAVAILABLE"
                    : "HOTSPOT PIXELS"}
                </text>
                <text x="240" y="293" className="sc-center-year">
                  {year}
                </text>
              </g>
            </svg>
          </div>
          <div className="sc-wheel-legend">
            <span>
              <i className="sc-fill-key" />
              Petal area = count
            </span>
            <span>
              <i className="sc-zero-key" />
              Recorded zero
            </span>
            <span>
              <i className="sc-missing-key" />
              Missing source
            </span>
          </div>
          <p className="sc-scale-note">
            {summary.available || recordScale ? (
              <>
                Outer edge = {number(maximum)} pixels ·{" "}
                {recordScale
                  ? "same scale for every year"
                  : "scale fitted to this year"}
                .
              </>
            ) : (
              "No source months are available for this year."
            )}{" "}
            Select a petal to compare its month.
          </p>
          <div className="sc-year-controls">
            <button
              aria-label="Previous year"
              disabled={yearIndex === 0 || !years.length}
              onClick={() => stepYear(-1)}
            >
              <ChevronLeft size={20} />
            </button>
            <div className="sc-year-readout">
              <strong>{year}</strong>
              <span>{summary.available}/12 months present</span>
            </div>
            <button
              aria-label="Next year"
              disabled={yearIndex === years.length - 1 || !years.length}
              onClick={() => stepYear(1)}
            >
              <ChevronRight size={20} />
            </button>
            <button
              className="sc-play"
              aria-label={
                playing ? "Pause year playback" : "Play through years"
              }
              aria-pressed={playing}
              disabled={!!reducedMotion || years.length < 2}
              title={
                reducedMotion
                  ? "Playback is off because reduced motion is enabled. Use the year controls."
                  : "Advance one year every 1.6 seconds"
              }
              onClick={() => {
                setRecordScale(true);
                setPlaying(!playing);
              }}
            >
              {playing ? <Pause size={17} /> : <Play size={17} />}
              {playing ? "Pause" : "Play years"}
            </button>
          </div>
          <label className="sc-scrubber">
            <span>{firstYear}</span>
            <input
              aria-label="Season year"
              type="range"
              min="0"
              max={Math.max(0, years.length - 1)}
              value={Math.max(0, yearIndex)}
              disabled={years.length < 2}
              aria-valuetext={String(year)}
              onChange={(e) => selectYear(years[Number(e.target.value)])}
            />
            <span>{lastYear}</span>
          </label>
          {yearIndex < 0 && (
            <p className="sc-context-note">
              Your selected date is preserved. {year} is outside this
              investigation’s bundled years.
            </p>
          )}
        </div>
        <aside className="sc-insight-panel">
          <span className="sc-kicker">READING THE RECORD</span>
          <h2>
            {summary.peak ? (
              <>
                {monthNames[peakIndex!]}
                {summary.peakTies > 1
                  ? " shares the peak"
                  : " leaves the largest mark"}
                .
              </>
            ) : summary.available ? (
              "A quiet recorded season."
            ) : (
              "A gap in this record."
            )}
          </h2>
          <p>
            {summary.peak ? (
              <>
                {number(summary.peak.value)} pixels in the largest{" "}
                {summary.complete ? "month of this year" : "available month"}.{" "}
                {summary.concentration !== null
                  ? `${Math.round(summary.concentration * 100)}% of this year's ${field === "estimate" ? "experimental estimated" : "recorded"} total.`
                  : "The year is incomplete; a whole-year share is not calculated."}
              </>
            ) : summary.available ? (
              "Available months contain zero recorded hotspot pixels. That does not establish fire absence or satellite observing coverage."
            ) : (
              "No values are available for this sensor or model and year. Missing months are not zero."
            )}
          </p>
          <div className="sc-total">
            <strong>{summary.available ? number(summary.total) : "—"}</strong>
            <span>
              {summary.complete ? "year total" : "available-month total"}
              <small>
                {summary.available}/12 source months · {unit}
              </small>
            </span>
          </div>
          <div className="sc-selection" aria-live={playing ? "off" : "polite"}>
            <span className="sc-kicker">
              SELECTED /{" "}
              {dateLabel(selectedMonth, {
                month: "long",
                year: "numeric",
              }).toUpperCase()}
            </span>
            <div className="sc-selected-value">
              {number(selectedValue)}
              <span>{unit}</span>
            </div>
            <div className="sc-reference">
              <span>
                {field === "estimate"
                  ? "Experimental same-month median"
                  : "Raw same-month median"}
              </span>
              <strong>{number(profile.median)}</strong>
            </div>
            <p>
              {profile.n ? (
                <>
                  {profile.n} other available{" "}
                  {profile.n === 1 ? "year" : "years"}, {range[0]}–{range[1]}.
                  {selectedValue !== null && profile.median !== null
                    ? ` Selected month is ${selectedValue === profile.median ? "equal to" : `${number(Math.abs(selectedValue - profile.median))} pixels ${selectedValue > profile.median ? "above" : "below"}`} this median.`
                    : ""}
                </>
              ) : (
                "No other available year in this comparison range."
              )}
            </p>
            <span className="sc-caution">
              {field === "estimate"
                ? "Experimental estimates on the VIIRS count scale; official monthly release remains gated. Cloud and overpass effort are unadjusted."
                : "Raw counts; observing effort is unadjusted. This is not a validated historical anomaly or a measure of fire risk."}
            </span>
          </div>
          <button className="sc-scene-button" onClick={onExplore}>
            Open this month in Explore <ArrowUpRight size={18} />
          </button>
          <p className="sc-footnote">
            A hotspot pixel is a satellite detection, not a unique fire or
            burned area. Sensor records should not be compared as equivalent
            counts.
          </p>
        </aside>
      </div>
    </section>
  );
}

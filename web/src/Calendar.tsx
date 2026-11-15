import { useEffect, useId, useMemo, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import {
  ArrowDownToLine,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  ShieldCheck,
} from "lucide-react";
import type { CaseStudy } from "./data";
import { dateLabel, number } from "./data";
import {
  monthKey,
  monthNames,
  monthProfile,
  petalRadius,
  seasonSummary,
  sectorPath,
  sourceValue,
} from "./calendar/season";
import "./calendar/calendar.css";

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
  const [sensor, setSensor] = useState<"modis" | "viirs">(() => {
    try {
      return sessionStorage.getItem("pyrobridge-calendar-sensor") === "viirs"
        ? "viirs"
        : "modis";
    } catch {
      return "modis";
    }
  });
  const [harmonized, setHarmonized] = useState(false);
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
  const [range, setRange] = useState<[number, number]>([firstYear, lastYear]);
  const year = Number(selectedMonth.slice(0, 4));
  const monthIndex = Math.max(
    0,
    Math.min(11, Number(selectedMonth.slice(5, 7)) - 1),
  );
  const field = harmonized && study.harmonized ? "estimate" : sensor;
  const summary = useMemo(
    () => seasonSummary(study.months, year, field),
    [study.months, year, field],
  );
  const profile = useMemo(
    () => monthProfile(study.months, years, selectedMonth, field, range),
    [study.months, years, selectedMonth, field, range],
  );
  const yearIndex = years.indexOf(year);
  const selected = study.months.find((m) => m.month === selectedMonth);
  const selectedValue = sourceValue(selected, field);
  const peakIndex = summary.peak
    ? Number(summary.peak.month.slice(5, 7)) - 1
    : null;
  const maximum = Math.max(
    1,
    ...(recordScale
      ? study.months.map((m) => sourceValue(m, field) ?? 0)
      : summary.months.map((m) => m.value ?? 0)),
  );
  const profileMaximum = Math.max(
    1,
    ...profile.points.map((p) => p.value ?? 0),
  );
  const focusedIndex = hovered ?? monthIndex;
  const focused = summary.months[focusedIndex];
  const sensorLabel =
    field === "estimate"
      ? "VIIRS-equivalent"
      : sensor === "modis"
        ? "Aqua MODIS"
        : "S-NPP VIIRS";
  const unit =
    field === "estimate"
      ? "estimated hotspot pixels"
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
    try {
      sessionStorage.setItem("pyrobridge-calendar-sensor", sensor);
    } catch {
      /* In-memory selection works without storage. */
    }
  }, [sensor]);
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

  return (
    <section
      className="season-calendar"
      data-sensor={sensor}
      aria-label="Season calendar"
    >
      <header className="sc-heading">
        <div>
          <span className="sc-kicker">THE SEASON CALENDAR / UTC</span>
          <h1>
            Every year has a shape<span>.</span>
          </h1>
          <p>Turn through the record. Find the months that shaped a season.</p>
        </div>
        <button className="sc-link" onClick={onExplore}>
          Explore this place <ArrowUpRight size={17} />
        </button>
      </header>
      <div className="sc-controls">
        <label className="sc-place">
          <span>Investigation</span>
          <select
            value={study.id}
            onChange={(e) => {
              const next = cases.find((c) => c.id === e.target.value);
              if (next) {
                setPlaying(false);
                onStudy(next);
                onMonth(selectedMonth);
              }
            }}
          >
            {cases.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}, {c.country}
              </option>
            ))}
          </select>
        </label>
        <div className="sc-sensors" role="group" aria-label="Recorded sensor">
          {(["modis", "viirs"] as const).map((s) => (
            <button
              key={s}
              aria-pressed={!harmonized && sensor === s}
              onClick={() => {
                setPlaying(false);
                setSensor(s);
                setHarmonized(false);
              }}
            >
              <i className={s} />
              {s === "modis" ? "Aqua MODIS" : "S-NPP VIIRS"}
            </button>
          ))}
        </div>
        <span className="sc-record-label">
          {field === "estimate"
            ? "Validated estimates"
            : "Raw observation record"}
        </span>
      </div>
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
                        className={`sc-petal sc-petal-${sensor}`}
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
                  ? `${Math.round(summary.concentration * 100)}% of this year's recorded total.`
                  : "The year is incomplete; a whole-year share is not calculated."}
              </>
            ) : summary.available ? (
              "Available months contain zero recorded hotspot pixels. That does not establish fire absence or satellite observing coverage."
            ) : (
              "There are no published source values for this sensor and year in this bundle. Missing months are not zero."
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
              SELECTED / {dateLabel(selectedMonth).toUpperCase()}
            </span>
            <div className="sc-selected-value">
              {number(selectedValue)}
              <span>{unit}</span>
            </div>
            <div className="sc-reference">
              <span>
                {field === "estimate"
                  ? "Eligible same-month median"
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
                ? "Released monthly estimates only. Review the method and uncertainty before interpretation."
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
      <section className="sc-history" aria-label="Same month across years">
        <div className="sc-history-heading">
          <div>
            <span className="sc-kicker">02 / A MONTH THROUGH TIME</span>
            <h2>
              {monthNames[monthIndex]}, year after year<span>.</span>
            </h2>
            <p>
              Choose a year below to move the season wheel. Same sensor, same
              month;{" "}
              {field === "estimate"
                ? "eligible monthly estimates"
                : "unadjusted observations"}
              .
            </p>
          </div>
          <div className="sc-range">
            <label>
              From
              <select
                aria-label="Comparison first year"
                value={range[0]}
                onChange={(e) =>
                  setRange([
                    Number(e.target.value),
                    Math.max(Number(e.target.value), range[1]),
                  ])
                }
              >
                {years.map((y) => (
                  <option key={y}>{y}</option>
                ))}
              </select>
            </label>
            <span>—</span>
            <label>
              To
              <select
                aria-label="Comparison last year"
                value={range[1]}
                onChange={(e) =>
                  setRange([
                    Math.min(range[0], Number(e.target.value)),
                    Number(e.target.value),
                  ])
                }
              >
                {years.map((y) => (
                  <option key={y}>{y}</option>
                ))}
              </select>
            </label>
          </div>
        </div>
        <div className="sc-profile-top">
          <span>
            {number(profileMaximum)} pixels at full height · linear scale
          </span>
          <span>
            {profile.n} reference {profile.n === 1 ? "year" : "years"} ·
            selected year excluded
          </span>
        </div>
        <div className="sc-profile-scroll">
          <div
            className="sc-profile"
            style={{ minWidth: Math.max(300, profile.points.length * 31) }}
          >
            {profile.median !== null && (
              <div
                className="sc-median-line"
                style={{
                  bottom: `${34 + (profile.median / profileMaximum) * 140}px`,
                }}
                aria-hidden="true"
              >
                <span>median {number(profile.median)}</span>
              </div>
            )}
            {profile.points.map((p) => (
              <button
                key={p.year}
                className={`sc-profile-year ${p.year === year ? "is-selected" : ""} ${p.value === null ? "is-missing" : ""}`}
                aria-pressed={p.year === year}
                aria-label={`${monthNames[monthIndex]} ${p.year}: ${p.value === null ? "source unavailable" : `${number(p.value)} ${unit}`}`}
                title={`${p.year}: ${p.value === null ? "missing source" : number(p.value) + " pixels"}`}
                onClick={() => selectYear(p.year)}
              >
                <span className="sc-profile-bar-space">
                  <span
                    className={`sc-profile-bar sc-profile-${sensor}`}
                    style={{
                      height:
                        p.value === null
                          ? "100%"
                          : `${(p.value / profileMaximum) * 100}%`,
                    }}
                  />
                  {p.value === 0 && <span className="sc-profile-zero" />}
                  {p.year === year && p.value !== null && (
                    <span className="sc-profile-number">{number(p.value)}</span>
                  )}
                </span>
                <span className="sc-profile-year-label">{p.year}</span>
              </button>
            ))}
          </div>
        </div>
        <p className="sc-history-note">
          Hatched columns are missing sources; baseline ticks are recorded
          zeros.{" "}
          {field === "estimate"
            ? "Only eligible monthly estimates appear."
            : "Source availability does not verify cloud-free, consistent, or complete observing effort."}
          {year < range[0] || year > range[1]
            ? " Your selected year remains outside the chosen comparison range."
            : ""}
        </p>
      </section>
      <div className="sc-details-grid">
        <details className="sc-details">
          <summary>
            Read the values <span>12 months · {year}</span>
          </summary>
          <table>
            <caption>
              {year} · {sensorLabel} · {unit}
            </caption>
            <thead>
              <tr>
                <th>Month</th>
                <th>Value</th>
                <th>Source</th>
              </tr>
            </thead>
            <tbody>
              {summary.months.map((m, i) => (
                <tr
                  key={m.month}
                  className={i === monthIndex ? "is-selected" : ""}
                >
                  <th>
                    <button onClick={() => selectMonth(i)}>
                      {monthNames[i]}
                    </button>
                  </th>
                  <td>{number(m.value)}</td>
                  <td>{m.value === null ? "Unavailable" : "Present"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
        <details className="sc-details">
          <summary>
            Methods &amp; harmonized estimates <ShieldCheck size={17} />
          </summary>
          <div className="sc-methods-body">
            <p>
              Counts describe this investigation boundary. Missing source values
              remain gaps. No coverage or risk claim follows from a zero.
            </p>
            <p>{study.supportReason}</p>
            <div className="sc-method-actions">
              <button
                aria-pressed={harmonized}
                disabled={!study.harmonized}
                onClick={() => {
                  setPlaying(false);
                  setHarmonized(!harmonized);
                }}
              >
                {harmonized
                  ? "Return to raw counts"
                  : "Show harmonized estimates"}
              </button>
              <button className="sc-link" onClick={onMethods}>
                Read the method <ArrowUpRight size={16} />
              </button>
            </div>
            <p className="sc-footnote">
              Harmonized history and exports require the monthly validation
              gate. Raw medians above are descriptive only.
            </p>
            <div className="sc-method-actions">
              <button
                disabled={!selected?.eligible}
                onClick={() => onExport("csv")}
              >
                <ArrowDownToLine size={15} />
                CSV
              </button>
              <button
                disabled={!selected?.eligible}
                onClick={() => onExport("pdf")}
              >
                <ArrowDownToLine size={15} />
                PDF
              </button>
              <span>
                {selected?.eligible
                  ? "Selected month released"
                  : "Monthly release gate closed"}
              </span>
            </div>
          </div>
        </details>
      </div>
    </section>
  );
}

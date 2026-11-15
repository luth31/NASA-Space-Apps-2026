import { useMemo, useState } from "react";
import { ArrowUpRight, MoveHorizontal } from "lucide-react";
import { integer } from "../data";
import type { PatternYear } from "./pattern-data";
import { seasonalValues, ridgePath } from "./ridge-data";
import "./ridges.css";

const months = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
export default function SeasonalRidges({
  rows,
  selectedYear,
  onSelect,
}: {
  rows: PatternYear[];
  selectedYear: number;
  onSelect: (period: string) => void;
}) {
  const available = useMemo(
    () => rows.filter((r) => r.buckets.some((b) => b.value !== null)),
    [rows],
  );
  const [year, setYear] = useState(selectedYear);
  const [month, setMonth] = useState(7);
  const [scale, setScale] = useState<"share" | "count">("share");
  const row = available.find((r) => r.year === year) || available.at(-1);
  const selected = row?.buckets[month];
  const values = useMemo(
    () => available.map((r) => seasonalValues(r, scale)),
    [available, scale],
  );
  const max =
    scale === "share" ? 1 : Math.max(1, ...values.flat().map((v) => v ?? 0));
  const baseline = (i: number) => 75 + i * 42;
  const plotHeight = Math.max(240, available.length * 42 + 65);
  const x = (i: number) => 105 + i * 69;
  const sourceComplete = !!row?.complete;
  const share =
    row && sourceComplete && row.total > 0 && selected?.value !== null
      ? (selected?.value ?? 0) / row.total
      : null;
  const inspect = (index: number, m: number) => {
    if (available[index]) {
      setYear(available[index].year);
      setMonth(m);
    }
  };
  return (
    <div className="season-ridges">
      <div className="sr-intro">
        <div>
          <span className="sr-eyebrow">THE SEASONAL LANDSCAPE</span>
          <h2>Every ridge, a year.</h2>
          <p>Trace a month through time. Watch the peaks move.</p>
        </div>
        <div className="sr-scale" aria-label="Seasonal landscape scale">
          <button
            aria-pressed={scale === "share"}
            onClick={() => setScale("share")}
          >
            Season shape
          </button>
          <button
            aria-pressed={scale === "count"}
            onClick={() => setScale("count")}
          >
            Detection count
          </button>
        </div>
      </div>
      <div className="sr-legend">
        <span>
          <i />{" "}
          {scale === "share"
            ? "Height = share of the year · fixed 0–100% scale"
            : `Height = detections · fixed 0–${integer(max)} scale`}
        </span>
        <span>Broken line = incomplete source</span>
      </div>
      <div className="sr-scroll">
        <svg
          className="sr-landscape"
          viewBox={`0 0 1000 ${plotHeight}`}
          role="group"
          aria-label="Interactive seasonal ridgelines. Arrows change month or year; Enter opens the selected month."
          tabIndex={0}
          onKeyDown={(e) => {
            const at = Math.max(
              0,
              available.findIndex((r) => r.year === row?.year),
            );
            if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
              e.preventDefault();
              setMonth((v) =>
                Math.max(
                  0,
                  Math.min(11, v + (e.key === "ArrowRight" ? 1 : -1)),
                ),
              );
            }
            if (e.key === "ArrowDown" || e.key === "ArrowUp") {
              e.preventDefault();
              inspect(
                Math.max(
                  0,
                  Math.min(
                    available.length - 1,
                    at + (e.key === "ArrowDown" ? 1 : -1),
                  ),
                ),
                month,
              );
            }
            if (e.key === "Home" || e.key === "End") {
              e.preventDefault();
              setMonth(e.key === "Home" ? 0 : 11);
            }
            if (
              e.key === "Enter" &&
              selected?.value !== null &&
              selected?.available === selected?.expected &&
              selected
            )
              onSelect(selected.key);
          }}
        >
          <defs>
            <linearGradient id="ridge-ink" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="#edbc7f" stopOpacity=".65" />
              <stop offset="1" stopColor="#182923" stopOpacity=".94" />
            </linearGradient>
            <linearGradient id="ridge-mint" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="#9ec8b7" stopOpacity=".4" />
              <stop offset="1" stopColor="#12201b" stopOpacity=".98" />
            </linearGradient>
          </defs>
          <rect
            x={x(month) - 27}
            y="18"
            width="54"
            height={plotHeight - 35}
            fill="#f6d49c"
            opacity=".045"
            rx="15"
          />
          {months.map((m, i) => (
            <g
              key={m}
              className={`sr-month ${i === month ? "is-active" : ""}`}
              role="button"
              tabIndex={-1}
              aria-label={`Trace ${m} across years`}
              onClick={() => setMonth(i)}
            >
              <rect
                x={x(i) - 30}
                y="2"
                width="60"
                height="33"
                fill="transparent"
              />
              <text
                className="sr-month-full"
                x={x(i)}
                y="22"
                textAnchor="middle"
              >
                {m}
              </text>
              <text
                className="sr-month-short"
                x={x(i)}
                y="28"
                textAnchor="middle"
              >
                {m[0]}
              </text>
              <line
                x1={x(i)}
                y1="34"
                x2={x(i)}
                y2={plotHeight - 12}
                stroke="#b4c8af"
                strokeOpacity=".08"
                strokeDasharray="2 8"
              />
            </g>
          ))}
          {available.map((r, index) => {
            const active = r.year === row?.year;
            const points = values[index];
            const by = baseline(index);
            const paths = ridgePath(points, max, by);
            return (
              <g
                key={r.year}
                className={`sr-year ${active ? "is-selected" : ""}`}
              >
                <line
                  x1="90"
                  y1={by}
                  x2="885"
                  y2={by}
                  stroke="#c9d8bd"
                  strokeOpacity=".14"
                />
                {paths.map((p, i) => (
                  <path
                    key={i}
                    d={p}
                    fill={active ? "url(#ridge-ink)" : "url(#ridge-mint)"}
                    stroke={active ? "#f5ce92" : "#92b9a6"}
                    strokeWidth={active ? 2 : 1.1}
                    strokeLinejoin="round"
                  />
                ))}
                {!r.complete && scale === "share" && (
                  <line
                    x1="105"
                    y1={by}
                    x2="864"
                    y2={by}
                    stroke="#9da596"
                    strokeDasharray="3 7"
                  />
                )}
                <text
                  className="sr-year-label"
                  x="79"
                  y={by + 4}
                  textAnchor="end"
                >
                  {r.year}
                </text>
                <text className="sr-year-total" x="899" y={by + 4}>
                  {r.complete ? integer(r.total) : "partial"}
                </text>
                {r.buckets.map((b, i) => (
                  <rect
                    key={b.key}
                    x={x(i) - 34}
                    y={by - 35}
                    width="69"
                    height="42"
                    fill="transparent"
                    onPointerMove={() => inspect(index, i)}
                    onClick={() => inspect(index, i)}
                    aria-hidden="true"
                    className="sr-hit"
                  />
                ))}
                {active && points[month] !== null && (
                  <>
                    <line
                      x1={x(month)}
                      y1={by}
                      x2={x(month)}
                      y2={by - ((points[month] ?? 0) / max) * 52}
                      stroke="#ffdfaa"
                      strokeWidth="2"
                    />
                    <circle
                      cx={x(month)}
                      cy={by - ((points[month] ?? 0) / max) * 52}
                      r="4"
                      fill="#ffe8c2"
                      stroke="#24352a"
                      strokeWidth="2"
                      pointerEvents="none"
                    />
                  </>
                )}
              </g>
            );
          })}
        </svg>
      </div>
      <div className="sr-readout">
        <div className="sr-date">
          <span>FOLLOWING</span>
          <div>
            <label>
              <span className="jy-sr">Inspected month</span>
              <select
                aria-label="Inspected month"
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
              >
                {months.map((m, i) => (
                  <option value={i} key={m}>
                    {m}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="jy-sr">Inspected year</span>
              <select
                aria-label="Inspected year"
                value={row?.year || ""}
                onChange={(e) => setYear(Number(e.target.value))}
              >
                {available.map((r) => (
                  <option key={r.year} value={r.year}>
                    {r.year}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
        <div className="sr-reading" aria-live="polite">
          <strong>
            {selected?.value === null || selected?.value === undefined
              ? "—"
              : integer(selected.value)}
          </strong>
          <span>
            {selected?.value === null || selected?.value === undefined
              ? "Source unavailable"
              : `${selected.value === 1 ? "detection" : "detections"}${selected.available !== selected.expected ? " · partial source" : ""}`}
          </span>
          <small>
            {share === null
              ? "Annual share unavailable"
              : `${(share * 100).toFixed(1)}% of the year's recorded detections`}
          </small>
        </div>
        <button
          className="sr-open"
          disabled={
            !selected ||
            selected.value === null ||
            selected.available !== selected.expected
          }
          onClick={() => selected && onSelect(selected.key)}
        >
          Open this month <ArrowUpRight size={17} />
        </button>
      </div>
      <div className="sr-footer">
        <span>
          <MoveHorizontal size={13} /> Hover to explore · arrows to trace ·
          Enter to open
        </span>
        <span>Right labels = annual detections</span>
      </div>
      <p className="jy-chart-caveat">
        {rows.length - available.length > 0
          ? `${rows.length - available.length} years without this sensor's records are omitted. `
          : ""}
        Season shapes require all 12 source months. Counts and timing are
        unadjusted for observing effort; they are not fire severity or validated
        trends.
      </p>
    </div>
  );
}

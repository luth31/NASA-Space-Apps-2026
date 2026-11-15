import { useState } from "react";
import { motion } from "motion/react";
import {
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  FileText,
  Newspaper,
  Satellite,
} from "lucide-react";
import { integer } from "../data";
import type { ReportModel } from "./use-report";
import type { PatternYear, Reading } from "./pattern-data";
import { sensorBuckets } from "./experiment-data";
import { ribbonGeometry, shortPeriod } from "./journey-data";
import type { Bucket } from "./report-data";

export function PatternWeave({
  rows,
  selectedYear,
  onSelect,
}: {
  rows: PatternYear[];
  selectedYear: number;
  onSelect: (period: string) => void;
}) {
  const [hover, setHover] = useState<{
    row: PatternYear;
    month: number;
  } | null>(null);
  const available = rows.filter((r) => r.buckets.some((b) => b.value !== null));
  const missing = rows.length - available.length;
  return (
    <div className="jy-weave">
      <div className="jy-weave-caption">
        <span>WHEN DOES EACH YEAR CONCENTRATE?</span>
        <span>Color = share of that year’s detections</span>
      </div>
      <div
        className="jy-weave-grid"
        role="group"
        aria-label="Monthly patterns across available years"
      >
        <span />
        {Array.from({ length: 12 }, (_, i) => (
          <span key={i} className={hover?.month === i ? "is-column" : ""}>
            {new Date(Date.UTC(2023, i, 1)).toLocaleDateString("en-GB", {
              month: "short",
              timeZone: "UTC",
            })}
          </span>
        ))}
        {available.map((row) => (
          <div
            className={`jy-weave-row ${row.year === selectedYear ? "is-year" : ""}`}
            key={row.year}
          >
            <button
              className="jy-weave-year"
              onClick={() => onSelect(String(row.year))}
            >
              {row.year}
            </button>
            {row.buckets.map((b, i) => {
              const share =
                b.value === null || !row.total ? null : b.value / row.total;
              return (
                <button
                  key={b.key}
                  disabled={b.value === null}
                  className={`jy-weave-cell ${hover?.month === i ? "is-column" : ""} ${b.available !== b.expected ? "is-partial" : ""}`}
                  style={{
                    background:
                      share === null
                        ? "#ffffff04"
                        : `color-mix(in srgb, #efc98b ${8 + share * 92}%, #15211c)`,
                  }}
                  aria-label={`${shortPeriod(b.key)} ${row.year}: ${b.value === null ? "source unavailable" : `${integer(b.value)} detections, ${Math.round((share ?? 0) * 100)}% of available annual detections`}. Select to open month.`}
                  onPointerEnter={() => setHover({ row, month: i })}
                  onFocus={() => setHover({ row, month: i })}
                  onClick={() => onSelect(b.key)}
                  onKeyDown={(e) => {
                    if (
                      ![
                        "ArrowRight",
                        "ArrowLeft",
                        "ArrowDown",
                        "ArrowUp",
                      ].includes(e.key)
                    )
                      return;
                    e.preventDefault();
                    const buttons = [
                      ...e.currentTarget
                        .closest(".jy-weave-grid")!
                        .querySelectorAll<HTMLButtonElement>(
                          ".jy-weave-cell:not(:disabled)",
                        ),
                    ];
                    const at = buttons.indexOf(e.currentTarget);
                    const delta =
                      e.key === "ArrowRight"
                        ? 1
                        : e.key === "ArrowLeft"
                          ? -1
                          : e.key === "ArrowDown"
                            ? 12
                            : -12;
                    buttons[
                      Math.max(0, Math.min(buttons.length - 1, at + delta))
                    ]?.focus();
                  }}
                >
                  <span className="jy-sr">{b.label}</span>
                </button>
              );
            })}
          </div>
        ))}
      </div>
      <div className="jy-weave-readout" aria-live="polite">
        {hover ? (
          <>
            <strong>
              {shortPeriod(hover.row.buckets[hover.month].key)} {hover.row.year}
            </strong>
            <span>
              {integer(hover.row.buckets[hover.month].value!)} detections ·{" "}
              {Math.round(
                ((hover.row.buckets[hover.month].value ?? 0) /
                  Math.max(1, hover.row.total)) *
                  100,
              )}
              % of that year
              {!hover.row.complete ? " · partial source records" : ""}
            </span>
          </>
        ) : (
          <>
            <strong>Follow a glowing column.</strong>
            <span>
              Hover or focus to trace a month; select a cell to open its days.
            </span>
          </>
        )}
      </div>
      <p className="jy-chart-caveat">
        {missing > 0
          ? `${missing} years without this sensor’s source data are omitted. `
          : ""}
        Within-year shares describe recorded timing, not adjusted fire trends.
        Observation effort is unverified.
      </p>
    </div>
  );
}

export function SatelliteFlow({
  model,
  onSelect,
  reduced,
}: {
  model: ReportModel;
  onSelect: (key: string, sensor: "modis" | "viirs") => void;
  reduced: boolean;
}) {
  const [inspected, setInspected] = useState<string | null>(null);
  const modis = sensorBuckets(model, "modis"),
    viirs = sensorBuckets(model, "viirs");
  const max = Math.max(1, ...[...modis, ...viirs].map((b) => b.value ?? 0));
  const focus =
    modis.find((b) => b.key === inspected) ??
    modis.find((b) => b.key === (model.selection.hour ?? model.peak?.key));
  const render = (buckets: Bucket[], sensor: string, color: string) => {
    const g = ribbonGeometry(buckets, max),
      total = model.selection.hour
        ? model.sensorCounts[sensor === "Aqua MODIS" ? "modis" : "viirs"]
        : buckets.reduce((n, b) => n + (b.value ?? 0), 0),
      has = buckets.some((b) => b.value !== null);
    return (
      <div className="jy-sensor-flow">
        <header>
          <span>
            <Satellite size={14} />
            {sensor}
          </span>
          <strong>
            {has && total !== null
              ? integer(total)
              : model.busy
                ? "Loading…"
                : "No source"}
            <small>{has ? "detections" : "for this selection"}</small>
          </strong>
        </header>
        <div className="jy-sensor-plot">
          <svg
            viewBox="0 0 1000 300"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <line x1="70" x2="930" y1="249" y2="249" stroke="#aabda32b" />
            <motion.path
              initial={false}
              animate={{ d: g.area }}
              transition={{ duration: reduced ? 0 : 0.7 }}
              fill={color}
              fillOpacity=".15"
              opacity={has ? 1 : 0}
            />
            <motion.path
              initial={false}
              animate={{ d: g.line }}
              transition={{ duration: reduced ? 0 : 0.7 }}
              fill="none"
              stroke={color}
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
              opacity={has ? 1 : 0}
            />
          </svg>
          <div className="jy-sensor-bins">
            {buckets.map((b, i) => (
              <button
                key={b.key}
                style={{
                  left: `${7 + (i / buckets.length) * 86}%`,
                  width: `${86 / buckets.length}%`,
                }}
                disabled={b.value === null || model.busy}
                onPointerEnter={() => setInspected(b.key)}
                onFocus={() => setInspected(b.key)}
                onClick={() =>
                  onSelect(b.key, sensor === "Aqua MODIS" ? "modis" : "viirs")
                }
                aria-label={`${sensor}, ${shortPeriod(b.key)}: ${b.value === null ? "no source" : integer(b.value) + " detections"}. Select to explore.`}
              >
                <span className={b.key === focus?.key ? "is-focus" : ""}>
                  {b.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  };
  return (
    <div className="jy-satellite-flow">
      <div className="jy-flow-caption">
        {model.selection.hour
          ? "SURROUNDING UTC HOURS · SELECTED HOUR HIGHLIGHTED"
          : "SAME PERIODS · SAME LINEAR COUNT SCALE · RAW OBSERVATIONS"}
      </div>
      {render(modis, "Aqua MODIS", "#a6d4cb")}
      {render(viirs, "S-NPP VIIRS", "#efc58b")}
      <p className="jy-flow-readout">
        {focus && (
          <>
            <strong>{shortPeriod(focus.key)}</strong> MODIS{" "}
            {focus.value === null ? "—" : integer(focus.value)} / VIIRS{" "}
            {viirs.find((b) => b.key === focus.key)?.value === null
              ? "—"
              : integer(
                  viirs.find((b) => b.key === focus.key)?.value ?? 0,
                )}{" "}
            detections.{" "}
          </>
        )}
        Different footprints and overpasses; these are not harmonized values or
        unique fires.
      </p>
    </div>
  );
}

export function ReadingCards({
  items,
  onPeriod,
}: {
  items: Reading[];
  onPeriod: (year: number, month: number) => void;
}) {
  return (
    <div className="jy-reading-cards">
      {!items.some((r) => r.kind === "Reporting") && (
        <p className="jy-reading-empty">
          No curated reporting matches this time and study area. Measurement
          research is available below.
        </p>
      )}
      {items.map((r) => (
        <article
          key={r.id}
          className={`jy-reading-card ${r.image ? "has-photo" : ""}`}
        >
          {r.image && (
            <figure>
              <img
                src={r.image}
                alt="Dated satellite context imagery of the study region"
                loading="lazy"
              />
              <figcaption>{r.imageDate}</figcaption>
            </figure>
          )}
          <div className="jy-reading-body">
            <div className="jy-reading-meta">
              {r.kind === "Reporting" ? (
                <Newspaper size={14} />
              ) : r.kind === "Research" ? (
                <BookOpen size={14} />
              ) : (
                <FileText size={14} />
              )}
              <span>
                {r.kind} · {r.date}
              </span>
            </div>
            <h3>
              <a href={r.url} target="_blank" rel="noreferrer">
                {r.title}
                <ArrowUpRight size={17} />
              </a>
            </h3>
            <span className="jy-reading-publisher">{r.publisher}</span>
            <p>{r.summary}</p>
            <p className="jy-reading-why">{r.why}</p>
            {r.year && r.month && (
              <button
                className="jy-text-action"
                onClick={() => onPeriod(r.year!, r.month!)}
              >
                <CalendarDays size={14} />
                Explore{" "}
                {shortPeriod(
                  `${r.year}-${String(r.month).padStart(2, "0")}`,
                )}{" "}
                {r.year}
                <ArrowUpRight size={14} />
              </button>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}

import { useMemo, useState, type CSSProperties } from "react";
import { motion } from "motion/react";
import { ArrowDownToLine, ArrowUpRight, ArrowRight, Info } from "lucide-react";
import type { CaseStudy } from "./data";
import { dateLabel, number } from "./data";
import {
  downloadMonthly,
  monthlyModels,
  useMonthlyCalibration,
  type MonthlyModel,
} from "./monthly";
import "./calendar-compact.css";

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
const series = [
  {
    key: "modis",
    name: "Original MODIS",
    subtitle: "Aqua · reported detections",
    color: "#f7a16b",
  },
  {
    key: "estimate",
    name: "Estimated VIIRS",
    subtitle: "Model · experimental counts",
    color: "#f2d46b",
  },
  {
    key: "viirs",
    name: "Observed VIIRS",
    subtitle: "S-NPP · reference detections",
    color: "#ff665c",
  },
] as const;

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

function Flame({ count, maximum }: { count: number | null; maximum: number }) {
  if (count === null)
    return (
      <span className="flame-no-source" aria-hidden="true">
        —
      </span>
    );
  if (count === 0)
    return (
      <span className="flame-zero" aria-hidden="true">
        0
      </span>
    );
  const intensity = Math.min(1, Math.log1p(count) / Math.log1p(maximum));
  return (
    <svg
      className="calendar-flame"
      viewBox="0 0 24 32"
      aria-hidden="true"
      style={{
        opacity: 0.38 + intensity * 0.62,
        transform: `scale(${0.38 + intensity * 0.62})`,
      }}
    >
      <path
        d="M13.1 1C15 9 4 11.2 4.1 20.1 1.7 17.5 2.6 14 2.6 14S-2 21.4 2.8 27.3C7.4 33 17 33.5 21.5 26.8c4.8-7.2-.4-13.5-3-16.5.8 4.8-1.3 6.2-1.3 6.2C19.3 9.9 14.4 3 13.1 1Z"
        fill="currentColor"
      />
      <path
        d="M12.5 18c.7 4.6-4.8 5-4.6 8.6.1 2.6 2.3 4 4.7 3.9 4-.2 5.5-3.8 3.8-6.4-.1 2-1.3 2.1-1.3 2.1.6-3.5-1.9-6.5-2.6-8.2Z"
        fill="#fff7df"
        opacity=".65"
      />
    </svg>
  );
}

function errorChange(original: number, estimated: number) {
  if (original === estimated) return "Same error";
  if (original === 0) return `${number(estimated)} more error`;
  const percentage = Math.abs((original - estimated) / original) * 100;
  return `${number(percentage)}% ${estimated < original ? "less" : "more"} error`;
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
  const [model, setModel] = useState<MonthlyModel>("Seasonal scaling");
  const [hoveredMonth, setHoveredMonth] = useState<string | null>(null);
  const { data: calibration, failed } = useMonthlyCalibration();
  const monthly = calibration?.cases[study.id];
  const months = useMemo(() => {
    const estimates = new Map(monthly?.months.map((m) => [m.month, m]));
    return study.months.map((month) => ({
      ...month,
      estimate: estimates.get(month.month)?.estimates[model] ?? null,
      evaluation: estimates.get(month.month)?.evaluation,
    }));
  }, [study, monthly, model]);
  const byMonth = useMemo(
    () => new Map(months.map((m) => [m.month, m])),
    [months],
  );
  const years = [...study.years].sort((a, b) => b - a);
  const orderedMonths = years.flatMap((year) =>
    names.map((_, month) => `${year}-${String(month + 1).padStart(2, "0")}`),
  );
  const selectedKey = byMonth.has(selectedMonth)
    ? selectedMonth
    : months[months.length - 1]?.month;
  const displayed =
    byMonth.get(hoveredMonth ?? selectedKey) ?? byMonth.get(selectedKey);
  const maximum = Math.max(
    1,
    ...months.flatMap((m) => [m.modis ?? 0, m.estimate ?? 0, m.viirs ?? 0]),
  );
  const baselineError =
    displayed?.modis != null && displayed.viirs != null
      ? Math.abs(displayed.modis - displayed.viirs)
      : null;
  const modelError =
    displayed?.estimate != null && displayed.viirs != null
      ? Math.abs(displayed.estimate - displayed.viirs)
      : null;
  const score = monthly?.scores[model];
  const visibleMonth = displayed
    ? dateLabel(`${displayed.month}-01`, { month: "long", year: "numeric" })
    : "Select a month";
  const monthTitle = (key: string) => {
    const row = byMonth.get(key);
    return `${dateLabel(`${key}-01`, { month: "long", year: "numeric" })} · MODIS ${row?.modis == null ? "unavailable" : number(row.modis)} · Estimated VIIRS ${row?.estimate == null ? "unavailable" : number(row.estimate)} · Observed VIIRS ${row?.viirs == null ? "unavailable" : number(row.viirs)}`;
  };

  return (
    <motion.div
      className="calendar-view calendar-story"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <header className="calendar-story-heading">
        <div className="calendar-story-title">
          <span className="calendar-kicker">THE FIRE ACTIVITY CALENDAR</span>
          <h1>One history. Three perspectives.</h1>
        </div>
        <div className="calendar-story-controls">
          <label>
            <span>Investigation</span>
            <select
              aria-label="Calendar investigation"
              value={study.id}
              onChange={(event) => {
                setHoveredMonth(null);
                onStudy(cases.find((c) => c.id === event.target.value)!);
              }}
            >
              {cases.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}, {c.country}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Calibration model</span>
            <select
              aria-label="Calendar calibration model"
              value={model}
              onChange={(event) => setModel(event.target.value as MonthlyModel)}
            >
              {monthlyModels.map((name) => (
                <option key={name}>{name}</option>
              ))}
            </select>
          </label>
          <button
            className="calendar-export"
            disabled={!monthly || !calibration}
            onClick={() =>
              calibration && downloadMonthly(study, calibration, model)
            }
            title="Download original counts, estimates and validation provenance"
          >
            <ArrowDownToLine size={15} />
            <span>CSV</span>
          </button>
        </div>
      </header>

      <section
        className="calendar-month-story"
        aria-label="Monthly sensor and model comparison"
      >
        <div className="calendar-month-identity">
          <span className="calendar-kicker">
            {hoveredMonth ? "MONTH PREVIEW" : "SELECTED MONTH"}
          </span>
          <h2>{visibleMonth}</h2>
          <button onClick={onExplore}>
            Investigate selection <ArrowUpRight size={13} />
          </button>
        </div>
        {series.map((sensor) => (
          <div
            className={`calendar-month-value ${sensor.key}`}
            key={sensor.key}
            style={{ "--series-color": sensor.color } as CSSProperties}
          >
            <span>{sensor.name}</span>
            <strong>{number(displayed?.[sensor.key])}</strong>
            <small>
              {displayed?.[sensor.key] == null
                ? "Source unavailable"
                : "monthly detections"}
            </small>
          </div>
        ))}
        <div
          className={`calendar-month-error ${baselineError != null && modelError != null && modelError > baselineError ? "is-worse" : ""}`}
        >
          <span className="calendar-kicker">ABSOLUTE ERROR VS VIIRS</span>
          {baselineError != null && modelError != null ? (
            <>
              <div className="calendar-error-values">
                <span>
                  {number(baselineError)}
                  <small>original</small>
                </span>
                <ArrowRight size={17} />
                <span>
                  {number(modelError)}
                  <small>model</small>
                </span>
              </div>
              <strong>{errorChange(baselineError, modelError)}</strong>
            </>
          ) : (
            <>
              <strong>
                {!calibration
                  ? failed
                    ? "Estimates unavailable"
                    : "Loading estimates…"
                  : displayed?.viirs == null
                    ? "No VIIRS comparison"
                    : "No model comparison"}
              </strong>
              <small>
                {!calibration
                  ? "Original observations remain visible"
                  : "No error claimed for missing data"}
              </small>
            </>
          )}
          <small className="calendar-prediction-origin">
            {displayed?.evaluation === "withheld-year"
              ? "This year excluded from training"
              : displayed?.estimate != null
                ? "Historical estimate · not validated here"
                : ""}
          </small>
        </div>
      </section>

      <div
        className={`calendar-matrices ${years.length <= 2 ? "short-record" : ""}`}
      >
        {series.map((sensor, seriesIndex) => {
          const available = months.filter(
            (month) => month[sensor.key] !== null,
          );
          const total = available.reduce(
            (sum, month) => sum + (month[sensor.key] ?? 0),
            0,
          );
          return (
            <section
              className={`calendar-matrix ${sensor.key}`}
              key={sensor.key}
              style={
                {
                  "--series-color": sensor.color,
                  "--year-count": years.length,
                } as CSSProperties
              }
              aria-label={sensor.name}
            >
              <div className="calendar-matrix-heading">
                <div>
                  <h2>
                    <span>{String(seriesIndex + 1).padStart(2, "0")}</span>
                    {sensor.name}
                  </h2>
                  <p>{sensor.subtitle}</p>
                </div>
                <Flame count={maximum} maximum={maximum} />
              </div>
              <div
                className="calendar-flame-grid"
                role="grid"
                aria-label={`${sensor.name}, monthly detection counts`}
              >
                <div
                  className="calendar-flame-row calendar-month-labels"
                  role="row"
                >
                  <span role="columnheader">YEAR</span>
                  {names.map((name) => (
                    <span role="columnheader" key={name}>
                      {name}
                    </span>
                  ))}
                </div>
                <div className="calendar-year-rows" role="rowgroup">
                  {years.map((year) => (
                    <div className="calendar-flame-row" role="row" key={year}>
                      <span className="calendar-year-label" role="rowheader">
                        {year}
                      </span>
                      {names.map((_, monthIndex) => {
                        const key = `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
                        const count = byMonth.get(key)?.[sensor.key] ?? null;
                        return (
                          <button
                            role="gridcell"
                            key={key}
                            data-month={key}
                            data-calendar-series={sensor.key}
                            aria-selected={selectedKey === key}
                            aria-label={`${sensor.name}: ${monthTitle(key)}`}
                            title={monthTitle(key)}
                            tabIndex={selectedKey === key ? 0 : -1}
                            className={`calendar-flame-cell ${selectedKey === key ? "selected" : ""} ${hoveredMonth === key ? "preview" : ""} ${count == null ? "missing" : count === 0 ? "zero" : "active"}`}
                            onClick={() => onMonth(key)}
                            onMouseEnter={() => setHoveredMonth(key)}
                            onMouseLeave={() => setHoveredMonth(null)}
                            onFocus={() => setHoveredMonth(key)}
                            onBlur={() => setHoveredMonth(null)}
                            onKeyDown={(event) => {
                              const offsets: Record<string, number> = {
                                ArrowLeft: -1,
                                ArrowRight: 1,
                                ArrowUp: -12,
                                ArrowDown: 12,
                              };
                              const offset =
                                event.key === "Home"
                                  ? -monthIndex
                                  : event.key === "End"
                                    ? 11 - monthIndex
                                    : offsets[event.key];
                              if (offset === undefined) return;
                              event.preventDefault();
                              const next =
                                orderedMonths[
                                  Math.max(
                                    0,
                                    Math.min(
                                      orderedMonths.length - 1,
                                      orderedMonths.indexOf(key) + offset,
                                    ),
                                  )
                                ];
                              onMonth(next);
                              document
                                .querySelector<HTMLButtonElement>(
                                  `[data-calendar-series="${sensor.key}"][data-month="${next}"]`,
                                )
                                ?.focus();
                            }}
                          >
                            <Flame count={count} maximum={maximum} />
                            {years.length <= 2 && (
                              <span className="calendar-short-value">
                                {number(count)}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
              <div className="calendar-matrix-total">
                <span>
                  {number(total)}{" "}
                  <small>
                    {sensor.key === "estimate" ? "estimated" : "reported"}{" "}
                    detections
                  </small>
                </span>
                <small>
                  {available.length}/{months.length} months
                </small>
              </div>
            </section>
          );
        })}
      </div>

      <footer className="calendar-story-footer">
        <div className="calendar-glyph-legend">
          <span className="calendar-legend-flames">
            <Flame count={1} maximum={maximum} />
            <Flame count={Math.sqrt(maximum)} maximum={maximum} />
            <Flame count={maximum} maximum={maximum} />
          </span>
          <span>Shared log scale · 1–{number(maximum)}</span>
          <span>
            <b>0</b> no detections
          </span>
          <span>
            <b>—</b> unavailable
          </span>
          <span
            className="calendar-context-note"
            title="Monthly reported detections, not fire area or number of fires. Clouds and satellite overpasses are not normalized. Zero detections does not establish no fire."
          >
            <Info size={13} /> Counts, not fire area
          </span>
        </div>
        <div className="calendar-validation-summary">
          {score ? (
            <>
              <span>{score.n} withheld months · average error</span>
              <strong>
                {number(score.baselineMae)} <ArrowRight size={12} />{" "}
                {number(score.mae)}
              </strong>
              <span className={score.mae > score.baselineMae ? "is-worse" : ""}>
                {errorChange(score.baselineMae, score.mae)}
              </span>
            </>
          ) : (
            <span role="status">
              {failed
                ? "Calibration unavailable. Reload to retry."
                : "Loading validation…"}
            </span>
          )}
          <button onClick={onMethods}>
            Model evidence <ArrowUpRight size={13} />
          </button>
        </div>
      </footer>
    </motion.div>
  );
}

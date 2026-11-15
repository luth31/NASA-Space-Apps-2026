import { useMemo, useState, type CSSProperties } from "react";
import { motion } from "motion/react";
import {
  ArrowDownToLine,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type { CaseStudy } from "./data";
import { dateLabel, number } from "./data";
import SeasonWheel from "./calendar/SeasonWheel";
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
  { key: "modis", name: "Original MODIS", short: "MODIS", color: "#f7a16b" },
  {
    key: "estimate",
    name: "Model estimate",
    short: "Estimate",
    color: "#f2d46b",
  },
  { key: "viirs", name: "Observed VIIRS", short: "VIIRS", color: "#ff665c" },
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
      <span className="calendar-flame-missing" aria-hidden="true">
        —
      </span>
    );
  if (count === 0)
    return (
      <span className="calendar-flame-zero" aria-hidden="true">
        ·
      </span>
    );
  // Scale both dimensions so the flame's area is proportional to the count.
  const height = 54 * Math.sqrt(count / maximum);
  return (
    <svg
      className="calendar-flame"
      viewBox="0 0 24 32"
      aria-hidden="true"
      width={height * (24 / 32)}
      height={height}
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
function gapChange(original: number, estimated: number) {
  if (original === estimated) return "Same gap";
  if (original === 0)
    return `${number(estimated)} detections farther from VIIRS`;
  const change = Math.abs(original - estimated) / original;
  return `${number(change * 100)}% ${estimated < original ? "smaller" : "larger"} gap`;
}

function describeGap(difference: number) {
  if (difference === 0) return "Matches VIIRS";
  return `${number(Math.abs(difference))} ${difference < 0 ? "below" : "above"}`;
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
  const [seasonView, setSeasonView] = useState(false);
  const [seasonField, setSeasonField] = useState<
    "modis" | "viirs" | "estimate"
  >("viirs");
  const { data: calibration, failed } = useMonthlyCalibration();
  const monthly = calibration?.cases[study.id];
  const months = useMemo(() => {
    const estimates = new Map(
      monthly?.months.map((month) => [month.month, month]),
    );
    return study.months.map((month) => ({
      ...month,
      estimate: estimates.get(month.month)?.estimates[model] ?? null,
      evaluation: estimates.get(month.month)?.evaluation,
    }));
  }, [study, monthly, model]);
  const byMonth = useMemo(
    () => new Map(months.map((month) => [month.month, month])),
    [months],
  );
  const years = [...study.years].sort((a, b) => a - b);
  const selectedKey = byMonth.has(selectedMonth)
    ? selectedMonth
    : (months[months.length - 1]?.month ?? study.date.slice(0, 7));
  const selected = byMonth.get(selectedKey);
  const year = Number(selectedKey.slice(0, 4));
  const yearIndex = years.indexOf(year);
  const yearMonths = names.map((_, i) =>
    byMonth.get(`${year}-${String(i + 1).padStart(2, "0")}`),
  );
  const maximum = Math.max(
    1,
    ...yearMonths.flatMap((month) => [
      month?.modis ?? 0,
      month?.estimate ?? 0,
      month?.viirs ?? 0,
    ]),
  );
  const totals = years.map((value) => {
    const rows = months.filter((month) =>
      month.month.startsWith(String(value)),
    );
    return {
      year: value,
      values: series.map((sensor) =>
        rows.every((row) => row[sensor.key] == null)
          ? null
          : rows.reduce((sum, row) => sum + (row[sensor.key] ?? 0), 0),
      ),
    };
  });
  const annualMax = Math.max(
    1,
    ...totals.flatMap((entry) => entry.values.map((value) => value ?? 0)),
  );
  const modisDifference =
    selected?.modis != null && selected.viirs != null
      ? selected.modis - selected.viirs
      : null;
  const estimateDifference =
    selected?.estimate != null && selected.viirs != null
      ? selected.estimate - selected.viirs
      : null;
  const modisGap = modisDifference == null ? null : Math.abs(modisDifference);
  const estimateGap =
    estimateDifference == null ? null : Math.abs(estimateDifference);
  const score = monthly?.scores[model];
  function chooseYear(value: number) {
    onMonth(`${value}-${selectedKey.slice(5, 7)}`);
  }
  function describeMonth(key: string) {
    const row = byMonth.get(key);
    return `${dateLabel(key + "-01", { month: "long", year: "numeric" })}: ${series.map((sensor) => `${sensor.name} ${row?.[sensor.key] == null ? "unavailable" : number(row[sensor.key])}`).join(", ")}`;
  }
  return (
    <motion.div
      className="calendar-view calendar-readable"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      <header className="calendar-heading">
        <div>
          <h1>Compare the fire record.</h1>
          <p>Compare MODIS, the model estimate, and observed VIIRS by month.</p>
        </div>
        <div className="calendar-controls">
          <button
            className="calendar-export"
            aria-pressed={seasonView}
            onClick={() => setSeasonView((value) => !value)}
          >
            {seasonView ? "Monthly comparison" : "Seasonal wheel"}
          </button>
          <select
            aria-label="Calendar investigation"
            value={study.id}
            onChange={(event) =>
              onStudy(cases.find((item) => item.id === event.target.value)!)
            }
          >
            {cases.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}, {item.country}
              </option>
            ))}
          </select>
          <select
            aria-label="Calendar calibration model"
            value={model}
            onChange={(event) => setModel(event.target.value as MonthlyModel)}
          >
            {monthlyModels.map((name) => (
              <option key={name}>{name}</option>
            ))}
          </select>
          <button
            className="calendar-export"
            disabled={!monthly || !calibration}
            onClick={() =>
              calibration && downloadMonthly(study, calibration, model)
            }
            title="Download counts, estimates and provenance"
          >
            <ArrowDownToLine size={16} /> CSV
          </button>
        </div>
      </header>
      <section
        className="calendar-comparison"
        aria-label="Selected month comparison"
      >
        <div className="calendar-selection">
          <span>SELECTED MONTH</span>
          <h2>
            {dateLabel(selectedKey + "-01", { month: "long", year: "numeric" })}
          </h2>
          <button onClick={onExplore}>
            Investigate <ArrowUpRight size={14} />
          </button>
        </div>
        {series.map((sensor) => (
          <div
            className={`calendar-comparison-count ${sensor.key}`}
            key={sensor.key}
            style={{ "--series-color": sensor.color } as CSSProperties}
          >
            <span>{sensor.name}</span>
            <strong>{number(selected?.[sensor.key])}</strong>
            <small>
              {selected?.[sensor.key] == null
                ? "Unavailable"
                : "monthly detections"}
            </small>
          </div>
        ))}
        <div
          className={`calendar-comparison-error ${estimateGap != null && modisGap != null && estimateGap > modisGap ? "is-worse" : ""}`}
        >
          <span>GAP TO OBSERVED VIIRS</span>
          {selected?.viirs != null ? (
            <dl className="calendar-gap-values">
              <div>
                <dt>Original MODIS</dt>
                <dd>
                  {modisDifference == null
                    ? "Unavailable"
                    : describeGap(modisDifference)}
                </dd>
              </div>
              <div>
                <dt>Model estimate</dt>
                <dd>
                  {estimateDifference == null
                    ? !calibration && !failed
                      ? "Loading…"
                      : "Unavailable"
                    : describeGap(estimateDifference)}
                </dd>
              </div>
            </dl>
          ) : (
            <strong>No VIIRS count for this month</strong>
          )}
          {modisGap != null && estimateGap != null && (
            <strong>{gapChange(modisGap, estimateGap)} this month</strong>
          )}
          {selected?.estimate != null && (
            <small>
              {selected.evaluation === "withheld-year"
                ? `The model was trained without ${year} data.`
                : "Historical estimate from the full archive fit."}
            </small>
          )}
        </div>
      </section>
      {seasonView ? (
        <div className="calendar-season-container">
          <SeasonWheel
            key={study.id}
            study={study}
            months={months}
            field={seasonField}
            model={model}
            selectedMonth={selectedKey}
            onMonth={onMonth}
            onField={setSeasonField}
            onExplore={onExplore}
          />
        </div>
      ) : (
        <div className="calendar-history-workspace">
          <aside className="calendar-years" aria-label="All archive years">
            <div className="calendar-years-heading">
              <h2>Full history</h2>
              <span>
                {years[0]}–{years[years.length - 1]}
              </span>
            </div>
            <div className="calendar-year-buttons">
              {totals.map((entry) => (
                <button
                  className={entry.year === year ? "selected" : ""}
                  key={entry.year}
                  aria-label={`View ${entry.year}; annual totals: ${series.map((sensor, index) => `${sensor.short} ${number(entry.values[index])}`).join(", ")}`}
                  aria-pressed={entry.year === year}
                  onClick={() => chooseYear(entry.year)}
                >
                  <strong>{entry.year}</strong>
                  <span className="calendar-year-mini" aria-hidden="true">
                    {entry.values.map((value, index) => (
                      <i
                        key={series[index].key}
                        style={{
                          background:
                            value == null ? "transparent" : series[index].color,
                          height:
                            value == null
                              ? "2px"
                              : `${2 + (Math.log1p(value) / Math.log1p(annualMax)) * 14}px`,
                        }}
                      />
                    ))}
                  </span>
                </button>
              ))}
            </div>
            <p>Select a year to compare all 12 months.</p>
          </aside>
          <section
            className="calendar-year-detail"
            aria-label={`${year} monthly comparison`}
          >
            <div className="calendar-year-heading">
              <div className="calendar-year-switch">
                <button
                  aria-label="Previous calendar year"
                  disabled={yearIndex <= 0}
                  onClick={() => chooseYear(years[yearIndex - 1])}
                >
                  <ChevronLeft size={18} />
                </button>
                <h2>{year}</h2>
                <button
                  aria-label="Next calendar year"
                  disabled={yearIndex === years.length - 1}
                  onClick={() => chooseYear(years[yearIndex + 1])}
                >
                  <ChevronRight size={18} />
                </button>
              </div>
              <div className="calendar-legend">
                {series.map((sensor) => (
                  <span key={sensor.key} style={{ color: sensor.color }}>
                    <i />
                    {sensor.short}
                  </span>
                ))}
              </div>
              <span className="calendar-scale-note">
                Flame area is proportional to count within {year}
              </span>
            </div>
            <div
              className="calendar-month-cards"
              role="grid"
              aria-label={`${year} monthly fire counts`}
            >
              {names.map((name, index) => {
                const key = `${year}-${String(index + 1).padStart(2, "0")}`;
                const row = byMonth.get(key);
                return (
                  <button
                    role="gridcell"
                    className={`calendar-month-card ${key === selectedKey ? "selected" : ""}`}
                    key={key}
                    data-month={key}
                    aria-selected={key === selectedKey}
                    aria-label={describeMonth(key)}
                    title={describeMonth(key)}
                    tabIndex={key === selectedKey ? 0 : -1}
                    onClick={() => onMonth(key)}
                    onKeyDown={(event) => {
                      const offset =
                        event.key === "ArrowLeft"
                          ? -1
                          : event.key === "ArrowRight"
                            ? 1
                            : event.key === "ArrowUp"
                              ? -6
                              : event.key === "ArrowDown"
                                ? 6
                                : event.key === "Home"
                                  ? -index
                                  : event.key === "End"
                                    ? 11 - index
                                    : undefined;
                      if (offset === undefined) return;
                      event.preventDefault();
                      const nextIndex = Math.max(
                        0,
                        Math.min(11, index + offset),
                      );
                      const next = `${year}-${String(nextIndex + 1).padStart(2, "0")}`;
                      onMonth(next);
                      document
                        .querySelector<HTMLButtonElement>(
                          `.calendar-month-card[data-month="${next}"]`,
                        )
                        ?.focus();
                    }}
                  >
                    <span className="calendar-month-name">
                      {name}
                      <span>{key === selectedKey ? "SELECTED" : ""}</span>
                    </span>
                    <span className="calendar-month-flames" aria-hidden="true">
                      {series.map((sensor) => (
                        <span key={sensor.key} style={{ color: sensor.color }}>
                          <Flame
                            count={row?.[sensor.key] ?? null}
                            maximum={maximum}
                          />
                        </span>
                      ))}
                    </span>
                    <span className="calendar-month-values">
                      {series.map((sensor) => (
                        <span key={sensor.key} style={{ color: sensor.color }}>
                          <span>{sensor.short}</span>
                          <strong>{number(row?.[sensor.key])}</strong>
                        </span>
                      ))}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      )}
      <footer className="calendar-evidence">
        <span className="calendar-missing-key">
          <b>0</b> no detections <b>—</b> unavailable
        </span>
        {score ? (
          <span className="calendar-average-error">
            Average gap to VIIRS over {score.n} test months
            <strong>
              MODIS {number(score.baselineMae)} · Estimate {number(score.mae)}
            </strong>
            <b className={score.mae > score.baselineMae ? "is-worse" : ""}>
              {gapChange(score.baselineMae, score.mae)}
            </b>
          </span>
        ) : (
          <span role="status">
            {failed ? "Calibration unavailable" : "Loading validation…"}
          </span>
        )}
        <button onClick={onMethods}>
          Model evidence <ArrowUpRight size={14} />
        </button>
      </footer>
    </motion.div>
  );
}

import { ArrowUpRight, ChevronRight } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import type { CoverageReport, Manifest, ModelReport } from "./data";
import { integer, number } from "./data";
import CalibrationDemo from "./CalibrationDemo";
import { useMonthlyCalibration } from "./monthly";

export default function Methods({
  report,
  coverage,
  manifest,
  onSources,
}: {
  report: ModelReport | null;
  coverage: CoverageReport | null;
  manifest: Manifest;
  onSources: () => void;
}) {
  const { data: monthly } = useMonthlyCalibration();
  return (
    <motion.div
      className="methods-view"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="page-heading">
        <div>
          <span className="eyebrow">MODELS & VALIDATION</span>
          <h1>
            Measure the difference<span>.</span>
          </h1>
          <p>
            Predictions checked against VIIRS observations excluded from
            training.
          </p>
        </div>
        <button className="text-button" onClick={onSources}>
          Data provenance <ArrowUpRight size={16} />
        </button>
      </div>
      {monthly && (
        <>
          <div className="method-summary monthly-summary">
            <div>
              <span className="eyebrow">MONTHLY CALIBRATION</span>
              <h2>
                {monthly.trainingMonths} months. {monthly.years.length} withheld
                years.
              </h2>
              <p>
                Hide one complete year, train on the others, then predict the
                hidden year. Repeat for every year.
              </p>
            </div>
            <div className="method-numbers">
              <div>
                <span className="mono">TRAINING + EVALUATION</span>
                <strong>
                  {number(monthly.seconds)}
                  <em>s</em>
                </strong>
                <small>CPU · two fitted approaches</small>
              </div>
            </div>
          </div>
          <section className="monthly-scorecard">
            <div className="section-heading">
              <h2>How far off were the predictions?</h2>
              <span className="mono">
                AVERAGE ABSOLUTE ERROR · DETECTIONS / MONTH
              </span>
            </div>
            <p>
              Lower is better. Compare each model with the original MODIS count.
            </p>
            <div className="scorecard-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Landscape</th>
                    <th>Months</th>
                    <th>Unchanged MODIS</th>
                    <th>Seasonal scaling</th>
                    <th>LightGBM</th>
                  </tr>
                </thead>
                <tbody>
                  {manifest.cases.map((c) => {
                    const r = monthly.cases[c.id];
                    return (
                      <tr key={c.id}>
                        <th>{c.name}</th>
                        <td>{r.scores["Seasonal scaling"].n}</td>
                        <td>
                          {number(r.scores["Seasonal scaling"].baselineMae)}
                        </td>
                        <td>{number(r.scores["Seasonal scaling"].mae)}</td>
                        <td>{number(r.scores.LightGBM.mae)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="method-footnote">
              Gran Chaco has one overlap year: its withheld-year test also
              withholds the entire region. These are archive-count estimates;
              cloud and overpass effort are not normalized.
            </p>
          </section>
        </>
      )}
      <CalibrationDemo cases={manifest.cases} />
      <details className="method-details">
        <summary>Inspect the models and evaluation protocol</summary>
        <div className="model-table">
          <div className="model-table-head">
            <span>APPROACH</span>
            <span>ROLE</span>
            <span>INPUTS</span>
            <span>OUTPUT</span>
          </div>
          <div className="model-table-row">
            <strong>Seasonal scaling</strong>
            <span>Default / simple fallback</span>
            <span>MODIS, month, region</span>
            <span>Monthly count</span>
          </div>
          <div className="model-table-row">
            <strong>LightGBM</strong>
            <span>Nonlinear candidate</span>
            <span>MODIS, month, location</span>
            <span>Monthly count</span>
          </div>
        </div>
        <p>
          Parameters are fixed before the year folds. Every calendar value from
          2013 onward is predicted without that year in training. Earlier values
          use models fitted to the complete overlap archive. Seasonal scaling is
          the transparent default, not a guarantee of improvement. The 2012
          partial VIIRS year is excluded from fitting and scoring.
        </p>
        <p>
          The monthly model learns reported counts, not missing fire
          coordinates. Historical estimates assume the sensor relationship
          transfers backward in time. Source months without detections remain
          distinct from verified clear-sky no-fire observations.
        </p>
      </details>
      <details className="method-details">
        <summary>
          Inspect the separate matched-pass experiment ·{" "}
          {report?.totalRows ?? 0} cells
        </summary>
        <p>
          This experiment compares near-simultaneous satellite passes over
          common usable land. Its scores use a different unit from the monthly
          calendar.
        </p>
        {report && <Benchmark report={report} />}
        {coverage && <CoverageAudit coverage={coverage} manifest={manifest} />}
      </details>
    </motion.div>
  );
}

function Benchmark({ report }: { report: ModelReport }) {
  const [scope, setScope] = useState("macro");
  const regions = report.models[0]?.folds?.map((f) => f.region) ?? [];
  const rows = report.models.map((m) => {
    const score =
      scope === "macro"
        ? m
        : scope === "time"
          ? m.chronological
          : m.folds?.find((f) => f.region === scope);
    return { ...m, score };
  });
  const max = Math.max(
    1,
    ...report.models.flatMap((m) => [
      m.mae ?? 0,
      m.chronological?.mae ?? 0,
      ...(m.folds?.map((f) => f.mae) ?? []),
    ]),
  );
  const best = [...rows]
    .filter((m) => m.score?.mae !== undefined)
    .sort((a, b) => a.score!.mae! - b.score!.mae!)[0];
  return (
    <section
      className="benchmark-panel"
      aria-label="Measured exploratory model results"
    >
      <div className="benchmark-heading">
        <div>
          <span className="eyebrow">MEASURED · EXPLORATORY</span>
          <h2>How the candidates actually performed.</h2>
          <p>
            Mean absolute error in hotspot pixels per 0.25° cell and paired
            pass. Lower is better.
          </p>
        </div>
        <select
          aria-label="Benchmark holdout"
          value={scope}
          onChange={(e) => setScope(e.target.value)}
        >
          <option value="macro">Mean of region holdouts</option>
          {regions.map((r) => (
            <option value={r} key={r}>
              Withheld: {r === "evia" ? "Evia" : r === "evros" ? "Evros" : r}
            </option>
          ))}
          <option value="time">Later-time sample</option>
        </select>
      </div>
      <div className="benchmark-labels mono">
        <span>APPROACH</span>
        <span>ABSOLUTE ERROR</span>
        <span>SIGNED BIAS</span>
      </div>
      {rows.map((m) => (
        <div className="benchmark-row" key={m.name}>
          <span>{m.name}</span>
          <div>
            <div className="benchmark-track">
              <motion.i
                initial={{ width: 0 }}
                animate={{ width: `${((m.score?.mae ?? 0) / max) * 100}%` }}
                transition={{ duration: 0.8, ease: [0.2, 0.8, 0.2, 1] }}
                className={m.name === best?.name ? "best" : ""}
              />
            </div>
            <strong className="mono">{m.score?.mae?.toFixed(2) ?? "—"}</strong>
          </div>
          <span className="mono">
            {m.score?.bias === undefined
              ? "—"
              : `${m.score.bias > 0 ? "+" : ""}${m.score.bias.toFixed(2)}`}
          </span>
        </div>
      ))}
      <div className="benchmark-foot">
        <p>
          <strong>{best?.name}</strong> has the lowest error in this sample.{" "}
          {scope === "time"
            ? "The 2023 Evros passes were evaluated after fitting to the earlier selected passes."
            : "Entire case regions were withheld; all candidates used the same eligible rows."}
        </p>
        <span className="mono">
          {integer(report.totalRows)} ELIGIBLE CELLS ·{" "}
          {report.independentRegions} REGIONS
        </span>
      </div>
      <p className="science-caution">
        Selected passes establish feasibility. These scores do not measure
        monthly historical accuracy or global performance. No prediction
        interval is released.
      </p>
    </section>
  );
}

function CoverageAudit({
  coverage,
  manifest,
}: {
  coverage: CoverageReport;
  manifest: Manifest;
}) {
  const [expanded, setExpanded] = useState(false);
  const pairs = expanded
    ? coverage.pairs
    : coverage.pairs.filter(
        (p) => p.region === "evros" && p.date.startsWith("2023"),
      );
  return (
    <section className="coverage-audit">
      <div className="benchmark-heading">
        <div>
          <span className="eyebrow">THE OBSERVATION OPPORTUNITY</span>
          <h2>First, establish what was observable.</h2>
          <p>
            Daytime land, usable fire masks, viewing angle below 65°, actual
            scan times within five minutes.
          </p>
        </div>
        <button className="text-button" onClick={() => setExpanded((v) => !v)}>
          {expanded
            ? "Show flagship passes"
            : `Inspect all ${coverage.pairs.length} candidate pairs`}{" "}
          <ChevronRight size={15} />
        </button>
      </div>
      <div className="coverage-labels mono">
        <span>PLACE / DATE</span>
        <span>COMMON USABLE AREA</span>
        <span>ELIGIBLE CELLS</span>
        <span>SCAN GAP</span>
      </div>
      {pairs.map((p) => (
        <div className="coverage-row" key={p.id}>
          <span>
            <strong>
              {manifest.cases.find((c) => c.id === p.region)?.name ?? p.region}
            </strong>
            <small>{p.date}</small>
          </span>
          <div>
            <div className="coverage-track">
              <i style={{ width: `${(p.commonFractionAOI ?? 0) * 100}%` }} />
            </div>
            <span className="mono">
              {p.commonFractionAOI === undefined
                ? "—"
                : `${(p.commonFractionAOI * 100).toFixed(1)}%`}
            </span>
          </div>
          <span className="mono">
            {p.eligibleCells ?? 0} / {p.requestedCells ?? "—"}
          </span>
          <span className="mono">
            {p.medianPassGapSeconds == null
              ? "No eligible match"
              : `${p.medianPassGapSeconds.toFixed(1)} s`}
          </span>
        </div>
      ))}
      <p className="science-caution">
        Area percentages use the full case rectangle, including water.
        Eligibility is assessed within land cells. Nearest-pixel coverage is
        approximate; the audit retains a tighter-distance sensitivity check.{" "}
        <a href="/data/coverage.json" target="_blank" rel="noreferrer">
          Open the complete audit ↗
        </a>
      </p>
    </section>
  );
}

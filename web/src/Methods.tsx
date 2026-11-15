import { ArrowDown, ArrowUpRight } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useRef, useState } from "react";
import type { CoverageReport, Manifest, ModelReport } from "./data";
import { integer, number } from "./data";
import CalibrationDemo from "./CalibrationDemo";
import { useMonthlyCalibration } from "./monthly";
import "./methods-chapters.css";

const chapters = [
  { id: "bridge", label: "The bridge in action" },
  { id: "scores", label: "Monthly validation" },
  { id: "protocol", label: "Models & training" },
  { id: "passes", label: "Matched satellite passes" },
];

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
  const { data: monthly, failed } = useMonthlyCalibration();
  const [activeChapter, setActiveChapter] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<(HTMLElement | null)[]>([]);
  const reduced = useReducedMotion();
  function goToChapter(index: number) {
    sectionRefs.current[index]?.scrollIntoView({
      behavior: reduced ? "auto" : "smooth",
      block: "start",
    });
  }
  return (
    <motion.div
      className="methods-view methods-chapters"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <nav className="method-chapter-nav" aria-label="Model chapters">
        {chapters.map((chapter, index) => (
          <button
            key={chapter.id}
            type="button"
            className={activeChapter === index ? "active" : ""}
            aria-label={`${index + 1}. ${chapter.label}`}
            aria-current={activeChapter === index ? "step" : undefined}
            onClick={() => goToChapter(index)}
          >
            <span className="chapter-dot" />
            <span className="chapter-dot-label">{chapter.label}</span>
          </button>
        ))}
      </nav>
      <div
        className="method-chapter-scroll"
        ref={scrollRef}
        onScroll={() => {
          const container = scrollRef.current;
          if (!container) return;
          setActiveChapter(
            Math.min(
              chapters.length - 1,
              Math.round(container.scrollTop / container.clientHeight),
            ),
          );
        }}
      >
        <section
          id="model-bridge"
          className="method-chapter method-animation-chapter"
          aria-labelledby="bridge-chapter-title"
          ref={(node) => {
            sectionRefs.current[0] = node;
          }}
        >
          <header className="method-chapter-heading">
            <div>
              <span className="eyebrow">01 / MODELS & VALIDATION</span>
              <h1 id="bridge-chapter-title">Watch the bridge work.</h1>
            </div>
            <button className="text-button" onClick={onSources}>
              Data & sources <ArrowUpRight size={16} />
            </button>
          </header>
          <div className="method-animation-body">
            <CalibrationDemo cases={manifest.cases} />
          </div>
          <button
            className="method-next-chapter"
            onClick={() => goToChapter(1)}
          >
            See the withheld-year results <ArrowDown size={14} />
          </button>
        </section>

        <section
          id="model-scores"
          className="method-chapter"
          aria-labelledby="scores-chapter-title"
          ref={(node) => {
            sectionRefs.current[1] = node;
          }}
        >
          <header className="method-chapter-heading">
            <div>
              <span className="eyebrow">02 / MONTHLY VALIDATION</span>
              <h2 id="scores-chapter-title">The years the models never saw.</h2>
            </div>
            <span className="method-unit">
              Mean absolute error · detections / month
            </span>
          </header>
          {monthly ? (
            <>
              <div className="chapter-metrics">
                <div>
                  <strong>{integer(monthly.trainingMonths)}</strong>
                  <span>withheld month predictions</span>
                </div>
                <div>
                  <strong>{monthly.years.length}</strong>
                  <span>complete year holdouts</span>
                </div>
                <div>
                  <strong>
                    {number(monthly.seconds)}
                    <small> s</small>
                  </strong>
                  <span>training + evaluation · CPU</span>
                </div>
              </div>
              <div className="chapter-scorecard">
                <table>
                  <caption>
                    Lower error is better. All three columns use the same
                    withheld months.
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Landscape</th>
                      <th scope="col">Months</th>
                      <th scope="col" className="score-modis">
                        Original MODIS
                      </th>
                      <th scope="col" className="score-scaling">
                        Seasonal scaling
                      </th>
                      <th scope="col">LightGBM</th>
                    </tr>
                  </thead>
                  <tbody>
                    {manifest.cases.map((study) => {
                      const result = monthly.cases[study.id];
                      if (!result) return null;
                      return (
                        <tr key={study.id}>
                          <th scope="row">
                            {study.name}
                            {result.overlapYears === 1 && <sup>*</sup>}
                          </th>
                          <td>{result.scores["Seasonal scaling"].n}</td>
                          <td className="score-modis">
                            {number(
                              result.scores["Seasonal scaling"].baselineMae,
                            )}
                          </td>
                          <td className="score-scaling">
                            {number(result.scores["Seasonal scaling"].mae)}
                          </td>
                          <td>{number(result.scores.LightGBM.mae)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr>
                      <th scope="row">All evaluated months</th>
                      <td>{integer(monthly.trainingMonths)}</td>
                      <td className="score-modis">
                        {number(monthly.models[0]?.baselineMae)}
                      </td>
                      <td className="score-scaling">
                        {number(
                          monthly.models.find(
                            (model) => model.name === "Seasonal scaling",
                          )?.mae,
                        )}
                      </td>
                      <td>
                        {number(
                          monthly.models.find(
                            (model) => model.name === "LightGBM",
                          )?.mae,
                        )}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              <p className="chapter-science-note">
                * Gran Chaco and Northern Pantanal have one overlap year:
                withholding that year also withholds the whole region. Counts
                are not normalized for clouds or satellite sampling.
              </p>
            </>
          ) : (
            <div className="chapter-empty">
              {failed
                ? "Monthly validation could not be loaded."
                : "Loading withheld-year results…"}
            </div>
          )}
        </section>

        <section
          id="model-protocol"
          className="method-chapter"
          aria-labelledby="protocol-chapter-title"
          ref={(node) => {
            sectionRefs.current[2] = node;
          }}
        >
          <header className="method-chapter-heading">
            <div>
              <span className="eyebrow">03 / MODELS & TRAINING</span>
              <h2 id="protocol-chapter-title">
                Two approaches. One honest test.
              </h2>
            </div>
            <button className="text-button" onClick={onSources}>
              Inspect provenance <ArrowUpRight size={16} />
            </button>
          </header>
          <div className="chapter-model-cards">
            <article>
              <span className="chapter-model-role">TRANSPARENT DEFAULT</span>
              <h3>Seasonal scaling</h3>
              <p>
                Adjust the MODIS count using the relationship learned for the
                region and season.
              </p>
              <dl>
                <div>
                  <dt>Inputs</dt>
                  <dd>MODIS count · month · region</dd>
                </div>
                <div>
                  <dt>Output</dt>
                  <dd>Estimated monthly VIIRS count</dd>
                </div>
              </dl>
            </article>
            <article>
              <span className="chapter-model-role">NONLINEAR CANDIDATE</span>
              <h3>LightGBM</h3>
              <p>
                Learn nonlinear relationships between the older sensor, season
                and location.
              </p>
              <dl>
                <div>
                  <dt>Inputs</dt>
                  <dd>MODIS count · month · location</dd>
                </div>
                <div>
                  <dt>Output</dt>
                  <dd>Estimated monthly VIIRS count</dd>
                </div>
              </dl>
            </article>
          </div>
          <ol className="chapter-protocol-steps">
            <li>
              <span>01</span>
              <div>
                <h3>Hold out a year</h3>
                <p>Hide every region’s observations for one complete year.</p>
              </div>
            </li>
            <li>
              <span>02</span>
              <div>
                <h3>Train on the rest</h3>
                <p>
                  Fit both approaches with parameters fixed before evaluation.
                </p>
              </div>
            </li>
            <li>
              <span>03</span>
              <div>
                <h3>Reveal & measure</h3>
                <p>
                  Compare predictions with the hidden VIIRS counts. Repeat for
                  every year.
                </p>
              </div>
            </li>
          </ol>
          <div className="chapter-protocol-notes">
            <div>
              <h3>2013 onward</h3>
              <p>
                Each calendar prediction excludes its own year from training.
                The partial VIIRS year 2012 is excluded from fitting and
                scoring.
              </p>
            </div>
            <div>
              <h3>Before the overlap</h3>
              <p>
                Historical estimates use the full overlap fit and assume the
                sensor relationship transfers backward. They estimate counts,
                not fire coordinates.
              </p>
            </div>
          </div>
          <p className="chapter-science-note">
            A source month with no detections is not a verified clear-sky
            no-fire observation.
          </p>
        </section>

        <section
          id="model-passes"
          className="method-chapter"
          aria-labelledby="passes-chapter-title"
          ref={(node) => {
            sectionRefs.current[3] = node;
          }}
        >
          <header className="method-chapter-heading">
            <div>
              <span className="eyebrow">04 / MATCHED SATELLITE PASSES</span>
              <h2 id="passes-chapter-title">
                Same place. Almost the same moment.
              </h2>
            </div>
            <span className="method-unit">
              A separate experiment · {integer(report?.totalRows ?? 0)} eligible
              cells
            </span>
          </header>
          <div className="chapter-pass-grid">
            {report ? (
              <Benchmark report={report} />
            ) : (
              <div className="chapter-empty">
                Matched-pass results are unavailable.
              </div>
            )}
            {coverage ? (
              <CoverageAudit coverage={coverage} manifest={manifest} />
            ) : (
              <div className="chapter-empty">
                Coverage audit is unavailable.
              </div>
            )}
          </div>
          <p className="chapter-science-note">
            Selected daytime passes establish feasibility across{" "}
            {report?.independentRegions ?? "the sampled"} regions. These scores
            measure hotspot pixels per paired pass, not monthly historical or
            global accuracy.
          </p>
        </section>
      </div>
    </motion.div>
  );
}

function Benchmark({ report }: { report: ModelReport }) {
  const [scope, setScope] = useState("macro");
  const regions = report.models[0]?.folds?.map((fold) => fold.region) ?? [];
  const rows = report.models.map((model) => ({
    ...model,
    score:
      scope === "macro"
        ? model
        : scope === "time"
          ? model.chronological
          : model.folds?.find((fold) => fold.region === scope),
  }));
  const max = Math.max(1, ...rows.map((model) => model.score?.mae ?? 0));
  const best = [...rows]
    .filter((model) => model.score?.mae !== undefined)
    .sort((a, b) => a.score!.mae! - b.score!.mae!)[0];
  return (
    <section
      className="chapter-pass-benchmark"
      aria-label="Measured exploratory model results"
    >
      <div className="chapter-panel-heading">
        <h3>Withheld-pass performance</h3>
        <span>Lower error is better</span>
      </div>
      <select
        aria-label="Benchmark holdout"
        value={scope}
        onChange={(event) => setScope(event.target.value)}
      >
        <option value="macro">Mean of region holdouts</option>
        {regions.map((region) => (
          <option value={region} key={region}>
            Withheld:{" "}
            {region === "evia" ? "Evia" : region === "evros" ? "Evros" : region}
          </option>
        ))}
        <option value="time">Later-time sample</option>
      </select>
      <p className="pass-unit">Hotspot pixels / 0.25° cell / paired pass</p>
      <div
        className="pass-table"
        role="table"
        aria-label="Matched-pass error and bias"
      >
        <div className="pass-result-head" role="row">
          <span role="columnheader">Approach</span>
          <span role="columnheader">Abs. error</span>
          <span role="columnheader">Bias</span>
        </div>
        {rows.map((model) => (
          <div
            className={`pass-result-row ${model.name === best?.name ? "best" : ""}`}
            role="row"
            key={model.name}
          >
            <span role="cell">
              {model.name}
              <i className="pass-error-track">
                <i
                  style={{ width: `${((model.score?.mae ?? 0) / max) * 100}%` }}
                />
              </i>
            </span>
            <strong role="cell">{model.score?.mae?.toFixed(2) ?? "—"}</strong>
            <span role="cell">
              {model.score?.bias === undefined
                ? "—"
                : `${model.score.bias > 0 ? "+" : ""}${model.score.bias.toFixed(2)}`}
            </span>
          </div>
        ))}
      </div>
      <p className="pass-result-note">
        <strong>{best?.name ?? "No candidate"}</strong> has the lowest error in
        this sample.{" "}
        {scope === "time"
          ? "Train on earlier passes; evaluate 2023 Evros."
          : "Entire regions withheld; identical eligible rows for all candidates."}
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
  const [pairId, setPairId] = useState(
    coverage.pairs.find(
      (pair) => pair.region === "evros" && pair.date.startsWith("2023"),
    )?.id ??
      coverage.pairs[0]?.id ??
      "",
  );
  const pair =
    coverage.pairs.find((candidate) => candidate.id === pairId) ??
    coverage.pairs[0];
  return (
    <section
      className="chapter-pass-coverage"
      aria-label="Satellite coverage audit"
    >
      <div className="chapter-panel-heading">
        <h3>What was observable?</h3>
        <span>{coverage.pairs.length} candidate pairs</span>
      </div>
      <select
        aria-label="Coverage satellite pair"
        value={pair?.id ?? ""}
        onChange={(event) => setPairId(event.target.value)}
      >
        {coverage.pairs.map((candidate) => (
          <option key={candidate.id} value={candidate.id}>
            {manifest.cases.find((study) => study.id === candidate.region)
              ?.name ?? candidate.region}{" "}
            · {candidate.date}
          </option>
        ))}
      </select>
      {pair && (
        <dl className="pass-coverage-stats">
          <div>
            <dt>Common usable area</dt>
            <dd>
              {pair.commonFractionAOI === undefined
                ? "—"
                : `${(pair.commonFractionAOI * 100).toFixed(1)}%`}
            </dd>
          </div>
          <div>
            <dt>Eligible cells</dt>
            <dd>
              {pair.eligibleCells ?? 0}
              <small> / {pair.requestedCells ?? "—"}</small>
            </dd>
          </div>
          <div>
            <dt>Median scan gap</dt>
            <dd>
              {pair.medianPassGapSeconds == null
                ? "No match"
                : `${pair.medianPassGapSeconds.toFixed(1)} s`}
            </dd>
          </div>
        </dl>
      )}
      {pair?.error && <p className="pass-audit-error">{pair.error}</p>}
      <div className="pass-eligibility">
        <h4>Pair eligibility</h4>
        <p>
          Daytime land · usable fire masks · viewing angle &lt; 65° · scan times
          within 5 minutes.
        </p>
      </div>
      <p className="pass-result-note">
        Area uses the full case rectangle, including water. Land-cell
        eligibility uses approximate nearest-pixel coverage; the audit retains a
        tighter-distance check.
      </p>
      <a
        className="pass-audit-link"
        href="/data/coverage.json"
        target="_blank"
        rel="noreferrer"
      >
        Complete coverage audit <ArrowUpRight size={14} />
      </a>
    </section>
  );
}

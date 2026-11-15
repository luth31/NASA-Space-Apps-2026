import {
  ArrowUpRight,
  Check,
  ChevronRight,
  FlaskConical,
  ShieldCheck,
} from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import type { CoverageReport, Manifest, ModelReport } from "./data";
import { integer, number } from "./data";

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
  return (
    <motion.div
      className="methods-view"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="page-heading">
        <div>
          <span className="eyebrow">METHODS & VALIDATION</span>
          <h1>
            Evidence before estimates<span>.</span>
          </h1>
          <p>
            One reference sensor. Multiple approaches. Results that have to earn
            their place.
          </p>
        </div>
        <button className="text-button" onClick={onSources}>
          Data provenance <ArrowUpRight size={16} />
        </button>
      </div>
      <div className="method-summary">
        <div className="method-statement">
          <FlaskConical size={24} />
          <span className="eyebrow">CURRENT RELEASE STATUS</span>
          <h2>
            {manifest.validationStatus === "validated"
              ? "Validated for the published scope."
              : "Three models trained.\nMonthly transfer unverified."}
          </h2>
          <p>
            {report?.limitation ??
              "The calibrated calendar requires verified common usable coverage from the original fire masks. Observations remain available to investigate."}
          </p>
        </div>
        <div className="method-numbers">
          <div>
            <span className="mono">SAMPLED CELL-PASSES</span>
            <strong>{report ? integer(report.totalRows) : "—"}</strong>
            <small>{report ? "Coverage-eligible 0.25° cells and paired passes" : "Coverage preparation pending"}</small>
          </div>
          <div>
            <span className="mono">TRAINING & EVALUATION</span>
            <strong>
              {report ? number(report.seconds) : "—"}
              <em>s</em>
            </strong>
            <small>Pinned feasibility run · CPU</small>
          </div>
          <div>
            <span className="mono">RELEASED ACCURACY CLAIM</span>
            <strong className="no-score">
              {manifest.validationStatus === "validated"
                ? "See scorecard"
                : "Not yet established"}
            </strong>
            <small>
              Exploratory fitting does not certify historical estimates.
            </small>
          </div>
        </div>
      </div>
      <div className="section-heading">
        <h2>Five ways to bridge the record</h2>
        <span className="mono">MAIN + FALLBACK + BASELINE + 2 EXPERIMENTS</span>
      </div>
      <div className="model-table">
        <div className="model-table-head">
          <span>APPROACH</span>
          <span>ROLE</span>
          <span>STATE</span>
          <span>FIT TIME</span>
        </div>
        {[
          {
            name: "LightGBM",
            role: "Main candidate",
            desc: "Nonlinear count regression · Poisson objective",
            key: "LightGBM",
          },
          {
            name: "Negative binomial",
            role: "Fallback candidate",
            desc: "Regularized count regression · exposure when verified",
            key: "Negative binomial",
          },
          {
            name: "Seasonal scaling",
            role: "Transparent baseline",
            desc: "Seasonal ratio shrunk toward a pooled reference",
            key: "Seasonal scaling",
          },
          {
            name: "Two-part count model",
            role: "Experiment",
            desc: "Separate occurrence probability and positive count",
            key: "Hurdle",
          },
          {
            name: "Active-cell days",
            role: "Experiment",
            desc: "A coarser measure with a distinct unit",
            key: "Active-cell days",
          },
        ].map((m, i) => {
          const r = report?.models.find((r) => r.name === m.key);
          return (
            <div className="model-table-row" key={m.name}>
              <div>
                <span className="model-index mono">0{i + 1}</span>
                <span>
                  <strong>{m.name}</strong>
                  <small>{m.desc}</small>
                </span>
              </div>
              <span>{m.role}</span>
              <span className={r ? "model-status" : "muted"}>
                {r ? (
                  <>
                    <Check size={13} />
                    Fitted · exploratory
                  </>
                ) : (
                  "Planned"
                )}
              </span>
              <span className="mono">
                {r?.seconds !== undefined ? `${r.seconds.toFixed(3)} s` : "—"}
              </span>
            </div>
          );
        })}
      </div>
      {report && <Benchmark report={report} />}
      {coverage && <CoverageAudit coverage={coverage} manifest={manifest} />}
      <div className="validation-bottom">
        <div>
          <span className="eyebrow">THE VALIDATION DESIGN</span>
          <h2>
            Leave places out.
            <br />
            Then leave time out.
          </h2>
          <p>
            Hold out entire geographic regions, keep fire episodes together, and
            reserve a later chronological block. Every candidate sees the same
            eligible observations. The current feasibility sample covers Evia
            and Evros. A monthly release needs an independently validated
            observation-effort conversion and a new locked holdout.
          </p>
          <div className="folds" aria-label="Current geographic holdout folds">
            {(
              report?.models[0]?.folds?.map((f) => f.region.toUpperCase()) ?? []
            ).map((r, i, regions) => (
              <div key={r}>
                <span className="mono">{r}</span>
                {regions.map((_, j) => (
                  <i key={j} className={i === j ? "held-out" : ""} />
                ))}
              </div>
            ))}
          </div>
          <div className="fold-legend">
            <i />
            Training regions <i className="held-out" />
            Withheld region
          </div>
        </div>
        <div className="release-gates">
          <span className="eyebrow">PUBLISHING GATES</span>
          {[
            {
              done: true,
              title: "Traceable source observations",
              body: "Timestamped NASA records, processing versions, file checksums and dated scene assets.",
            },
            {
              done: !!report,
              title: "Reproducible candidate fitting",
              body: "Main, fallback and baseline saved independently of the dashboard.",
            },
            {
              done: !!coverage,
              title: "Sampled-pass coverage audit",
              body: "Fire masks and acquisition times checked for the declared passes. Monthly observing effort remains unverified.",
            },
            {
              done: manifest.validationStatus === "validated",
              title: "Independent monthly validation",
              body: "Coverage, absolute error, bias and interval performance must pass the frozen release criteria.",
            },
          ].map((g) => (
            <div className="gate" key={g.title}>
              <span className={g.done ? "done" : ""}>
                {g.done ? <Check size={14} /> : <ChevronRight size={14} />}
              </span>
              <div>
                <strong>{g.title}</strong>
                <p>{g.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="evidence-strip">
        <ShieldCheck size={23} />
        <p>
          VIIRS-equivalent counts describe the reference sensor’s detections.
          They do not reconstruct missing ignition locations or establish every
          fire on the ground.
        </p>
      </div>
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
          {integer(report.totalRows)} ELIGIBLE CELL-PASSES ·{" "}
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

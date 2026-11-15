import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { number } from "./data";

export type Prediction = {
  model: string;
  holdout: "region" | "time";
  region: string;
  pair: string;
  cell: number;
  observed: number;
  predicted: number;
};

export function bridgeExamples(
  data: Prediction[],
  region: string,
  model: string,
) {
  const control = new Map(
    data
      .filter(
        (r) =>
          r.holdout === "region" &&
          r.region === region &&
          r.model === "Unchanged MODIS rate",
      )
      .map((r) => [`${r.pair}:${r.cell}`, r]),
  );
  return data
    .filter(
      (r) => r.holdout === "region" && r.region === region && r.model === model,
    )
    .flatMap((row) => {
      const before = control.get(`${row.pair}:${row.cell}`);
      return before && before.observed === row.observed
        ? [{ ...row, before: before.predicted }]
        : [];
    })
    .sort(
      (a, b) =>
        b.observed - a.observed ||
        a.pair.localeCompare(b.pair) ||
        a.cell - b.cell,
    );
}

export default function BridgeExperiment({
  initialRegion = "evros",
  onRegion,
}: {
  initialRegion?: string;
  onRegion?: (region: string) => void;
}) {
  const [data, setData] = useState<Prediction[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [region, setRegion] = useState(
    initialRegion === "evia" ? "evia" : "evros",
  );
  const [model, setModel] = useState("Seasonal scaling");
  const [key, setKey] = useState("");
  const reduced = useReducedMotion();
  useEffect(() => {
    const controller = new AbortController();
    fetch("/data/held-out-predictions.json", { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw Error();
        return r.json();
      })
      .then(setData)
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true);
      });
    return () => controller.abort();
  }, []);
  const rows = useMemo(
    () => bridgeExamples(data ?? [], region, model),
    [data, region, model],
  );
  const chosen = rows.find((r) => `${r.pair}:${r.cell}` === key) ?? rows[0];
  // Keep the axis fixed when switching models or individual examples.
  const max = useMemo(
    () =>
      Math.max(
        1,
        ...(data
          ?.filter((r) => r.holdout === "region")
          .flatMap((r) => [r.predicted, r.observed]) ?? []),
      ),
    [data],
  );
  const beforeError = chosen ? Math.abs(chosen.before - chosen.observed) : 0;
  const afterError = chosen ? Math.abs(chosen.predicted - chosen.observed) : 0;
  return (
    <section
      className="bridge-experiment"
      aria-label="MODIS to VIIRS model experiment"
    >
      <header>
        <span className="eyebrow">THE MODEL CHANGE · HELD-OUT DATA</span>
        <h2>From MODIS to a VIIRS-scale estimate.</h2>
        <p>
          Choose a place, a model, and a cell-pass. Compare the estimate with
          the VIIRS reading the model never saw.
        </p>
      </header>
      <div className="bridge-controls">
        <label>
          Test location
          <select
            aria-label="Bridge test location"
            value={region}
            onChange={(e) => {
              setRegion(e.target.value);
              setKey("");
              onRegion?.(e.target.value);
            }}
          >
            <option value="evros">Evros · Greece</option>
            <option value="evia">Evia · Greece</option>
          </select>
        </label>
        <label>
          Calibration
          <select
            aria-label="Bridge calibration model"
            value={model}
            onChange={(e) => setModel(e.target.value)}
          >
            {["Seasonal scaling", "Negative binomial", "LightGBM"].map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </label>
      </div>
      {chosen ? (
        <>
          <label className="bridge-example-picker">
            Explore all {rows.length} eligible cell-passes
            <select
              aria-label="Bridge cell-pass example"
              value={`${chosen.pair}:${chosen.cell}`}
              onChange={(e) => setKey(e.target.value)}
            >
              {rows.map((r) => (
                <option
                  key={`${r.pair}:${r.cell}`}
                  value={`${r.pair}:${r.cell}`}
                >
                  {r.observed === 0
                    ? "Zero VIIRS count"
                    : `${r.observed} VIIRS pixels`}{" "}
                  · {r.pair.replace(`${region}-`, "")} · cell {r.cell}
                </option>
              ))}
            </select>
          </label>
          <div className="bridge-values" aria-live="polite">
            {[
              {
                label: "01 · Before calibration",
                value: chosen.before,
                name: "MODIS count, matched area",
                kind: "modis",
              },
              {
                label: "02 · After calibration",
                value: chosen.predicted,
                name: "Estimated VIIRS count",
                kind: "estimate",
              },
              {
                label: "03 · The withheld reading",
                value: chosen.observed,
                name: "Actually observed VIIRS",
                kind: "viirs",
              },
            ].map((item) => (
              <div key={item.kind} className={`bridge-value ${item.kind}`}>
                <span>{item.label}</span>
                <strong>{number(item.value)}</strong>
                <span>{item.name}</span>
                <div className="bridge-bar">
                  <motion.i
                    initial={false}
                    animate={{ width: `${(item.value / max) * 100}%` }}
                    transition={{ duration: reduced ? 0 : 0.7 }}
                  />
                </div>
              </div>
            ))}
          </div>
          <p className="bridge-outcome" aria-live="polite">
            Absolute error:{" "}
            <strong>
              {number(beforeError)} → {number(afterError)} pixels.
            </strong>{" "}
            {afterError < beforeError
              ? "Closer to VIIRS for this example."
              : afterError > beforeError
                ? "This calibration overshoots or misses: the unchanged rate was closer here."
                : "The calibration makes no difference to the error here."}
          </p>
          <p className="bridge-scope">
            Trained on {region === "evros" ? "Evia" : "Evros"}, tested on{" "}
            {region === "evros" ? "Evros" : "Evia"}. One 0.25° cell and paired
            pass. All three counts use the same common usable area; the MODIS
            control is its unchanged rate multiplied by that area.
          </p>
        </>
      ) : (
        <p role="status">
          {failed
            ? "Saved experiment unavailable. Reload to retry."
            : "Loading saved predictions…"}
        </p>
      )}
      <footer>
        Calibration changes the estimated count, not the pixel locations. This
        is an exploratory test; monthly historical upgrades remain unreleased.
      </footer>
    </section>
  );
}

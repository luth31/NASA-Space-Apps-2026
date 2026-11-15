import { useEffect, useMemo, useState } from "react";
import { number } from "./data";

type Prediction = {
  model: string;
  holdout: "region" | "time";
  region: string;
  pair: string;
  cell: number;
  observed: number;
  predicted: number;
};

export default function HoldoutLab() {
  const [data, setData] = useState<Prediction[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [region, setRegion] = useState("evros");
  const [model, setModel] = useState("Seasonal scaling");
  const [selected, setSelected] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/data/held-out-predictions.json", { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw Error("Prediction artifact unavailable");
        return r.json();
      })
      .then(setData)
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true);
      });
    return () => controller.abort();
  }, []);
  const rows = useMemo(
    () =>
      data?.filter(
        (r) =>
          r.holdout === "region" && r.region === region && r.model === model,
      ) ?? [],
    [data, region, model],
  );
  // A shared scale makes model switching comparable; retain all zero rows.
  const max = useMemo(
    () =>
      Math.max(
        1,
        ...(data
          ?.filter((r) => r.holdout === "region")
          .flatMap((r) => [r.observed, r.predicted]) ?? []),
      ),
    [data],
  );
  const chosen = rows[Math.min(selected, rows.length - 1)];
  const mae = rows.length
    ? rows.reduce((sum, r) => sum + Math.abs(r.predicted - r.observed), 0) /
      rows.length
    : null;
  const positive = rows.filter((row) => row.observed > 0);
  const positiveMae = positive.length
    ? positive.reduce(
        (sum, row) => sum + Math.abs(row.predicted - row.observed),
        0,
      ) / positive.length
    : null;
  return (
    <section
      className="holdout-lab"
      aria-label="Inspect held-out model predictions"
    >
      <header>
        <div>
          <span className="eyebrow">THE EXPERIMENT, OPEN TO INSPECTION</span>
          <h2>What did the model actually predict?</h2>
        </div>
        <a href="/data/held-out-predictions.json" download>
          Download predictions ↗
        </a>
      </header>
      <div className="holdout-controls">
        <label>
          Withheld region
          <select
            aria-label="Experiment withheld region"
            value={region}
            onChange={(e) => {
              setRegion(e.target.value);
              setSelected(0);
            }}
          >
            <option value="evros">Evros</option>
            <option value="evia">Evia</option>
          </select>
        </label>
        <label>
          Approach
          <select
            aria-label="Experiment model"
            value={model}
            onChange={(e) => setModel(e.target.value)}
          >
            {[
              "Unchanged MODIS rate",
              "Seasonal scaling",
              "Negative binomial",
              "LightGBM",
            ].map((name) => (
              <option key={name}>{name}</option>
            ))}
          </select>
        </label>
        <p>
          Trained on <strong>{region === "evros" ? "Evia" : "Evros"}</strong>.
          <br />
          Tested on <strong>{region === "evros" ? "Evros" : "Evia"}</strong>.
        </p>
      </div>
      {data ? (
        <>
          <div className="holdout-legend">
            <span>
              <i />
              Observed VIIRS
            </span>
            <span>
              <i />
              Model estimate
            </span>
            <span>Shared scale: 0–{Math.ceil(max)} pixels</span>
          </div>
          <div className="holdout-chart-scroll">
            <div
              className="holdout-chart"
              role="group"
              aria-label="All eligible cell-pass predictions"
            >
              {rows.map((row, index) => (
                <button
                  key={`${row.pair}:${row.cell}`}
                  className={index === selected ? "selected" : ""}
                  onClick={() => setSelected(index)}
                  onFocus={() => setSelected(index)}
                  aria-pressed={index === selected}
                  aria-label={`${row.pair}, cell ${row.cell}: observed ${row.observed}, estimated ${row.predicted.toFixed(2)} pixels`}
                >
                  <span
                    className="holdout-bar"
                    style={{ height: `${(row.observed / max) * 100}%` }}
                  />
                  <span
                    className="holdout-bar prediction"
                    style={{ height: `${(row.predicted / max) * 100}%` }}
                  />
                  <small>{index + 1}</small>
                </button>
              ))}
            </div>
          </div>
          {chosen && (
            <div className="holdout-reading" aria-live="polite">
              <span>
                {chosen.pair} · cell {chosen.cell}
              </span>
              <div>
                <span>
                  VIIRS observed<strong>{chosen.observed}</strong>
                </span>
                <span>
                  Model estimate<strong>{number(chosen.predicted)}</strong>
                </span>
                <span>
                  Absolute error
                  <strong>
                    {number(Math.abs(chosen.predicted - chosen.observed))}
                  </strong>
                </span>
              </div>
            </div>
          )}
          <p className="holdout-scope">
            <strong>{rows.length} eligible cell-passes</strong> ·{" "}
            {rows.filter((r) => r.observed === 0).length} zero target counts ·
            regional MAE <strong>{mae?.toFixed(2)}</strong>. MAE on the{" "}
            {positive.length} nonzero target rows:{" "}
            <strong>{positiveMae?.toFixed(2) ?? "—"}</strong>. Every bar
            represents a 0.25° cell and paired satellite pass, not a whole
            incident or month. Select a bar or use Tab to inspect it.
          </p>
        </>
      ) : (
        <p role="status">
          {failed
            ? "The saved prediction artifact could not be loaded. Reload to retry."
            : "Loading the saved held-out predictions…"}
        </p>
      )}
      <p className="mission-note">
        These predictions come from the regional holdout fits, not the final
        model trained on all rows. Target common usable area is supplied when
        scoring paired counts. Historical inference still needs independent
        reference observing effort and a broader, locked evaluation sample.
      </p>
    </section>
  );
}

import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import type { CaseStudy, Observation } from "./data";
import {
  coordinates,
  dateLabel,
  integer,
  loadObservations,
  number,
  timeLabel,
  within,
} from "./data";
import FireMeshCaseMap from "./FireMeshCaseMap";
import "./fire-mesh/experience/investigation.css";

/** Mount the original SVG resolution lens without changing the main MapLibre map. */
export default function FireMeshInvestigation({
  cases,
  onCase,
}: {
  cases: CaseStudy[];
  onCase: (study: CaseStudy) => void;
}) {
  const [caseId, setCaseId] = useState(cases[0]?.id ?? "");
  const study = cases.find((c) => c.id === caseId) ?? cases[0];
  const [month, setMonth] = useState(study?.date.slice(0, 7) ?? "");
  const [sensor, setSensor] = useState("all");
  const [compare, setCompare] = useState(true);
  const [rows, setRows] = useState<Observation[]>([]);
  const [selected, setSelected] = useState<Observation | null>(null);
  const [status, setStatus] = useState(
    "Loading original satellite detections…",
  );
  const [retry, setRetry] = useState(0);
  const [limit, setLimit] = useState(25);

  useEffect(() => {
    if (!study) return;
    let active = true;
    setRows([]);
    setSelected(null);
    setLimit(25);
    const counts = study.months.find((m) => m.month === month);
    if (!counts || (counts.modis === null && counts.viirs === null)) {
      setStatus("Source unavailable for this month");
      return;
    }
    if ((counts.modis ?? 0) + (counts.viirs ?? 0) === 0) {
      setStatus("");
      return;
    }
    setStatus("Loading original satellite detections…");
    loadObservations(`/data/observations/${study.id}/${month}.json`)
      .then((data) => {
        if (!active) return;
        setRows(data.filter((o) => within(o, study.bbox)));
        setStatus("");
      })
      .catch(() => {
        if (active)
          setStatus("Satellite detections could not load. Retry below.");
      });
    return () => {
      active = false;
    };
  }, [study, month, retry]);

  const observations = useMemo(
    () => rows.filter((o) => sensor === "all" || o.sensor === sensor),
    [rows, sensor],
  );
  const sorted = useMemo(
    () => [...observations].sort((a, b) => (b.frp ?? 0) - (a.frp ?? 0)),
    [observations],
  );

  if (!study) return null;
  return (
    <section
      className="fire-mesh-investigation"
      aria-labelledby="fire-mesh-title"
    >
      <div className="fire-mesh-intro">
        <div>
          <p className="eyebrow">THE FIRE-MESH RESOLUTION LENS</p>
          <h2 id="fire-mesh-title">1 km (MODIS) vs 375 m (VIIRS)</h2>
          <p>
            Two sensors, one landscape. Slide the divider to compare reference
            meshes and original satellite detections.
          </p>
        </div>
        <button className="text-button" onClick={() => onCase(study)}>
          Open full investigation <ArrowUpRight size={16} />
        </button>
      </div>
      <div className="fire-mesh-filters">
        <label>
          Investigation
          <select
            aria-label="Fire-Mesh investigation"
            value={study.id}
            onChange={(e) => {
              const next = cases.find((c) => c.id === e.target.value)!;
              setCaseId(next.id);
              setMonth(next.date.slice(0, 7));
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
          Observation month · UTC
          <select
            aria-label="Fire-Mesh observation month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          >
            {[...study.months].reverse().map((m) => (
              <option key={m.month} value={m.month}>
                {dateLabel(m.month + "-01", { month: "long", year: "numeric" })}
              </option>
            ))}
          </select>
        </label>
        <label>
          Sensor
          <select
            aria-label="Fire-Mesh sensor"
            value={sensor}
            onChange={(e) => {
              setSensor(e.target.value);
              setSelected(null);
              setLimit(25);
              setCompare(e.target.value === "all");
            }}
          >
            <option value="all">Both sensors</option>
            <option value="MODIS">Aqua MODIS · 1 km</option>
            <option value="VIIRS">S-NPP VIIRS · 375 m</option>
          </select>
        </label>
        <span className="fire-mesh-count" role="status">
          {status || `${integer(observations.length)} reported detections`}
        </span>
        {status.includes("Retry") && (
          <button
            className="text-button"
            onClick={() => setRetry((n) => n + 1)}
          >
            Retry
          </button>
        )}
      </div>
      <div className="fire-mesh-stage">
        <FireMeshCaseMap
          study={study}
          observations={observations}
          selected={selected}
          onSelect={setSelected}
          compare={compare && sensor === "all"}
          onCompare={() => {
            setSensor("all");
            setCompare((value) => !value);
          }}
          period={month}
          reset={0}
          wide={false}
          sensor={sensor}
          recordStatus={status || undefined}
        />
      </div>
      <div className="fire-mesh-records">
        <details>
          <summary>
            Inspect original records · {integer(observations.length)} detections
          </summary>
          <p>
            Choose a record to locate it on the mesh. FRP is reported radiative
            power; detections are not a count of individual fires.
          </p>
          <div className="fire-mesh-record-scroll">
            <table>
              <thead>
                <tr>
                  <th>Sensor / UTC time</th>
                  <th>Coordinates</th>
                  <th>FRP</th>
                  <th>Reported footprint</th>
                </tr>
              </thead>
              <tbody>
                {sorted.slice(0, limit).map((o) => (
                  <tr
                    key={o.id}
                    className={selected?.id === o.id ? "selected" : ""}
                  >
                    <td>
                      <button
                        onClick={() => setSelected(o)}
                        aria-pressed={selected?.id === o.id}
                      >
                        {o.sensor} · {dateLabel(o.time)} · {timeLabel(o.time)}
                      </button>
                    </td>
                    <td>{coordinates(o.lon, o.lat)}</td>
                    <td>{number(o.frp)} MW</td>
                    <td>
                      {number(o.scan)} × {number(o.track)} km
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {limit < observations.length && (
            <button
              className="text-button"
              onClick={() => setLimit((n) => n + 50)}
            >
              Show 50 more records
            </button>
          )}
        </details>
        {selected && (
          <p className="fire-mesh-selected" role="status">
            <strong>
              {selected.sensor} · {dateLabel(selected.time)} ·{" "}
              {timeLabel(selected.time)}
            </strong>
            <br />
            {coordinates(selected.lon, selected.lat)} · {number(selected.frp)}{" "}
            MW · reported footprint {number(selected.scan)} ×{" "}
            {number(selected.track)} km
          </p>
        )}
      </div>
      <p className="fire-mesh-caveat">
        The mesh shows nominal nadir resolution, not actual scan footprints,
        burned area or fire boundaries. Pass times differ. Flame size and motion
        do not encode severity.
      </p>
    </section>
  );
}

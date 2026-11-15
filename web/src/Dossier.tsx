import { useEffect, useState } from "react";
import {
  ArrowDownToLine,
  ArrowUpRight,
  ChevronRight,
  Crosshair,
  Info,
  X,
} from "lucide-react";
import type { CaseStudy, Observation } from "./data";
import {
  coordinates,
  dateLabel,
  number,
  sensorLabel,
  timeLabel,
  typeLabel,
  within,
} from "./data";

interface Props {
  study: CaseStudy | null;
  observation: Observation | null;
  observations: Observation[];
  onSelect: (o: Observation) => void;
  onClose: () => void;
  onCalendar: () => void;
  onSources: () => void;
  onExport: (format: "csv" | "pdf") => void;
  wide: boolean;
  onWide: () => void;
  countStatus?: { modis: string; viirs: string };
  recordStatus?: string;
}
export default function Dossier({
  study,
  observation: o,
  observations,
  onSelect,
  onClose,
  onCalendar,
  onSources,
  onExport,
  wide,
  onWide,
  countStatus,
  recordStatus,
}: Props) {
  const [page, setPage] = useState(0);
  useEffect(() => setPage(0), [observations, o?.id]);
  const candidates = observations.filter((x) => x.id !== o?.id);
  const nearby = candidates.slice(page * 8, page * 8 + 8);
  const counts = {
    modis: observations.filter((x) => x.sensor === "MODIS").length,
    viirs: observations.filter((x) => x.sensor !== "MODIS").length,
  };
  return (
    <aside className="dossier">
      <div className="panel-title">
        <span className="eyebrow">
          {o ? "OBSERVATION DOSSIER" : "AREA INVESTIGATION"}
        </span>
        {(o || !study) && (
          <button
            className="icon-button"
            aria-label="Close observation details"
            onClick={onClose}
          >
            <X size={16} />
          </button>
        )}
      </div>
      {o ? (
        <>
          <div className="observation-heading">
            <span
              className={`sensor-label ${o.sensor === "MODIS" ? "aqua" : "fire"}`}
            >
              <i className={`dot ${o.sensor === "MODIS" ? "aqua" : "fire"}`} />
              {sensorLabel(o.sensor)}
            </span>
            <h2>
              Thermal anomaly
              <span className="live-dot" />
            </h2>
            <p className="mono coordinates">{coordinates(o.lon, o.lat)}</p>
          </div>
          <dl className="observation-details">
            <div>
              <dt>Acquired</dt>
              <dd>
                {dateLabel(o.time)}
                <small>{timeLabel(o.time)}</small>
              </dd>
            </div>
            <div>
              <dt>Radiative power</dt>
              <dd className="frp-value">
                {number(o.frp)} <span>MW</span>
              </dd>
            </div>
            <div>
              <dt>Detection confidence</dt>
              <dd className="capitalize">
                {o.confidence}
                {o.sensor === "MODIS" ? " / 100" : ""}
              </dd>
            </div>
            <div>
              <dt>Reported footprint</dt>
              <dd>
                {o.scan} × {o.track} km
              </dd>
            </div>
            <div>
              <dt>Observation</dt>
              <dd>{o.daynight === "D" ? "Daytime" : "Nighttime"}</dd>
            </div>
            <div>
              <dt>Processing</dt>
              <dd>
                {o.version.includes("NRT")
                  ? "Near real time"
                  : "Standard archive"}
                <small>Version {o.version}</small>
              </dd>
            </div>
            <div>
              <dt>Source type</dt>
              <dd>{typeLabel(o.type)}</dd>
            </div>
          </dl>
          <p className="observation-caveat">
            <Info size={13} />
            Reported pixel center. This is not an ignition location or a fire
            perimeter.
          </p>
        </>
      ) : (
        <>
          <div className="area-heading">
            <h2>{study?.name ?? "Global snapshot"}</h2>
            <p>
              {study?.description ??
                "NOAA-20 observations, ordered by reported radiative power. Select a record to inspect its acquisition and source."}
            </p>
          </div>
          <div className="count-pair">
            {study && (
              <div>
                <span className="mono">
                  <i className="dot aqua" />
                  AQUA MODIS
                </span>
                <strong>
                  {number(countStatus?.modis ? null : counts.modis)}
                </strong>
                <small>{countStatus?.modis || "reported detections"}</small>
              </div>
            )}
            <div>
              <span className="mono">
                <i className="dot fire" />
                {study ? "S-NPP VIIRS" : "NOAA-20 VIIRS"}
              </span>
              <strong>
                {number(countStatus?.viirs ? null : counts.viirs)}
              </strong>
              <small>{countStatus?.viirs || "reported detections"}</small>
            </div>
          </div>
          <div className="coverage-line">
            <span className="status-dot" />
            Usable observation coverage unverified
          </div>
        </>
      )}
      {!study && (
        <p className="historical-unavailable">
          <Info size={14} />
          Historical comparison is unavailable at this location. The original
          observation remains available to inspect.
        </p>
      )}
      {o && study && !within(o, wide ? study.sceneBounds : study.bbox) && (
        <p className="historical-unavailable">
          The pinned observation is outside the current counting boundary.
        </p>
      )}
      {study && (
        <div className="area-control">
          <div>
            <span className="eyebrow">ANALYSIS BOUNDARY</span>
            <strong>
              {wide ? "Wider scene area" : study.name + " case area"}
            </strong>
          </div>
          <button
            className="icon-button"
            aria-label={wide ? "Use case boundary" : "Widen analysis area"}
            onClick={onWide}
          >
            <Crosshair size={17} />
          </button>
          <p>
            {wide
              ? "Counts include the full scene boundary. Historical comparisons use the case area."
              : "The dashed boundary defines the area being counted."}
          </p>
        </div>
      )}
      {study && (
        <button className="calendar-link" onClick={onCalendar}>
          <div>
            <span className="eyebrow">THE LONGER RECORD</span>
            <strong>Open fire calendar</strong>
            <small>
              {study.years[0]}–{study.years.at(-1)} · monthly observations
            </small>
          </div>
          <ArrowUpRight size={22} />
        </button>
      )}
      <div className="nearby-heading">
        <h3>{o ? "Other observations by distance" : "In this selection"}</h3>
        <span className="mono">
          {number(recordStatus ? null : candidates.length)}
        </span>
      </div>
      <div className="observation-list">
        {nearby.length ? (
          nearby.map((x) => (
            <button
              className={`observation-row ${x.id === o?.id ? "selected" : ""}`}
              key={x.id}
              onClick={() => onSelect(x)}
            >
              <i className={`dot ${x.sensor === "MODIS" ? "aqua" : "fire"}`} />
              <span>
                <strong>
                  {x.lat.toFixed(3)}°, {x.lon.toFixed(3)}°
                </strong>
                <small>
                  {dateLabel(x.time, { day: "numeric", month: "short" })} ·{" "}
                  {timeLabel(x.time)} ·{" "}
                  {x.sensor === "MODIS" ? "MODIS" : "VIIRS"}
                </small>
              </span>
              <span className="row-frp">
                {number(x.frp)}
                <small>MW</small>
              </span>
              <ChevronRight size={13} />
            </button>
          ))
        ) : (
          <p className="empty-copy">
            {recordStatus ||
              "No detections reported in this selection. Usable coverage is unknown."}
          </p>
        )}
      </div>
      {candidates.length > 8 && (
        <div className="list-pagination">
          <button
            aria-label="Previous observations"
            disabled={page === 0}
            onClick={() => setPage((p) => p - 1)}
          >
            ← Previous
          </button>
          <span className="mono">
            {page * 8 + 1}–{Math.min(page * 8 + 8, candidates.length)} /{" "}
            {number(candidates.length)}
          </span>
          <button
            aria-label="Next observations"
            disabled={(page + 1) * 8 >= candidates.length}
            onClick={() => setPage((p) => p + 1)}
          >
            Next →
          </button>
        </div>
      )}
      {study && (
        <div className="related-context">
          <h3>Featured-event reading</h3>
          <p className="empty-copy">
            Curated context for {study.date}. These links do not track the
            selected month or identify individual detections.
          </p>
          {study.context.map((c) => (
            <a key={c.url} href={c.url} target="_blank" rel="noreferrer">
              <span className="mono">{c.publisher}</span>
              <strong>
                {c.title}
                <ArrowUpRight size={14} />
              </strong>
              <small>{c.relation}</small>
            </a>
          ))}
        </div>
      )}
      <div className="dossier-footer">
        <button className="text-button" onClick={onSources}>
          Data & provenance <ArrowUpRight size={13} />
        </button>
        {study?.harmonized && (
          <button className="text-button" onClick={() => onExport("pdf")}>
            <ArrowDownToLine size={13} />
            Brief
          </button>
        )}
      </div>
    </aside>
  );
}

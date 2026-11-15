import { useEffect, useId, useState } from "react";
import {
  ArrowDownToLine,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
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
  period?: string;
  onSelect: (o: Observation) => void;
  onClose: () => void;
  onCalendar: () => void;
  onSources: () => void;
  onExport: (format: "csv" | "pdf") => void;
  wide: boolean;
  onWide: () => void;
}

type InspectorTab = "overview" | "readings" | "reports";
const tabLabels: [InspectorTab, string][] = [
  ["overview", "Overview"],
  ["readings", "Readings"],
  ["reports", "Reports"],
];

export default function Dossier({
  study,
  observation: o,
  observations,
  period,
  onSelect,
  onClose,
  onCalendar,
  onSources,
  onExport,
  wide,
  onWide,
}: Props) {
  const [tab, setTab] = useState<InspectorTab>("overview");
  const [page, setPage] = useState(0);
  const tabId = useId();
  useEffect(() => setPage(0), [observations, o?.id]);
  useEffect(() => setTab("overview"), [o?.id, study?.id]);
  const candidates = observations.filter((row) => row.id !== o?.id);
  const pageSize = 5;
  const readings = candidates.slice(page * pageSize, (page + 1) * pageSize);
  const counts = {
    modis: observations.filter((row) => row.sensor === "MODIS").length,
    viirs: observations.filter((row) => row.sensor !== "MODIS").length,
  };
  const periodLabel = period
    ? dateLabel(
        period.length === 7 ? `${period}-01` : period,
        period.length === 7
          ? { month: "long", year: "numeric" }
          : { day: "numeric", month: "short", year: "numeric" },
      )
    : "Current selection";

  return (
    <aside
      className="dossier case-inspector"
      aria-label="Investigation inspector"
    >
      <header className="case-inspector-heading">
        <div>
          <span>{o ? "SELECTED DETECTION" : "CASE INVESTIGATION"}</span>
          <h2>{study?.name ?? "Global snapshot"}</h2>
          <p>{periodLabel} · UTC</p>
        </div>
        {o && (
          <button
            className="case-close-reading"
            aria-label="Close observation details"
            onClick={onClose}
          >
            <X size={17} />
          </button>
        )}
      </header>
      <div
        className="case-inspector-tabs"
        role="tablist"
        aria-label="Investigation details"
      >
        {tabLabels.map(([key, label]) => (
          <button
            key={key}
            id={`${tabId}-${key}`}
            role="tab"
            aria-selected={tab === key}
            aria-controls={`${tabId}-panel`}
            tabIndex={tab === key ? 0 : -1}
            onClick={() => setTab(key)}
            onKeyDown={(event) => {
              const index = tabLabels.findIndex(([value]) => value === key);
              const next =
                event.key === "ArrowRight"
                  ? (index + 1) % tabLabels.length
                  : event.key === "ArrowLeft"
                    ? (index + tabLabels.length - 1) % tabLabels.length
                    : event.key === "Home"
                      ? 0
                      : event.key === "End"
                        ? tabLabels.length - 1
                        : -1;
              if (next < 0) return;
              event.preventDefault();
              setTab(tabLabels[next][0]);
              document
                .getElementById(`${tabId}-${tabLabels[next][0]}`)
                ?.focus();
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <section
        className={`case-inspector-content case-panel-${tab}`}
        role="tabpanel"
        id={`${tabId}-panel`}
        aria-labelledby={`${tabId}-${tab}`}
      >
        {tab === "overview" &&
          (o ? (
            <>
              <div
                className={`case-selected-sensor ${o.sensor === "MODIS" ? "is-modis" : "is-viirs"}`}
              >
                <i />
                {sensorLabel(o.sensor)}
              </div>
              <h3 className="case-coordinates">{coordinates(o.lon, o.lat)}</h3>
              <dl className="case-reading-facts">
                <div>
                  <dt>Observed</dt>
                  <dd>
                    {dateLabel(o.time, { day: "numeric", month: "short" })} ·{" "}
                    {timeLabel(o.time)}
                  </dd>
                </div>
                <div>
                  <dt>Radiative power</dt>
                  <dd>
                    {number(o.frp)} <small>MW</small>
                  </dd>
                </div>
                <div>
                  <dt>Confidence</dt>
                  <dd>
                    {o.confidence}
                    {o.sensor === "MODIS" ? " / 100" : ""}
                  </dd>
                </div>
                <div>
                  <dt>Reported footprint</dt>
                  <dd>
                    {o.scan} × {o.track} <small>km</small>
                  </dd>
                </div>
              </dl>
              <details className="case-metadata">
                <summary>Acquisition details</summary>
                <dl>
                  <div>
                    <dt>Conditions</dt>
                    <dd>{o.daynight === "D" ? "Daylight" : "Night"}</dd>
                  </div>
                  <div>
                    <dt>Source type</dt>
                    <dd>{typeLabel(o.type)}</dd>
                  </div>
                  <div>
                    <dt>Processing</dt>
                    <dd>
                      {o.version.includes("NRT")
                        ? "Near real time"
                        : "Standard archive"}{" "}
                      · {o.version}
                    </dd>
                  </div>
                </dl>
              </details>
              <p className="case-caption">
                The flame marks the reported pixel center. Its footprint
                describes a satellite pixel, not the fire’s perimeter.
              </p>
              {study && !within(o, wide ? study.sceneBounds : study.bbox) && (
                <p className="case-caption">
                  This pinned detection is outside the current counting
                  boundary.
                </p>
              )}
              <button
                className="case-inline-action"
                onClick={() => setTab("readings")}
              >
                Browse nearby detections <ChevronRight size={15} />
              </button>
            </>
          ) : (
            <>
              <div className="case-sensor-counts">
                <div className="is-modis">
                  <span>
                    <i />
                    Aqua MODIS
                  </span>
                  <strong>{number(counts.modis)}</strong>
                  <small>detections</small>
                </div>
                <div className="is-viirs">
                  <span>
                    <i />
                    {study ? "S-NPP" : "NOAA-20"} VIIRS
                  </span>
                  <strong>{number(counts.viirs)}</strong>
                  <small>detections</small>
                </div>
              </div>
              <p className="case-overview-copy">
                {study?.description ??
                  "Choose a detection to inspect its source, acquisition time and reported pixel footprint."}
              </p>
              <button
                className="case-inline-action"
                onClick={() => setTab("readings")}
              >
                Inspect {number(observations.length)} detections{" "}
                <ChevronRight size={15} />
              </button>
              {study && (
                <div className="case-boundary-control">
                  <div>
                    <span>Counting area</span>
                    <strong>
                      {wide
                        ? "Full satellite scene"
                        : `${study.name} case boundary`}
                    </strong>
                  </div>
                  <button onClick={onWide}>
                    {wide ? "Use case area" : "Widen area"}
                  </button>
                </div>
              )}
              <p className="case-caption">
                Each sensor samples fire differently. Several detections can
                belong to the same fire.
              </p>
            </>
          ))}
        {tab === "readings" && (
          <>
            <div className="case-reading-summary">
              <span>
                {o
                  ? "Nearest to your selection"
                  : "Highest radiative power first"}
              </span>
              <strong>{number(candidates.length)}</strong>
            </div>
            <div className="case-reading-list">
              {readings.length ? (
                readings.map((row) => (
                  <button
                    key={row.id}
                    className={row.sensor === "MODIS" ? "is-modis" : "is-viirs"}
                    onClick={() => onSelect(row)}
                  >
                    <i />
                    <span>
                      <strong>
                        {row.lat.toFixed(3)}°, {row.lon.toFixed(3)}°
                      </strong>
                      <small>
                        {timeLabel(row.time)} ·{" "}
                        {row.sensor === "MODIS" ? "MODIS" : "VIIRS"}
                      </small>
                    </span>
                    <span className="case-row-power">
                      {number(row.frp)}
                      <small>MW</small>
                    </span>
                    <ChevronRight size={13} />
                  </button>
                ))
              ) : (
                <p className="case-empty">
                  No detections in this selection. Try another day or source.
                </p>
              )}
            </div>
            {candidates.length > pageSize && (
              <nav className="case-reading-pages" aria-label="Detection pages">
                <button
                  aria-label="Previous observations"
                  disabled={page === 0}
                  onClick={() => setPage(page - 1)}
                >
                  <ChevronLeft size={16} />
                </button>
                <span>
                  {page * pageSize + 1}–
                  {Math.min((page + 1) * pageSize, candidates.length)} of{" "}
                  {number(candidates.length)}
                </span>
                <button
                  aria-label="Next observations"
                  disabled={(page + 1) * pageSize >= candidates.length}
                  onClick={() => setPage(page + 1)}
                >
                  <ChevronRight size={16} />
                </button>
              </nav>
            )}
          </>
        )}
        {tab === "reports" && (
          <>
            <h3 className="case-panel-title">From the field</h3>
            <div className="case-report-links">
              {study?.context.map((item) => (
                <a
                  href={item.url}
                  key={item.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  <span>
                    {item.publisher}
                    <ArrowUpRight size={14} />
                  </span>
                  <strong>{item.title}</strong>
                  <small>{item.relation}</small>
                </a>
              ))}
            </div>
            {study?.harmonized ? (
              <div className="case-export-actions">
                <button onClick={() => onExport("csv")}>
                  <ArrowDownToLine size={14} /> CSV data
                </button>
                <button onClick={() => onExport("pdf")}>
                  <ArrowDownToLine size={14} /> PDF brief
                </button>
              </div>
            ) : (
              study && (
                <button className="case-inline-action" onClick={onCalendar}>
                  <ArrowDownToLine size={14} /> Monthly counts & CSV{" "}
                  <ChevronRight size={15} />
                </button>
              )
            )}
            <button className="case-inline-action" onClick={onSources}>
              Data & provenance <ArrowUpRight size={14} />
            </button>
          </>
        )}
      </section>
      {study && (
        <button className="case-calendar-action" onClick={onCalendar}>
          <span>
            Compare the longer record
            <small>
              {study.years[0]}–{study.years.at(-1)} · fire calendar
            </small>
          </span>
          <ArrowUpRight size={17} />
        </button>
      )}
    </aside>
  );
}

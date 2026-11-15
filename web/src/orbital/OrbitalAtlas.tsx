import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  ChevronRight,
  Crosshair,
  Database,
  Globe2,
  Layers2,
  Pause,
  Play,
  Search,
  X,
} from "lucide-react";
import type { Manifest, Observation, CaseStudy, ModelReport } from "../data";
import {
  coordinates,
  dateLabel,
  integer,
  loadObservations,
  number,
  sensorLabel,
  timeLabel,
  typeLabel,
  within,
} from "../data";
import { boundsOf, groupGeography } from "./geography";
import type { Geography, Area } from "./geography";
import geographyUrl from "./map-units.json?url";
import ContinuousMap from "./ContinuousMap";
import type { Camera, MapHandle } from "./ContinuousMap";
import Navigation from "../Navigation";
import CalibrationDemo from "../CalibrationDemo";
import { useMonthlyCalibration } from "../monthly";
import { geoContains } from "d3-geo";

type Props = {
  observations: Observation[];
  manifest: Manifest;
  report: ModelReport | null;
  offlineReady: boolean;
  initialExplore: boolean;
  onNavigate: (
    view: "calendar" | "methods" | "sources" | "investigations",
  ) => void;
  onMonth: (study: CaseStudy, month: string) => void;
  onCase: (study: CaseStudy) => void;
};
const chapters = [
  "Try the calibration",
  "The sensor difference",
  "Learning the bridge",
  "The longer record",
];
const headlines = [
  <>
    A longer memory.
    <br />
    <em>A clearer picture.</em>
  </>,
  <>
    Same landscape.
    <br />
    <em>Different signals.</em>
  </>,
  <>
    Learn from the overlap.
    <br />
    <em>Test somewhere else.</em>
  </>,
  <>
    Today’s insight.
    <br />
    <em>Decades of context.</em>
  </>,
];
const descriptions = [
  "Newer satellites detect smaller hotspots. PyroBridge learns from overlapping MODIS and VIIRS records to make decades of fire observations comparable.",
  "Same landscape and day. Different satellite counts. A higher count does not automatically mean more fire.",
  "Hide a whole region. Train elsewhere. Test estimates against the unseen VIIRS observations. Repeat for each region.",
  "Apply the learned sensor relationship to older MODIS months. Compare the original record with experimental VIIRS-scale estimates.",
];

export default function OrbitalAtlas(props: Props) {
  const [geography, setGeography] = useState<Geography | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    fetch(geographyUrl, { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw Error();
        return r.json();
      })
      .then(setGeography)
      .catch(() => {
        if (!controller.signal.aborted) setError(true);
      });
    return () => controller.abort();
  }, []);
  if (!geography)
    return (
      <main className="mission-boot">
        <Globe2 size={32} />
        <h1>{error ? "The atlas could not be loaded" : "Opening Earth"}</h1>
        {error && <button onClick={() => location.reload()}>Try again</button>}
      </main>
    );
  return <Dashboard {...props} geography={geography} />;
}

function Dashboard({
  observations,
  manifest,
  offlineReady,
  initialExplore,
  onNavigate,
  onCase,
  onMonth,
  geography,
}: Props & { geography: Geography }) {
  const [chapter, setChapter] = useState(0);
  const [explore, setExplore] = useState(initialExplore);
  const [region, setRegion] = useState<Area | null>(null);
  const [area, setArea] = useState<[number, number] | null>(null);
  const [point, setPoint] = useState<Observation | null>(null);
  const [search, setSearch] = useState("");
  const [sensor, setSensor] = useState<"MODIS" | "VIIRS">("MODIS");
  const [globalSensor, setGlobalSensor] = useState<"all" | "MODIS" | "NOAA-20">(
    "all",
  );
  const [caseRows, setCaseRows] = useState<Observation[]>([]);
  const [caseError, setCaseError] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [caseId, setCaseId] = useState("evros");
  const [caseLoading, setCaseLoading] = useState(false);
  const map = useRef<MapHandle>(null);
  const globalRows = useMemo(
    () =>
      explore && globalSensor !== "all"
        ? observations.filter((row) => row.sensor === globalSensor)
        : observations,
    [observations, explore, globalSensor],
  );
  const groups = useMemo(
    () => groupGeography(geography, globalRows),
    [geography, globalRows],
  );
  const regions = useMemo(
    () => groups.regions.filter((a) => a.rows.length),
    [groups],
  );
  const study = manifest.cases.find((c) => c.id === caseId)!;
  const inCase = !explore;
  useEffect(() => {
    let active = true;
    setCaseRows([]);
    setCaseLoading(true);
    setCaseError(false);
    loadObservations(`/data/scenes/${study.id}.json`)
      .then((rows) => {
        if (active)
          setCaseRows(
            rows.filter(
              (row) =>
                row.time.startsWith(study.date) &&
                row.daynight === "D" &&
                within(row, study.bbox),
            ),
          );
      })
      .catch(() => {
        if (active) setCaseError(true);
      })
      .finally(() => {
        if (active) setCaseLoading(false);
      });
    return () => {
      active = false;
    };
  }, [study]);
  useEffect(() => {
    if (!playing) return;
    const timer = setTimeout(
      () => {
        if (chapter === 1 && sensor === "MODIS") {
          setSensor("VIIRS");
          return;
        }
        if (chapter === 3) {
          setPlaying(false);
          return;
        }
        chooseChapter(chapter + 1, true);
      },
      chapter === 1 ? 3200 : 5700,
    );
    return () => clearTimeout(timer);
  }, [playing, chapter, sensor]);
  const rows = useMemo(() => {
    if (!inCase) return globalRows;
    if (chapter === 1) return caseRows.filter((row) => row.sensor === sensor);
    return caseRows;
  }, [inCase, chapter, caseRows, sensor, globalRows]);
  const localRows = useMemo(() => {
    if (area)
      return rows.filter(
        (row) =>
          Math.abs(((row.lon - area[0] + 540) % 360) - 180) < 1 &&
          Math.abs(row.lat - area[1]) < 1,
      );
    if (region)
      return groups.regions.find((entry) => entry.id === region.id)?.rows ?? [];
    return rows;
  }, [rows, region, area, groups.regions]);
  const camera = useMemo<Camera>(() => {
    if (point)
      return { id: point.id, center: [point.lon, point.lat], zoom: 9.5 };
    if (area) return { id: area.join(), center: area, zoom: 8.5 };
    if (region) return { id: region.id, bounds: boundsOf(region) };
    if (inCase) return { id: study.id, center: study.center, zoom: 7.6 };
    return { id: "earth", center: [20, 15] };
  }, [point, area, region, inCase, study]);
  const counts = useMemo(
    () => ({
      MODIS: caseRows.filter((r) => r.sensor === "MODIS").length,
      VIIRS: caseRows.filter((r) => r.sensor === "VIIRS").length,
    }),
    [caseRows],
  );
  const country = useMemo(
    () =>
      point
        ? (groups.countries.find(
            (c) =>
              c.geometry && geoContains(c.geometry, [point.lon, point.lat]),
          ) ?? null)
        : null,
    [point, groups],
  );
  const level = point ? 3 : area ? 2 : region || inCase ? 1 : 0;
  function clearPlace() {
    setRegion(null);
    setArea(null);
    setPoint(null);
  }
  function chooseChapter(next: number, automatic = false) {
    setChapter(next);
    setExplore(false);
    clearPlace();
    if (next === 1) setSensor("MODIS");
    if (!automatic) setPlaying(false);
  }
  function openExplore() {
    setExplore(true);
    setChapter(0);
    clearPlace();
    setPlaying(false);
  }
  function selectRegion(next: Area) {
    setRegion(next);
    setArea(null);
    setPoint(null);
    setExplore(true);
    setPlaying(false);
  }
  function selectArea(lon: number, lat: number) {
    setArea([lon, lat]);
    setPoint(null);
    setPlaying(false);
  }
  function selectPoint(row: Observation) {
    if (!area) setArea([row.lon, row.lat]);
    if (!inCase) setExplore(true);
    setPoint(row);
    setPlaying(false);
  }
  function backTo(next: number) {
    if (next === level) return;
    setPlaying(false);
    setPoint(null);
    if (next < 2) setArea(null);
    if (next < 1) {
      setRegion(null);
      if (inCase) chooseChapter(0);
    }
  }
  const scopeTitle = point
    ? `${country?.adminName ?? country?.name ?? region?.name ?? (inCase ? `${study.name}, ${study.country}` : "Observation")} · ${coordinates(point.lon, point.lat)}`
    : area
      ? "Local observations"
      : (region?.name ??
        (inCase ? `${study.name}, ${study.country}` : "Global observations"));
  const range = inCase
    ? `${chapter === 2 ? "Context image · " : ""}${dateLabel(study.date)}`
    : `${dateLabel(manifest.snapshotStart, { day: "numeric", month: "short" })}–${dateLabel(manifest.snapshotEnd, { day: "numeric", month: "short", year: "numeric" })}`;
  const hasGlobalModis = manifest.globalSensorCounts?.MODIS !== undefined;
  const globalSourceLabel =
    explore && globalSensor !== "all"
      ? sensorLabel(globalSensor)
      : manifest.globalSensor;
  function changeGlobalSensor(next: "all" | "MODIS" | "NOAA-20") {
    setGlobalSensor(next);
    if (next !== "all" && point?.sensor !== next) setPoint(null);
  }
  return (
    <main className="mission-app">
      <Navigation
        active={explore ? "explore" : "dashboard"}
        onNavigate={(view) => {
          if (view === "dashboard") chooseChapter(0);
          else if (view === "explore") openExplore();
          else onNavigate(view);
        }}
      />
      <div className="mission-workspace">
        <aside className="mission-story" aria-label="Investigation context">
          <div className="mission-story-scroll">
            <p className="mission-eyebrow">
              {point
                ? "THE ORIGINAL OBSERVATION"
                : explore
                  ? "THE OBSERVED EARTH"
                  : "BRIDGING MODIS & VIIRS"}
            </p>
            <h1>
              {point ? (
                <>
                  {inCase
                    ? `${study.name}, ${study.country}.`
                    : (country?.adminName ??
                      country?.name ??
                      region?.name ??
                      "Satellite reading.")}
                  <br />
                  <em>One thermal pixel.</em>
                </>
              ) : explore ? (
                <>
                  {region?.name ?? "Follow the signal."}
                  <br />
                  <em>
                    {area ? "Closer to the ground." : "Across the planet."}
                  </em>
                </>
              ) : (
                headlines[chapter]
              )}
            </h1>
            <p className="mission-description">
              {point
                ? "Inspect the sensor, time and reported footprint. Keep panning or zooming to retain the geographic context."
                : explore
                  ? "Explore satellite detections from the global view down to an individual reading. Drag to move, scroll to zoom, or choose a place."
                  : descriptions[chapter]}
            </p>
            {!explore && !point && chapter === 0 && (
              <>
                <div className="sensor-footprints">
                  <div>
                    <i className="pixel-modis" />
                    <span>
                      MODIS<strong>1 km</strong>
                    </span>
                  </div>
                  <ArrowRight size={20} />
                  <div>
                    <i className="pixel-viirs" />
                    <span>
                      VIIRS<strong>375 m</strong>
                    </span>
                  </div>
                  <small>Nominal active-fire pixel size at nadir</small>
                </div>
                <button
                  className="mission-primary"
                  onClick={() => chooseChapter(1)}
                >
                  Explore the original detections <ArrowRight size={17} />
                </button>
                <button className="mission-text" onClick={openExplore}>
                  Explore {integer(observations.length)} detections{" "}
                  <ArrowUpRight size={15} />
                </button>
                <div className="mission-purpose">
                  <span>THE QUESTION</span>
                  <p>
                    More detections. More fire?
                    <br />
                    Or a better satellite?
                  </p>
                </div>
              </>
            )}
            {!explore && !point && chapter === 1 && (
              <>
                <label className="mission-case-picker">
                  Explore another landscape
                  <select
                    aria-label="Sensor comparison case"
                    value={caseId}
                    onChange={(e) => {
                      setCaseId(e.target.value);
                      clearPlace();
                      setPlaying(false);
                    }}
                  >
                    {manifest.cases.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}, {c.country} · {c.date.slice(0, 4)}
                      </option>
                    ))}
                  </select>
                </label>
                <p className="mission-case-description">{study.description}</p>
                <div
                  className="mission-sensors"
                  role="group"
                  aria-label="Compare satellite observations"
                >
                  {(["MODIS", "VIIRS"] as const).map((name) => (
                    <button
                      key={name}
                      className={sensor === name ? "selected" : ""}
                      aria-pressed={sensor === name}
                      onClick={() => {
                        setSensor(name);
                        setPlaying(false);
                        setPoint(null);
                      }}
                    >
                      <span>
                        {name === "MODIS" ? "Aqua · MODIS" : "S-NPP · VIIRS"}
                      </span>
                      <strong>
                        {caseError || caseLoading ? "—" : integer(counts[name])}
                      </strong>
                      <small>daytime detections</small>
                    </button>
                  ))}
                </div>
                {!caseLoading && !caseError && (
                  <p className="mission-sensor-change" aria-live="polite">
                    <strong>
                      {sensor === "MODIS" ? "MODIS · 1 km" : "VIIRS · 375 m"}
                    </strong>{" "}
                    nominal pixels at nadir.
                    <br />
                    VIIRS reports{" "}
                    {integer(Math.abs(counts.VIIRS - counts.MODIS))}{" "}
                    {counts.VIIRS >= counts.MODIS ? "more" : "fewer"} detections
                    here on this day.
                  </p>
                )}
                <p className="mission-note">
                  {dateLabel(study.date)} · Same analysis boundary. Separate
                  overpasses and sampling. Apply calibration in the next step to
                  compare estimated counts.
                </p>
                <button
                  className="mission-primary"
                  onClick={() => chooseChapter(2)}
                >
                  See what the model changes <ArrowRight size={17} />
                </button>
              </>
            )}
            {!explore && !point && chapter === 2 && (
              <>
                <div className="bridge-flow">
                  <span>Start with MODIS</span>
                  <ChevronRight />
                  <strong>Apply calibration</strong>
                  <ChevronRight />
                  <span>Reveal the VIIRS reading</span>
                </div>
                <p className="mission-note">
                  Try another month or landscape. The result can improve—or
                  worsen. The measured error stays visible.
                </p>
                <button
                  className="mission-primary"
                  onClick={() => onNavigate("methods")}
                >
                  Inspect the validation <ArrowUpRight size={17} />
                </button>
              </>
            )}
            {!explore && !point && chapter === 3 && (
              <>
                <div className="mission-measure">
                  <strong>{study.years.length}</strong>
                  <span>
                    years in this case archive
                    <br />
                    {Math.min(...study.years)}–{Math.max(...study.years)}
                  </span>
                </div>
                <p className="mission-note">
                  Switch between original MODIS counts and monthly VIIRS-scale
                  estimates. Each estimate retains its model and evaluation
                  history.
                </p>
                <button
                  className="mission-primary"
                  onClick={() => onMonth(study, study.date.slice(0, 7))}
                >
                  Open the fire calendar <ArrowRight size={17} />
                </button>
                <button className="mission-text" onClick={() => onCase(study)}>
                  Investigate {study.name} <ArrowUpRight size={15} />
                </button>
              </>
            )}
            {explore && !point && (
              <>
                <button
                  className="mission-primary explore-calibration-link"
                  onClick={() => chooseChapter(0)}
                >
                  Try MODIS → VIIRS calibration <ArrowRight size={17} />
                </button>
                <div className="mission-measure">
                  <strong>{integer(localRows.length)}</strong>
                  <span>
                    reported detections
                    <br />
                    {globalSourceLabel} · {range}
                  </span>
                </div>
                {localRows.length === 0 && (
                  <p className="mission-note">
                    No detections reported here for this sensor and snapshot
                    window. Usable coverage is unknown.
                  </p>
                )}
                {!region && !area && (
                  <>
                    <label className="mission-search">
                      <Search size={16} />
                      <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        aria-label="Find a region"
                        placeholder="Find a region"
                      />
                    </label>
                    <div className="mission-places">
                      {regions
                        .filter((a) =>
                          a.name.toLowerCase().includes(search.toLowerCase()),
                        )
                        .map((a) => (
                          <button key={a.id} onClick={() => selectRegion(a)}>
                            <span>{a.name}</span>
                            <small>{integer(a.rows.length)}</small>
                            <ChevronRight size={14} />
                          </button>
                        ))}
                    </div>
                  </>
                )}
                {(region || area) && (
                  <div className="mission-observations">
                    <h2>
                      {area ? "Readings in this area" : "Explore a detection"}
                    </h2>
                    {[...localRows]
                      .sort((a, b) => (b.frp ?? -1) - (a.frp ?? -1))
                      .slice(0, 8)
                      .map((row) => (
                        <button
                          key={row.id}
                          onClick={() =>
                            area
                              ? selectPoint(row)
                              : selectArea(row.lon, row.lat)
                          }
                        >
                          <span>
                            {coordinates(row.lon, row.lat)}
                            <small>
                              {sensorLabel(row.sensor)} · {timeLabel(row.time)}
                            </small>
                          </span>
                          <strong>
                            {number(row.frp)} <small>MW</small>
                          </strong>
                        </button>
                      ))}
                  </div>
                )}
              </>
            )}
            {point && (
              <ObservationReading row={point} onClose={() => setPoint(null)} />
            )}
            {caseError && inCase && (
              <p role="alert">
                Case observations could not be loaded. Reload to retry.
              </p>
            )}
          </div>
          <footer className="mission-story-footer">
            <Database size={14} />
            <span>
              {offlineReady
                ? "Core data saved on this device"
                : "Precomputed NASA observations"}
            </span>
          </footer>
        </aside>
        <section
          className={`mission-scene${!explore && (chapter === 0 || chapter === 2) && !point ? " mission-learning-scene" : ""}`}
          aria-label="Interactive Earth and scientific evidence"
        >
          {!explore && !point && (chapter === 0 || chapter === 2) ? (
            <div
              className="demo-landscape"
              style={{
                backgroundImage: `url(/assets/map-context/${study.id}-mercator.jpg)`,
              }}
            />
          ) : (
            <ContinuousMap
              ref={map}
              rows={rows}
              regions={regions}
              countries={groups.countries}
              camera={camera}
              region={region}
              selected={point}
              study={inCase ? study : null}
              onRegion={selectRegion}
              onArea={selectArea}
              onPoint={selectPoint}
              onInteract={() => setPlaying(false)}
            />
          )}
          <div className="mission-location-bar">
            <nav aria-label="Geographic depth">
              {["Earth", "Region", "Area", "Observation"].map(
                (label, index) => (
                  <button
                    key={label}
                    className={level === index ? "current" : ""}
                    disabled={index > level}
                    aria-current={index === level ? "step" : undefined}
                    onClick={() => backTo(index)}
                  >
                    {index > 0 && <ChevronRight size={12} />}
                    {label}
                  </button>
                ),
              )}
            </nav>
            <button
              aria-label="Reset to Earth"
              onClick={() => {
                chooseChapter(0);
                map.current?.reset();
              }}
            >
              <Globe2 size={17} />
            </button>
          </div>
          <div className="mission-map-caption">
            <span>{scopeTitle}</span>
            <small>
              {range} ·{" "}
              {inCase
                ? chapter === 1
                  ? sensorLabel(sensor)
                  : "Aqua & S-NPP"
                : globalSourceLabel}
            </small>
          </div>
          {(!inCase || chapter === 1) && (
            <div
              className={`mission-map-legend${explore && hasGlobalModis ? " with-filter" : ""}`}
            >
              {explore && hasGlobalModis ? (
                <div
                  className="mission-sensor-filter"
                  role="group"
                  aria-label="Filter observations by sensor"
                >
                  {(["all", "MODIS", "NOAA-20"] as const).map((option) => (
                    <button
                      key={option}
                      aria-pressed={globalSensor === option}
                      onClick={() => changeGlobalSensor(option)}
                    >
                      {option !== "all" && (
                        <i
                          className={option === "MODIS" ? "modis" : "viirs"}
                          aria-hidden="true"
                        />
                      )}
                      {option === "all"
                        ? "Both"
                        : option === "MODIS"
                          ? "Aqua MODIS"
                          : "NOAA-20 VIIRS"}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="mission-legend-symbols">
                  {(inCase
                    ? [sensor]
                    : hasGlobalModis
                      ? (["MODIS", "NOAA-20"] as const)
                      : (["NOAA-20"] as const)
                  ).map((id) => (
                    <span key={id}>
                      <i
                        className={id === "MODIS" ? "modis" : "viirs"}
                        aria-hidden="true"
                      />
                      {sensorLabel(id)}
                    </span>
                  ))}
                </div>
              )}
              <span className="mission-mixed-key">
                <i /> Gray = mixed sensors · amber = MODIS · blue = VIIRS
              </span>
              <small>
                Circles = groups · squares = pixels · white ring = selection
              </small>
            </div>
          )}
          {!explore && !point && (chapter === 0 || chapter === 2) && (
            <div className="mission-bridge-panel">
              <CalibrationDemo
                cases={manifest.cases}
                initialCase={caseId}
                onCalendar={onMonth}
                onCase={(id) => {
                  setCaseId(id);
                  clearPlace();
                  setPlaying(false);
                }}
              />
            </div>
          )}
          {!explore && !point && chapter === 3 && (
            <CalendarPreview
              study={study}
              onOpen={(month) =>
                onMonth(study, month ?? study.date.slice(0, 7))
              }
            />
          )}
          <div className="mission-imagery-note">
            {inCase
              ? `NASA Aqua MODIS · ${dateLabel(study.date)} composite`
              : "NASA Blue Marble · background imagery · not current conditions"}
          </div>
        </section>
      </div>
      <footer className="mission-journey">
        {explore ? (
          <>
            <button className="mission-text" onClick={() => chooseChapter(0)}>
              <ArrowLeft size={16} />
              Back to the dashboard
            </button>
            <span className="mission-explore-hint">
              {point
                ? "Observation selected · inspect its source reading"
                : area
                  ? "Select a pixel to inspect the satellite reading"
                  : region
                    ? "Select a group or use the list to investigate"
                    : "Select a region to begin"}
            </span>
            <button
              className="mission-text"
              onClick={() => onNavigate("sources")}
            >
              Sources <ArrowUpRight size={14} />
            </button>
          </>
        ) : (
          <>
            <button
              className="mission-play"
              onClick={() => {
                if (playing) setPlaying(false);
                else {
                  if (chapter === 3) chooseChapter(0);
                  setPlaying(true);
                }
              }}
              aria-label={playing ? "Pause introduction" : "Play introduction"}
            >
              {playing ? <Pause size={17} /> : <Play size={17} />}
              <span>{playing ? "Pause" : "Play story"}</span>
            </button>
            <div className="mission-chapters">
              {chapters.map((label, i) => (
                <button
                  key={label}
                  className={chapter === i ? "active" : ""}
                  onClick={() => chooseChapter(i)}
                >
                  <span className="chapter-line" />
                  <span>{label}</span>
                </button>
              ))}
            </div>
            <button
              className="mission-next"
              onClick={() => chooseChapter((chapter + 1) % 4)}
              aria-label="Next chapter"
            >
              <ArrowRight size={20} />
            </button>
          </>
        )}
      </footer>
    </main>
  );
}

function ObservationReading({
  row,
  onClose,
}: {
  row: Observation;
  onClose: () => void;
}) {
  return (
    <section className="mission-reading">
      <header>
        <h2>Satellite reading</h2>
        <button aria-label="Close satellite reading" onClick={onClose}>
          <X size={18} />
        </button>
      </header>
      <p className="reading-coordinates">
        <Crosshair size={16} />
        {coordinates(row.lon, row.lat)}
      </p>
      <dl>
        {[
          ["Acquired", `${dateLabel(row.time)} · ${timeLabel(row.time)}`],
          ["Sensor", sensorLabel(row.sensor)],
          ["Fire radiative power", `${number(row.frp)} MW`],
          ["Confidence", row.confidence],
          ["Scan × track", `${number(row.scan)} × ${number(row.track)} km`],
          ["Classification", typeLabel(row.type)],
          ["Processing version", row.version],
        ].map(([name, value]) => (
          <div key={name}>
            <dt>{name}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <p className="mission-note">
        A detection is a thermal pixel. Repeated passes may observe the same
        fire. Pixel centers do not describe fire boundaries.
      </p>
    </section>
  );
}

function CalendarPreview({
  study,
  onOpen,
}: {
  study: CaseStudy;
  onOpen: (month?: string) => void;
}) {
  const focusYear = Number(study.date.slice(0, 4));
  const { data } = useMonthlyCalibration();
  const calibrated = data?.cases[study.id]?.months ?? [];
  const value = (month: string) =>
    calibrated.find((m) => m.month === month)?.estimates["Seasonal scaling"] ??
    null;
  const years = study.years.filter((y) => y >= focusYear - 2 && y <= focusYear);
  const max = Math.max(
    ...study.months
      .filter((m) => years.includes(Number(m.month.slice(0, 4))))
      .map((m) => value(m.month) ?? 0),
    1,
  );
  return (
    <section className="mission-calendar-preview">
      <header>
        <div>
          <p className="mission-eyebrow">
            {study.name.toUpperCase()} · HARMONIZED MONTHLY ESTIMATES
          </p>
          <h2>Every season leaves a pattern.</h2>
        </div>
        <Layers2 size={24} />
      </header>
      <div className="mini-calendar-head">
        <span />
        {"JFMAMJJASOND".split("").map((m, i) => (
          <span key={i}>{m}</span>
        ))}
      </div>
      {years.map((year) => (
        <div className="mini-calendar-row" key={year}>
          <span>{year}</span>
          {Array.from({ length: 12 }, (_, i) => {
            const month = study.months.find(
              (m) => m.month === `${year}-${String(i + 1).padStart(2, "0")}`,
            );
            return (
              <button
                key={i}
                onClick={() =>
                  onOpen(`${year}-${String(i + 1).padStart(2, "0")}`)
                }
                title={`${year}-${i + 1}: ${value(month?.month ?? "") ?? "unavailable"} estimated VIIRS detections`}
                style={{
                  background:
                    value(month?.month ?? "") == null
                      ? "#28343e"
                      : `rgba(117,197,255,${0.07 + Math.sqrt((value(month?.month ?? "") ?? 0) / max) * 0.9})`,
                }}
                aria-label={`${year} month ${i + 1}: ${value(month?.month ?? "") ?? "unavailable"} estimated VIIRS detections. Open this month.`}
              />
            );
          })}
        </div>
      ))}
      <p className="mission-note">
        Experimental monthly counts · seasonal scaling. Select a month to
        compare the estimate with its original MODIS reading.
      </p>
      <button className="mission-text" onClick={() => onOpen()}>
        Explore the full record <ArrowUpRight size={15} />
      </button>
    </section>
  );
}

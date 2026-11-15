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
import "./mission.css";
import Navigation from "../Navigation";
import LocationInset from "./LocationInset";

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
  "The changing view",
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
  "Explore decades of observed fire activity. A harmonized calendar needs broader validation before we publish estimates.",
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
  report,
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
  const [fold, setFold] = useState("macro");
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
  const study = manifest.cases.find((c) => c.id === "evros")!;
  const inCase = !explore && chapter > 0;
  useEffect(() => {
    let active = true;
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
        ? (groups.countries.find((c) =>
            c.rows.some((r) => r.id === point.id),
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
    ? `${country?.name ?? region?.name ?? (inCase ? "Evros, Greece" : "Observation")} · ${coordinates(point.lon, point.lat)}`
    : area
      ? "Local observations"
      : (region?.name ?? (inCase ? "Evros, Greece" : "Global observations"));
  const range = inCase
    ? dateLabel(study.date)
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
                    ? "Evros, Greece."
                    : (country?.name ?? region?.name ?? "Satellite reading.")}
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
                  See the sensor difference <ArrowRight size={17} />
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
                <div
                  className="mission-sensors"
                  role="group"
                  aria-label="Compare satellite observations"
                >
                  {(["MODIS", "VIIRS"] as const).map((name) => (
                    <button
                      key={name}
                      className={sensor === name ? "selected" : ""}
                      onClick={() => {
                        setSensor(name);
                        setPlaying(false);
                        setPoint(null);
                      }}
                    >
                      <span>
                        {name === "MODIS" ? "Aqua · MODIS" : "S-NPP · VIIRS"}
                      </span>
                      <strong>{caseError ? "—" : integer(counts[name])}</strong>
                      <small>daytime detections</small>
                    </button>
                  ))}
                </div>
                <p className="mission-note">
                  {dateLabel(study.date)} · Same analysis boundary. Separate
                  overpasses and sampling. Counts alone do not measure the
                  sensor correction.
                </p>
                <button
                  className="mission-primary"
                  onClick={() => chooseChapter(2)}
                >
                  How do we bridge the gap? <ArrowRight size={17} />
                </button>
              </>
            )}
            {!explore && !point && chapter === 2 && (
              <>
                <div className="bridge-flow">
                  <span>MODIS observations</span>
                  <ChevronRight />
                  <strong>Trained calibration</strong>
                  <ChevronRight />
                  <span>VIIRS-equivalent count</span>
                </div>
                <p className="mission-note">
                  The model estimates counts for a common observation
                  opportunity. Original detection locations remain traceable.
                </p>
                <div className="mission-measure">
                  <strong>{report?.totalRows ?? "—"}</strong>
                  <span>
                    eligible cell-passes
                    <br />
                    {report?.independentRegions ?? "—"} regions · exploratory
                    benchmark
                  </span>
                </div>
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
                    years in the Greek case archive
                    <br />
                    {Math.min(...study.years)}–{Math.max(...study.years)}
                  </span>
                </div>
                <p className="mission-note">
                  Observed counts are available now. Harmonized monthly values
                  need broader validation and complete observing-effort records.
                </p>
                <button
                  className="mission-primary"
                  onClick={() => onNavigate("calendar")}
                >
                  Open the fire calendar <ArrowRight size={17} />
                </button>
                <button className="mission-text" onClick={() => onCase(study)}>
                  Investigate Evros <ArrowUpRight size={15} />
                </button>
              </>
            )}
            {explore && !point && (
              <>
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
          className="mission-scene"
          aria-label="Interactive Earth and scientific evidence"
        >
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
              <small>
                Circles group detections · squares show individual pixels
              </small>
            </div>
          )}
          {!explore && !point && chapter === 2 && (
            <ModelEvidence
              report={report}
              fold={fold}
              onFold={(value) => {
                setPlaying(false);
                setFold(value);
              }}
            />
          )}
          {!explore && !point && chapter === 3 && (
            <CalendarPreview
              study={study}
              onOpen={(month) =>
                onMonth(study, month ?? study.date.slice(0, 7))
              }
            />
          )}
          {point && country && (
            <LocationInset
              country={country}
              point={point}
              onBack={() => backTo(1)}
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

function ModelEvidence({
  report,
  fold,
  onFold,
}: {
  report: ModelReport | null;
  fold: string;
  onFold: (fold: string) => void;
}) {
  const scores =
    report?.models
      .map((model) => ({
        name: model.name,
        mae:
          fold === "macro"
            ? model.mae
            : model.folds?.find((f) => f.region === fold)?.mae,
      }))
      .filter((m) => m.mae !== undefined) ?? [];
  const max = Math.max(1, ...scores.map((s) => s.mae!));
  return (
    <section className="mission-evidence" aria-label="Actual model benchmark">
      <header>
        <div>
          <p className="mission-eyebrow">MEASURED ON WITHHELD DATA</p>
          <h2>How close did we get?</h2>
        </div>
        <select
          value={fold}
          onChange={(e) => onFold(e.target.value)}
          aria-label="Validation region"
        >
          <option value="macro">Mean of region holdouts</option>
          <option value="evia">Withheld Evia</option>
          <option value="evros">Withheld Evros</option>
        </select>
      </header>
      <p>Mean absolute error · lower is better</p>
      <div className="mission-scorebars">
        {scores.map((score) => (
          <div key={score.name}>
            <span>{score.name}</span>
            <div>
              <i style={{ width: `${(score.mae! / max) * 100}%` }} />
            </div>
            <strong>{score.mae?.toFixed(2)}</strong>
          </div>
        ))}
      </div>
      <p className="mission-note">
        Hotspot pixels per 0.25° cell and paired pass.{" "}
        {report?.totalRows ?? "—"} eligible cell-passes in two regions. Monthly
        and global transfer remain unverified.
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
  const years = [2021, 2022, 2023];
  const max = Math.max(
    ...study.months
      .filter((m) => years.includes(Number(m.month.slice(0, 4))))
      .map((m) => m.modis ?? 0),
    1,
  );
  return (
    <section className="mission-calendar-preview">
      <header>
        <div>
          <p className="mission-eyebrow">EVROS · OBSERVED MODIS COUNTS</p>
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
                title={`${year}-${i + 1}: ${month?.modis ?? "unavailable"} MODIS detections`}
                style={{
                  background:
                    month?.modis == null
                      ? "#28343e"
                      : `rgba(235,148,89,${0.07 + Math.sqrt(month.modis / max) * 0.9})`,
                }}
                aria-label={`${year} month ${i + 1}: ${month?.modis ?? "unavailable"} MODIS detections. Open this month.`}
              />
            );
          })}
        </div>
      ))}
      <p className="mission-note">
        Raw counts reflect both fire activity and observation conditions.
        Historical calibration is the next scientific milestone.
      </p>
      <button className="mission-text" onClick={() => onOpen()}>
        Explore the full record <ArrowUpRight size={15} />
      </button>
    </section>
  );
}

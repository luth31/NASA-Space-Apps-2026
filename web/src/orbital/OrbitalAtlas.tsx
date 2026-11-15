import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Globe2,
  Pause,
  Play,
  Search,
  X,
} from "lucide-react";
import { useReducedMotion } from "motion/react";
import type { Manifest, Observation, CaseStudy, ModelReport } from "../data";
import {
  coordinates,
  dateLabel,
  integer,
  sensorLabel,
  timeLabel,
} from "../data";
import { boundsOf, groupGeography, administrativeCountries } from "./geography";
import type { Geography, Area } from "./geography";
import geographyUrl from "./map-units.json?url";
import ContinuousMap, {
  type Camera,
  type MapHandle,
  type MapDepth,
} from "./ContinuousMap";
import Navigation from "../Navigation";
import "./dashboard-compact.css";

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
        <h1>{error ? "The globe could not be loaded" : "Opening Earth"}</h1>
        {error && <button onClick={() => location.reload()}>Try again</button>}
      </main>
    );
  return <LivingDashboard {...props} geography={geography} />;
}

function LivingDashboard({
  observations,
  manifest,
  onNavigate,
  onCase,
  geography,
}: Props & { geography: Geography }) {
  const reduced = useReducedMotion();
  const [camera, setCamera] = useState<Camera>({
    id: "earth",
    center: [24, 19],
  });
  const [depth, setDepth] = useState<MapDepth>("globe");
  const [context, setContext] = useState<Area | null>(null);
  const [selected, setSelected] = useState<Observation | null>(null);
  const [rotating, setRotating] = useState(!reduced);
  const [search, setSearch] = useState("");
  const [sensor, setSensor] = useState<"all" | "MODIS" | "NOAA-20">("all");
  const [page, setPage] = useState(0);
  const map = useRef<MapHandle>(null);
  const rows = useMemo(
    () =>
      sensor === "all"
        ? observations
        : observations.filter((r) => r.sensor === sensor),
    [observations, sensor],
  );
  const groups = useMemo(
    () => groupGeography(geography, rows),
    [geography, rows],
  );
  const countries = useMemo(
    () => administrativeCountries(groups.countries),
    [groups],
  );
  const activeContext = context
    ? ([...groups.continents, ...countries].find((a) => a.id === context.id) ??
      context)
    : null;
  const continent =
    activeContext?.kind === "continent"
      ? activeContext
      : (groups.continents.find((a) => a.id === activeContext?.parent) ?? null);
  const items = useMemo(() => {
    if (search)
      return [...groups.continents, ...countries].filter((a) =>
        a.name.toLowerCase().includes(search.toLowerCase()),
      );
    if (depth === "globe") return groups.continents;
    if (depth === "continents" || depth === "countries")
      return countries.filter((a) => !continent || a.parent === continent.id);
    return [];
  }, [groups, countries, depth, continent, search]);
  const date = `${dateLabel(manifest.snapshotStart, { day: "numeric", month: "short" })}–${dateLabel(manifest.snapshotEnd, { day: "numeric", month: "short", year: "numeric" })}`;
  const count = activeContext?.rows.length ?? rows.length;
  const showingSignals = depth === "points" && !search;
  const signals = activeContext?.rows ?? rows;
  const pageSize = 4;
  const itemCount = showingSignals ? signals.length : items.length;
  const pageCount = Math.max(1, Math.ceil(itemCount / pageSize));
  const currentPage = Math.min(page, pageCount - 1);
  const pageStart = currentPage * pageSize;
  useEffect(() => setPage(0), [depth, context?.id, search, sensor]);
  function home() {
    setSelected(null);
    setContext(null);
    setSearch("");
    setRotating(!reduced);
    setCamera({ id: `earth-${Date.now()}`, center: [24, 19] });
  }
  function choose(place: Area) {
    setRotating(false);
    setSelected(null);
    setContext(place);
    setSearch("");
    setCamera({
      id: `${place.id}-${Date.now()}`,
      center: place.point,
      bounds: place.kind === "continent" ? undefined : boundsOf(place),
      kind: place.kind,
    });
  }
  function pick(row: Observation) {
    setSelected(row);
    setRotating(false);
    setCamera({ id: row.id, center: [row.lon, row.lat], zoom: 9.5 });
  }
  return (
    <main
      className={`mission-app living-earth dashboard-compact ${depth === "globe" ? "at-earth" : "at-detail"}`}
    >
      <Navigation
        active="dashboard"
        onNavigate={(v) => {
          if (v === "dashboard" || v === "explore") home();
          else onNavigate(v);
        }}
      />
      <div className="living-toolbar">
        <div>
          <Globe2 size={17} />
          <span>{activeContext?.name ?? "Earth"}</span>
          <span className="living-snapshot">{date}</span>
        </div>
        <label className="living-search">
          <Search size={17} />
          <input
            aria-label="Find a continent or country"
            placeholder="Find a place…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setSelected(null);
              setRotating(false);
            }}
          />
        </label>
      </div>
      <div className="mission-workspace living-workspace">
        <aside className="mission-story" aria-label="Explore fire activity">
          <div className="mission-story-scroll">
            <div className="dashboard-heading">
              <p className="mission-eyebrow">THE FIRE OBSERVATORY</p>
              <h1>{activeContext?.name ?? "A changing planet."}</h1>
            </div>
            <div className="living-measure">
              <strong>{integer(count)}</strong>
              <span>reported fire signals</span>
            </div>
            {selected ? (
              <section
                className="living-reading"
                aria-label="Selected fire signal"
              >
                <button
                  className="reading-close"
                  onClick={() => setSelected(null)}
                  aria-label="Close fire signal"
                >
                  <X size={17} />
                </button>
                <span className="eyebrow">SELECTED SIGNAL</span>
                <strong>{coordinates(selected.lon, selected.lat)}</strong>
                <dl>
                  <div>
                    <dt>Observed</dt>
                    <dd>
                      {dateLabel(selected.time)} · {timeLabel(selected.time)}
                    </dd>
                  </div>
                  <div>
                    <dt>Satellite</dt>
                    <dd>{sensorLabel(selected.sensor)}</dd>
                  </div>
                  <div>
                    <dt>Conditions</dt>
                    <dd>{selected.daynight === "D" ? "Daylight" : "Night"}</dd>
                  </div>
                </dl>
                <button
                  className="mission-text"
                  onClick={() => onNavigate("sources")}
                >
                  View data source <ArrowUpRight size={14} />
                </button>
              </section>
            ) : (
              <section
                className="dashboard-browse"
                aria-label={showingSignals ? "Fire signals" : "Places"}
              >
                <div className="dashboard-list-heading">
                  <h2>
                    {search
                      ? "Matching places"
                      : showingSignals
                        ? "Explore a signal"
                        : "Explore a place"}
                  </h2>
                  <span>{integer(itemCount)}</span>
                </div>
                <div className="living-place-list">
                  {showingSignals
                    ? signals
                        .slice(pageStart, pageStart + pageSize)
                        .map((row) => (
                          <button key={row.id} onClick={() => pick(row)}>
                            <span>
                              {coordinates(row.lon, row.lat)}
                              <small>
                                {timeLabel(row.time)} ·{" "}
                                {row.sensor === "MODIS" ? "MODIS" : "VIIRS"}
                              </small>
                            </span>
                            <ChevronRight size={15} />
                          </button>
                        ))
                    : items
                        .slice(pageStart, pageStart + pageSize)
                        .map((area) => (
                          <button key={area.id} onClick={() => choose(area)}>
                            <span>{area.name}</span>
                            <strong>{integer(area.rows.length)}</strong>
                            <ChevronRight size={15} />
                          </button>
                        ))}
                </div>
                {itemCount === 0 ? (
                  <p className="dashboard-empty">
                    {search
                      ? `No place matches “${search}”.`
                      : "No signals in this snapshot."}
                  </p>
                ) : (
                  <div
                    className="dashboard-pagination"
                    aria-label="Browse results"
                  >
                    <span>
                      {pageStart + 1}–
                      {Math.min(pageStart + pageSize, itemCount)} of{" "}
                      {integer(itemCount)}
                    </span>
                    <button
                      aria-label="Previous results"
                      disabled={currentPage === 0}
                      onClick={() => setPage(currentPage - 1)}
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button
                      aria-label="Next results"
                      disabled={currentPage === pageCount - 1}
                      onClick={() => setPage(currentPage + 1)}
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                )}
              </section>
            )}
            <div className="dashboard-story-access">
              {manifest.cases[0] && (
                <button
                  className="living-feature"
                  onClick={() => onCase(manifest.cases[0])}
                >
                  <span>FOLLOW A REAL FIRE</span>
                  <strong>
                    Evros, Greece <ArrowUpRight size={16} />
                  </strong>
                  <small>August 2023 · open the story</small>
                </button>
              )}
              <p className="living-note">
                Satellite snapshot · several signals may belong to one fire.
              </p>
            </div>
          </div>
        </aside>
        <section
          className="mission-scene"
          aria-label="Rotating Earth and fire activity"
        >
          <ContinuousMap
            ref={map}
            rows={rows}
            continents={groups.continents}
            countries={countries}
            camera={camera}
            region={activeContext}
            selected={selected}
            cases={manifest.cases}
            onCase={onCase}
            rotating={rotating && !reduced}
            onRegion={choose}
            onArea={(lon, lat) => {
              setRotating(false);
              setCamera({
                id: `local-${lon}-${lat}`,
                center: [lon, lat],
                zoom: 8.5,
              });
            }}
            onPoint={pick}
            onInteract={() => setRotating(false)}
            onView={(next, area) => {
              setDepth(next);
              setContext(area);
            }}
          />
          <div className="mission-location-bar">
            <nav aria-label="Geographic depth">
              {(
                ["globe", "continents", "countries", "points"] as MapDepth[]
              ).map((d, i) => (
                <button
                  key={d}
                  className={depth === d ? "current" : ""}
                  aria-current={depth === d ? "step" : undefined}
                  onClick={() => {
                    setSelected(null);
                    setRotating(false);
                    if (d === "globe") home();
                    else if (d === "continents")
                      map.current?.level("continents");
                    else if (d === "countries") map.current?.level("countries");
                    else map.current?.level("points");
                  }}
                >
                  {i > 0 && <ChevronRight size={12} />}
                  {["Earth", "Continents", "Countries", "Fire signals"][i]}
                </button>
              ))}
            </nav>
            <button aria-label="Reset to Earth" onClick={() => home()}>
              <Globe2 size={18} />
            </button>
          </div>
          <div className="living-map-key">
            <span className="living-key-scale" />
            <div>
              <strong>
                {depth === "globe"
                  ? "Fire signals glow across Earth"
                  : depth === "points"
                    ? "Each light is a reported signal"
                    : "More red · more fire signals"}
              </strong>
              <small>
                {depth === "globe"
                  ? "Scroll or choose a place to look closer"
                  : depth === "points"
                    ? "Select a light to find out more"
                    : "Total signals in each place · not fire size"}
              </small>
            </div>
          </div>
          <div className="living-map-bottom">
            <div
              className="living-sensor-toggle"
              role="group"
              aria-label="Satellite sources"
            >
              {(["all", "MODIS", "NOAA-20"] as const).map((s) => (
                <button
                  key={s}
                  aria-pressed={sensor === s}
                  onClick={() => {
                    setSensor(s);
                    setSelected(null);
                  }}
                >
                  {s === "all"
                    ? "Both sources"
                    : s === "MODIS"
                      ? "MODIS"
                      : "VIIRS"}
                </button>
              ))}
            </div>
            <button
              className="living-rotation"
              aria-label={
                rotating ? "Pause globe rotation" : "Resume globe rotation"
              }
              onClick={() => {
                if (!rotating && depth !== "globe") home();
                else setRotating((v) => !v);
              }}
            >
              {rotating ? <Pause size={15} /> : <Play size={15} />}
              {rotating ? "Pause rotation" : "Rotate Earth"}
            </button>
          </div>
          <div className="mission-imagery-note">
            NASA Blue Marble · background imagery, not current conditions
          </div>
        </section>
      </div>
    </main>
  );
}

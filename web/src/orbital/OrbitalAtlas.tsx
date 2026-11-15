import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  ChevronRight,
  Database,
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
  offlineReady,
  initialExplore,
  onNavigate,
  onCase,
  geography,
}: Props & { geography: Geography }) {
  const reduced = useReducedMotion();
  const [explore, setExplore] = useState(initialExplore);
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
  function home(asExplore = false) {
    setExplore(asExplore);
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
    setExplore(true);
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
    setExplore(true);
    setCamera({ id: row.id, center: [row.lon, row.lat], zoom: 9.5 });
  }
  function stepIn() {
    setRotating(false);
    setExplore(true);
    map.current?.zoom(1);
  }
  return (
    <main
      className={`mission-app living-earth ${depth === "globe" ? "at-earth" : "at-detail"}`}
    >
      <Navigation
        active={explore ? "explore" : "dashboard"}
        onNavigate={(v) => {
          if (v === "dashboard") home();
          else if (v === "explore") {
            setExplore(true);
            setRotating(false);
          } else onNavigate(v);
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
              setExplore(true);
              setRotating(false);
            }}
          />
        </label>
      </div>
      <div className="mission-workspace living-workspace">
        <aside className="mission-story" aria-label="Explore fire activity">
          <div className="mission-story-scroll">
            <p className="mission-eyebrow">
              {selected
                ? "A CLOSER LOOK"
                : depth === "globe"
                  ? "THE FIRE OBSERVATORY"
                  : "FOLLOW THE FIRE SIGNALS"}
            </p>
            <h1>
              {selected ? (
                "One signal. A place to look closer."
              ) : depth === "globe" ? (
                <>
                  A changing planet.
                  <br />
                  <em>Every signal matters.</em>
                </>
              ) : (
                <>
                  {activeContext?.name ?? "A closer look"}
                  <span className="living-title-dot">.</span>
                  <br />
                  <em>
                    {depth === "points"
                      ? "See each signal."
                      : "Find the places to watch."}
                  </em>
                </>
              )}
            </h1>
            <p className="mission-description">
              {selected
                ? "A satellite spotted heat here. It may be part of a larger fire, or another source of heat."
                : depth === "globe"
                  ? "See where satellites spotted fire activity. Turn the globe, choose a place, and look closer."
                  : depth === "points"
                    ? "Each light is a satellite heat detection. Choose one to see when and where it was spotted."
                    : "Redder places have more reported fire signals. Choose a place to keep exploring."}
            </p>
            {selected ? (
              <section className="living-reading">
                <button
                  className="reading-close"
                  onClick={() => setSelected(null)}
                  aria-label="Close fire signal"
                >
                  <X size={17} />
                </button>
                <span className="eyebrow">SPOTTED HERE</span>
                <strong>{activeContext?.name ?? "Selected location"}</strong>
                <p>{coordinates(selected.lon, selected.lat)}</p>
                <dl>
                  <div>
                    <dt>When</dt>
                    <dd>
                      {dateLabel(selected.time)} · {timeLabel(selected.time)}
                    </dd>
                  </div>
                  <div>
                    <dt>Seen by</dt>
                    <dd>{sensorLabel(selected.sensor)}</dd>
                  </div>
                  <div>
                    <dt>Time of day</dt>
                    <dd>{selected.daynight === "D" ? "Daylight" : "Night"}</dd>
                  </div>
                </dl>
                <button
                  className="mission-text"
                  onClick={() => onNavigate("sources")}
                >
                  Where this information comes from <ArrowUpRight size={14} />
                </button>
              </section>
            ) : (
              <>
                <div className="living-measure">
                  <strong>{integer(count)}</strong>
                  <span>
                    reported fire signals
                    {activeContext
                      ? ` in ${activeContext.name}`
                      : " around Earth"}
                  </span>
                  <small>{date}</small>
                </div>
                {depth === "globe" && !explore && !search ? (
                  <>
                    <button className="mission-primary" onClick={stepIn}>
                      Explore by place <ArrowRight size={18} />
                    </button>
                    <button
                      className="living-feature"
                      onClick={() => onCase(manifest.cases[0])}
                    >
                      <span>FOLLOW A REAL FIRE</span>
                      <strong>
                        Evros, Greece <ArrowUpRight size={17} />
                      </strong>
                      <small>August 2023 · open the story</small>
                    </button>
                  </>
                ) : (
                  <>
                    {!!items.length && (
                      <div
                        className="living-place-list"
                        aria-label={
                          depth === "globe" ? "Continents" : "Countries"
                        }
                      >
                        {items.slice(0, search ? 30 : 18).map((a) => (
                          <button key={a.id} onClick={() => choose(a)}>
                            <span>
                              {a.name}
                              <small>
                                {a.kind === "continent"
                                  ? "Explore countries"
                                  : "Look closer"}
                              </small>
                            </span>
                            <strong>{integer(a.rows.length)}</strong>
                            <ChevronRight size={15} />
                          </button>
                        ))}
                      </div>
                    )}
                    {search && !items.length && (
                      <p className="mission-note">
                        No place matches “{search}”.
                      </p>
                    )}
                    {depth === "points" && (
                      <div
                        className="living-place-list"
                        aria-label="Fire signals in this country"
                      >
                        {(activeContext?.rows ?? rows)
                          .slice(0, 8)
                          .map((row) => (
                            <button key={row.id} onClick={() => pick(row)}>
                              <span>
                                {dateLabel(row.time)}
                                <small>
                                  {timeLabel(row.time)} ·{" "}
                                  {row.daynight === "D" ? "Daylight" : "Night"}
                                </small>
                              </span>
                              <ChevronRight size={15} />
                            </button>
                          ))}
                      </div>
                    )}
                  </>
                )}
              </>
            )}
            <p className="living-note">
              Several signals can belong to the same fire. This is a satellite
              snapshot, not a live emergency map.
            </p>
            <button
              className="mission-text"
              onClick={() => onNavigate("calendar")}
            >
              Explore the longer fire record <ArrowUpRight size={15} />
            </button>
          </div>
          <footer className="mission-story-footer">
            <Database size={14} />
            <span>
              {offlineReady
                ? "Saved for offline exploring"
                : "NASA satellite observations"}
            </span>
          </footer>
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
                    if (d === "globe") home(explore);
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
            <button aria-label="Reset to Earth" onClick={() => home(explore)}>
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
                if (!rotating && depth !== "globe") home(explore);
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
      <footer className="living-footer">
        <span>
          <Globe2 size={14} /> Drag to explore · scroll to zoom
        </span>
        <span>
          {depth === "globe"
            ? "EARTH"
            : depth === "continents"
              ? "CONTINENTS"
              : depth === "countries"
                ? "COUNTRIES"
                : "FIRE SIGNALS"}
        </span>
        <button onClick={() => onNavigate("methods")}>
          How the records connect <ArrowUpRight size={14} />
        </button>
      </footer>
    </main>
  );
}

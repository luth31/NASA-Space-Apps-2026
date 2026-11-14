import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  ChevronDown,
  Flame,
  Globe2,
  HelpCircle,
  Map,
  Menu,
  Pause,
  Play,
  Search,
  X,
} from "lucide-react";
import type { Manifest, Observation, CaseStudy } from "../data";
import { coordinates, dateLabel, integer, number, timeLabel } from "../data";
import { frameFor, grid, groupGeography, signalClusters } from "./geography";
import type { Geography, Area } from "./geography";
import geographyUrl from "./map-units.json?url";
import OrbitalEarth from "./OrbitalEarth";
import AtlasMap from "./AtlasMap";
import "./orbital.css";

type Props = {
  observations: Observation[];
  manifest: Manifest;
  offlineReady: boolean;
  onNavigate: (view: "calendar" | "methods" | "sources") => void;
  onCase: (study: CaseStudy) => void;
};
type Place = {
  regionId: string | null;
  sectorId: string | null;
  atlas: boolean;
};
const home: Place = { regionId: null, sectorId: null, atlas: false };

export default function OrbitalAtlas(props: Props) {
  const [data, setData] = useState<Geography | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    fetch(geographyUrl, { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw Error();
        return r.json();
      })
      .then(setData)
      .catch(() => {
        if (!controller.signal.aborted) setError(true);
      });
    return () => controller.abort();
  }, []);
  return data ? (
    <Experience {...props} geography={data} />
  ) : (
    <main className="orb-boot">
      <Flame size={36} />
      <h1>
        {error ? "Earth could not be loaded" : "Opening a window onto Earth"}
      </h1>
      {error && (
        <button onClick={() => window.location.reload()}>Try again</button>
      )}
    </main>
  );
}

function Experience({
  observations,
  manifest,
  offlineReady,
  geography,
  onNavigate,
  onCase,
}: Props & { geography: Geography }) {
  const [place, setPlace] = useState<Place>(home);
  const [hover, setHover] = useState<Area | null>(null);
  const [point, setPoint] = useState<Observation | null>(null);
  const [hoverPoint, setHoverPoint] = useState<Observation | null>(null);
  const [panel, setPanel] = useState<"places" | "learn" | "menu" | null>(null);
  const [search, setSearch] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [paused, setPaused] = useState(false);
  const [tour, setTour] = useState<number | null>(null);
  const [tourPaused, setTourPaused] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const reading = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const groups = useMemo(
    () => groupGeography(geography, observations),
    [geography, observations],
  );
  const regions = useMemo(
    () => groups.regions.filter((a) => a.rows.length),
    [groups],
  );
  const region = regions.find((a) => a.id === place.regionId) ?? null;
  const sectors = useMemo(() => grid(region?.rows ?? [], 2), [region]);
  const sector = sectors.find((a) => a.id === place.sectorId) ?? null;
  const active = sector ?? region;
  const areaRows = active?.rows ?? observations;
  const signals = useMemo(
    () => signalClusters(observations, 7),
    [observations],
  );
  const mapSignals = useMemo(
    () => (active ? signalClusters(areaRows, 2) : signals),
    [active, areaRows, signals],
  );
  const bounds = useMemo(() => frameFor(active), [active]);
  const pointRows = useMemo(
    () =>
      sector
        ? [...sector.rows].sort((a, b) => (b.frp ?? -1) - (a.frp ?? -1))
        : [],
    [sector],
  );
  const shownPoint = point ?? hoverPoint;
  const isEarth = !place.atlas && !region;
  const isWorld = !region && !isEarth;
  const available = region ? sectors : regions;
  const range = `${dateLabel(manifest.snapshotStart, { day: "numeric", month: "short" })}–${dateLabel(manifest.snapshotEnd, { day: "numeric", month: "short", year: "numeric" })}`;
  const tourRegion =
    regions.find((a) => a.id === "Eastern Africa") ?? regions[0];
  const tourSector = useMemo(
    () => grid(tourRegion?.rows ?? [], 2)[0],
    [tourRegion],
  );
  const lessons = [
    "Satellites help us spot heat across our planet.",
    "Unfold Earth to see every part of the world.",
    "Closer in, shaded squares group the heat detections.",
    "Each small mark is one satellite observation.",
    "One fire can be seen more than once as satellites pass overhead.",
  ];
  useEffect(() => {
    if (!point) return;
    reading.current?.focus({ preventScroll: true });
    reading.current?.scrollIntoView({
      block: "nearest",
      behavior: reduced ? "instant" : "smooth",
    });
  }, [point, reduced]);
  useEffect(() => {
    if (panel) dialog.current?.showModal();
    else dialog.current?.close();
  }, [panel]);
  useEffect(() => {
    if (tour === null || tourPaused) return;
    const timer = setTimeout(
      () => {
        if (tour === 4) {
          setTourPaused(true);
          return;
        }
        const next = tour + 1;
        setTour(next);
        if (next === 1)
          move({ regionId: null, sectorId: null, atlas: true }, false);
        if (next === 2 && tourRegion)
          move({ regionId: tourRegion.id, sectorId: null, atlas: true }, false);
        if (next === 3 && tourSector)
          move(
            { regionId: tourRegion.id, sectorId: tourSector.id, atlas: true },
            false,
          );
        if (next === 4) setPoint(tourSector?.peak ?? null);
      },
      tour === 0 ? 3000 : 3800,
    );
    return () => clearTimeout(timer);
  }, [tour, tourPaused, tourRegion, tourSector]);
  function move(next: Place, manual = true) {
    if (manual) {
      setTour(null);
      setTourPaused(false);
    }
    setPlace(next);
    setPoint(null);
    setHover(null);
    setHoverPoint(null);
    setShowAll(false);
    setPanel(null);
    setSearch("");
    window.scrollTo({ top: 0, behavior: reduced ? "instant" : "smooth" });
  }
  function open(area: Area) {
    if (area.kind === "sector") move({ ...place, sectorId: area.id });
    else move({ regionId: area.id, sectorId: null, atlas: true });
  }
  function back() {
    if (point) {
      setPoint(null);
      return;
    }
    if (sector) move({ ...place, sectorId: null });
    else move(home);
  }
  function startTour() {
    move(home, false);
    setTour(0);
    setTourPaused(false);
  }
  function pickPoint(row: Observation) {
    setTour(null);
    setPoint(row);
  }
  function keyboard(event: React.KeyboardEvent) {
    if (event.key === "Escape" && !panel) {
      setTour(null);
      back();
    }
  }
  const choices = available.filter((a, index) =>
    `${region ? `Area ${index + 1} ` : ""}${a.name}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  const contextual = hover ?? active;
  const title = isEarth ? (
    <>
      A world of fire.
      <br />
      <em>A closer look.</em>
    </>
  ) : isWorld ? (
    "Choose a place."
  ) : (
    region?.name
  );
  return (
    <main className="orb-app" onKeyDown={keyboard}>
      <header className="orb-header">
        <button
          className="orb-brand"
          onClick={() => move(home)}
          aria-label="PyroBridge home"
        >
          <Flame size={28} />
          <span>pyrobridge</span>
        </button>
        <div className="orb-header-actions">
          <button onClick={() => setPanel("learn")} aria-label="How it works">
            <HelpCircle size={19} />
            <span>How it works</span>
          </button>
          <button onClick={() => setPanel("menu")} aria-label="Open menu">
            <Menu size={23} />
          </button>
        </div>
      </header>
      <section
        className={`orb-scene ${isEarth ? "is-earth" : isWorld ? "is-world" : "is-place"}`}
        data-view={
          isEarth ? "earth" : sector ? "sector" : isWorld ? "atlas" : "region"
        }
      >
        <div className="orb-intro">
          {!isEarth && (
            <button className="orb-back" onClick={back}>
              <ArrowLeft size={18} />
              {point
                ? "Back to this area"
                : sector
                  ? "Back to " + region!.name
                  : "Back to Earth"}
            </button>
          )}
          <p className="orb-date">Seen from space · {range}</p>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={isEarth ? "earth" : isWorld ? "world" : region?.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
            >
              <h1>{title}</h1>
              <p className="orb-description">
                {isEarth
                  ? "See where satellites found heat. Pick a place and follow the story."
                  : isWorld
                    ? "Tap a place to discover what satellites saw."
                    : sector
                      ? "You’re looking at individual heat detections. Tap a mark to meet one."
                      : "Tap a shaded square to take a closer look."}
              </p>
            </motion.div>
          </AnimatePresence>
          {isEarth && (
            <div className="orb-start">
              <button
                className="orb-primary"
                onClick={() =>
                  move({ regionId: null, sectorId: null, atlas: true })
                }
              >
                <Map size={18} />
                Explore the world
                <ArrowRight size={18} />
              </button>
              <button className="orb-tour-link" onClick={startTour}>
                <Play size={15} />
                Show me around
              </button>
            </div>
          )}
        </div>
        <div className="orb-visual" onPointerDown={() => setTour(null)}>
          <AnimatePresence mode="sync" initial={false}>
            {isEarth ? (
              <motion.div
                className="orb-earth-layer"
                key="earth"
                initial={{ opacity: 0, scale: 0.87 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.14, rotate: -8 }}
                transition={{
                  duration: reduced ? 0 : 0.75,
                  ease: [0.2, 0.8, 0.2, 1],
                }}
              >
                <OrbitalEarth
                  areas={regions}
                  signals={signals}
                  onOpen={open}
                  paused={paused || panel !== null}
                />
              </motion.div>
            ) : (
              <motion.div
                className="orb-atlas-layer"
                key="map"
                initial={{ opacity: 0, scale: 0.72 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.75 }}
                transition={{
                  duration: reduced ? 0 : 0.8,
                  ease: [0.2, 0.8, 0.2, 1],
                }}
              >
                <AtlasMap
                  style="orbital"
                  stage={active ? "detail" : "world"}
                  land={groups.land}
                  motionLand={groups.motionLand}
                  outline={region?.geometry}
                  areas={sector ? [] : available}
                  signal={mapSignals}
                  motionSignal={signals}
                  bounds={bounds}
                  rows={pointRows}
                  showPoints={!!sector}
                  sector={sector?.bounds}
                  hovered={hover}
                  selectedPoint={point}
                  onHover={setHover}
                  onOpen={open}
                  onPoint={pickPoint}
                  onHoverPoint={setHoverPoint}
                />
              </motion.div>
            )}
          </AnimatePresence>
          <div className="orb-map-bottom">
            <span>
              {isEarth
                ? "Drag to turn Earth"
                : sector
                  ? "Each small square is one detection"
                  : isWorld
                    ? "Flames group nearby detections"
                    : "Brighter squares contain more detections"}
            </span>
            {isEarth && (
              <button
                onClick={() => setPaused((v) => !v)}
                aria-label={
                  paused ? "Resume Earth rotation" : "Pause Earth rotation"
                }
              >
                {paused ? <Play size={15} /> : <Pause size={15} />}
              </button>
            )}
          </div>
          {isEarth && (
            <span className="orb-texture-credit">
              NASA Blue Marble · Aug 2004
            </span>
          )}
        </div>
        <div className="orb-action-strip">
          <button
            className="orb-place-button"
            onClick={() => setPanel("places")}
          >
            <Search size={18} />
            {region ? "Choose an area" : "Choose a place"}
            <ChevronDown size={16} />
          </button>
          <button className="orb-legend" onClick={() => setPanel("learn")}>
            <Flame size={21} />
            <span>Heat spotted by satellite</span>
            <HelpCircle size={15} />
          </button>
        </div>
        <AnimatePresence>
          {tour !== null && (
            <motion.div
              className="orb-guide"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              role="status"
            >
              <span className="orb-guide-progress">{tour + 1}/5</span>
              <p>{lessons[tour]}</p>
              <button
                onClick={() =>
                  tour === 4 ? startTour() : setTourPaused(!tourPaused)
                }
                aria-label={
                  tour === 4
                    ? "Replay introduction"
                    : tourPaused
                      ? "Resume introduction"
                      : "Pause introduction"
                }
              >
                {tourPaused ? <Play size={18} /> : <Pause size={18} />}
              </button>
              <button
                onClick={() => setTour(null)}
                aria-label="Close introduction"
              >
                <X size={18} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </section>
      {active && (
        <section className="orb-detail">
          {shownPoint ? (
            <motion.div
              className="orb-observation"
              ref={reading}
              tabIndex={-1}
              key={shownPoint.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="orb-detail-icon">
                <Flame size={28} />
              </div>
              <div>
                <h2>A little mark. A real observation.</h2>
                <p>
                  The satellite measured unusually hot ground here on{" "}
                  {dateLabel(shownPoint.time)} at {timeLabel(shownPoint.time)}.
                </p>
                <details>
                  <summary>See the satellite reading</summary>
                  <dl>
                    <div>
                      <dt>Location</dt>
                      <dd>{coordinates(shownPoint.lon, shownPoint.lat)}</dd>
                    </div>
                    <div>
                      <dt>Heat radiated (fire radiative power)</dt>
                      <dd>{number(shownPoint.frp)} MW</dd>
                    </div>
                    <div>
                      <dt>Satellite confidence</dt>
                      <dd>{shownPoint.confidence}</dd>
                    </div>
                    <div>
                      <dt>Satellite and sensor</dt>
                      <dd>NOAA-20 · VIIRS</dd>
                    </div>
                    <div>
                      <dt>Pixel footprint</dt>
                      <dd>
                        {number(shownPoint.scan)} × {number(shownPoint.track)}{" "}
                        km
                      </dd>
                    </div>
                    <div>
                      <dt>Processing version</dt>
                      <dd>{shownPoint.version}</dd>
                    </div>
                  </dl>
                  <p>
                    Fire radiative power measures how quickly heat is radiated.
                    It does not tell us a fire’s size or danger on its own.
                  </p>
                </details>
              </div>
              <button
                onClick={() => {
                  setPoint(null);
                  setHoverPoint(null);
                }}
                aria-label="Close observation"
              >
                <X size={20} />
              </button>
            </motion.div>
          ) : (
            <div className="orb-region-fact">
              <Flame size={28} />
              <p>
                <strong>
                  {integer(contextual?.rows.length ?? areaRows.length)}
                </strong>{" "}
                heat detections{" "}
                {sector
                  ? "in this square"
                  : `across ${contextual?.name ?? region!.name}`}
                .<span>A satellite may see the same fire more than once.</span>
              </p>
            </div>
          )}
          {!sector && (
            <div className="orb-area-shortcuts">
              <h2>Look closer</h2>
              <div>
                {sectors
                  .slice(0, showAll ? sectors.length : 4)
                  .map((area, i) => (
                    <button
                      key={area.id}
                      onClick={() => open(area)}
                      onMouseEnter={() => setHover(area)}
                      onMouseLeave={() => setHover(null)}
                      onFocus={() => setHover(area)}
                      onBlur={() => setHover(null)}
                    >
                      <span>
                        Area {i + 1}
                        <small>{area.name}</small>
                      </span>
                      <strong>
                        {integer(area.rows.length)} <small>detections</small>
                      </strong>
                      <ArrowRight size={18} />
                    </button>
                  ))}
              </div>
              {sectors.length > 4 && (
                <button
                  className="orb-text-button"
                  onClick={() => setShowAll(!showAll)}
                >
                  {showAll
                    ? "Show fewer areas"
                    : `See all ${sectors.length} areas`}
                  <ChevronDown size={16} />
                </button>
              )}
            </div>
          )}
          {sector && !point && (
            <button
              className="orb-primary"
              onClick={() => pickPoint(sector.peak!)}
            >
              Show me one detection
              <ArrowRight size={18} />
            </button>
          )}
        </section>
      )}
      {!active && (
        <section className="orb-invitation">
          <span className="orb-invitation-icon">
            <Flame size={24} />
          </span>
          <p>
            <strong>Every mark starts with a satellite.</strong>
            <br />
            It spots heat that may come from a fire. Zoom in to see what it
            found.
          </p>
          <button
            onClick={() => setPanel("learn")}
            aria-label="Learn how satellites see fire"
          >
            <ArrowUpRight size={21} />
          </button>
        </section>
      )}
      <footer className="orb-footer">
        <span>NASA FIRMS · NOAA-20 VIIRS</span>
        <button onClick={() => onNavigate("sources")}>
          Data & credits
          <ArrowUpRight size={13} />
        </button>
      </footer>
      <dialog
        className="orb-dialog"
        aria-labelledby="orb-panel-title"
        ref={dialog}
        onClose={() => {
          setPanel(null);
          setSearch("");
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) setPanel(null);
        }}
      >
        <div className="orb-dialog-inner">
          <header>
            <h2 id="orb-panel-title">
              {panel === "places"
                ? region
                  ? "Choose an area"
                  : "Where shall we go?"
                : panel === "learn"
                  ? "How can a satellite see fire?"
                  : "Keep exploring"}
            </h2>
            <button onClick={() => setPanel(null)} aria-label="Close panel">
              <X size={22} />
            </button>
          </header>
          {panel === "places" && (
            <>
              <label className="orb-search">
                <Search size={20} />
                <input
                  autoFocus
                  aria-label="Find a place"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={region ? "Find an area…" : "Try Western Europe…"}
                />
              </label>
              <div className="orb-choices">
                {choices.map((area) => (
                  <button key={area.id} onClick={() => open(area)}>
                    <span>
                      {region
                        ? `Area ${available.indexOf(area) + 1}`
                        : area.name}
                      <small>{region ? area.name : ""}</small>
                    </span>
                    <small>{integer(area.rows.length)} heat detections</small>
                    <ArrowRight size={18} />
                  </button>
                ))}
                {!choices.length && (
                  <p>
                    {region
                      ? "No areas match. Try an area number or coordinates."
                      : "No places match that name. Try a region, such as Western Europe."}
                  </p>
                )}
              </div>
              {region && (
                <button
                  className="orb-text-button"
                  onClick={() => {
                    move(home);
                    setPanel("places");
                  }}
                >
                  Choose another part of the world
                  <Globe2 size={17} />
                </button>
              )}
            </>
          )}
          {panel === "learn" && (
            <div className="orb-learning">
              <div>
                <Flame />
                <h3>Heat leaves a clue.</h3>
                <p>
                  Fires give off heat. Sensors on satellites can spot unusually
                  hot patches of ground as they pass overhead.
                </p>
              </div>
              <div>
                <Globe2 />
                <h3>Zoom in to follow it.</h3>
                <p>
                  The flame symbols group nearby detections. Choose a place,
                  then a square, to see individual satellite readings.
                </p>
              </div>
              <div>
                <BookOpen />
                <h3>One fire can leave many marks.</h3>
                <p>
                  Satellites can see the same fire on several passes. Clouds can
                  hide fires, and some heat comes from volcanoes or other hot
                  sources.
                </p>
              </div>
              <p className="orb-source-note">
                This view uses {range} observations. Empty areas may have
                missing observations. The globe’s background is NASA imagery
                from August 2004.
              </p>
              <p className="orb-source-note">
                Map boundaries use{" "}
                <a
                  href="https://www.naturalearthdata.com/"
                  target="_blank"
                  rel="noreferrer"
                >
                  Natural Earth 5.1.2
                </a>
                . The shaded squares are 2° map cells, not fire boundaries.
                Their ground area varies with latitude.
              </p>
              <button className="orb-primary" onClick={() => setPanel(null)}>
                Let’s explore
                <ArrowRight size={18} />
              </button>
            </div>
          )}
          {panel === "menu" && (
            <div className="orb-menu">
              <p className="orb-source-note" role="status">
                {offlineReady
                  ? "Ready to explore offline. Featured stories and the calendar are saved on this device."
                  : "PyroBridge 0.2 · Orbital Atlas"}
              </p>
              <button
                onClick={() => {
                  setPanel(null);
                  startTour();
                }}
              >
                <Play />
                Show me around
                <ArrowRight />
              </button>
              <button onClick={() => onNavigate("calendar")}>
                <Map />
                Fire calendar
                <ArrowRight />
              </button>
              <button onClick={() => onNavigate("methods")}>
                <BookOpen />
                How the science works
                <ArrowRight />
              </button>
              <h3>Stories from the past</h3>
              {manifest.cases.map((c) => (
                <button key={c.id} onClick={() => onCase(c)}>
                  <span>
                    {c.name}, {c.country}
                    <small>{dateLabel(c.date)}</small>
                  </span>
                  <ArrowRight />
                </button>
              ))}
            </div>
          )}
        </div>
      </dialog>
    </main>
  );
}

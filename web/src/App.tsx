import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronDown,
  Compass,
  Globe2,
  LoaderCircle,
  LocateFixed,
  Minus,
  Pause,
  Play,
  Plus,
  Search,
  X,
} from "lucide-react";
import type {
  CaseStudy,
  CoverageReport,
  Manifest,
  ModelReport,
  Observation,
} from "./data";
import {
  coordinates,
  dateLabel,
  distance,
  integer,
  loadObservations,
  number,
  timeLabel,
  within,
} from "./data";
import RegionalMap from "./RegionalMap";
import Dossier from "./Dossier";
import Calendar from "./Calendar";
import Methods from "./Methods";
import Sources from "./Sources";
import Navigation from "./Navigation";
import Investigations from "./Investigations";
import { exportInvestigation } from "./exports";
import "./case-workspace.css";

const Globe = lazy(() => import("./Globe"));
const OrbitalAtlas = lazy(() => import("./orbital/OrbitalAtlas"));
const Report = lazy(() => import("./Report"));
type View =
  | "explore"
  | "calendar"
  | "methods"
  | "sources"
  | "investigations"
  | "report";

function Brand() {
  return (
    <span className="brand">
      <svg
        width="27"
        height="30"
        viewBox="0 0 32 36"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M4 30V16a12 12 0 0 1 24 0v14M10 30V16a6 6 0 0 1 12 0v14M16 16v14"
          stroke="currentColor"
          strokeWidth="2.4"
        />
      </svg>
      <span>
        pyro<span>bridge</span>
        <small>A CONTINUOUS VIEW OF FIRE</small>
      </span>
    </span>
  );
}

export default function App() {
  const [manifest, setManifest] = useState<Manifest | null>(null),
    [global, setGlobal] = useState<Observation[]>([]),
    [report, setReport] = useState<ModelReport | null>(null),
    [error, setError] = useState("");
  const [coverage, setCoverage] = useState<CoverageReport | null>(null);
  const [browseGlobal, setBrowseGlobal] = useState(false);
  const [atlasExplore, setAtlasExplore] = useState(false);
  const [view, setView] = useState<View>(() =>
      new URLSearchParams(location.search).get("tab") === "report"
        ? "report"
        : "explore",
    ),
    [study, setStudy] = useState<CaseStudy | null>(null),
    [selected, setSelected] = useState<Observation | null>(null);
  const [month, setMonth] = useState("2023-08"),
    [day, setDay] = useState<string | null>(null),
    [caseRows, setCaseRows] = useState<Observation[]>([]),
    [loading, setLoading] = useState(false);
  const [sensor, setSensor] = useState("all"),
    [daynight, setDaynight] = useState("all"),
    [compare, setCompare] = useState(false),
    [wide, setWide] = useState(false),
    [zoom, setZoom] = useState(0),
    [reset, setReset] = useState(0);
  const [search, setSearch] = useState(""),
    [searchFocused, setSearchFocused] = useState(false),
    [playing, setPlaying] = useState(false),
    [toast, setToast] = useState("");
  const [online, setOnline] = useState(navigator.onLine),
    [offlineReady, setOfflineReady] = useState(false);
  const reduced = useReducedMotion();
  const [destination, setDestination] = useState<CaseStudy | null>(null);
  const flightTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const url = new URL(location.href);
    if (view === "report") url.searchParams.set("tab", "report");
    else {
      url.searchParams.delete("tab");
      url.searchParams.delete("concept");
    }
    history.replaceState(null, "", url);
  }, [view]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setView("explore");
        setTimeout(
          () =>
            document
              .querySelector<HTMLElement>(
                '[aria-label="Choose investigation"], [aria-label="Search case studies"]',
              )
              ?.focus(),
          0,
        );
      }
      if (e.key === "Escape") {
        setSearchFocused(false);
        if (flightTimer.current) clearTimeout(flightTimer.current);
        setDestination(null);
      }
    };
    window.addEventListener("keydown", key);
    return () => {
      window.removeEventListener("keydown", key);
      if (flightTimer.current) clearTimeout(flightTimer.current);
    };
  }, []);
  useEffect(() => {
    Promise.all([
      fetch("/data/manifest.json").then((r) => {
        if (!r.ok) throw Error("The data bundle could not be loaded.");
        return r.json();
      }),
      loadObservations("/data/global.json"),
    ])
      .then(([m, g]) => {
        setManifest(m);
        setGlobal(g);
      })
      .catch((e) => setError(String(e.message)));
    fetch("/data/models.json")
      .then((r) => (r.ok ? r.json() : null))
      .then(setReport)
      .catch(() => {});
    fetch("/data/coverage.json")
      .then((r) => (r.ok ? r.json() : null))
      .then(setCoverage)
      .catch(() => {});
  }, []);
  useEffect(() => {
    let registration: ServiceWorkerRegistration | null = null;
    let disposed = false;
    let checking = false;
    const checkForUpdate = () => {
      if (
        disposed ||
        checking ||
        !registration ||
        registration.installing ||
        !navigator.onLine ||
        document.visibilityState !== "visible"
      )
        return;
      checking = true;
      registration
        .update()
        .catch(() => {})
        .finally(() => {
          checking = false;
        });
    };
    const update = () => {
      setOnline(navigator.onLine);
      checkForUpdate();
    };
    const status = (event: MessageEvent) => {
      if (event.data?.type === "PYROBRIDGE_OFFLINE_STATUS") {
        setOfflineReady(
          event.data.ready === true &&
            event.data.version === manifest?.bundleVersion,
        );
      }
    };
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    const productionWorker =
      "serviceWorker" in navigator && import.meta.env.PROD;
    const updateTimer = productionWorker
      ? window.setInterval(checkForUpdate, 30_000)
      : undefined;
    if (productionWorker) {
      document.addEventListener("visibilitychange", checkForUpdate);
      window.addEventListener("pageshow", checkForUpdate);
      navigator.serviceWorker.addEventListener("message", status);
      navigator.serviceWorker
        .register("/service-worker.js", { updateViaCache: "none" })
        .then((r) => {
          if (disposed) return;
          registration = r;
          r.active?.postMessage({ type: "OFFLINE_STATUS" });
        })
        .catch(() => {});
    }
    return () => {
      disposed = true;
      window.clearInterval(updateTimer);
      document.removeEventListener("visibilitychange", checkForUpdate);
      window.removeEventListener("pageshow", checkForUpdate);
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
      navigator.serviceWorker?.removeEventListener("message", status);
    };
  }, [manifest?.bundleVersion]);
  useEffect(() => {
    if (!study) return;
    let active = true;
    setLoading(true);
    setCaseRows([]);
    setSelected(null);
    const m = (study.contextMonths ?? study.months).find(
      (m) => m.month === month,
    );
    if (m && (m.modis ?? 0) + (m.viirs ?? 0) === 0) {
      setLoading(false);
      return;
    }
    loadObservations(
      `/data/${study.contextMonths ? "context" : "observations"}/${study.id}/${month}.json`,
    )
      .then((rows) => {
        if (active) {
          setCaseRows(rows);
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) {
          setLoading(false);
          setToast(
            navigator.onLine
              ? "This observation partition is unavailable. Try another month."
              : "This month was not saved offline. The featured case months remain available.",
          );
        }
      });
    return () => {
      active = false;
    };
  }, [study, month]);
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(""), 5500);
    return () => clearTimeout(id);
  }, [toast]);
  const dates = useMemo(() => {
    const n = new Date(+month.slice(0, 4), +month.slice(5), 0).getDate();
    return Array.from(
      { length: n },
      (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`,
    );
  }, [month]);
  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(
      () =>
        setDay(
          (d) =>
            dates[(Math.max(0, dates.indexOf(d ?? "")) + 1) % dates.length],
        ),
      1100,
    );
    return () => clearInterval(timer);
  }, [playing, dates]);
  function commitCase(c: CaseStudy) {
    window.scrollTo(0, 0);
    cancelFlight();
    setDestination(null);
    setStudy(c);
    setView("explore");
    setSelected(null);
    setBrowseGlobal(false);
    setMonth(c.date.slice(0, 7));
    setDay(c.date);
    setCompare(true);
    setSensor("all");
    setDaynight("all");
    setWide(false);
    setPlaying(false);
    setSearch("");
    setReset((v) => v + 1);
  }
  function openCase(c: CaseStudy) {
    cancelFlight();
    if (!study && view === "explore" && !reduced) {
      setSelected(null);
      setDestination(c);
      loadObservations(
        `/data/${c.contextMonths ? "context" : "observations"}/${c.id}/${c.date.slice(0, 7)}.json`,
      ).catch(() => {});
      flightTimer.current = setTimeout(() => commitCase(c), 1600);
    } else commitCase(c);
  }
  function cancelFlight() {
    if (flightTimer.current) clearTimeout(flightTimer.current);
    flightTimer.current = null;
    setDestination(null);
  }
  function toGlobal() {
    setAtlasExplore(false);
    window.scrollTo(0, 0);
    cancelFlight();
    setStudy(null);
    setSelected(null);
    setBrowseGlobal(false);
    setView("explore");
    setCompare(false);
    setSensor("all");
    setDaynight("all");
    setPlaying(false);
    setReset((v) => v + 1);
  }
  function navigate(v: View) {
    window.scrollTo(0, 0);
    cancelFlight();
    setView(v);
    setPlaying(false);
    if (v === "calendar") setWide(false);
    if (v === "calendar" && !study && manifest) {
      const c = manifest.cases[0];
      setStudy(c);
      setMonth(c.date.slice(0, 7));
      setDay(null);
    }
  }
  function selectObservation(o: Observation) {
    setSelected(o);
    setPlaying(false);
  }
  const observations = useMemo(() => {
    const rows = study ? caseRows : global;
    return rows.filter(
      (o) =>
        (!study || wide || within(o, study.bbox)) &&
        (!study || !day || o.time.startsWith(day)) &&
        (sensor === "all" || o.sensor === sensor) &&
        (daynight === "all" || o.daynight === daynight),
    );
  }, [caseRows, global, study, day, sensor, daynight, wide]);
  const displayRows = useMemo(
    () =>
      selected
        ? [...observations].sort(
            (a, b) => distance(selected, a) - distance(selected, b),
          )
        : [...observations].sort((a, b) => (b.frp ?? 0) - (a.frp ?? 0)),
    [observations, selected],
  );
  const dayCounts = useMemo(
    () =>
      dates.map(
        (d) =>
          caseRows.filter(
            (o) =>
              o.time.startsWith(d) &&
              (!study || wide || within(o, study.bbox)) &&
              (sensor === "all" || o.sensor === sensor) &&
              (daynight === "all" || o.daynight === daynight),
          ).length,
      ),
    [caseRows, dates, sensor, daynight, study, wide],
  );
  const searchCases =
    manifest?.cases.filter((c) =>
      (c.name + " " + c.country + " " + c.date)
        .toLowerCase()
        .includes(search.toLowerCase()),
    ) ?? [];
  async function handleExport(format: "csv" | "pdf") {
    if (!study || !manifest) return;
    try {
      const record = study.months.find((m) => m.month === month);
      const rows =
        (record?.modis ?? 0) + (record?.viirs ?? 0) > 0
          ? await loadObservations(
              `/data/observations/${study.id}/${month}.json`,
            )
          : [];
      await exportInvestigation(format, study, month, rows, manifest);
      setToast(`Your ${format.toUpperCase()} investigation is ready.`);
    } catch (e) {
      setToast((e as Error).message);
    }
  }
  if (error)
    return (
      <div className="boot">
        <Brand />
        <h1>The observation bundle is unavailable.</h1>
        <p>{error}</p>
        <button className="primary-button" onClick={() => location.reload()}>
          Try again
        </button>
      </div>
    );
  if (!manifest)
    return (
      <div className="boot">
        <Brand />
        <div className="boot-orbit">
          <span />
        </div>
        <span className="mono">PREPARING THE OBSERVATORY</span>
        <p>Loading the NASA observation snapshot</p>
      </div>
    );
  if (view === "explore" && !study)
    return (
      <Suspense fallback={<div className="boot">Opening Earth…</div>}>
        <OrbitalAtlas
          observations={global}
          manifest={manifest}
          report={report}
          offlineReady={offlineReady}
          initialExplore={atlasExplore}
          onMonth={(c, m) => {
            commitCase(c);
            setView("calendar");
            setMonth(m);
            setDay(null);
          }}
          onNavigate={navigate}
          onCase={commitCase}
        />
      </Suspense>
    );
  return (
    <div
      className="app-shell"
      onPointerDownCapture={() => {
        if (destination) cancelFlight();
      }}
    >
      <a className="skip-link" href="#main-content">
        Skip to the observatory
      </a>
      <main
        className={`app-main scientific-workspace workspace-${view}`}
        id="main-content"
        tabIndex={-1}
      >
        <Navigation
          online={online}
          active={view === "explore" ? "investigations" : view}
          onNavigate={(next) => {
            if (next === "dashboard" || next === "explore") {
              toGlobal();
              setAtlasExplore(next === "explore");
            } else navigate(next);
          }}
        />
        {view === "investigations" && (
          <Investigations cases={manifest.cases} onCase={commitCase} />
        )}
        {view === "explore" && (
          <div className={`explore-view ${study ? "case-workspace" : ""}`}>
            {study && (
              <header className="case-workspace-toolbar">
                <button
                  className="case-back"
                  onClick={() => navigate("investigations")}
                >
                  <ChevronLeft size={17} />
                  <span>All cases</span>
                </button>
                <label className="case-switcher">
                  <span>Investigation</span>
                  <select
                    aria-label="Choose investigation"
                    value={study.id}
                    onChange={(event) =>
                      commitCase(
                        manifest.cases.find(
                          (item) => item.id === event.target.value,
                        )!,
                      )
                    }
                  >
                    {manifest.cases.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} · {item.country}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="case-toolbar-guide">
                  Choose a flame to inspect a detection
                </div>
                <label className="case-filter">
                  <span>Satellite</span>
                  <select
                    aria-label="Filter satellite"
                    value={sensor}
                    onChange={(event) => {
                      setSensor(event.target.value);
                      setCompare(false);
                      setSelected(null);
                    }}
                  >
                    <option value="all">MODIS + VIIRS</option>
                    <option value="MODIS">Aqua MODIS</option>
                    <option value="VIIRS">S-NPP VIIRS</option>
                  </select>
                </label>
                <label className="case-filter">
                  <span>Time of day</span>
                  <select
                    aria-label="Filter observation time"
                    value={daynight}
                    onChange={(event) => {
                      setDaynight(event.target.value);
                      setSelected(null);
                    }}
                  >
                    <option value="all">Day & night</option>
                    <option value="D">Daytime</option>
                    <option value="N">Nighttime</option>
                  </select>
                </label>
              </header>
            )}
            {!study && (
              <div className="explore-toolbar">
                <div className="breadcrumbs">
                  <button onClick={toGlobal}>
                    <Globe2 size={14} />
                    Earth
                  </button>
                </div>
                <div className="search-wrap">
                  <Search size={15} />
                  <input
                    aria-label="Search case studies"
                    placeholder="Find an investigation…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onFocus={() => setSearchFocused(true)}
                    onBlur={() =>
                      setTimeout(() => setSearchFocused(false), 180)
                    }
                  />
                  <span className="search-key">⌘ K</span>
                  {searchFocused && (
                    <div className="search-results">
                      {searchCases.length ? (
                        searchCases.map((c) => (
                          <button key={c.id} onClick={() => openCase(c)}>
                            <span>
                              {c.name}
                              <small>
                                {c.country} · {dateLabel(c.date)}
                              </small>
                            </span>
                            <ArrowUpRight size={14} />
                          </button>
                        ))
                      ) : (
                        <p>
                          No case study matches. Explore any observation
                          directly on the globe.
                        </p>
                      )}
                    </div>
                  )}
                </div>
                <div className="filter-wrap">
                  <select
                    aria-label="Filter observation time"
                    value={daynight}
                    onChange={(e) => {
                      setDaynight(e.target.value);
                      setSelected(null);
                    }}
                  >
                    <option value="all">Day & night</option>
                    <option value="D">Daytime</option>
                    <option value="N">Nighttime</option>
                  </select>
                  <ChevronDown size={13} />
                </div>
              </div>
            )}
            <div
              className={`exploration-stage ${study ? "regional" : "global"} ${(selected || browseGlobal) && !study ? "has-selection" : ""}`}
            >
              <div className="map-space">
                {study ? (
                  <RegionalMap
                    key={study.id}
                    study={study}
                    observations={observations}
                    selected={selected}
                    onSelect={selectObservation}
                    compare={compare}
                    onCompare={() => {
                      setCompare((v) => !v);
                      setSensor("all");
                    }}
                    period={day ?? month}
                    reset={reset}
                    wide={wide}
                  />
                ) : (
                  <>
                    <div
                      className={`global-intro ${destination ? "departing" : ""}`}
                    >
                      <span className="eyebrow">
                        <span className="tiny-cross">+</span> THE FIRE
                        OBSERVATORY
                      </span>
                      <h1>
                        A changing planet.
                        <br />
                        <em>A continuous record.</em>
                      </h1>
                      <p>
                        Find the signal.
                        <br />
                        Understand the season.
                      </p>
                      <div className="global-metric">
                        <span>{integer(observations.length)}</span>
                        <div>
                          reported hotspots
                          <small>
                            {dateLabel(manifest.snapshotStart, {
                              day: "numeric",
                              month: "short",
                            })}{" "}
                            —{" "}
                            {dateLabel(manifest.snapshotEnd, {
                              day: "numeric",
                              month: "short",
                            })}
                          </small>
                        </div>
                      </div>
                      <div className="global-source">
                        <i className="dot fire" />
                        {manifest.globalSensor}
                      </div>
                    </div>
                    <Suspense
                      fallback={
                        <div className="globe-loading">
                          <LoaderCircle className="spin" />
                          Preparing Earth
                        </div>
                      }
                    >
                      <Globe
                        observations={observations}
                        onSelect={selectObservation}
                        onCase={() => openCase(manifest.cases[0])}
                        focus={selected}
                        destination={destination?.center}
                        zoom={zoom}
                        reset={reset}
                      />
                    </Suspense>
                    <div className="globe-map-tools">
                      <button
                        className="icon-button"
                        aria-label="Zoom globe in"
                        onClick={() => setZoom((z) => z + 1)}
                      >
                        <Plus size={17} />
                      </button>
                      <button
                        className="icon-button"
                        aria-label="Zoom globe out"
                        onClick={() => setZoom((z) => z - 1)}
                      >
                        <Minus size={17} />
                      </button>
                      <button
                        className="icon-button"
                        aria-label="Reset globe"
                        onClick={() => {
                          setSelected(null);
                          setReset((v) => v + 1);
                        }}
                      >
                        <LocateFixed size={17} />
                      </button>
                    </div>
                    <div className="globe-instructions mono">
                      <Compass size={14} />
                      DRAG TO EXPLORE <span>·</span> SCROLL TO ZOOM
                    </div>
                  </>
                )}
                {destination && (
                  <motion.div
                    className="flight-label"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <span className="eyebrow">ENTERING THE INVESTIGATION</span>
                    <strong>
                      {destination.name}, {destination.country}
                    </strong>
                    <span className="mono">
                      {dateLabel(destination.date)} · NASA AQUA MODIS
                    </span>
                  </motion.div>
                )}
                {loading && (
                  <div className="map-loading">
                    <LoaderCircle className="spin" size={18} />
                    Loading observations
                  </div>
                )}
              </div>
              {study || selected || browseGlobal ? (
                <Dossier
                  study={study}
                  observation={selected}
                  observations={displayRows}
                  period={day ?? month}
                  onSelect={selectObservation}
                  onClose={() => {
                    setSelected(null);
                    setBrowseGlobal(false);
                  }}
                  onCalendar={() => navigate("calendar")}
                  onSources={() => navigate("sources")}
                  onExport={handleExport}
                  wide={wide}
                  onWide={() => {
                    setWide((v) => !v);
                    setToast(
                      wide
                        ? "Case boundary restored."
                        : "Counting the wider scene area. The selected observation stays pinned.",
                    );
                  }}
                />
              ) : (
                <aside className="global-aside">
                  <div className="panel-title">
                    <span className="eyebrow">IN THE CURRENT SNAPSHOT</span>
                    <span className="mono">01—04</span>
                  </div>
                  <p className="list-description">
                    High radiative-power observations
                    <br />
                    across the planet.
                  </p>
                  <div className="global-observation-list">
                    {displayRows.slice(0, 4).map((o, i) => (
                      <button key={o.id} onClick={() => selectObservation(o)}>
                        <span className="observation-index mono">0{i + 1}</span>
                        <div>
                          <strong>{coordinates(o.lon, o.lat)}</strong>
                          <small>
                            {dateLabel(o.time, {
                              day: "numeric",
                              month: "short",
                            })}{" "}
                            · {timeLabel(o.time)}
                          </small>
                        </div>
                        <span className="global-frp">
                          {number(o.frp)}
                          <small>MW</small>
                        </span>
                        <ArrowUpRight size={14} />
                      </button>
                    ))}
                  </div>
                  <div className="snapshot-note">
                    <span className="eyebrow">FOLLOW THE OBSERVATION</span>
                    <p>
                      A hotspot is a satellite detection. Open an observation to
                      see its source, time, confidence and context.
                    </p>
                    <button
                      className="text-button"
                      onClick={() => setBrowseGlobal(true)}
                    >
                      Browse all observations <ArrowUpRight size={13} />
                    </button>
                  </div>
                </aside>
              )}
            </div>
            {study ? (
              <div className="timeline case-timeline">
                <button
                  className="playback-button"
                  aria-label={
                    playing ? "Pause time playback" : "Play time playback"
                  }
                  onClick={() => {
                    if (!day) setDay(dates[0]);
                    setPlaying((v) => !v);
                  }}
                >
                  {playing ? (
                    <Pause size={16} />
                  ) : (
                    <Play size={16} fill="currentColor" />
                  )}
                </button>
                <div className="timeline-label">
                  <span className="eyebrow">
                    {day ? "SELECTED DAY" : "WHOLE MONTH"}
                  </span>
                  <strong>
                    {dateLabel(
                      day ?? month + "-01",
                      day
                        ? { day: "numeric", month: "short", year: "numeric" }
                        : { month: "long", year: "numeric" },
                    )}
                  </strong>
                  <button
                    onClick={() => {
                      setDay(
                        day
                          ? null
                          : study.date.slice(0, 7) === month
                            ? study.date
                            : dates[0],
                      );
                      setSelected(null);
                    }}
                  >
                    {day
                      ? "Show whole month"
                      : study.date.slice(0, 7) === month
                        ? "Show featured day"
                        : "Show one day"}
                  </button>
                </div>
                <div
                  className="timeline-chart"
                  aria-label="Daily detection timeline"
                >
                  <span className="case-timeline-hint">
                    Daily detections · choose a day
                  </span>
                  <div className="timeline-bars">
                    {dayCounts.map((n, i) => (
                      <button
                        key={dates[i]}
                        aria-label={`${dates[i]}, ${n} reported detections`}
                        title={`${dateLabel(dates[i])} · ${integer(n)} detections`}
                        className={day === dates[i] ? "selected" : ""}
                        onClick={() => {
                          setDay(dates[i]);
                          setSelected(null);
                          setPlaying(false);
                        }}
                      >
                        <span
                          style={{
                            height: `${Math.max(3, Math.sqrt(n / Math.max(...dayCounts, 1)) * 100)}%`,
                          }}
                        />
                      </button>
                    ))}
                  </div>
                  <div className="timeline-axis mono">
                    <span>
                      01{" "}
                      {dateLabel(month + "-01", {
                        month: "short",
                      }).toUpperCase()}
                    </span>
                    <span>15</span>
                    <span>
                      {dates.length}{" "}
                      {dateLabel(month + "-01", {
                        month: "short",
                      }).toUpperCase()}
                    </span>
                  </div>
                </div>
                <button
                  className="calendar-shortcut"
                  onClick={() => navigate("calendar")}
                >
                  <CalendarDays size={18} />
                  <span>Fire calendar</span>
                  <ArrowUpRight size={15} />
                </button>
              </div>
            ) : (
              <div className="case-section">
                <div className="case-section-label">
                  <span className="eyebrow">GO DEEPER</span>
                  <h2>
                    Three places.
                    <br />
                    Different perspectives.
                  </h2>
                  <span className="mono">
                    CURATED INVESTIGATIONS <ArrowRight size={13} />
                  </span>
                </div>
                <div className="case-cards">
                  {manifest.cases.map((c, i) => (
                    <button
                      className="case-card"
                      key={c.id}
                      onClick={() => openCase(c)}
                    >
                      <img
                        src={`/assets/${c.image}`}
                        alt={`NASA satellite imagery of ${c.name} on ${c.date}`}
                      />
                      <div className="case-card-gradient" />
                      <span className="case-number mono">
                        0{i + 1} / {c.eyebrow}
                      </span>
                      <div>
                        <h3>
                          {c.name}
                          <ArrowUpRight size={18} />
                        </h3>
                        <span>
                          {c.country} <i /> {dateLabel(c.date)}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        <AnimatePresence mode="wait">
          {view === "report" && (
            <Suspense
              key="report"
              fallback={
                <div className="boot" role="status">
                  Opening Report…
                </div>
              }
            >
              <Report
                manifest={manifest}
                onExplore={(context) => {
                  const target = manifest.cases.find(
                    (c) => c.id === context.caseId,
                  );
                  if (!target) return;
                  commitCase(target);
                  setMonth(context.month);
                  setDay(null);
                  setSensor(
                    context.sensor && context.sensor !== "all"
                      ? context.sensor.toUpperCase()
                      : "all",
                  );
                  setCompare(!context.sensor || context.sensor === "all");
                }}
              />
            </Suspense>
          )}
          {view === "calendar" && study && (
            <Calendar
              key={"calendar" + study.id}
              study={study}
              cases={manifest.cases}
              onStudy={(c) => {
                commitCase(c);
                setView("calendar");
                setDay(null);
              }}
              selectedMonth={month}
              onMonth={(m) => {
                setMonth(m);
                setDay(null);
              }}
              onExplore={() => {
                navigate("explore");
                setDay(null);
                setWide(false);
              }}
              onExport={handleExport}
              onMethods={() => navigate("methods")}
            />
          )}{" "}
          {view === "methods" && (
            <Methods
              key="methods"
              report={report}
              coverage={coverage}
              manifest={manifest}
              onSources={() => navigate("sources")}
            />
          )}{" "}
          {view === "sources" && <Sources key="sources" manifest={manifest} />}
        </AnimatePresence>
      </main>

      <AnimatePresence>
        {toast && (
          <motion.div
            className="toast"
            role="status"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Check size={15} />
            {toast}
            <button
              aria-label="Dismiss notification"
              onClick={() => setToast("")}
            >
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      {reduced && <span className="sr-only">Reduced motion is enabled.</span>}
    </div>
  );
}

import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  ChartNoAxesCombined,
  Check,
  ChevronDown,
  ChevronRight,
  Compass,
  Database,
  FlaskConical,
  Globe2,
  LoaderCircle,
  LocateFixed,
  Minus,
  Pause,
  Play,
  Plus,
  RotateCcw,
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
import { exportInvestigation } from "./exports";
import { offlineStatusMatches } from "./offline-status";
import { brand } from "./brand";
import { readRoute, sectionPurpose, monthlyAvailability } from "./navigation";
import type { View } from "./navigation";
import type { ReportContext } from "./Report";

const Globe = lazy(() => import("./Globe"));
const ExploreAtlas = lazy(() => import("./ExploreAtlas"));
const Report = lazy(() => import("./Report"));
const demoSteps = [
  "A global perspective",
  "An event, up close",
  "Two ways of seeing",
  "What the season reveals",
  "Behind the estimate",
];

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
        {brand.wordmark[0]}
        <span>{brand.wordmark[1]}</span>
        <small>{brand.tagline}</small>
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
  const legacyExplore =
    new URLSearchParams(location.search).get("explore") === "legacy";
  const [atlasOpen, setAtlasOpen] = useState(
    new URLSearchParams(location.search).get("atlas") === "1",
  );
  const [globePaused, setGlobePaused] = useState(false);
  const [browseGlobal, setBrowseGlobal] = useState(false);
  const initialRoute = useRef(readRoute(location.search));
  const [reportContext, setReportContext] = useState<
    ReportContext | undefined
  >();
  const [partitionError, setPartitionError] = useState("");
  const [retry, setRetry] = useState(0);
  const [view, setView] = useState<View>(() => readRoute(location.search).view),
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
  const [demo, setDemo] = useState<number | null>(null),
    [demoPlaying, setDemoPlaying] = useState(false),
    [online, setOnline] = useState(navigator.onLine),
    [offlineReady, setOfflineReady] = useState(false);
  const [offlineUpdate, setOfflineUpdate] = useState<ServiceWorker | null>(
    null,
  );
  const [offlineReplaced, setOfflineReplaced] = useState(false);
  const offlineReloadRequested = useRef(false);
  const reduced = useReducedMotion();
  const [destination, setDestination] = useState<CaseStudy | null>(null);
  useEffect(() => {
    const suspend = () => {
      if (document.hidden) {
        setPlaying(false);
        setDemoPlaying(false);
      }
    };
    document.addEventListener("visibilitychange", suspend);
    return () => document.removeEventListener("visibilitychange", suspend);
  }, []);
  useEffect(() => {
    if (reduced) {
      setPlaying(false);
      setDemoPlaying(false);
    }
  }, [reduced]);
  const flightTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!manifest) return;
    const url = new URL(location.href);
    url.searchParams.set("tab", view);
    if (atlasOpen && !legacyExplore) url.searchParams.set("atlas", "1");
    else url.searchParams.delete("atlas");
    if (view !== "report") url.searchParams.delete("concept");
    const context =
      view === "report"
        ? reportContext
        : study
          ? { caseId: study.id, month, sensor: sensor.toLowerCase() }
          : undefined;
    if (context) {
      url.searchParams.set("case", context.caseId);
      url.searchParams.set("month", context.month);
      url.searchParams.set("sensor", context.sensor ?? "viirs");
    } else
      ["case", "month", "sensor"].forEach((k) => url.searchParams.delete(k));
    history.replaceState(null, "", url);
    document.title = `${brand.name} — ${view === "methods" ? "The science" : view[0].toUpperCase() + view.slice(1)}`;
  }, [
    view,
    manifest,
    study,
    month,
    sensor,
    reportContext,
    atlasOpen,
    legacyExplore,
  ]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setView("explore");
        setTimeout(
          () =>
            document
              .querySelector<HTMLInputElement>(
                '[aria-label=\"Search case studies\"]',
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
        const route = initialRoute.current;
        const target = m.cases.find((c: CaseStudy) => c.id === route.caseId);
        if (target) {
          setStudy(target);
          setMonth(route.month ?? target.date.slice(0, 7));
          setDay(null);
          setSensor(
            route.sensor === "all" ? "all" : route.sensor.toUpperCase(),
          );
        }
        if (route.view === "report" && route.caseId)
          setReportContext({
            caseId: route.caseId,
            month: route.month ?? target?.date.slice(0, 7) ?? "2023-08",
            sensor: route.sensor,
          });
        if (route.view === "calendar" && !target) {
          setStudy(m.cases[0]);
          setMonth(m.cases[0].date.slice(0, 7));
        }
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
    const update = () => setOnline(navigator.onLine);
    let disposed = false;
    let registration: ServiceWorkerRegistration | undefined;
    let hadController = Boolean(navigator.serviceWorker?.controller);
    const status = (event: MessageEvent) => {
      if (
        event.data?.type === "PYROBRIDGE_OFFLINE_STATUS" &&
        event.source === navigator.serviceWorker.controller
      ) {
        setOfflineReady(
          offlineStatusMatches(
            event.data,
            manifest?.bundleVersion,
            import.meta.env.VITE_APP_BUILD_ID,
          ),
        );
      }
    };
    const controlled = () => {
      setOfflineReady(false);
      if (offlineReloadRequested.current) {
        location.reload();
        return;
      }
      if (hadController) setOfflineReplaced(true);
      hadController = true;
      navigator.serviceWorker.controller?.postMessage({
        type: "OFFLINE_STATUS",
      });
    };
    const checkWaiting = () => {
      if (!disposed) setOfflineUpdate(registration?.waiting ?? null);
    };
    const found = () => {
      const installing = registration?.installing;
      installing?.addEventListener("statechange", checkWaiting);
    };
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    if ("serviceWorker" in navigator && import.meta.env.PROD) {
      navigator.serviceWorker.addEventListener("message", status);
      navigator.serviceWorker.addEventListener("controllerchange", controlled);
      navigator.serviceWorker
        .register("/service-worker.js", { updateViaCache: "none" })
        .then((r) => {
          if (disposed) return;
          registration = r;
          checkWaiting();
          r.addEventListener("updatefound", found);
          found();
          navigator.serviceWorker.controller?.postMessage({
            type: "OFFLINE_STATUS",
          });
        })
        .catch(() => {});
    }
    return () => {
      disposed = true;
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
      navigator.serviceWorker?.removeEventListener("message", status);
      navigator.serviceWorker?.removeEventListener(
        "controllerchange",
        controlled,
      );
      registration?.removeEventListener("updatefound", found);
    };
  }, [manifest?.bundleVersion]);
  useEffect(() => {
    if (!study) return;
    let active = true;
    setLoading(true);
    setPartitionError("");
    setCaseRows([]);
    setSelected(null);
    const m = (study.contextMonths ?? study.months).find(
      (m) => m.month === month,
    );
    if (!m || (m.modis === null && m.viirs === null)) {
      setLoading(false);
      setPartitionError(
        "No source record is bundled for this month. Missing records are not zero detections.",
      );
      return;
    }
    if ((m.modis ?? 0) + (m.viirs ?? 0) === 0) {
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
          setPartitionError(
            navigator.onLine
              ? "This observation partition could not be loaded. Retry, or open the featured month."
              : "This month was not saved offline. Reconnect and retry, or open the featured month.",
          );
        }
      });
    return () => {
      active = false;
    };
  }, [study, month, retry]);
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
    setCompare(false);
    setSensor("all");
    setDaynight("all");
    setWide(false);
    setPlaying(false);
    setSearch("");
    setReset((v) => v + 1);
  }
  function openCase(c: CaseStudy) {
    cancelFlight();
    if (
      (legacyExplore || !atlasOpen) &&
      !study &&
      view === "explore" &&
      !reduced
    ) {
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
    window.scrollTo(0, 0);
    cancelFlight();
    setStudy(null);
    setAtlasOpen(false);
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
    if (v === "report" && (view === "explore" || view === "calendar")) {
      setReportContext(
        study
          ? {
              caseId: study.id,
              month,
              sensor: sensor.toLowerCase() as ReportContext["sensor"],
            }
          : selected
            ? {
                caseId: "global-snapshot",
                month: selected.time.slice(0, 7),
                sensor: "viirs",
              }
            : undefined,
      );
    }
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
  function demoAction(step: number) {
    if (!manifest) return;
    setDemo(step);
    if (step === 0) {
      toGlobal();
    }
    if (step === 1) openCase(manifest.cases[0]);
    if (step === 2) {
      commitCase(manifest.cases[0]);
      setView("explore");
      setCompare(true);
      setSensor("all");
    }
    if (step === 3) {
      commitCase(manifest.cases[0]);
      setReportContext(undefined);
      setView("report");
      setDay(null);
    }
    if (step === 4) {
      navigate("methods");
    }
  }
  useEffect(() => {
    if (!demoPlaying || demo === null) return;
    const timer = setTimeout(
      () => {
        if (demo < 4) demoAction(demo + 1);
        else setDemoPlaying(false);
      },
      demo === 0 ? 5000 : demo === 1 ? 6500 : 6000,
    );
    return () => clearTimeout(timer);
  }, [demo, demoPlaying, manifest]);
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
  return (
    <div
      className="app-shell"
      onPointerDownCapture={(e) => {
        if (!(e.target as Element).closest(".demo-controller, .demo-button")) {
          setDemoPlaying(false);
          if (destination) cancelFlight();
        }
      }}
    >
      <a className="skip-link" href="#main-content">
        Skip to the observatory
      </a>
      <aside className="rail">
        <button
          className="rail-logo"
          onClick={toGlobal}
          aria-label={`${brand.name} home`}
        >
          <Brand />
        </button>
        <div className="rail-nav">
          {[
            { id: "explore" as View, icon: Globe2, label: "Explore Earth" },
            {
              id: "report" as View,
              icon: ChartNoAxesCombined,
              label: "Report",
            },
            {
              id: "calendar" as View,
              icon: CalendarDays,
              label: "Fire calendar",
            },
            {
              id: "methods" as View,
              icon: FlaskConical,
              label: "Methods and validation",
            },
            {
              id: "sources" as View,
              icon: Database,
              label: "Data and provenance",
            },
          ].map((n) => (
            <button
              className={view === n.id ? "active" : ""}
              key={n.id}
              onClick={() => navigate(n.id)}
              title={n.label}
              aria-label={n.label}
              aria-current={view === n.id ? "page" : undefined}
            >
              <n.icon size={21} />
            </button>
          ))}
        </div>
        <a
          className="rail-nasa"
          href="https://www.spaceappschallenge.org/2026/challenges/modis-and-viirs-hot-spots/"
          target="_blank"
          rel="noreferrer"
          title="NASA Space Apps Challenge"
        >
          NASA
          <small>
            SPACE
            <br />
            APPS
          </small>
        </a>
      </aside>
      <main className="app-main" id="main-content" tabIndex={-1}>
        <header className="topbar">
          <button className="wordmark" onClick={toGlobal}>
            <Brand />
          </button>
          <nav aria-label="Main navigation">
            <button
              className={view === "explore" ? "active" : ""}
              onClick={() => navigate("explore")}
              aria-current={view === "explore" ? "page" : undefined}
              title={sectionPurpose.explore}
            >
              Explore
            </button>
            <button
              className={view === "report" ? "active" : ""}
              onClick={() => navigate("report")}
              aria-current={view === "report" ? "page" : undefined}
            >
              Report
            </button>
            <button
              className={view === "calendar" ? "active" : ""}
              onClick={() => navigate("calendar")}
              aria-current={view === "calendar" ? "page" : undefined}
              title={sectionPurpose.calendar}
            >
              Fire calendar
            </button>
            <button
              className={view === "methods" ? "active" : ""}
              onClick={() => navigate("methods")}
              aria-current={view === "methods" ? "page" : undefined}
              title={sectionPurpose.methods}
            >
              The science
            </button>
            <button
              className={view === "sources" ? "active" : ""}
              onClick={() => navigate("sources")}
              aria-current={view === "sources" ? "page" : undefined}
              title={sectionPurpose.sources}
            >
              Sources
            </button>
          </nav>
          <div className="topbar-right">
            <span className="snapshot-status">
              <i />
              {online ? "OBSERVATION SNAPSHOT" : "OFFLINE SNAPSHOT"}
            </span>
            <button
              className="demo-button"
              onClick={() => {
                demoAction(0);
                setDemoPlaying(!reduced);
              }}
            >
              <Play size={12} fill="currentColor" />
              Take a tour
            </button>
          </div>
        </header>
        {view === "explore" && (
          <div
            className={`explore-view ${!legacyExplore ? "atlas-mode" : ""} ${!study && !atlasOpen && !legacyExplore ? "orbital-entry" : ""}`}
          >
            <div className="explore-toolbar">
              <div className="breadcrumbs">
                <button onClick={toGlobal}>
                  <Globe2 size={14} />
                  Earth
                </button>
                {study && (
                  <>
                    <ChevronRight size={12} />
                    <span>{study.country}</span>
                    <ChevronRight size={12} />
                    <strong>{study.name}</strong>
                  </>
                )}
              </div>
              <div className="search-wrap">
                <Search size={15} />
                <input
                  aria-label="Search case studies"
                  placeholder="Find an investigation…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setTimeout(() => setSearchFocused(false), 180)}
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
                        No case study matches. Explore any observation directly
                        on the globe.
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
              {study && (
                <div className="filter-wrap">
                  <select
                    aria-label="Filter satellite"
                    value={sensor}
                    onChange={(e) => {
                      setSensor(e.target.value);
                      setCompare(false);
                      setSelected(null);
                    }}
                  >
                    <option value="all">Both satellites</option>
                    <option value="MODIS">Aqua MODIS</option>
                    <option value="VIIRS">S-NPP VIIRS</option>
                  </select>
                  <ChevronDown size={13} />
                </div>
              )}
            </div>
            {!study && !legacyExplore && atlasOpen && (
              <div className="atlas-scene-intro">
                <div>
                  <span className="eyebrow">NASA FIRE OBSERVATIONS</span>
                  <h1>
                    Follow the shapes. <em>Find the activity.</em>
                  </h1>
                </div>
                <div className="atlas-snapshot-summary">
                  <strong>
                    {integer(observations.length)} satellite detections
                  </strong>
                  <span>
                    NOAA-20 VIIRS · {dateLabel(manifest.snapshotStart)} –{" "}
                    {dateLabel(manifest.snapshotEnd)}
                  </span>
                  <button onClick={() => setBrowseGlobal(true)}>
                    Browse original observations <ArrowUpRight size={12} />
                  </button>
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
                    recordStatus={
                      loading
                        ? "Loading observations…"
                        : partitionError
                          ? "Observations unavailable"
                          : monthlyAvailability(study, month, sensor) ===
                              "missing"
                            ? "No source record"
                            : undefined
                    }
                    reset={reset}
                    wide={wide}
                  />
                ) : (
                  <>
                    {(legacyExplore || !atlasOpen) && (
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
                          <em>Every observation matters.</em>
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
                          NOAA-20 VIIRS <span>375 m at nadir</span>
                        </div>
                        {!legacyExplore && (
                          <button
                            className="primary-button open-contour-atlas"
                            onClick={() => {
                              setSelected(null);
                              setBrowseGlobal(false);
                              setAtlasOpen(true);
                            }}
                          >
                            Explore by place <ArrowRight size={17} />
                          </button>
                        )}
                      </div>
                    )}
                    <Suspense
                      fallback={
                        <div className="globe-loading">
                          <LoaderCircle className="spin" />
                          Preparing Earth
                        </div>
                      }
                    >
                      {legacyExplore || !atlasOpen ? (
                        <Globe
                          observations={observations}
                          onSelect={selectObservation}
                          onCase={() => openCase(manifest.cases[0])}
                          focus={selected}
                          destination={destination?.center}
                          zoom={zoom}
                          reset={reset}
                          paused={globePaused}
                          onAtlas={
                            legacyExplore
                              ? undefined
                              : () => {
                                  setSelected(null);
                                  setBrowseGlobal(false);
                                  setAtlasOpen(true);
                                }
                          }
                        />
                      ) : (
                        <ExploreAtlas
                          observations={observations}
                          cases={manifest.cases}
                          onSelect={selectObservation}
                          onCase={commitCase}
                          snapshotStart={manifest.snapshotStart}
                          snapshotEnd={manifest.snapshotEnd}
                          focus={selected}
                          zoom={zoom}
                          reset={reset}
                          onBackToGlobe={() => {
                            setAtlasOpen(false);
                            setSelected(null);
                            setBrowseGlobal(false);
                            setReset((v) => v + 1);
                          }}
                        />
                      )}
                    </Suspense>
                    {(legacyExplore || !atlasOpen) && (
                      <>
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
                          <button
                            className="icon-button"
                            aria-label={
                              globePaused
                                ? "Resume globe motion"
                                : "Pause globe motion"
                            }
                            aria-pressed={globePaused}
                            onClick={() => setGlobePaused((v) => !v)}
                          >
                            {globePaused ? (
                              <Play size={16} />
                            ) : (
                              <Pause size={16} />
                            )}
                          </button>
                        </div>
                        <div className="globe-instructions mono">
                          <Compass size={14} />
                          DRAG TO EXPLORE <span>·</span> SCROLL TO ZOOM
                        </div>
                      </>
                    )}
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
                  onSelect={selectObservation}
                  recordStatus={
                    study
                      ? loading
                        ? "Loading observations…"
                        : partitionError ||
                          (monthlyAvailability(study, month, sensor) ===
                          "missing"
                            ? "No source record for this sensor and month."
                            : "")
                      : undefined
                  }
                  countStatus={
                    study
                      ? {
                          modis: loading
                            ? "Loading…"
                            : partitionError
                              ? "Unavailable"
                              : sensor === "VIIRS"
                                ? "Not selected"
                                : monthlyAvailability(study, month, "MODIS") ===
                                    "missing"
                                  ? "No source record"
                                  : "",
                          viirs: loading
                            ? "Loading…"
                            : partitionError
                              ? "Unavailable"
                              : sensor === "MODIS"
                                ? "Not selected"
                                : monthlyAvailability(study, month, "VIIRS") ===
                                    "missing"
                                  ? "No source record"
                                  : "",
                        }
                      : undefined
                  }
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
              ) : legacyExplore ? (
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
              ) : null}
            </div>
            {study && (
              <div className="investigation-context">
                <span>
                  <strong>{study.name}</strong> · {day ?? month} ·{" "}
                  {sensor === "all" ? "Aqua MODIS + S-NPP VIIRS" : sensor} ·{" "}
                  {wide ? "Wider scene" : "Study rectangle"}
                </span>
                <button
                  className="text-button"
                  onClick={() => navigate("report")}
                >
                  <ChartNoAxesCombined size={15} /> Discover this period in
                  Report <ArrowRight size={14} />
                </button>
              </div>
            )}
            {study &&
              (partitionError ||
                monthlyAvailability(study, month, sensor) === "missing") && (
                <div className="partition-state" role="status">
                  <strong>Observations unavailable for this selection</strong>
                  <p>
                    {partitionError ||
                      "This sensor has no source record here in this month. Missing records are not zero detections."}
                  </p>
                  <button onClick={() => setRetry((v) => v + 1)}>
                    Retry loading
                  </button>
                  <button
                    onClick={() => {
                      setMonth(study.date.slice(0, 7));
                      setDay(study.date);
                      setSensor("all");
                    }}
                  >
                    Open featured month
                  </button>
                </div>
              )}
            {study &&
              !partitionError &&
              monthlyAvailability(study, month, sensor) === "partial" && (
                <p className="coverage-note">
                  Only one sensor has a source record in this month. Counts are
                  partial, and observing effort has not been normalized.
                </p>
              )}
            {study ? (
              <div className="timeline" aria-busy={loading}>
                <button
                  className="playback-button"
                  disabled={
                    loading ||
                    Boolean(partitionError) ||
                    monthlyAvailability(study, month, sensor) === "missing"
                  }
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
                    {day ? "SELECTED DAY" : "SELECTED MONTH"}
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
                    {day ? "View entire month" : "View one day"}
                  </button>
                </div>
                <div className="timeline-chart">
                  <div className="timeline-bars">
                    {dayCounts.map((n, i) => (
                      <button
                        key={dates[i]}
                        disabled={
                          loading ||
                          Boolean(partitionError) ||
                          monthlyAvailability(study, month, sensor) ===
                            "missing"
                        }
                        aria-label={`${dates[i]}, ${loading || partitionError ? "observations unavailable" : n + " reported detections"}`}
                        title={`${dateLabel(dates[i])} · ${loading || partitionError || monthlyAvailability(study, month, sensor) === "missing" ? "observations unavailable" : integer(n) + " detections"}`}
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
                  <span>
                    Explore
                    <br />
                    the calendar
                  </span>
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
                  Opening the report…
                </div>
              }
            >
              <Report
                manifest={manifest}
                context={reportContext}
                onExplore={(context) => {
                  const target = manifest.cases.find(
                    (c) => c.id === context.caseId,
                  );
                  if (!target) return;
                  commitCase(target);
                  setMonth(context.month);
                  setDay(null);
                  setSensor(
                    context.sensor === "all"
                      ? "all"
                      : (context.sensor ?? "viirs").toUpperCase(),
                  );
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
        <footer className="app-footer">
          <span>
            <span className="footer-status" />
            {offlineReady ? "OFFLINE BUNDLE READY" : "PINNED NASA DATA BUNDLE"}
          </span>
          {(offlineUpdate || offlineReplaced) && (
            <button
              onClick={() => {
                if (!offlineUpdate || offlineUpdate.state === "activated") {
                  location.reload();
                  return;
                }
                offlineReloadRequested.current = true;
                setOfflineReady(false);
                offlineUpdate.postMessage({ type: "ACTIVATE_UPDATE" });
              }}
            >
              {offlineUpdate ? "Update and reload" : "Reload updated app"}
            </button>
          )}
          <button onClick={() => navigate("sources")}>
            GLOBAL SNAPSHOT {dateLabel(manifest.snapshotEnd).toUpperCase()} ·{" "}
            {timeLabel(manifest.snapshotEnd)}
          </button>
          <a href="/playground.html">Playground & brand ideas</a>
          <span>
            BUILT FOR NASA SPACE APPS <span className="footer-year">2026</span>
          </span>
        </footer>
      </main>
      <AnimatePresence>
        {demo !== null && (
          <motion.div
            className="demo-controller"
            initial={{ y: 90, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 90, opacity: 0 }}
            transition={{ type: "spring", bounce: 0.2 }}
          >
            <button
              className="demo-toggle"
              aria-label={
                demoPlaying ? "Pause guided tour" : "Resume guided tour"
              }
              onClick={() => setDemoPlaying((v) => !v)}
            >
              {demoPlaying ? <Pause size={16} /> : <Play size={16} />}
            </button>
            <div>
              <span className="eyebrow">
                A GUIDED EXPLORATION · {demo + 1} / 5
              </span>
              <strong>{demoSteps[demo]}</strong>
              <div className="demo-progress">
                {demoSteps.map((s, i) => (
                  <button
                    key={s}
                    title={s}
                    aria-label={`Tour step ${i + 1}: ${s}`}
                    className={i === demo ? "active" : i < demo ? "done" : ""}
                    onClick={() => demoAction(i)}
                  />
                ))}
              </div>
            </div>
            <button
              className="icon-button"
              aria-label="Previous tour step"
              onClick={() => demoAction(Math.max(0, demo - 1))}
              disabled={demo === 0}
            >
              <ArrowLeft size={16} />
            </button>
            <button
              className="icon-button"
              aria-label="Next tour step"
              onClick={() => demoAction(Math.min(4, demo + 1))}
              disabled={demo === 4}
            >
              <ArrowRight size={16} />
            </button>
            <button
              className="icon-button"
              aria-label="Replay tour"
              onClick={() => {
                demoAction(0);
                setDemoPlaying(!reduced);
              }}
            >
              <RotateCcw size={15} />
            </button>
            <button
              className="icon-button"
              aria-label="Close guided tour"
              onClick={() => {
                setDemo(null);
                setDemoPlaying(false);
              }}
            >
              <X size={17} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
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

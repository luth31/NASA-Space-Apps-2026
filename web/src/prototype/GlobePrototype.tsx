// Local design comparison for the Explore route. Inspect the three versions with ?variant=.
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDownRight,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  ChevronRight,
  CircleDot,
  Globe2,
  Grid2X2,
  Layers3,
  MapPinned,
  Orbit,
  Pause,
  Play,
  RotateCcw,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { coordinates, dateLabel, integer, number, timeLabel } from "../data";
import type { Manifest, Observation } from "../data";
import { frameFor, grid, groupGeography, signalClusters } from "./geography";
import type { Area, Geography } from "./geography";
import PrototypeMap from "./PrototypeMap";
import type { Style } from "./PrototypeMap";
import mapUnitsUrl from "./map-units.json?url";
import "./prototype.css";

const variants = {
  orbital: { id: "A", name: "Orbital Atlas", icon: Orbit },
  atlas: { id: "B", name: "Border Atlas", icon: MapPinned },
  grid: { id: "C", name: "Signal Grid", icon: Grid2X2 },
};
const choices = Object.keys(variants) as Style[];

type Props = {
  observations: Observation[];
  manifest: Manifest;
  variant: Style;
  reset: number;
  onVariant: (style: Style | null) => void;
  onSelect: (row: Observation) => void;
};

export default function GlobePrototype(props: Props) {
  const [geography, setGeography] = useState<Geography | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    fetch(mapUnitsUrl, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw Error("Prototype geography is unavailable.");
        return response.json() as Promise<Geography>;
      })
      .then(setGeography)
      .catch(() => {
        if (!controller.signal.aborted) setError(true);
      });
    return () => controller.abort();
  }, []);
  return (
    <>
      {geography ? (
        <Explorer key={props.variant} {...props} geography={geography} />
      ) : (
        <div className="prototype-loading">
          {error ? "The map data could not be loaded." : "Loading the atlas…"}
        </div>
      )}
      <PrototypeSwitcher current={props.variant} onChange={props.onVariant} />
    </>
  );
}

function PrototypeSwitcher({
  current,
  onChange,
}: {
  current: Style;
  onChange: Props["onVariant"];
}) {
  function cycle(delta: number) {
    onChange(
      choices[
        (choices.indexOf(current) + delta + choices.length) % choices.length
      ],
    );
  }
  useEffect(() => {
    function key(event: KeyboardEvent) {
      if (
        event.altKey ||
        event.metaKey ||
        event.ctrlKey ||
        event.defaultPrevented ||
        (event.target instanceof HTMLElement &&
          event.target.closest(
            "input,select,textarea,button,[contenteditable]",
          ))
      )
        return;
      if (event.key === "ArrowLeft") cycle(-1);
      if (event.key === "ArrowRight") cycle(1);
    }
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  });
  return (
    <nav className="prototype-switcher" aria-label="Globe prototypes">
      <button
        className="prototype-cycle"
        aria-label="Previous globe design"
        onClick={() => cycle(-1)}
      >
        <ArrowLeft size={14} />
      </button>
      {choices.map((key) => {
        const option = variants[key];
        return (
          <button
            key={key}
            className={`prototype-option ${current === key ? "is-active" : ""}`}
            aria-pressed={current === key}
            onClick={() => onChange(key)}
          >
            <span>{option.id}</span>
            <strong>{option.name}</strong>
          </button>
        );
      })}
      <button
        className="prototype-cycle"
        aria-label="Next globe design"
        onClick={() => cycle(1)}
      >
        <ArrowRight size={14} />
      </button>
      <button
        className="prototype-exit"
        aria-label="Return to current dashboard"
        onClick={() => onChange(null)}
      >
        <X size={14} />
      </button>
    </nav>
  );
}

function Explorer({
  observations,
  manifest,
  variant,
  geography,
  reset,
  onSelect,
}: Props & { geography: Geography }) {
  const demoRequested =
    new URLSearchParams(window.location.search).get("tour") === "1";
  const [demoStep, setDemoStep] = useState(demoRequested ? 0 : null);
  const [playing, setPlaying] = useState(demoRequested);
  const [level, setLevel] = useState(0);
  const [selection, setSelection] = useState<string[]>([]);
  const [hovered, setHovered] = useState<Area | null>(null);
  const [hoverPoint, setHoverPoint] = useState<Observation | null>(null);
  const [point, setPoint] = useState<Observation | null>(null);
  const [page, setPage] = useState(0);
  const list = useRef<HTMLDivElement>(null);
  const groups = useMemo(
    () => groupGeography(geography, observations),
    [geography, observations],
  );
  const signals = useMemo(
    () => signalClusters(observations, 3),
    [observations],
  );
  const motionSignal = useMemo(() => signals.slice(0, 420), [signals]);
  const zones = useMemo(() => grid(observations, 15), [observations]);
  const isOrbital = variant === "orbital";
  const isAtlas = variant === "atlas";
  const first = useMemo(
    () =>
      (isOrbital
        ? groups.regions
        : isAtlas
          ? [...groups.continents, groups.unmatched]
          : zones
      ).filter((area) => area.rows.length),
    [groups, zones, isOrbital, isAtlas],
  );
  const primary = first.find((area) => area.id === selection[0]) ?? null;
  const countryLevel = useMemo(
    () =>
      isAtlas
        ? groups.countries.filter(
            (area) => area.parent === primary?.id && area.rows.length,
          )
        : [],
    [groups, isAtlas, primary],
  );
  const country = countryLevel.find((area) => area.id === selection[1]) ?? null;
  const hasCountries = isAtlas && primary?.id !== groups.unmatched.id;
  const location = country ?? primary;
  const cellSize = isOrbital ? 2 : isAtlas ? 1 : 2.5;
  const sectors = useMemo(
    () => grid(location?.rows ?? [], cellSize),
    [location, cellSize],
  );
  const sector =
    sectors.find((area) => area.id === selection[hasCountries ? 2 : 1]) ?? null;
  const active = sector ?? location;
  const stage = level === 0 ? "globe" : !primary ? "world" : "detail";
  const sectorLevel = Boolean(primary && (!hasCountries || country));
  const available = sector
    ? []
    : sectorLevel
      ? sectors
      : primary
        ? countryLevel
        : first;
  const totalRows = active?.rows ?? observations;
  const focusBounds = useMemo(() => frameFor(active), [active]);
  const mapSignal = useMemo(
    () =>
      active && active.kind !== "sector"
        ? signalClusters(active.rows, isAtlas ? 0.5 : 1)
        : signals,
    [active, isAtlas, signals],
  );
  const pointRows = useMemo(
    () =>
      sector
        ? [...sector.rows].sort((a, b) => (b.frp ?? -1) - (a.frp ?? -1))
        : [],
    [sector],
  );
  const demoFrames = useMemo(() => {
    const region = isOrbital
      ? (first.find((item) => item.id === "Eastern Africa") ?? first[0])
      : isAtlas
        ? (first.find((item) => item.id === "Africa") ?? first[0])
        : first[0];
    if (!region) return [];
    const localCountry = isAtlas
      ? groups.countries.find(
          (item) => item.parent === region.id && item.rows.length,
        )
      : null;
    const frames: {
      level: number;
      path: string[];
      caption: string;
      point?: Observation | null;
    }[] = [
      { level: 0, path: [], caption: "Start with the global VIIRS snapshot." },
      {
        level: 1,
        path: [],
        caption: isOrbital
          ? "Unfold the globe into an oval atlas."
          : isAtlas
            ? "Open the map of continents."
            : "Compare activity across 15° zones.",
      },
      {
        level: 2,
        path: [region.id],
        caption: isOrbital
          ? `Zoom into ${region.name}.`
          : isAtlas
            ? `Open ${region.name} and compare countries.`
            : "Zoom into the zone with the most detections.",
      },
    ];
    if (localCountry) {
      frames.push({
        level: 3,
        path: [region.id, localCountry.id],
        caption: `See the 1° sectors across ${localCountry.name}.`,
      });
    }
    const cell = grid((localCountry ?? region).rows, cellSize)[0];
    if (cell) {
      const path = localCountry
        ? [region.id, localCountry.id, cell.id]
        : [region.id, cell.id];
      frames.push({
        level: localCountry ? 4 : 3,
        path,
        caption: `Inspect the original detections in a ${cellSize}° sector.`,
      });
      frames.push({
        level: localCountry ? 4 : 3,
        path,
        caption: "Select one detection to see its time, location, and FRP.",
        point: cell.peak,
      });
    }
    return frames;
  }, [first, groups, isOrbital, isAtlas, cellSize]);
  const demoFrame = demoStep == null ? null : demoFrames[demoStep];
  const demoFinished = demoStep === demoFrames.length - 1;
  useEffect(() => {
    if (!playing || !demoFrame || demoStep === null) return;
    const timer = window.setTimeout(
      () => {
        const next = demoFrames[demoStep + 1];
        if (!next) {
          setPlaying(false);
          return;
        }
        goTo(next.level, next.path);
        setPoint(next.point ?? null);
        setDemoStep(demoStep + 1);
      },
      demoStep === 0 ? 2100 : 2900,
    );
    return () => clearTimeout(timer);
  }, [playing, demoStep, demoFrame, demoFrames]);

  function replay() {
    goTo(0, []);
    setDemoStep(0);
    setPlaying(true);
  }
  function stopDemo() {
    setPlaying(false);
    setDemoStep(null);
  }

  const isWorld = stage === "world" || stage === "globe";
  const cardArea =
    (hovered && available.find((area) => area.id === hovered.id)) || active;

  const dataRange = `${dateLabel(manifest.snapshotStart, { day: "numeric", month: "short" })}–${dateLabel(manifest.snapshotEnd, { day: "numeric", month: "short", year: "numeric" })}`;
  const title = point
    ? "Hotspot detail"
    : sector
      ? "Sector " + sector.name
      : location && !isOrbital
        ? location.name
        : primary
          ? primary.name
          : stage === "world" && isOrbital
            ? "Earth, unfolded"
            : variant === "grid"
              ? "Signal Grid"
              : stage === "world"
                ? "Continents"
                : "Earth’s hotspots";

  useEffect(() => {
    goTo(0, []);
  }, [reset]);
  useEffect(() => {
    setHovered(null);
    setHoverPoint(null);
    setPoint(null);
    setPage(0);
  }, [observations]);
  useEffect(() => {
    if (
      selection.length &&
      (!primary ||
        (hasCountries && selection.length >= 2 && !country) ||
        (selection.length === (hasCountries ? 3 : 2) && !sector))
    )
      goTo(1, []);
  }, [selection, primary, country, sector, hasCountries]);

  function goTo(next: number, path: string[]) {
    setLevel(next);
    setSelection(path);
    setHovered(null);
    setHoverPoint(null);
    setPoint(null);
    setPage(0);
    list.current?.scrollTo(0, 0);
  }
  function open(area: Area) {
    stopDemo();
    if (!area.rows.length) return;
    if (level === 0 && isOrbital) {
      goTo(1, []);
      return;
    }
    if (!primary) goTo(2, [area.id]);
    else if (hasCountries && !country) goTo(3, [primary.id, area.id]);
    else if (!sector) goTo(hasCountries ? 4 : 3, [...selection, area.id]);
  }
  function openPoint(row: Observation) {
    stopDemo();
    setPoint(row);
  }
  function back() {
    stopDemo();
    if (point) setPoint(null);
    else if (selection.length)
      goTo(Math.max(1, level - 1), selection.slice(0, -1));
    else goTo(0, []);
  }
  function keyDown(event: React.KeyboardEvent) {
    if (event.key === "Escape" && level > 0) {
      event.stopPropagation();
      back();
    }
  }
  function onAreaHover(area: Area | null) {
    setHovered(area);
  }

  const map = (
    <PrototypeMap
      style={variant}
      stage={stage}
      land={groups.land}
      motionLand={groups.motionLand}
      outline={sector ? location?.geometry : active?.geometry}
      areas={available}
      signal={mapSignal}
      motionSignal={motionSignal}
      bounds={focusBounds}
      rows={pointRows}
      sector={sector?.bounds}
      showPoints={Boolean(sector)}
      hovered={hovered}
      selectedPoint={point}
      onHover={onAreaHover}
      onOpen={open}
      onPoint={openPoint}
      onHoverPoint={setHoverPoint}
    />
  );
  const navigation = (
    <nav className="prototype-path" aria-label="Map path">
      <button
        onClick={() => goTo(0, [])}
        aria-current={stage === "globe" ? "page" : undefined}
      >
        <Globe2 size={14} /> Earth
      </button>
      {stage !== "globe" && (
        <>
          <ChevronRight size={13} />
          <button
            onClick={() => goTo(1, [])}
            aria-current={!primary ? "page" : undefined}
          >
            {isOrbital ? "World atlas" : isAtlas ? "Continents" : "15° zones"}
          </button>
        </>
      )}
      {primary && (
        <>
          <ChevronRight size={13} />
          <button
            onClick={() => goTo(2, [primary.id])}
            aria-current={!country && !sector ? "page" : undefined}
          >
            {primary.name}
          </button>
        </>
      )}
      {country && (
        <>
          <ChevronRight size={13} />
          <button
            onClick={() => goTo(3, [primary!.id, country.id])}
            aria-current={!sector ? "page" : undefined}
          >
            {country.name}
          </button>
        </>
      )}
      {sector && (
        <>
          <ChevronRight size={13} />
          <button onClick={() => setPoint(null)} aria-current="page">
            {cellSize}° sector
          </button>
        </>
      )}
    </nav>
  );
  const listTitle = sector
    ? "Hotspot observations"
    : sectorLevel
      ? `${cellSize}° sectors`
      : primary
        ? "Countries & territories"
        : isOrbital
          ? "Regions"
          : isAtlas
            ? "Continents"
            : "15° zones";
  const displayAreas = available;
  const range = pointRows.slice(page * 35, (page + 1) * 35);
  const topCount = displayAreas[0]?.rows.length ?? 1;
  const displayList = (
    <section className="prototype-list-shell" aria-label={listTitle}>
      <div className="prototype-list-head">
        <h2>{listTitle}</h2>
        <span>{integer(sector ? pointRows.length : displayAreas.length)}</span>
      </div>
      <div
        className="prototype-list-scroll"
        ref={list}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) {
            setHovered(null);
          }
        }}
        onMouseLeave={() => setHovered(null)}
      >
        {sector
          ? range.map((row) => (
              <button
                className="prototype-row"
                key={row.id}
                aria-pressed={point?.id === row.id}
                onClick={() => openPoint(row)}
              >
                <span>
                  <strong>{coordinates(row.lon, row.lat)}</strong>
                  <small>{timeLabel(row.time)}</small>
                </span>
                <span>{row.frp === null ? "—" : `${number(row.frp)} MW`}</span>
                <ArrowUpRight size={13} />
              </button>
            ))
          : displayAreas.map((area) => (
              <button
                className="prototype-row"
                key={area.id}
                data-area-id={area.id}
                data-active={hovered?.id === area.id}
                onMouseEnter={() => onAreaHover(area)}
                onFocus={() => onAreaHover(area)}
                onClick={() => open(area)}
              >
                <span>
                  <strong>{area.name}</strong>
                  {variant === "grid" && (
                    <i
                      style={{
                        width: `${Math.max(4, Math.sqrt(area.rows.length / topCount) * 100)}%`,
                      }}
                    />
                  )}
                </span>
                <span>{integer(area.rows.length)}</span>
                <ChevronRight size={13} />
              </button>
            ))}
        {!pointRows.length && !displayAreas.length && (
          <div className="prototype-empty">
            No detections match this filter.
          </div>
        )}
      </div>
      {sector && pointRows.length > 35 && (
        <div className="prototype-pager">
          <button
            aria-label="Previous hotspots"
            disabled={!page}
            onClick={() => {
              setPage(page - 1);
              list.current?.scrollTo(0, 0);
            }}
          >
            <ArrowLeft size={15} />
          </button>
          <span>
            {page * 35 + 1}–{Math.min((page + 1) * 35, pointRows.length)} of{" "}
            {integer(pointRows.length)}
          </span>
          <button
            aria-label="Next hotspots"
            disabled={(page + 1) * 35 >= pointRows.length}
            onClick={() => {
              setPage(page + 1);
              list.current?.scrollTo(0, 0);
            }}
          >
            <ArrowRight size={15} />
          </button>
        </div>
      )}
    </section>
  );

  const inspectedPoint = hoverPoint ?? point;
  const currentStats = inspectedPoint ? (
    <div className="prototype-stats" data-context="point">
      <span className="prototype-kicker">
        NOAA-20 VIIRS · {dateLabel(inspectedPoint.time)}
      </span>
      <strong>
        {number(inspectedPoint.frp)} <small>MW</small>
      </strong>
      <p>
        {coordinates(inspectedPoint.lon, inspectedPoint.lat)}
        <br />
        {timeLabel(inspectedPoint.time)} · {inspectedPoint.confidence}{" "}
        confidence
      </p>
      {point && inspectedPoint.id === point.id && (
        <button
          className="prototype-text-action"
          onClick={() => onSelect(point)}
        >
          Open observation dossier <ArrowUpRight size={14} />
        </button>
      )}
    </div>
  ) : (
    <div className="prototype-stats" data-context={cardArea?.id ?? "world"}>
      <span className="prototype-kicker">
        {cardArea?.name ?? "Global snapshot"}
      </span>
      <strong>{integer(cardArea?.rows.length ?? totalRows.length)}</strong>
      <p>Reported detections</p>
      {cardArea && (
        <dl>
          <div>
            <dt>DAY</dt>
            <dd>{integer(cardArea.daytime)}</dd>
          </div>
          <div>
            <dt>NIGHT</dt>
            <dd>{integer(cardArea.rows.length - cardArea.daytime)}</dd>
          </div>
          <div>
            <dt>PEAK FRP</dt>
            <dd>
              {cardArea.peak?.frp != null
                ? `${number(cardArea.peak.frp)} MW`
                : "—"}
            </dd>
          </div>
        </dl>
      )}
    </div>
  );

  return (
    <section
      className={`globe-prototype prototype-${variant}`}
      data-stage={stage}
      data-level={level}
      onKeyDown={keyDown}
      onPointerDownCapture={(event) => {
        if (
          demoFrame &&
          event.target instanceof Element &&
          !event.target.closest(".prototype-demo")
        )
          stopDemo();
      }}
    >
      <div className="prototype-top">
        {navigation}
        <span className="prototype-date">
          NOAA-20 VIIRS <i /> {dataRange}
        </span>
      </div>
      {(demoFrame || __GLOBE_DEMO_BUILD__) && (
        <div className="prototype-demo">
          <div className="prototype-demo-copy" aria-live="polite">
            <span className="prototype-kicker">
              {demoFrame
                ? `Step ${demoStep! + 1} of ${demoFrames.length}`
                : "Walkthrough"}
            </span>
            <p>
              {demoFrame?.caption ??
                "Watch this design go from globe to hotspot."}
            </p>
          </div>
          <div className="prototype-demo-controls">
            {demoFrame && (
              <button
                aria-label={
                  playing ? "Pause walkthrough" : "Resume walkthrough"
                }
                onClick={() =>
                  demoFinished && !playing ? replay() : setPlaying(!playing)
                }
              >
                {playing ? <Pause size={14} /> : <Play size={14} />}
              </button>
            )}
            <button onClick={replay}>
              {demoFrame ? <RotateCcw size={14} /> : <Play size={14} />}{" "}
              {demoFrame ? "Replay" : "Play demo"}
            </button>
            {demoFrame && (
              <button aria-label="Close walkthrough" onClick={stopDemo}>
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      )}
      <div className="prototype-body">
        <div className="prototype-visual">
          {map}
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div
              className="prototype-heading"
              key={title}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.24 }}
            >
              <span className="prototype-kicker">
                {isOrbital ? (
                  <Orbit size={14} />
                ) : isAtlas ? (
                  <Layers3 size={14} />
                ) : (
                  <Grid2X2 size={14} />
                )}
                {variants[variant].name}
              </span>
              <h1>{title}</h1>
              {isWorld && (
                <p>
                  {stage === "globe"
                    ? "Drag to rotate"
                    : isOrbital
                      ? "Choose a region to inspect its sectors"
                      : isAtlas
                        ? "Choose a continent"
                        : "Choose a zone to inspect its sectors"}
                </p>
              )}
            </motion.div>
          </AnimatePresence>
          <div className="prototype-map-actions">
            {level > 0 && (
              <button onClick={back} aria-label="Back one map level">
                <ArrowLeft size={15} /> Back
              </button>
            )}
            {stage === "globe" && (
              <button className="prototype-primary" onClick={() => goTo(1, [])}>
                {isOrbital
                  ? "Unfold Earth"
                  : isAtlas
                    ? "Browse continents"
                    : "Open signal grid"}{" "}
                {isOrbital ? (
                  <ArrowDownRight size={17} />
                ) : (
                  <ArrowRight size={17} />
                )}
              </button>
            )}
          </div>
          <div className="prototype-map-credit">
            <CircleDot size={10} />{" "}
            {sector
              ? "Each mark is a reported detection"
              : "Natural Earth boundaries"}
          </div>
        </div>
        <aside className="prototype-inspector" aria-label="Area details">
          {currentStats}
          {displayList}
        </aside>
      </div>
    </section>
  );
}

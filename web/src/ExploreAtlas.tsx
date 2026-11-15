import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import {
  ArrowLeft,
  ArrowUpRight,
  ChevronRight,
  Globe2,
  Map,
  Minus,
  Pause,
  Play,
  Plus,
  RotateCcw,
} from "lucide-react";
import type { CaseStudy, Observation } from "./data";
import { integer } from "./data";
import AtlasSurface from "./explore/AtlasSurface";
import {
  areaKm2,
  contains,
  continents,
  countryBounds,
  inBounds,
  localWindow,
  sectors,
  WORLD,
} from "./explore/geography";
import type { Bounds, Country, GeoData, Sector } from "./explore/geography";
import "./explore/atlas.css";

interface Props {
  observations: Observation[];
  cases: CaseStudy[];
  onSelect: (observation: Observation) => void;
  onCase: (study: CaseStudy) => void;
  snapshotStart: string;
  snapshotEnd: string;
  focus?: Observation | null;
  zoom?: number;
  reset?: number;
}
interface Place {
  name: string;
  bounds: Bounds;
  kind: "world" | "continent" | "country" | "sector";
  country?: Country;
  sector?: Sector;
}
export default function ExploreAtlas({
  observations,
  cases,
  onSelect,
  onCase,
  snapshotStart,
  snapshotEnd,
  focus,
  zoom = 0,
  reset = 0,
}: Props) {
  const [path, setPath] = useState<Place[]>([]);
  const [data, setData] = useState<GeoData | null>(null),
    [error, setError] = useState(false),
    [attempt, setAttempt] = useState(0);
  const [paused, setPaused] = useState(false),
    [hover, setHover] = useState<Country | null>(null),
    [page, setPage] = useState(0);
  const [hoveredSector, setHoveredSector] = useState<Sector | null>(null);
  const reduced = !!useReducedMotion();
  const variant =
    new URLSearchParams(location.search).get("atlasMotion") === "ellipsoid"
      ? "ellipsoid"
      : "unwrap";
  const current = path.at(-1),
    open = path.length > 0,
    bounds = current?.bounds || WORLD;
  useEffect(() => {
    const abort = new AbortController();
    setError(false);
    fetch("/assets/geography/countries-110m.json", { signal: abort.signal })
      .then((r) => {
        if (!r.ok) throw Error("Boundaries unavailable");
        return r.json();
      })
      .then(setData)
      .catch((e) => {
        if (e.name !== "AbortError") setError(true);
      });
    return () => abort.abort();
  }, [attempt]);
  const resetView = useCallback(() => {
    setPath([]);
    setHover(null);
    setPage(0);
  }, []);
  const unfold = useCallback(
    () => setPath([{ name: "World atlas", bounds: WORLD, kind: "world" }]),
    [],
  );
  const back = useCallback(() => {
    setPath((p) => p.slice(0, -1));
    setPage(0);
  }, []);
  const chooseContinent = useCallback((name: string) => {
    const c = continents.find((c) => c.name === name);
    if (c)
      setPath([
        { name: "World atlas", bounds: WORLD, kind: "world" },
        { name: c.name, bounds: c.bounds, kind: "continent" },
      ]);
    setPage(0);
  }, []);
  const chooseCountry = useCallback((country: Country) => {
    const b = countryBounds(country);
    const w = Math.max(1, b[2] - b[0]),
      h = Math.max(1, b[3] - b[1]);
    const padded: Bounds = [
      b[0] - w * 0.12,
      b[1] - h * 0.12,
      b[2] + w * 0.12,
      b[3] + h * 0.12,
    ];
    const c = continents.find((c) => c.name === country.properties.CONTINENT);
    setPath([
      { name: "World atlas", bounds: WORLD, kind: "world" },
      ...(c
        ? [{ name: c.name, bounds: c.bounds, kind: "continent" as const }]
        : []),
      {
        name: country.properties.NAME_EN,
        bounds: padded,
        kind: "country",
        country,
      },
    ]);
    setPage(0);
  }, []);
  const chooseWindow = useCallback((lon: number, lat: number) => {
    const window = localWindow(lon, lat);
    setPath((p) => [
      ...p.filter(
        (place) => place.kind === "world" || place.kind === "continent",
      ),
      {
        name: `Map window · ${((window[1] + window[3]) / 2).toFixed(1)}° / ${((window[0] + window[2]) / 2).toFixed(1)}°`,
        bounds: window,
        kind: "country",
      },
    ]);
    setPage(0);
  }, []);
  useEffect(() => {
    setHoveredSector(null);
    setHover(null);
  }, [current]);
  const rows = useMemo(() => {
    if (current?.kind === "sector" && current.sector)
      return current.sector.rows;
    if (!current || current.kind === "world") return observations;
    const candidates = observations.filter((o) => inBounds(o, bounds));
    return current.country
      ? candidates.filter((o) => contains(current.country!, o.lon, o.lat))
      : candidates;
  }, [observations, current, bounds]);
  const binSize =
    current?.kind === "country" ? 0.5 : current?.kind === "continent" ? 2 : 5;
  const bins = useMemo(() => sectors(rows, binSize), [rows, binSize]);
  const topBins = useMemo(
    () => [...bins].sort((a, b) => b.count - a.count).slice(0, 4),
    [bins],
  );
  const chooseSector = useCallback((sector: Sector) => {
    setPath((p) => [
      ...p.filter((x) => x.kind !== "sector"),
      {
        name: `${sector.lat.toFixed(2)}° / ${sector.lon.toFixed(2)}°`,
        bounds: sector.bounds,
        kind: "sector",
        sector,
        country: p.at(-1)?.country,
      },
    ]);
    setPage(0);
  }, []);
  const countryItems = useMemo(
    () =>
      data?.features
        .filter((f) => f.properties.CONTINENT === current?.name)
        .sort((a, b) =>
          a.properties.NAME_EN.localeCompare(b.properties.NAME_EN),
        ) || [],
    [data, current],
  );
  const indexedCountries = useMemo(
    () =>
      data?.features.map((country) => ({
        country,
        bounds: countryBounds(country),
      })) || [],
    [data],
  );
  const countryAt = useCallback(
    (lon: number, lat: number) =>
      indexedCountries.find(
        (f) =>
          inBounds({ lon, lat }, f.bounds) && contains(f.country, lon, lat),
      )?.country,
    [indexedCountries],
  );
  const onZoom = useCallback(
    (direction: number, at?: [number, number]) => {
      if (direction < 0) {
        back();
        return;
      }
      if (!open) {
        unfold();
        return;
      }
      if (current?.kind === "world") {
        const country = at ? countryAt(...at) : hover;
        if (
          country &&
          continents.some((c) => c.name === country.properties.CONTINENT)
        )
          chooseContinent(country.properties.CONTINENT);
        else if (country) chooseCountry(country);
        else
          chooseWindow(
            ...(at || [
              (bounds[0] + bounds[2]) / 2,
              (bounds[1] + bounds[3]) / 2,
            ]),
          );
        return;
      }
      if (current?.kind === "continent") {
        if (at && !countryAt(...at)) {
          chooseWindow(...at);
          return;
        }
        const country =
          (at ? countryAt(...at) : undefined) ||
          hover ||
          countryItems.find((c) => c.properties.NAME_EN === "Greece") ||
          countryItems[0];
        if (country) chooseCountry(country);
        return;
      }
      if (current?.kind === "country" && topBins[0])
        chooseSector(
          (at
            ? bins.find((b) => inBounds({ lon: at[0], lat: at[1] }, b.bounds))
            : undefined) ||
            hoveredSector ||
            topBins[0],
        );
    },
    [
      back,
      open,
      unfold,
      current,
      chooseContinent,
      hover,
      countryItems,
      chooseCountry,
      topBins,
      chooseSector,
      countryAt,
      bins,
      hoveredSector,
      chooseWindow,
      bounds,
    ],
  );
  const lastZoom = useRef(zoom),
    lastReset = useRef(reset);
  useEffect(() => {
    if (zoom !== lastZoom.current) {
      onZoom(zoom > lastZoom.current ? 1 : -1);
      lastZoom.current = zoom;
    }
  }, [zoom, onZoom]);
  useEffect(() => {
    if (reset !== lastReset.current) {
      resetView();
      lastReset.current = reset;
    }
  }, [reset, resetView]);
  const lastFocus = useRef("");
  useEffect(() => {
    if (focus && focus.id !== lastFocus.current) {
      lastFocus.current = focus.id;
      if (current?.kind === "sector" && rows.some((o) => o.id === focus.id))
        return;
      const selectedBin = sectors([focus], 0.5)[0];
      const sector =
        sectors(
          observations.filter((o) => inBounds(o, selectedBin.bounds)),
          0.5,
        )[0] || selectedBin;
      setPath([
        { name: "World atlas", bounds: WORLD, kind: "world" },
        {
          name: "Selected location",
          bounds: sector.bounds,
          kind: "sector",
          sector,
        },
      ]);
    }
  }, [focus, current, rows, observations]);
  const onPick = (lon: number, lat: number) => {
    if (!open) {
      unfold();
      return;
    }
    if (current?.kind === "sector") {
      const nearest = rows.reduce<Observation | null>(
        (a, o) =>
          !a ||
          Math.hypot(o.lon - lon, o.lat - lat) <
            Math.hypot(a.lon - lon, a.lat - lat)
            ? o
            : a,
        null,
      );
      if (nearest) onSelect(nearest);
      return;
    }
    if (current?.kind === "country") {
      const sector = bins.find((b) => inBounds({ lon, lat }, b.bounds));
      if (sector) chooseSector(sector);
      return;
    }
    const c = countryAt(lon, lat);
    if (c) {
      if (
        current?.kind === "world" &&
        continents.some((region) => region.name === c.properties.CONTINENT)
      )
        chooseContinent(c.properties.CONTINENT);
      else chooseCountry(c);
    } else chooseWindow(lon, lat);
  };
  const onHover = (lon: number, lat: number) => {
    if (!open || current?.kind === "sector") return;
    if (current?.kind === "country") {
      setHoveredSector(
        bins.find((b) => inBounds({ lon, lat }, b.bounds)) || null,
      );
      return;
    }
    const c = countryAt(lon, lat);
    setHover(c || null);
  };
  const anchors = useMemo(() => {
    if (!open || current?.kind === "world")
      return continents.map((c) => ({
        key: c.name,
        label: c.name,
        lon: c.center[0],
        lat: c.center[1],
        kind: "continent" as const,
      }));
    return cases
      .filter((c) => inBounds({ lon: c.center[0], lat: c.center[1] }, bounds))
      .map((c) => ({
        key: c.id,
        label: c.name + " · historical study",
        lon: c.center[0],
        lat: c.center[1],
        kind: "study" as const,
      }));
  }, [open, current, cases, bounds]);
  const points = useMemo(
    () => (current?.kind === "sector" ? rows.slice(0, 4000) : undefined),
    [current, rows],
  );
  return (
    <section
      className={`explore-atlas ${open ? "is-open" : "is-globe"}`}
      aria-label="Unfolding Earth atlas"
    >
      <div className="atlas-toolbar">
        <nav aria-label="Atlas geographic path">
          <button onClick={resetView}>
            <Globe2 size={14} />
            Earth
          </button>
          {path.map((p, i) => (
            <span key={p.name}>
              <ChevronRight size={12} />
              <button
                onClick={() => {
                  setPath(path.slice(0, i + 1));
                  setPage(0);
                }}
                aria-current={i === path.length - 1 ? "location" : undefined}
              >
                {p.name}
              </button>
            </span>
          ))}
        </nav>
        <div className="atlas-controls">
          <button aria-label="Zoom atlas out" onClick={back} disabled={!open}>
            <Minus size={16} />
          </button>
          <button
            aria-label="Zoom atlas in"
            onClick={() => onZoom(1)}
            disabled={current?.kind === "sector"}
          >
            <Plus size={16} />
          </button>
          <button aria-label="Reset atlas to globe" onClick={resetView}>
            <RotateCcw size={15} />
          </button>
          <button
            aria-label={paused ? "Resume globe motion" : "Pause globe motion"}
            onClick={() => setPaused(!paused)}
            aria-pressed={paused}
          >
            {paused ? <Play size={14} /> : <Pause size={14} />}
          </button>
        </div>
      </div>
      <div
        className="atlas-stage"
        tabIndex={0}
        aria-label="Map controls: plus to zoom, minus or Escape to go back; Tab reaches geographic controls"
        onKeyDown={(e) => {
          if (e.target !== e.currentTarget) return;
          if (e.key === "+" || e.key === "=" || e.key === "Enter") {
            e.preventDefault();
            onZoom(1);
          }
          if (e.key === "-" || e.key === "Escape") {
            e.preventDefault();
            back();
          }
          if (e.key === "Home") {
            e.preventDefault();
            resetView();
          }
        }}
      >
        <AtlasSurface
          open={open}
          paused={paused}
          reduced={reduced}
          bounds={bounds}
          data={data}
          bins={bins}
          points={points}
          anchors={anchors}
          onAnchor={(key) => {
            const c = cases.find((c) => c.id === key);
            if (c) onCase(c);
            else chooseContinent(key);
          }}
          onPick={onPick}
          onZoom={onZoom}
          onHover={onHover}
          variant={variant}
        />
        {!open && (
          <div className="atlas-invitation">
            <p className="mono">ONE PLANET. MANY WAYS OF SEEING.</p>
            <button onClick={unfold}>
              <Map size={17} /> Unfold the Earth <span>↗</span>
            </button>
            <small>Drag to rotate · scroll or select to open</small>
            <small className="atlas-globe-meaning">
              Marker sizes: raw detections per 5° bin · NOAA-20 VIIRS
              <br />
              {snapshotStart.replace("T", " ").replace("Z", "")} –{" "}
              {snapshotEnd.replace("T", " ").replace("Z", "")} UTC
              <br />
              Blue Marble is static geographic context.
            </small>
          </div>
        )}
        {open && (
          <div className="atlas-map-caption">
            <strong>
              {hover &&
              current?.kind !== "country" &&
              current?.kind !== "sector"
                ? hover.properties.NAME_EN
                : current?.name}
            </strong>
            <span>
              {current?.kind === "country" && hoveredSector
                ? `${integer(hoveredSector.count)} detections in this 0.5° sector · select to inspect`
                : current?.kind === "world"
                  ? "Select a continent to reveal its countries"
                  : current?.kind === "continent"
                    ? "Select a country boundary or use the list below"
                    : current?.kind === "country"
                      ? "Select a glowing grid sector to inspect its detections"
                      : "Select a point or an observation below"}
            </span>
          </div>
        )}
        {open && (
          <button className="atlas-back" onClick={back}>
            <ArrowLeft size={13} /> Wider view
          </button>
        )}
      </div>
      {open && (
        <div className="atlas-context">
          <div className="atlas-facts">
            <strong>
              {integer(rows.length)}
              <small>
                snapshot detections{" "}
                {current?.country
                  ? "within generalized boundaries"
                  : current?.kind === "world"
                    ? "globally"
                    : "in this map window"}
              </small>
            </strong>
            <p>
              <b>NOAA-20 VIIRS</b>
              <br />
              {snapshotStart.slice(0, 10)} – {snapshotEnd.slice(0, 10)} UTC
              <br />
              <span>
                Thermal pixels, not unique fires. No observation-effort
                correction.
              </span>
            </p>
          </div>
          {current?.kind !== "sector" && (
            <div className="atlas-legend">
              <i />
              Marker size shows detections in {binSize}° grid bins. Grids are
              analytical sectors, not administrative regions.
            </div>
          )}
          {current?.kind === "world" && (
            <div className="atlas-place-list">
              {continents.map((c) => (
                <button key={c.name} onClick={() => chooseContinent(c.name)}>
                  {c.name}
                  <ChevronRight size={13} />
                </button>
              ))}
            </div>
          )}
          {current?.kind === "continent" && (
            <label className="atlas-country-select">
              Country{" "}
              <select
                value=""
                onChange={(e) => {
                  const c = countryItems.find(
                    (c) => c.properties.NAME_EN === e.target.value,
                  );
                  if (c) chooseCountry(c);
                }}
              >
                <option value="">Choose a country…</option>
                {countryItems.map((c) => (
                  <option
                    key={c.properties.NAME_EN}
                    value={c.properties.NAME_EN}
                  >
                    {c.properties.NAME_EN}
                  </option>
                ))}
              </select>
            </label>
          )}
          {current?.kind === "country" && (
            <div className="atlas-sector-list">
              {bounds[2] - bounds[0] > 180 && (
                <p>
                  This boundary crosses the atlas seam. The full longitude range
                  stays visible; choose a sector below to inspect it.
                </p>
              )}
              <span className="mono">
                SECTORS WITH THE MOST SNAPSHOT DETECTIONS
              </span>
              {topBins.map((b) => (
                <button key={b.key} onClick={() => chooseSector(b)}>
                  <span>
                    {b.lat.toFixed(2)}° / {b.lon.toFixed(2)}°
                  </span>
                  <b>{integer(b.count)}</b>
                  <ChevronRight size={13} />
                </button>
              ))}
              {!bins.length && (
                <p>
                  No snapshot detections in{" "}
                  {current.country
                    ? "this generalized country boundary"
                    : "this rectangular map window"}
                  . This does not establish fire-free conditions.
                </p>
              )}
            </div>
          )}
          {current?.kind === "sector" && (
            <div className="atlas-observations">
              <p>
                Analytical rectangle · {integer(areaKm2(bounds))} km² rectangle
                · {integer(rows.length)} detections{" "}
                {current.country
                  ? `within ${current.country.properties.NAME_EN}’s generalized boundary`
                  : "across the whole rectangle"}
                .{" "}
                {rows.length > 4000
                  ? "Map shows the first 4,000 points; browse the complete list below."
                  : "Points are original satellite pixel centers."}
              </p>
              {!rows.length && (
                <p>
                  No detections in this sector; observing coverage is unknown.
                </p>
              )}
              <div>
                {rows.slice(page * 10, page * 10 + 10).map((o) => (
                  <button key={o.id} onClick={() => onSelect(o)}>
                    <span>
                      {o.lat.toFixed(3)}°, {o.lon.toFixed(3)}°
                    </span>
                    <small>
                      {o.time.slice(11, 16)} UTC ·{" "}
                      {o.frp == null
                        ? "FRP unavailable"
                        : `${o.frp.toFixed(1)} MW`}
                    </small>
                    <ArrowUpRight size={13} />
                  </button>
                ))}
              </div>
              {rows.length > 10 && (
                <nav aria-label="Sector observation pages">
                  <button
                    disabled={page === 0}
                    onClick={() => setPage(page - 1)}
                  >
                    Previous
                  </button>
                  <span>
                    {page + 1} / {Math.ceil(rows.length / 10)}
                  </span>
                  <button
                    disabled={(page + 1) * 10 >= rows.length}
                    onClick={() => setPage(page + 1)}
                  >
                    Next
                  </button>
                </nav>
              )}
            </div>
          )}
          {(current?.kind === "continent" || current?.kind === "country") &&
            cases.some((c) =>
              inBounds({ lon: c.center[0], lat: c.center[1] }, bounds),
            ) && (
              <div className="atlas-studies">
                <p>
                  Historical investigations{" "}
                  <span>
                    Separate datasets and dates · rectangular study areas
                  </span>
                </p>
                {cases
                  .filter((c) =>
                    inBounds({ lon: c.center[0], lat: c.center[1] }, bounds),
                  )
                  .map((c) => (
                    <button onClick={() => onCase(c)} key={c.id}>
                      {c.name}
                      <small>
                        {c.date} ·{" "}
                        {c.years.length > 1
                          ? `${c.years[0]}–${c.years.at(-1)}`
                          : c.years[0]}{" "}
                        record
                      </small>
                      <ArrowUpRight size={15} />
                    </button>
                  ))}
              </div>
            )}
          {error && (
            <p className="atlas-data-state">
              Country boundaries could not load.{" "}
              <button onClick={() => setAttempt(attempt + 1)}>
                Retry boundaries
              </button>
              . Snapshot points and geographic windows remain available.
            </p>
          )}
          <details className="atlas-method">
            <summary>Map meaning & sources</summary>
            <p>
              Natural Earth public-domain country boundaries at 1:110 million
              are generalized; tiny islands and precise coastal attribution may
              be omitted. Country counts use point-in-polygon matching.
              Continental views are bounding windows and may include neighboring
              areas. Orange circles encode raw counts, not density, risk,
              probability, burned area, or unique incidents. Empty regions have
              unknown observing coverage.
            </p>
            <a
              href="https://www.naturalearthdata.com/about/terms-of-use/"
              target="_blank"
              rel="noreferrer"
            >
              Natural Earth terms ↗
            </a>
            <p>
              NASA Blue Marble is a static context texture, not imagery from
              this observation window. Choose a dated study to open the original
              satellite comparison map.
            </p>
          </details>
        </div>
      )}
    </section>
  );
}

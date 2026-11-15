import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import {
  ArrowLeft,
  ArrowUpRight,
  ChevronRight,
  Minus,
  Plus,
  RotateCcw,
  ScanLine,
} from "lucide-react";
import type { CaseStudy, Observation } from "./data";
import { integer } from "./data";
import {
  contains,
  continents,
  countryBounds,
  sectors,
  WORLD,
} from "./explore/geography";
import type { Bounds, Country, GeoData } from "./explore/geography";
import {
  contourPath,
  countFill,
  countThresholds,
  fitProjection,
  labelPoint,
  partitionRegions,
  redScale,
} from "./explore/contour-data";
import type { CountRegion } from "./explore/contour-data";
import "./explore/contours.css";
import TerrainDetail from "./explore/TerrainDetail";

interface Props {
  observations: Observation[];
  cases: CaseStudy[];
  onSelect: (o: Observation) => void;
  onCase: (study: CaseStudy) => void;
  snapshotStart: string;
  snapshotEnd: string;
  focus?: Observation | null;
  zoom?: number;
  reset?: number;
  initialOpen?: boolean;
  initialContinent?: string;
  onBackToGlobe?: () => void;
  onSurfaceReady?: (surface: SVGSVGElement) => void;
}
interface Selection {
  kind: CountRegion["kind"];
  id: string;
  name: string;
  bounds?: Bounds;
}
const worldBounds: Bounds = [-180, -60, 180, 85];
const regionBox = (bounds: Bounds): Country => ({
  type: "Feature",
  properties: { NAME_EN: "Analytical sector", CONTINENT: "", ISO_A3: "" },
  geometry: {
    type: "Polygon",
    coordinates: [
      [
        [bounds[0], bounds[1]],
        [bounds[2], bounds[1]],
        [bounds[2], bounds[3]],
        [bounds[0], bounds[3]],
        [bounds[0], bounds[1]],
      ],
    ],
  },
});
function combinedBounds(features: Country[]): Bounds {
  const boxes = features.map(countryBounds);
  return [
    Math.min(...boxes.map((b) => b[0])),
    Math.min(...boxes.map((b) => b[1])),
    Math.max(...boxes.map((b) => b[2])),
    Math.max(...boxes.map((b) => b[3])),
  ];
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
  initialContinent,
  onBackToGlobe,
  onSurfaceReady,
}: Props) {
  const [countries, setCountries] = useState<Country[]>([]),
    [admin, setAdmin] = useState<Country[]>([]);
  const [detailedCountries, setDetailedCountries] = useState<Country[]>([]);
  const [activityWash, setActivityWash] = useState(true);
  const [flying, setFlying] = useState(false);
  const [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [retry, setRetry] = useState(0);
  const [path, setPath] = useState<Selection[]>(
    initialContinent
      ? [{ kind: "continent", id: initialContinent, name: initialContinent }]
      : [],
  );
  const [hover, setHover] = useState<string | null>(null),
    [scale, setScale] = useState(1),
    [pan, setPan] = useState({ x: 0, y: 0 });
  const [page, setPage] = useState(0);
  const reduced = !!useReducedMotion();
  const svg = useRef<SVGSVGElement>(null);
  const [labelFont, setLabelFont] = useState(16);
  const [viewHeight, setViewHeight] = useState(570);
  useEffect(() => {
    if (!svg.current) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      const pixelScale = width / 1000;
      if (width > 0) setViewHeight((height / width) * 1000);
      if (svg.current) onSurfaceReady?.(svg.current);
      if (pixelScale > 0)
        setLabelFont(
          Math.min(36, Math.max(8, (width < 700 ? 10.5 : 12) / pixelScale)),
        );
    });
    observer.observe(svg.current);
    return () => observer.disconnect();
  }, [loading, error]);
  const drag = useRef<{
      x: number;
      y: number;
      startX: number;
      startY: number;
    } | null>(null),
    moved = useRef(false);
  const touches = useRef(new Map<number, { x: number; y: number }>()),
    pinch = useRef(0);
  const current = path.at(-1);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    Promise.all(
      ["countries-110m.json", "greece-admin1.json"].map((file) =>
        fetch(`/assets/geography/${file}`, { signal: controller.signal }).then(
          (r) => {
            if (!r.ok) throw Error("Geographic contours could not load.");
            return r.json() as Promise<GeoData>;
          },
        ),
      ),
    )
      .then(([world, greece]) => {
        setCountries(world.features);
        setAdmin(greece.features);
        setLoading(false);
      })
      .catch((e) => {
        if (e.name !== "AbortError") {
          setError(e.message);
          setLoading(false);
        }
      });
    return () => controller.abort();
  }, [retry]);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/assets/geography/countries-50m.json", { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw Error();
        return r.json() as Promise<GeoData>;
      })
      .then((data) => setDetailedCountries(data.features))
      .catch(() => {
        /* The bundled counting geometry remains a usable fallback. */
      });
    return () => controller.abort();
  }, []);
  const displayGeometry = useMemo(
    () => new Map(detailedCountries.map((c) => [c.properties.NAME_EN, c])),
    [detailedCountries],
  );
  const assignment = useMemo(
    () => partitionRegions(observations, countries),
    [observations, countries],
  );
  const continental = useMemo(() => {
    const groups = new Map<string, CountRegion>();
    for (const c of countries) {
      const name =
        c.properties.CONTINENT === "Seven seas (open ocean)"
          ? "Ocean islands"
          : c.properties.CONTINENT;
      if (name === "Antarctica") continue;
      const group = groups.get(name) || {
        id: name,
        name,
        kind: "continent" as const,
        features: [],
        rows: [],
        center: continents.find((r) => r.name === name)?.center,
      };
      group.features.push(c);
      group.rows.push(...(assignment.groups.get(c) || []));
      groups.set(name, group);
    }
    return [...groups.values()];
  }, [countries, assignment]);
  const selectedContinent = continental.find(
    (c) => c.id === path.find((p) => p.kind === "continent")?.id,
  );
  const subregional = useMemo(() => {
    const groups = new Map<string, CountRegion>();
    for (const country of selectedContinent?.features || []) {
      const name = country.properties.SUBREGION || "Other source geography";
      const group = groups.get(name) || {
        id: name,
        name,
        kind: "subregion" as const,
        features: [],
        rows: [],
      };
      group.features.push(country);
      group.rows.push(...(assignment.groups.get(country) || []));
      groups.set(name, group);
    }
    return [...groups.values()];
  }, [selectedContinent, assignment]);
  const countrySelection = path.find((p) => p.kind === "country"),
    adminSelection = path.find((p) => p.kind === "admin");
  const selectedCountry = countries.find(
    (c) => c.properties.NAME_EN === countrySelection?.id,
  );
  const countryRows = selectedCountry
    ? assignment.groups.get(selectedCountry) || []
    : observations;
  const adminPartition = useMemo(
    () =>
      partitionRegions(
        countryRows,
        selectedCountry?.properties.NAME_EN === "Greece" ? admin : [],
      ),
    [countryRows, selectedCountry, admin],
  );
  const selectedAdmin = admin.find(
    (a) => a.properties.NAME_EN === adminSelection?.id,
  );
  const parentRows = selectedAdmin
    ? adminPartition.groups.get(selectedAdmin) || []
    : countryRows;
  const bins = useMemo(() => sectors(parentRows, 0.25), [parentRows]);
  const selectedBin =
    current?.kind === "sector"
      ? bins.find((b) => b.key === current.id)
      : undefined;
  const visibleRows =
    current?.kind === "sector" ? selectedBin?.rows || [] : parentRows;
  const scene = useMemo<CountRegion[]>(() => {
    if (!current) return continental;
    if (current.kind === "continent") return subregional;
    if (current.kind === "subregion") {
      const features =
        subregional.find((r) => r.id === current.id)?.features || [];
      return features.map((c) => ({
        id: c.properties.NAME_EN,
        name: c.properties.NAME_EN,
        features: [c],
        rows: assignment.groups.get(c) || [],
        kind: "country",
      }));
    }
    if (
      current.kind === "country" &&
      selectedCountry?.properties.NAME_EN === "Greece"
    )
      return admin.map((a) => ({
        id: a.properties.NAME_EN,
        name: a.properties.NAME_EN,
        features: [a],
        rows: adminPartition.groups.get(a) || [],
        kind: "admin",
      }));
    if (current.kind === "sector") return [];
    return bins.map((b, i) => ({
      id: b.key,
      name: `Sector ${i + 1}`,
      features: [regionBox(b.bounds)],
      rows: b.rows,
      kind: "sector",
      bounds: b.bounds,
      center: [b.lon, b.lat],
    }));
  }, [
    current,
    continental,
    subregional,
    assignment,
    selectedCountry,
    admin,
    adminPartition,
    bins,
  ]);
  const bounds = useMemo<Bounds>(() => {
    if (!current) return worldBounds;
    if (current.kind === "sector") return current.bounds || WORLD;
    if (current.kind === "continent")
      return (
        continents.find((c) => c.name === current.id)?.bounds ||
        combinedBounds(
          continental.find((c) => c.id === current.id)?.features || countries,
        )
      );
    if (current.kind === "subregion") {
      const features =
        subregional.find((r) => r.id === current.id)?.features || [];
      if (!features.length) return WORLD;
      const b = combinedBounds(features),
        c = continents.find((c) => c.name === selectedContinent?.name)?.bounds;
      if (c) {
        const clipped: Bounds = [
          Math.max(b[0], c[0]),
          Math.max(b[1], c[1]),
          Math.min(b[2], c[2]),
          Math.min(b[3], c[3]),
        ];
        if (clipped[2] > clipped[0] && clipped[3] > clipped[1]) return clipped;
      }
      return b;
    }
    if (current.kind === "admin" && selectedAdmin)
      return countryBounds(selectedAdmin);
    if (selectedCountry?.properties.NAME_EN === "Greece" && admin.length)
      return combinedBounds(admin);
    return selectedCountry ? countryBounds(selectedCountry) : WORLD;
  }, [
    current,
    selectedCountry,
    selectedAdmin,
    admin,
    continental,
    countries,
    subregional,
    selectedContinent,
  ]);
  const projection = useMemo(
    () => fitProjection(bounds, 1000, viewHeight),
    [bounds, viewHeight],
  );
  const returnPending = useRef(false);
  const previousProjection = useRef(projection);
  useLayoutEffect(() => {
    const prior = previousProjection.current;
    previousProjection.current = projection;
    const group = svg.current?.querySelector<SVGGElement>(".contour-flight");
    if (!group || reduced || prior === projection) return;
    const [x0, y0] = projection.project(0, 0),
      [x1, y1] = projection.project(1, 1);
    const [px0, py0] = prior.project(0, 0),
      [px1, py1] = prior.project(1, 1);
    const sx = (px1 - px0) / (x1 - x0),
      sy = (py1 - py0) / (y1 - y0);
    setFlying(true);
    const animation = group.animate(
      [
        {
          transform: `matrix(${sx},0,0,${sy},${px0 - sx * x0},${py0 - sy * y0})`,
        },
        { transform: "matrix(1,0,0,1,0,0)" },
      ],
      { duration: 1050, easing: "cubic-bezier(.22,.68,.18,1)", fill: "none" },
    );
    animation.onfinish = () => {
      setFlying(false);
      if (returnPending.current) {
        returnPending.current = false;
        onBackToGlobe?.();
      }
    };
    return () => {
      animation.cancel();
      setFlying(false);
    };
  }, [projection, reduced]);
  const terrainImage = (source: string, extent: Bounds, key: string) => {
    const a = projection.project(extent[0], extent[3]),
      b = projection.project(extent[2], extent[1]);
    return (
      <image
        key={key}
        href={source}
        x={a[0]}
        y={a[1]}
        width={b[0] - a[0]}
        height={b[1] - a[1]}
        preserveAspectRatio="none"
        className={`contour-terrain ${key !== "world" ? "terrain-detail" : ""}`}
        aria-hidden="true"
      />
    );
  };
  const thresholds = useMemo(
    () => countThresholds(Math.max(0, ...scene.map((r) => r.rows.length))),
    [scene],
  );
  const mapShapes = useMemo(
    () =>
      scene.map((region) => ({
        region,
        d: contourPath(
          region.kind === "admin" || region.kind === "sector"
            ? region.features
            : region.features.map(
                (f) => displayGeometry.get(f.properties.NAME_EN) || f,
              ),
          projection.project,
        ),
        point: projection.project(
          ...(region.center || labelPoint(region.features)),
        ),
      })),
    [scene, projection, displayGeometry],
  );
  const background = useMemo(
    () =>
      contourPath(
        detailedCountries.length ? detailedCountries : countries,
        projection.project,
      ),
    [countries, detailedCountries, projection],
  );
  const labels = useMemo(() => {
    const occupied: { x: number; y: number; w: number; h: number }[] = [];
    return [...mapShapes]
      .sort(
        (a, b) =>
          Number(b.region.id === hover) - Number(a.region.id === hover) ||
          b.region.rows.length - a.region.rows.length,
      )
      .flatMap((item) => {
        const [anchorX, anchorY] = item.point;
        if (
          anchorX < 0 ||
          anchorX > 1000 ||
          anchorY < 0 ||
          anchorY > viewHeight
        )
          return [];
        const w = Math.max(75, item.region.name.length * labelFont * 0.54),
          h = labelFont * 2.6;
        const x = Math.max(w / 2 + 12, Math.min(988 - w / 2, anchorX));
        const y = Math.max(
          labelFont + 12,
          Math.min(viewHeight - h / 2 - 20, anchorY),
        );
        const collision = occupied.some(
          (b) =>
            Math.abs(b.x - x) < (b.w + w) / 2 + 4 &&
            Math.abs(b.y - y) < (b.h + h) / 2 + 4,
        );
        if (collision) return [];
        occupied.push({ x, y, w, h });
        return [{ ...item, point: [x, y] as [number, number] }];
      });
  }, [mapShapes, hover, labelFont, viewHeight]);
  const enter = (region: CountRegion) => {
    setPath((p) => [
      ...p,
      {
        kind: region.kind,
        id: region.id,
        name: region.name,
        bounds: region.bounds,
      },
    ]);
    setPage(0);
  };
  const back = () => {
    if (path.length) setPath((p) => p.slice(0, -1));
    else onBackToGlobe?.();
  };
  const resetAll = () => {
    setPath([]);
    setPan({ x: 0, y: 0 });
    setScale(1);
    if (path.length && !reduced) returnPending.current = true;
    else onBackToGlobe?.();
  };
  useEffect(() => {
    setPan({ x: 0, y: 0 });
    setScale(1);
    setHover(null);
    setPage(0);
  }, [current]);
  const lastReset = useRef(reset),
    lastZoom = useRef(zoom);
  useEffect(() => {
    if (lastReset.current !== reset) {
      lastReset.current = reset;
      setPath([]);
      setPan({ x: 0, y: 0 });
      setScale(1);
    }
  }, [reset]);
  useEffect(() => {
    if (lastZoom.current !== zoom) {
      const direction = zoom > lastZoom.current ? 1 : -1;
      lastZoom.current = zoom;
      if (direction < 0) back();
      else if (scene[0]) enter(scene.find((s) => s.id === hover) || scene[0]);
    }
  }, [zoom]);
  const latest = useRef({ back, enter, scene, hover, current, scale, pan });
  latest.current = { back, enter, scene, hover, current, scale, pan };
  useEffect(() => {
    const el = svg.current;
    if (!el) return;
    let last = 0;
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      if (performance.now() - last < 1100) return;
      last = performance.now();
      const s = latest.current;
      if (event.deltaY > 0) {
        if (s.scale > 1.05) setScale(Math.max(1, s.scale / 1.5));
        else s.back();
        return;
      }
      const region = s.scene.find((r) => r.id === s.hover);
      if (region) s.enter(region);
      else setScale(Math.min(5, s.scale * 1.5));
    };
    el.addEventListener("wheel", wheel, { passive: false });
    return () => el.removeEventListener("wheel", wheel);
  }, [loading, error]);
  const coordinateFromEvent = (e: { clientX: number; clientY: number }) => {
    const r = svg.current!.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) * 1000) / r.width,
      y: ((e.clientY - r.top) * viewHeight) / r.height,
    };
  };
  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    const p = coordinateFromEvent(e);
    touches.current.set(e.pointerId, p);
    if (touches.current.size === 2) {
      const [a, b] = [...touches.current.values()];
      pinch.current = Math.hypot(a.x - b.x, a.y - b.y);
      moved.current = true;
    } else moved.current = false;
    drag.current = { ...p, startX: p.x, startY: p.y };
  };
  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!drag.current) return;
    const p = coordinateFromEvent(e);
    touches.current.set(e.pointerId, p);
    if (touches.current.size === 2) {
      const [a, b] = [...touches.current.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (Math.abs(d - pinch.current) > 65) {
        if (d < pinch.current) back();
        else setScale((s) => Math.min(5, s * 1.35));
        pinch.current = d;
      }
      return;
    }
    if (Math.hypot(p.x - drag.current.startX, p.y - drag.current.startY) > 5) {
      moved.current = true;
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    const dx = p.x - drag.current.x,
      dy = p.y - drag.current.y;
    const limitX = 500 * (scale - 1) + 180,
      limitY = (viewHeight / 2) * (scale - 1) + 120;
    setPan((previous) => ({
      x: Math.max(-limitX, Math.min(limitX, previous.x + dx)),
      y: Math.max(-limitY, Math.min(limitY, previous.y + dy)),
    }));
    drag.current = { ...drag.current, x: p.x, y: p.y };
  };
  const onPointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    touches.current.delete(e.pointerId);
    if (touches.current.size === 0) drag.current = null;
  };
  const selectedRowsCount =
    current?.kind === "continent"
      ? continental.find((c) => c.id === current.id)?.rows.length || 0
      : current?.kind === "subregion"
        ? subregional.find((r) => r.id === current.id)?.rows.length || 0
        : current?.kind === "sector"
          ? visibleRows.length
          : current
            ? parentRows.length
            : observations.length;
  const historical = cases.filter((c) =>
    selectedAdmin
      ? contains(selectedAdmin, ...c.center)
      : selectedCountry
        ? c.country === selectedCountry.properties.NAME_EN
        : false,
  );
  const pointMode = current?.kind === "sector";
  const unassigned =
    current?.kind === "country" &&
    selectedCountry?.properties.NAME_EN === "Greece"
      ? adminPartition.unassigned.length
      : !current
        ? assignment.unassigned.length
        : 0;
  return (
    <section
      className={`contour-atlas terrain-atlas ${activityWash ? "with-activity" : ""} ${flying ? "is-flying" : ""}`}
      aria-label="Geographic contours and satellite detections"
    >
      <header className="contour-header">
        <nav aria-label="Geographic path">
          <button onClick={resetAll}>Earth</button>
          <ChevronRight size={12} />
          <button
            onClick={() => setPath([])}
            aria-current={!current ? "location" : undefined}
          >
            Continents
          </button>
          {path.map((p, i) => (
            <span key={p.kind + p.id}>
              <ChevronRight size={12} />
              <button
                onClick={() => setPath(path.slice(0, i + 1))}
                aria-current={i === path.length - 1 ? "location" : undefined}
              >
                {p.name}
              </button>
            </span>
          ))}
        </nav>
        <div className="contour-controls">
          <button
            className="terrain-toggle"
            aria-pressed={activityWash}
            onClick={() => setActivityWash((v) => !v)}
          >
            Activity wash
          </button>
          <button onClick={back} aria-label="Wider geographic view">
            <Minus size={15} />
          </button>
          <button
            onClick={() => {
              const target =
                scene.find((s) => s.id === hover) ||
                scene.find((s) => s.rows.length > 0) ||
                scene[0];
              if (target) enter(target);
            }}
            disabled={pointMode || !scene.length}
            aria-label="Open selected geographic level"
          >
            <Plus size={15} />
          </button>
          <button
            onClick={() => {
              setPan({ x: 0, y: 0 });
              setScale(1);
            }}
            aria-label="Fit current contours"
          >
            <ScanLine size={15} />
          </button>
          <button onClick={resetAll} aria-label="Return to original globe">
            <RotateCcw size={15} />
          </button>
        </div>
      </header>
      <div className="contour-heading">
        <div>
          <span className="mono">
            {pointMode
              ? "ORIGINAL OBSERVATIONS"
              : current?.kind === "country" &&
                  selectedCountry?.properties.NAME_EN === "Greece"
                ? "ADMINISTRATIVE REGIONS"
                : current?.kind === "admin" || current?.kind === "country"
                  ? "ANALYTICAL SECTORS"
                  : current?.kind === "continent"
                    ? "REGIONS"
                    : current
                      ? "COUNTRIES"
                      : "CONTINENTAL COUNTRY GROUPS"}
          </span>
          <h1>{current?.name || "A world of observations"}</h1>
        </div>
        <p>
          <b>{integer(selectedRowsCount)}</b> detections{" "}
          <small>
            NOAA-20 VIIRS · {snapshotStart.slice(0, 10)} –{" "}
            {snapshotEnd.slice(0, 10)} UTC
          </small>
        </p>
      </div>
      {loading ? (
        <div className="contour-state" role="status">
          Loading geographic contours…
        </div>
      ) : error ? (
        <div className="contour-state" role="alert">
          {error}
          <button onClick={() => setRetry((r) => r + 1)}>
            Retry geography
          </button>
        </div>
      ) : (
        <div className="contour-map-wrap">
          <svg
            ref={svg}
            className="contour-map"
            viewBox={`0 0 1000 ${viewHeight}`}
            aria-label={
              pointMode
                ? "Individual observation locations"
                : "Filled geographic shapes. Each name has its detection count beneath it."
            }
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={() => {
              drag.current = null;
              touches.current.clear();
              moved.current = true;
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.preventDefault();
                back();
              }
              if (e.key === "Home") {
                e.preventDefault();
                resetAll();
              }
            }}
          >
            <defs>
              <pattern
                id="atlas-missing"
                width="6"
                height="6"
                patternUnits="userSpaceOnUse"
              >
                <path d="M0 6L6 0" stroke="#89968e" strokeWidth="1" />
              </pattern>
              <filter
                id="continent-outline"
                x="-5%"
                y="-5%"
                width="110%"
                height="110%"
              >
                <feComponentTransfer in="SourceAlpha" result="solid">
                  <feFuncA type="linear" slope="1000" />
                </feComponentTransfer>
                <feMorphology
                  in="solid"
                  operator="dilate"
                  radius={labelFont / 12}
                  result="outline"
                />
                <feComposite
                  in="outline"
                  in2="solid"
                  operator="out"
                  result="edge"
                />
                <feFlood floodColor="#f6a08d" />
                <feComposite in2="edge" operator="in" />
                <feComposite in="SourceGraphic" />
              </filter>
            </defs>
            <g className="contour-flight">
              <g
                className={`contour-camera ${reduced ? "is-reduced" : ""}`}
                transform={`translate(${pan.x} ${pan.y}) translate(500 ${viewHeight / 2}) scale(${scale}) translate(-500 ${-viewHeight / 2})`}
              >
                {terrainImage(
                  "/assets/geography/world-terrain.jpg",
                  [-180, -90, 180, 90],
                  "world",
                )}
                {selectedContinent?.name === "Europe" &&
                  terrainImage(
                    "/assets/geography/europe-terrain.jpg",
                    [-25, 30, 50, 75],
                    "europe",
                  )}
                {selectedCountry?.properties.NAME_EN === "Greece" &&
                  terrainImage(
                    "/assets/geography/greece-terrain.jpg",
                    [18, 33, 31, 43],
                    "greece",
                  )}
                <TerrainDetail
                  projection={projection}
                  height={viewHeight}
                  enabled={
                    !!current &&
                    ["country", "admin", "sector"].includes(current.kind)
                  }
                />
                {current && (
                  <path
                    d={background}
                    className="contour-background"
                    fillRule="evenodd"
                  />
                )}
                {mapShapes.map(({ region, d }) => (
                  <g
                    key={region.id}
                    className={`contour-place ${hover === region.id ? "is-hovered" : ""}`}
                    role="button"
                    tabIndex={0}
                    aria-label={`${region.name}: ${integer(region.rows.length)} recorded detections. Open details.`}
                    onFocus={() => setHover(region.id)}
                    onMouseEnter={() => setHover(region.id)}
                    onMouseLeave={() => setHover(null)}
                    onClick={() => {
                      if (!moved.current) enter(region);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        enter(region);
                      }
                    }}
                  >
                    <path
                      d={d}
                      fill={countFill(region.rows.length, thresholds)}
                      fillRule="evenodd"
                      data-zero={region.rows.length === 0}
                      filter={
                        region.kind === "continent" ||
                        region.kind === "subregion"
                          ? "url(#continent-outline)"
                          : undefined
                      }
                      className={
                        region.kind === "continent" ||
                        region.kind === "subregion"
                          ? "continent-fill"
                          : "region-fill"
                      }
                    >
                      <title>
                        {region.name}: {integer(region.rows.length)} detections
                      </title>
                    </path>
                  </g>
                ))}
                {!pointMode &&
                  labels.map(({ region, point }) => (
                    <g
                      className="contour-label"
                      key={region.id}
                      transform={`translate(${point[0]} ${point[1]})`}
                      aria-hidden="true"
                    >
                      <text
                        textAnchor="middle"
                        style={{
                          fontSize: labelFont,
                          strokeWidth: labelFont * 0.2,
                        }}
                      >
                        {region.name}
                      </text>
                      <text
                        textAnchor="middle"
                        y={labelFont * 1.25}
                        className="contour-count"
                        style={{
                          fontSize: labelFont * 1.15,
                          strokeWidth: labelFont * 0.2,
                        }}
                      >
                        {integer(region.rows.length)}
                      </text>
                    </g>
                  ))}
                {pointMode &&
                  visibleRows.slice(0, 4000).map((o) => {
                    const [x, y] = projection.project(o.lon, o.lat);
                    return (
                      <circle
                        key={o.id}
                        cx={x}
                        cy={y}
                        r={focus?.id === o.id ? 5 : 3.2}
                        className="contour-observation"
                        tabIndex={0}
                        role="button"
                        aria-label={`${o.lat.toFixed(3)}, ${o.lon.toFixed(3)}, ${o.time} UTC`}
                        onClick={() => {
                          if (!moved.current) onSelect(o);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") onSelect(o);
                        }}
                      >
                        <title>
                          {o.time} · {o.frp ?? "—"} MW
                        </title>
                      </circle>
                    );
                  })}
              </g>
            </g>
          </svg>
          <button className="contour-back" onClick={back}>
            <ArrowLeft size={13} /> Wider view
          </button>
          <span className="contour-gesture">
            Select a place · scroll to travel · drag to pan
          </span>
        </div>
      )}
      <div className="terrain-credit">
        <span>NASA BLUE MARBLE</span> August 2004 composite · geographic context{" "}
        <span>Natural Earth boundaries</span>
      </div>
      {!pointMode && (
        <div
          className="contour-legend"
          aria-label="Recorded detection count scale"
        >
          <span>Recorded detections</span>
          <i style={{ background: "#34463f" }} />
          <small>0</small>
          {redScale.map((color, i) => (
            <span key={color}>
              <i style={{ background: color }} />
              <small>
                {i === 0 ? "1" : thresholds[i - 1] + 1}–{thresholds[i]}
              </small>
            </span>
          ))}
          <em>Counts, not severity or risk</em>
        </div>
      )}
      {!pointMode && (
        <details className="contour-places">
          <summary>
            All {scene.length}{" "}
            {current?.kind === "country" &&
            selectedCountry?.properties.NAME_EN === "Greece"
              ? "regions"
              : current?.kind === "continent"
                ? "regions"
                : current?.kind === "subregion"
                  ? "countries"
                  : "places"}
          </summary>
          <div>
            {scene.map((r) => (
              <button onClick={() => enter(r)} key={r.id}>
                <span>{r.name}</span>
                <b>{integer(r.rows.length)}</b>
              </button>
            ))}
          </div>
        </details>
      )}
      {pointMode && (
        <div className="contour-point-list">
          <p>
            {visibleRows.length
              ? "Satellite pixel centers · select a point or observation"
              : "No detections in the selected source records. Observing coverage remains unknown."}
          </p>
          {visibleRows.slice(page * 8, page * 8 + 8).map((o) => (
            <button key={o.id} onClick={() => onSelect(o)}>
              <span>
                {o.lat.toFixed(3)}°, {o.lon.toFixed(3)}°
              </span>
              <small>
                {o.time.slice(11, 16)} UTC · {o.frp ?? "—"} MW
              </small>
              <ArrowUpRight size={13} />
            </button>
          ))}
          {visibleRows.length > 8 && (
            <nav>
              <button onClick={() => setPage((p) => p - 1)} disabled={!page}>
                Previous
              </button>
              <span>
                {page + 1}/{Math.ceil(visibleRows.length / 8)}
              </span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={(page + 1) * 8 >= visibleRows.length}
              >
                Next
              </button>
            </nav>
          )}
        </div>
      )}
      {historical.length > 0 && (
        <div className="contour-historical">
          <span>Historical studies · separate dates</span>
          {historical.map((c) => (
            <button key={c.id} onClick={() => onCase(c)}>
              {c.name} <small>{c.date}</small>
              <ArrowUpRight size={12} />
            </button>
          ))}
        </div>
      )}
      <details className="contour-notes">
        <summary>Observation window & map meaning</summary>
        <p>
          {snapshotStart} – {snapshotEnd} UTC. Counts are detected thermal
          pixels in this selected snapshot, not unique fires, burned area,
          severity or risk. Zero means no recorded detections, not complete
          observing coverage. Missing geographic data is shown as unavailable,
          never zero.
        </p>
        <p>
          Natural Earth public-domain boundaries: country display 1:50m (1:110m
          fallback), count assignment 1:110m, Greece’s 13 regions and Mount
          Athos 1:10m. Continental groups follow the source country
          classification, including transcontinental countries; named subregions
          use Natural Earth’s SUBREGION field; boundaries are generalized.
          Region counts retain the parent country scope.{" "}
          {unassigned > 0
            ? `${integer(unassigned)} detections in this scope are outside the available generalized child boundaries and remain unassigned.`
            : ""}{" "}
          Red thresholds stay fixed across the visible sibling shapes. Grids are
          analytical sectors, not administrative regions. NASA Blue Marble
          shaded relief is an August 2004 geographic composite, not current
          imagery or evidence of these fires.
        </p>
        {pointMode && visibleRows.length > 4000 && (
          <p>
            The map renders the first 4,000 points; the list retains every
            observation.
          </p>
        )}
        <a
          href="https://www.naturalearthdata.com/about/terms-of-use/"
          target="_blank"
          rel="noreferrer"
        >
          Natural Earth source & license ↗
        </a>
      </details>
    </section>
  );
}

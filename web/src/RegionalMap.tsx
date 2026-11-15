import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { motion, useReducedMotion } from "motion/react";
import { Crosshair, Grid2X2, Minus, Plus } from "lucide-react";
import LocationInset, {
  viewportCountry,
  type Viewport,
} from "./orbital/LocationInset";
import { groupGeography, type Area, type Point } from "./orbital/geography";
import geographyUrl from "./orbital/map-units.json?url";
import type { CaseStudy, MapMarker, Observation } from "./data";
import {
  clusterMarkers,
  dateLabel,
  project,
  sensorLabel,
  timeLabel,
} from "./data";
import "./regional-mesh.css";

interface Props {
  study: CaseStudy;
  observations: Observation[];
  selected: Observation | null;
  onSelect: (o: Observation) => void;
  compare: boolean;
  onCompare: () => void;
  period: string;
  reset: number;
  wide: boolean;
}

const SENSOR_COLORS = { modis: "#ffaaa0", viirs: "#ff4558" };
const FLAME =
  "M12 1C15 7 7 9 7 15c-3-1-3-5-3-5S-1 17 3 22c4 6 13 7 17 1 4-6 0-12-3-15 1 5-1 6-1 6 2-6-2-11-4-13Z";
const CORE =
  "M12 14c1 4-4 5-4 8 0 2 2 4 4 4 4 0 6-3 4-6 0 2-1 2-1 2 1-3-2-6-3-8Z";
const MAX_ZOOM = 64;

export default function RegionalMap({
  study,
  observations,
  selected,
  onSelect,
  period,
  reset,
}: Props) {
  const [countries, setCountries] = useState<Area[]>([]);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [mesh, setMesh] = useState(true);
  const [size, setSize] = useState({ width: 1000, height: 500 });
  const [hover, setHover] = useState<{
    o: Observation;
    x: number;
    y: number;
    count: number;
  } | null>(null);
  const host = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(
    null,
  );
  const moved = useRef(false);
  const focused = useRef(false);
  const reduced = useReducedMotion();
  const meshId = useId().replaceAll(":", "");
  const ratio =
    (study.sceneBounds[3] - study.sceneBounds[1]) /
    (study.sceneBounds[2] - study.sceneBounds[0]);
  const h = 1000 * ratio;
  const scale = Math.max(size.width / 1000, size.height / h);
  // The raster is geographic, so x/y distances differ away from the equator.
  // This is a nominal nadir illustration at the case latitude, not a swath grid.
  const kmAcross =
    111.32 *
    Math.cos((study.center[1] * Math.PI) / 180) *
    (study.sceneBounds[2] - study.sceneBounds[0]);
  const kmDown = 111.32 * (study.sceneBounds[3] - study.sceneBounds[1]);
  const unitX = 1000 / kmAcross;
  const unitY = h / kmDown;
  const xy = (lon: number, lat: number) => {
    const point = project(lon, lat, study.sceneBounds);
    return [point[0], point[1] * ratio];
  };
  const centerOn = (point: Point, nextZoom: number) => {
    const p = xy(...point);
    setZoom(nextZoom);
    setPan({ x: (500 - p[0]) * nextZoom, y: (h / 2 - p[1]) * nextZoom });
  };
  const fitCase = () => {
    const [west, south, east, north] = study.bbox;
    const topLeft = xy(west, north);
    const bottomRight = xy(east, south);
    const fitted =
      Math.min(
        size.width / ((bottomRight[0] - topLeft[0]) * scale),
        size.height / ((bottomRight[1] - topLeft[1]) * scale),
      ) * 0.8;
    centerOn(study.center, Math.max(1, Math.min(MAX_ZOOM, fitted)));
  };
  useEffect(() => {
    const controller = new AbortController();
    fetch(geographyUrl, { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw Error();
        return r.json();
      })
      .then((data) => setCountries(groupGeography(data, []).countries))
      .catch(() => {});
    return () => controller.abort();
  }, []);
  useEffect(() => {
    if (!host.current) return;
    const observer = new ResizeObserver(([entry]) =>
      setSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      }),
    );
    observer.observe(host.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    focused.current = false;
  }, [study.id, reset]);
  useEffect(() => {
    if (focused.current || !observations.length) return;
    focused.current = true;
    // Open on a real dense neighborhood, with a ~40km field of view. A national
    // overview cannot resolve 375m cells; the locator and Fit case retain context.
    const bins = new Map<string, { count: number; lon: number; lat: number }>();
    for (const point of observations) {
      const key = `${Math.floor(point.lon / 0.05)}:${Math.floor(point.lat / 0.05)}`;
      const bin = bins.get(key);
      if (bin) {
        bin.count++;
        bin.lon += point.lon;
        bin.lat += point.lat;
      } else bins.set(key, { count: 1, lon: point.lon, lat: point.lat });
    }
    const densest = [...bins.values()].sort((a, b) => b.count - a.count)[0];
    const initialZoom = Math.max(
      1,
      Math.min(MAX_ZOOM, size.width / (40 * unitX * scale)),
    );
    centerOn(
      [densest.lon / densest.count, densest.lat / densest.count],
      initialZoom,
    );
  }, [observations, study.id, reset, size.width, size.height]);
  useEffect(() => {
    if (selected)
      centerOn(
        [selected.lon, selected.lat],
        Math.min(MAX_ZOOM, Math.max(zoom, size.width / (25 * unitX * scale))),
      );
  }, [selected?.id, study.id]);

  const viewport = useMemo<Viewport>(() => {
    const [west, south, east, north] = study.sceneBounds;
    const unproject = (sx: number, sy: number): Point => {
      const x = 500 + ((sx - size.width / 2) / scale - pan.x) / zoom;
      const y = h / 2 + ((sy - size.height / 2) / scale - pan.y) / zoom;
      return [
        west + (x / 1000) * (east - west),
        north - (y / h) * (north - south),
      ];
    };
    return {
      zoom: 5 + Math.log2(zoom),
      center: unproject(size.width / 2, size.height / 2),
      corners: [
        [0, 0],
        [size.width, 0],
        [size.width, size.height],
        [0, size.height],
      ].map(([x, y]) => unproject(x, y)),
    };
  }, [study, size, scale, pan, zoom, h]);
  const insetCountry = useMemo(
    () =>
      viewportCountry(countries, {
        zoom: 7,
        center: study.center,
        corners: [study.center],
      }),
    [countries, study],
  );
  const projectedPoints = useMemo(
    () =>
      observations.map((o) => {
        const [x, y] = xy(o.lon, o.lat);
        return { key: o.id, o, x, y, count: 1 };
      }),
    [observations, study.id],
  );
  const markerItems = useMemo(() => {
    const visible = projectedPoints.filter((p) => {
      const x = ((p.x - 500) * zoom + pan.x) * scale + size.width / 2;
      const y = ((p.y - h / 2) * zoom + pan.y) * scale + size.height / 2;
      return x >= 0 && x <= size.width && y >= 0 && y <= size.height;
    });
    return clusterMarkers(
      visible,
      (visible.length > 900 ? 16 : 10) / (zoom * scale),
      selected?.id,
    );
  }, [projectedPoints, zoom, pan, size, selected?.id]);
  const visibleCounts = useMemo(
    () =>
      markerItems.reduce(
        (total, item) => {
          total[item.o.sensor === "MODIS" ? "modis" : "viirs"] += item.count;
          return total;
        },
        { modis: 0, viirs: 0 },
      ),
    [markerItems],
  );
  const sourceCounts = useMemo(
    () => ({
      modis: observations.filter((o) => o.sensor === "MODIS").length,
      viirs: observations.filter((o) => o.sensor !== "MODIS").length,
    }),
    [observations],
  );
  const transform = `translate(${500 + pan.x} ${h / 2 + pan.y}) scale(${zoom}) translate(-500 ${-h / 2})`;
  const worldPerPixel = 1 / (zoom * scale);
  const meshOpacity = (km: number) =>
    Math.min(
      1,
      Math.max(0, ((Math.min(unitX, unitY) * km) / worldPerPixel - 2.5) / 4),
    );
  const origin = xy(...study.center);
  const showModis = sourceCounts.modis > 0;
  const showViirs = sourceCounts.viirs > 0;
  const meshLayers = [
    { name: "modis", size: 1, color: SENSOR_COLORS.modis, visible: showModis },
    {
      name: "viirs",
      size: 0.375,
      color: SENSOR_COLORS.viirs,
      visible: showViirs,
    },
  ];
  const mark = (item: MapMarker, index = 0) => {
    const active = selected?.id === item.o.id;
    const color = SENSOR_COLORS[item.o.sensor === "MODIS" ? "modis" : "viirs"];
    const glyphSize = (active ? 20 : item.count > 1 ? 16 : 12) * worldPerPixel;
    const markScale = glyphSize / 27;
    return (
      <g
        key={item.key}
        className={`map-mark sensor-fire-mark ${active ? "is-selected" : ""}`}
        transform={`translate(${item.x} ${item.y})`}
        onClick={(event) => {
          event.stopPropagation();
          if (moved.current) return;
          if (item.count > 1)
            centerOn([item.o.lon, item.o.lat], Math.min(MAX_ZOOM, zoom * 1.5));
          onSelect(item.o);
        }}
        onPointerEnter={(event) => {
          if (drag.current) return;
          const rect = host.current!.getBoundingClientRect();
          setHover({
            o: item.o,
            count: item.count,
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
          });
        }}
        onPointerLeave={() => setHover(null)}
      >
        <rect
          x={-11 * worldPerPixel}
          y={-16 * worldPerPixel}
          width={22 * worldPerPixel}
          height={25 * worldPerPixel}
          fill="transparent"
        />
        {active && (
          <rect
            className="sensor-selection-frame"
            x={-14 * worldPerPixel}
            y={-24 * worldPerPixel}
            width={28 * worldPerPixel}
            height={31 * worldPerPixel}
            rx={5 * worldPerPixel}
            fill="#09201588"
            stroke="#f3f2db"
            strokeWidth={worldPerPixel}
          />
        )}
        <g
          transform={`translate(${-12 * markScale} ${-24 * markScale}) scale(${markScale})`}
        >
          <g
            className={
              !reduced && (active || index % 7 === 0) && index < 560
                ? "sensor-fire-flicker"
                : undefined
            }
            style={
              { "--flame-delay": `${(-index % 9) * 0.37}s` } as CSSProperties
            }
          >
            <path d={FLAME} fill={color} stroke="#361214" strokeWidth="1" />
            <path
              d={CORE}
              fill={item.o.sensor === "MODIS" ? "#fff0db" : "#ffc3ac"}
              opacity=".9"
            />
          </g>
        </g>
        {item.count >= 10 && (
          <text
            x={8 * worldPerPixel}
            y={-9 * worldPerPixel}
            className="sensor-group-count"
            fontSize={9 * worldPerPixel}
            strokeWidth={2.5 * worldPerPixel}
          >
            {item.count > 999
              ? `${(item.count / 1000).toFixed(1)}k`
              : item.count}
          </text>
        )}
      </g>
    );
  };
  const renderedMarks = useMemo(
    () => markerItems.map((item, index) => mark(item, index)),
    [markerItems, selected?.id, zoom, scale, reduced, onSelect],
  );
  const pinnedOutside =
    selected && !observations.some((o) => o.id === selected.id);
  const periodLabel =
    period.length === 7
      ? dateLabel(period + "-01", { month: "long", year: "numeric" })
      : dateLabel(period);
  return (
    <div
      className={`regional-map sensor-mesh-map ${reduced ? "reduce-motion" : ""}`}
      ref={host}
    >
      <motion.svg
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: reduced ? 0 : 0.45 }}
        viewBox={`0 0 1000 ${h}`}
        preserveAspectRatio="xMidYMid slice"
        role="img"
        aria-label={`NASA scene of ${study.name}; ${observations.length} detections from ${periodLabel}. Coral flames represent MODIS, red flames VIIRS. Nominal resolution grids are illustrations. Use the readings list to select records with the keyboard.`}
        onWheel={(event) => {
          setHover(null);
          setZoom((value) =>
            Math.min(
              MAX_ZOOM,
              Math.max(1, value * (event.deltaY < 0 ? 1.12 : 0.89)),
            ),
          );
        }}
        onPointerDown={(event) => {
          drag.current = {
            x: event.clientX,
            y: event.clientY,
            px: pan.x,
            py: pan.y,
          };
          moved.current = false;
          setHover(null);
        }}
        onPointerMove={(event) => {
          if (!drag.current || event.buttons !== 1) return;
          const dx = (event.clientX - drag.current.x) / scale;
          const dy = (event.clientY - drag.current.y) / scale;
          if (Math.abs(dx) + Math.abs(dy) > 3) moved.current = true;
          setPan({ x: drag.current.px + dx, y: drag.current.py + dy });
        }}
        onPointerUp={() => {
          drag.current = null;
        }}
        onPointerLeave={() => {
          drag.current = null;
          setHover(null);
        }}
      >
        <defs>
          {meshLayers.map((layer) => (
            <pattern
              key={layer.name}
              id={`${meshId}-${layer.name}`}
              patternUnits="userSpaceOnUse"
              x={origin[0]}
              y={origin[1]}
              width={unitX * layer.size}
              height={unitY * layer.size}
            >
              <rect
                width={unitX * layer.size}
                height={unitY * layer.size}
                fill={layer.color}
                fillOpacity={layer.name === "modis" ? 0.018 : 0.012}
              />
              <path
                d={`M ${unitX * layer.size} 0 H 0 V ${unitY * layer.size}`}
                fill="none"
                stroke={layer.color}
                strokeWidth={
                  worldPerPixel * (layer.name === "modis" ? 0.8 : 0.55)
                }
              />
            </pattern>
          ))}
        </defs>
        <g transform={transform}>
          <image
            href={`/assets/${study.image}`}
            width="1000"
            height={h}
            preserveAspectRatio="none"
          />
          <rect width="1000" height={h} fill="#071b0f" opacity=".17" />
          {mesh && (
            <g className="sensor-resolution-mesh" pointerEvents="none">
              {meshLayers
                .filter((layer) => layer.visible)
                .map((layer) => (
                  <rect
                    key={layer.name}
                    width="1000"
                    height={h}
                    fill={`url(#${meshId}-${layer.name})`}
                    opacity={
                      meshOpacity(layer.size) *
                      (layer.name === "modis" ? 0.55 : 0.34)
                    }
                  />
                ))}
            </g>
          )}
          <g aria-hidden="true">
            {renderedMarks}
            {pinnedOutside &&
              selected &&
              mark({
                key: selected.id,
                o: selected,
                x: xy(selected.lon, selected.lat)[0],
                y: xy(selected.lon, selected.lat)[1],
                count: 1,
              })}
          </g>
        </g>
      </motion.svg>
      <div className="map-shading" />
      <div className="sensor-map-heading">
        <span>{periodLabel}</span>
        <strong>
          {study.name}
          <small>{study.country}</small>
        </strong>
      </div>
      <button
        className={`sensor-mesh-toggle ${mesh ? "active" : ""}`}
        aria-pressed={mesh}
        onClick={() => setMesh((value) => !value)}
        title="Geographic illustration of nominal nadir resolution; actual scan/track footprints vary"
      >
        <Grid2X2 size={15} /> Resolution mesh
      </button>
      {insetCountry && (
        <LocationInset
          country={insetCountry}
          viewport={viewport}
          point={selected}
          onBack={fitCase}
          overviewLabel="Fit whole case"
        />
      )}
      <div className="sensor-map-legend">
        <div className="sensor-legend-sources">
          <div style={{ color: SENSOR_COLORS.modis }}>
            <i className="sensor-grid-swatch coarse" />
            <span>
              <strong>MODIS</strong>
              <small>1 km</small>
            </span>
            <b>{visibleCounts.modis.toLocaleString()}</b>
          </div>
          <div style={{ color: SENSOR_COLORS.viirs }}>
            <i className="sensor-grid-swatch fine" />
            <span>
              <strong>VIIRS</strong>
              <small>375 m</small>
            </span>
            <b>{visibleCounts.viirs.toLocaleString()}</b>
          </div>
        </div>
        <span className="sensor-legend-note">
          Detections in view · hover a flame for grouped counts
        </span>
        <details className="sensor-resolution-help">
          <summary>About the resolution mesh</summary>
          <p>
            Nominal nadir spacing at this latitude. An illustration, not
            satellite pixel boundaries. Actual footprints grow away from nadir;
            inspect a reading for its scan × track dimensions.
          </p>
          <a
            href="https://firms.modaps.eosdis.nasa.gov/content/descriptions/FIRMS_VIIRS_Firehotspots.html"
            target="_blank"
            rel="noreferrer"
          >
            NASA sensor resolution ↗
          </a>
        </details>
        {mesh && meshOpacity(0.375) < 0.15 && (
          <span className="sensor-mesh-hint">
            Zoom closer to resolve the 375 m mesh
          </span>
        )}
      </div>
      <div className="map-tool-stack">
        <button
          aria-label="Zoom in"
          onClick={() => setZoom((value) => Math.min(MAX_ZOOM, value * 1.4))}
        >
          <Plus size={17} />
        </button>
        <button
          aria-label="Zoom out"
          onClick={() => setZoom((value) => Math.max(1, value / 1.4))}
        >
          <Minus size={17} />
        </button>
        <button
          aria-label="Fit whole case"
          title="Fit whole case"
          onClick={fitCase}
        >
          <Crosshair size={17} />
        </button>
      </div>
      <div className="scene-credit">
        NASA Aqua MODIS · {study.date} composite
        {period !== study.date ? " · fixed background" : ""}
      </div>
      {hover && (
        <div
          className="map-hover sensor-map-hover"
          style={{
            left: Math.min(size.width - 235, Math.max(12, hover.x + 15)),
            top: Math.max(12, Math.min(size.height - 115, hover.y + 15)),
          }}
        >
          <strong>
            {hover.count > 1
              ? `${hover.count.toLocaleString()} grouped ${hover.o.sensor === "MODIS" ? "MODIS" : "VIIRS"} readings`
              : sensorLabel(hover.o.sensor)}
          </strong>
          <span>
            {hover.o.lat.toFixed(3)}°, {hover.o.lon.toFixed(3)}°
          </span>
          <small>
            {dateLabel(hover.o.time)} · {timeLabel(hover.o.time)}
          </small>
          <small>
            {hover.count > 1 ? "Representative: " : "Reported footprint: "}
            {hover.o.scan} × {hover.o.track} km
          </small>
        </div>
      )}
    </div>
  );
}

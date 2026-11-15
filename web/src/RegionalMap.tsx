import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { motion, useReducedMotion } from "motion/react";
import {
  Crosshair,
  Grid2X2,
  Layers2,
  Minus,
  Pause,
  Play,
  Plus,
  ScanLine,
} from "lucide-react";
import type { CaseStudy, MapMarker, Observation } from "./data";
import {
  clusterMarkers,
  dateLabel,
  project,
  sensorLabel,
  timeLabel,
} from "./data";

import { occupiedMeshCells } from "./explore/resolution-mesh";
import "./explore/case-map.css";

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
  sensor: string;
  recordStatus?: string;
}

export default function RegionalMap({
  study,
  observations,
  selected,
  onSelect,
  compare: requestedCompare,
  onCompare,
  period,
  reset,
  wide,
  sensor,
  recordStatus,
}: Props) {
  const compare = requestedCompare && !recordStatus;
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [split, setSplit] = useState(50);
  const [columns, setColumns] = useState(false);
  const [meshVisible, setMeshVisible] = useState(true);
  const [flamesMoving, setFlamesMoving] = useState(true);
  const [inView, setInView] = useState(true);
  const [pageVisible, setPageVisible] = useState(true);
  const meshId = useId().replace(/:/g, "");
  const [dragging, setDragging] = useState(false);
  const [size, setSize] = useState({ width: 1000, height: 500 });
  const [hover, setHover] = useState<{
    o: Observation;
    x: number;
    y: number;
    count: number;
  } | null>(null);
  const host = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(
    null,
  );
  const moved = useRef(false);
  const reduced = useReducedMotion();
  const ratio =
    (study.sceneBounds[3] - study.sceneBounds[1]) /
    (study.sceneBounds[2] - study.sceneBounds[0]);
  const h = 1000 * ratio;
  const scale = Math.max(size.width / 1000, size.height / h);
  const visibleWidth = size.width / scale;
  const splitX = (1000 - visibleWidth) / 2 + (visibleWidth * split) / 100;
  const xy = (lon: number, lat: number) => {
    const p = project(lon, lat, study.sceneBounds);
    return [p[0], p[1] * ratio];
  };
  useEffect(() => {
    if (!svg.current) return;
    const observer = new ResizeObserver(([entry]) =>
      setSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      }),
    );
    observer.observe(svg.current);
    return () => observer.disconnect();
  }, []);
  const box = wide ? study.sceneBounds : study.bbox;
  const fitCase = () => {
    const a = xy(box[0], box[3]),
      b = xy(box[2], box[1]);
    const z = Math.min(
      6,
      Math.max(
        1,
        Math.min(
          Math.max(220, size.width - 110) / ((b[0] - a[0]) * scale),
          Math.max(160, size.height - (size.width < 700 ? 170 : 240)) /
            ((b[1] - a[1]) * scale),
        ),
      ),
    );
    setZoom(z);
    setPan({
      x: (500 - (a[0] + b[0]) / 2) * z,
      y: (h / 2 - (a[1] + b[1]) / 2) * z + (size.width < 700 ? 35 : 12) / scale,
    });
  };
  useEffect(fitCase, [reset, study.id, size.width, size.height, wide]);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) =>
      setInView(entry.isIntersecting),
    );
    if (host.current) observer.observe(host.current);
    const visibility = () =>
      setPageVisible(document.visibilityState === "visible");
    visibility();
    document.addEventListener("visibilitychange", visibility);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);
  useEffect(() => {
    if (!selected) return;
    const p = project(selected.lon, selected.lat, study.sceneBounds);
    const z = Math.max(zoom, 2.3);
    setZoom(z);
    setPan({ x: (500 - p[0]) * z, y: (h / 2 - p[1] * ratio) * z });
  }, [selected?.id, study.id]);

  const markerItems = useMemo(() => {
    const points = observations.map((o) => {
      const p = xy(o.lon, o.lat);
      return { key: o.id, o, x: p[0], y: p[1], count: 1 };
    });
    const visible = points.filter((p) => {
      const x = ((p.x - 500) * zoom + pan.x) * scale + size.width / 2;
      const y = ((p.y - h / 2) * zoom + pan.y) * scale + size.height / 2;
      return (
        x >= -60 && x <= size.width + 60 && y >= -60 && y <= size.height + 60
      );
    });
    return clusterMarkers(
      visible,
      (visible.length > 1500 ? 24 : 18) / (zoom * scale),
      selected?.id,
    );
  }, [observations, study.id, zoom, pan, size, selected?.id]);
  const corner = xy(box[0], box[3]),
    end = xy(box[2], box[1]);
  const transform = `translate(${500 + pan.x}px, ${h / 2 + pan.y}px) scale(${zoom}) translate(-500px, ${-h / 2}px)`;
  const mapStyle = {
    transform,
    transition:
      dragging || reduced ? "none" : "transform .8s cubic-bezier(.2,.8,.2,1)",
  };
  const meshes = useMemo(
    () => [
      {
        sensor: "MODIS",
        metres: 1000,
        color: "#f5a1ad",
        data: occupiedMeshCells(
          observations.filter((o) => o.sensor === "MODIS"),
          box,
          study.sceneBounds,
          1000,
        ),
      },
      {
        sensor: "VIIRS",
        metres: 375,
        color: "#ff6354",
        data: occupiedMeshCells(
          observations.filter((o) => o.sensor !== "MODIS"),
          box,
          study.sceneBounds,
          375,
        ),
      },
    ],
    [observations, study.id, wide],
  );
  const meshLayer = (side?: string) =>
    meshVisible &&
    !recordStatus &&
    meshes
      .filter(
        (m) =>
          (!side || m.sensor === side) &&
          (sensor === "all" || m.sensor === sensor),
      )
      .map((m) => {
        const g = m.data;
        // Subpixel cells merge visually at a wide extent: disclose rather than enlarge them.
        const readable =
          Math.min(g.cellWidth, g.cellHeight) * scale * zoom >= 2.2;
        return (
          <g
            key={m.sensor}
            className="resolution-mesh"
            data-sensor={m.sensor}
            data-cell-metres={m.metres}
            pointerEvents="none"
          >
            <rect
              x={g.x}
              y={g.y}
              width={g.width}
              height={g.height}
              fill={`url(#${meshId}-${m.sensor})`}
              opacity={readable ? 1 : 0.14}
            />
            <g
              clipPath={`url(#${meshId}-area)`}
              fill={m.color}
              fillOpacity={readable ? 0.13 : 0.07}
            >
              {g.cells.map((c) => (
                <rect
                  key={c.key}
                  x={c.x}
                  y={c.y}
                  width={g.cellWidth}
                  height={g.cellHeight}
                />
              ))}
            </g>
          </g>
        );
      });
  const mark = (item: MapMarker, animate = true) => {
    const { o, count } = item;
    const p = [item.x, item.y];
    const active = selected?.id === o.id;
    const color = o.sensor === "MODIS" ? "#f5a1ad" : "#ff6354";
    const iconScale = (active ? 1 : 0.72) / (zoom * scale);
    const phase = [...o.id].reduce((sum, c) => sum + c.charCodeAt(0), 0) % 19;
    return (
      <g
        key={item.key}
        className={`map-mark fire-mark ${active ? "is-selected" : ""}`}
        data-sensor={o.sensor}
        data-count={count}
        data-observation-id={o.id}
        onClick={(e) => {
          e.stopPropagation();
          if (!moved.current) {
            if (count > 1 && zoom < 8) {
              const z = Math.min(8, Math.max(2.3, zoom * 1.8));
              setZoom(z);
              setPan({ x: (500 - p[0]) * z, y: (h / 2 - p[1]) * z });
              setHover(null);
              return;
            }
            onSelect(o);
          }
        }}
        onPointerEnter={(e) => {
          if (drag.current) return;
          const rect = host.current!.getBoundingClientRect();
          setHover({
            o,
            count,
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
          });
        }}
        onPointerLeave={() => setHover(null)}
      >
        {columns && count === 1 && o.frp !== null && (
          <line
            x1={p[0]}
            x2={p[0]}
            y1={p[1]}
            y2={p[1] - Math.log1p(o.frp) * 4}
            stroke={color}
            strokeWidth={2.4 / zoom}
            opacity=".7"
          />
        )}
        <g transform={`translate(${p[0]} ${p[1]}) scale(${iconScale})`}>
          <rect x="-10" y="-18" width="20" height="23" fill="transparent" />
          {active && (
            <path
              d="M-11 -13v-7h7 M4 -20h7v7 M11 -1v6H4 M-4 5h-7v-6"
              className="fire-selection"
            />
          )}
          <g
            className={`fire-glyph ${animate ? "" : "is-still"}`}
            style={{ "--flame-delay": `${-phase / 10}s` } as CSSProperties}
          >
            <path
              className="fire-outer"
              fill={color}
              d="M0 1C-8 1-8-6-5-10C-5-7-3-7-3-8C-4-12 1-13 0-18C7-13 3-10 6-7C8-3 5 1 0 1Z"
            />
            <path
              className="fire-core"
              d="M0 0C-3 0-3-3-1-5C0-6 1-8 0-10C4-7 2-5 3-3C4-1 2 0 0 0Z"
            />
          </g>
          {count > 1 && (
            <path
              className="fire-group-tick"
              d="M-4 4h8M-2 7h4"
              stroke={color}
            />
          )}
        </g>
      </g>
    );
  };
  const marks = useMemo(
    () =>
      markerItems.map((item, index) => ({
        sensor: item.o.sensor,
        element: mark(item, index < 180 || item.o.id === selected?.id),
      })),
    [markerItems, selected?.id, columns, zoom, scale, onSelect],
  );
  const modis = observations.filter((o) => o.sensor === "MODIS");
  const viirs = observations.filter((o) => o.sensor !== "MODIS");
  const pinnedOutside =
    selected && !observations.some((o) => o.id === selected.id);
  const periodLabel =
    period.length === 7
      ? dateLabel(period + "-01", { month: "long", year: "numeric" })
      : dateLabel(period);
  return (
    <div
      className={`regional-map fire-mesh-map ${reduced || !flamesMoving || !inView || !pageVisible || dragging ? "flames-paused" : ""}`}
      ref={host}
    >
      <motion.svg
        ref={svg}
        initial={{ opacity: 0, scale: reduced ? 1 : 1.08 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.1, ease: [0.19, 1, 0.22, 1] }}
        viewBox={`0 0 1000 ${h}`}
        preserveAspectRatio="xMidYMid slice"
        role="img"
        aria-label={`NASA satellite scene of ${study.name}. ${recordStatus || `${observations.length} observations from ${periodLabel}`}. Select individual records in the observation list.`}
        onWheel={(e) => {
          setHover(null);
          setZoom((z) =>
            Math.min(8, Math.max(1, z * (e.deltaY < 0 ? 1.12 : 0.89))),
          );
        }}
        onPointerDown={(e) => {
          drag.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y };
          moved.current = false;
          setHover(null);
        }}
        onPointerMove={(e) => {
          if (!drag.current || e.buttons !== 1) return;
          const dx = (e.clientX - drag.current.x) / scale,
            dy = (e.clientY - drag.current.y) / scale;
          if (Math.abs(dx) + Math.abs(dy) > 3) {
            moved.current = true;
            setDragging(true);
          }
          setPan({ x: drag.current.px + dx, y: drag.current.py + dy });
        }}
        onPointerUp={() => {
          drag.current = null;
          setDragging(false);
        }}
        onPointerLeave={() => {
          drag.current = null;
          setDragging(false);
          setHover(null);
        }}
      >
        <defs>
          <clipPath id={`${meshId}-area`}>
            <rect
              x={corner[0]}
              y={corner[1]}
              width={end[0] - corner[0]}
              height={end[1] - corner[1]}
            />
          </clipPath>
          {meshes.map((m) => (
            <pattern
              key={m.sensor}
              id={`${meshId}-${m.sensor}`}
              patternUnits="userSpaceOnUse"
              x={m.data.x}
              y={m.data.y}
              width={m.data.cellWidth}
              height={m.data.cellHeight}
            >
              <path
                d={`M${m.data.cellWidth} 0H0V${m.data.cellHeight}`}
                fill="none"
                stroke={m.color}
                strokeOpacity={m.sensor === "MODIS" ? 0.28 : 0.22}
                strokeWidth={0.6 / (scale * zoom)}
              />
            </pattern>
          ))}
          <clipPath id="left-compare">
            <rect x="-1000" y="-1000" width={splitX + 1000} height={h + 2000} />
          </clipPath>
          <clipPath id="right-compare">
            <rect x={splitX} y="-1000" width="2000" height={h + 2000} />
          </clipPath>
        </defs>
        <g style={mapStyle}>
          <image
            href={`/assets/${study.image}`}
            width="1000"
            height={h}
            preserveAspectRatio="none"
          />
          <rect width="1000" height={h} fill="#06100c" opacity=".2" />
          <rect
            x={corner[0]}
            y={corner[1]}
            width={end[0] - corner[0]}
            height={end[1] - corner[1]}
            fill="#fff4dd"
            fillOpacity=".02"
            stroke="#e0dbc7"
            strokeOpacity=".7"
            strokeDasharray={`${4 / zoom} ${4 / zoom}`}
            strokeWidth={0.75 / zoom}
          />
          {!compare && meshLayer()}
          {!compare && (
            <g aria-hidden="true">
              {marks.map((m) => m.element)}
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
          )}
        </g>
        {compare && (
          <>
            <g clipPath="url(#left-compare)" aria-hidden="true">
              <motion.g
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6 }}
              >
                <g style={mapStyle}>
                  {meshLayer("MODIS")}
                  {marks
                    .filter((m) => m.sensor === "MODIS")
                    .map((m) => m.element)}
                </g>
              </motion.g>
            </g>
            <g clipPath="url(#right-compare)" aria-hidden="true">
              <motion.g
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.25 }}
              >
                <g style={mapStyle}>
                  {meshLayer("VIIRS")}
                  {marks
                    .filter((m) => m.sensor !== "MODIS")
                    .map((m) => m.element)}
                </g>
              </motion.g>
            </g>
            <line
              x1={splitX}
              x2={splitX}
              y1="-1000"
              y2={h + 1000}
              stroke="#f6f2e8"
              strokeWidth={1 / scale}
            />
          </>
        )}
      </motion.svg>
      <div className="map-shading" />
      <div className="scene-heading">
        <span className="eyebrow">SATELLITE INVESTIGATION</span>
        <h1>
          {study.name}
          <span>, {study.country}</span>
        </h1>
        <p>
          {periodLabel} <span>·</span>{" "}
          {recordStatus ||
            `${observations.length.toLocaleString()} reported detections`}
        </p>
      </div>
      {compare && (
        <>
          <div className="comparison-titles">
            <span>
              <i className="dot aqua" />
              AQUA / MODIS <b>{modis.length.toLocaleString()}</b>
              <small>1 km at nadir</small>
            </span>
            <span>
              <i className="dot fire" />
              S-NPP / VIIRS <b>{viirs.length.toLocaleString()}</b>
              <small>375 m at nadir</small>
            </span>
          </div>
          <div className="comparison-note mono">
            SELECTED ACQUISITIONS · PASS TIMES DIFFER
          </div>
        </>
      )}
      {compare && (
        <input
          aria-label="Satellite comparison divider"
          className="comparison-slider"
          type="range"
          min="10"
          max="90"
          value={split}
          onChange={(e) => setSplit(+e.target.value)}
        />
      )}
      <div className="map-tool-stack">
        <button
          aria-label="Zoom in"
          onClick={() => setZoom((z) => Math.min(8, z * 1.3))}
        >
          <Plus size={17} />
        </button>
        <button
          aria-label="Zoom out"
          onClick={() => setZoom((z) => Math.max(1, z / 1.3))}
        >
          <Minus size={17} />
        </button>
        <button aria-label="Reset map view" onClick={fitCase}>
          <Crosshair size={17} />
        </button>
        <button
          aria-label="Toggle FRP columns"
          aria-pressed={columns}
          title="FRP columns"
          className={columns ? "active" : ""}
          onClick={() => setColumns((v) => !v)}
        >
          <Layers2 size={17} />
        </button>
      </div>
      <button
        className={`compare-button ${compare ? "selected" : ""}`}
        aria-pressed={compare}
        disabled={!!recordStatus}
        onClick={onCompare}
      >
        <ScanLine size={15} />
        {compare ? "Close comparison" : "Compare satellites"}
      </button>
      <div className="mesh-key">
        <div className="mesh-key-top">
          <span className="eyebrow">THE RESOLUTION LENS</span>
          <div>
            <button
              aria-label="Show resolution mesh"
              aria-pressed={meshVisible}
              onClick={() => setMeshVisible((v) => !v)}
              title="Show resolution mesh"
            >
              <Grid2X2 size={14} />
            </button>
            <button
              aria-label={
                flamesMoving ? "Pause flame animation" : "Play flame animation"
              }
              aria-pressed={flamesMoving && !reduced}
              disabled={!!reduced}
              onClick={() => setFlamesMoving((v) => !v)}
              title={reduced ? "Reduced motion enabled" : "Flame animation"}
            >
              {flamesMoving && !reduced ? (
                <Pause size={14} />
              ) : (
                <Play size={14} />
              )}
            </button>
          </div>
        </div>
        <div className="mesh-sensors">
          <span
            className={`mesh-sensor modis ${!modis.length ? "is-muted" : ""}`}
          >
            <i className="mesh-swatch coarse" />
            <span>
              MODIS
              <strong>
                1 km <small>at nadir</small>
              </strong>
            </span>
          </span>
          <span
            className={`mesh-sensor viirs ${!viirs.length ? "is-muted" : ""}`}
          >
            <i className="mesh-swatch fine" />
            <span>
              VIIRS
              <strong>
                375 m <small>at nadir</small>
              </strong>
            </span>
          </span>
        </div>
        <p>Reference grid · approximate spacing, not pixel boundaries.</p>
        <div className="mesh-reading">
          {recordStatus ||
            (meshes.some(
              (m) =>
                (sensor === "all" || m.sensor === sensor) &&
                Math.min(m.data.cellWidth, m.data.cellHeight) * scale * zoom >=
                  2.2,
            )
              ? "Zoom to separate nearby detections"
              : "Zoom in to reveal the resolution mesh")}
        </div>
        <details>
          <summary>Reading the flames</summary>
          <p>
            Flames locate satellite detections from the selected period, not
            individual fires. Underlined flames group nearby records from one
            sensor. Colour identifies the sensor; motion does not show fire
            behaviour. The mesh illustrates nominal resolution; actual pixel
            sizes vary across the scan. Select a record for its reported
            footprint.
          </p>
        </details>
      </div>
      <div className="scene-credit mono">
        IMAGERY {study.date} · AQUA MODIS / NASA GIBS
        {period !== study.date
          ? " · FIXED BACKGROUND SCENE"
          : " · DAILY COMPOSITE"}
      </div>
      {columns && (
        <div className="column-legend mono">HEIGHT ∝ LOG(1 + FRP IN MW)</div>
      )}
      {hover && (
        <div
          className="map-hover"
          style={{
            left: Math.min(size.width - 205, Math.max(12, hover.x + 15)),
            top: Math.max(12, Math.min(size.height - 90, hover.y + 15)),
          }}
        >
          <strong>
            {hover.count > 1
              ? `${hover.count.toLocaleString()} ${hover.o.sensor === "MODIS" ? "MODIS" : "VIIRS"} detections · ${zoom < 8 ? "click to separate" : "inspect record"}`
              : sensorLabel(hover.o.sensor)}
          </strong>
          <span>
            {hover.o.lat.toFixed(3)}°, {hover.o.lon.toFixed(3)}°
          </span>
          <small>
            {dateLabel(hover.o.time)} · {timeLabel(hover.o.time)}
          </small>
        </div>
      )}
    </div>
  );
}

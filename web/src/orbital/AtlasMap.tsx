import { geoGraticule, geoGraticule10, geoPath, geoProjection } from "d3-geo";
import type { GeoProjection } from "d3-geo";
import type { GeoPermissibleObjects } from "d3-geo";
import type { MultiPolygon } from "geojson";
import { useLayoutEffect, useRef } from "react";
import { useReducedMotion } from "motion/react";
import { drawFire } from "./fireSymbol";
import { integer, number } from "../data";
import type { Observation } from "../data";
import { cellOutline } from "./geography";
import type { Area, Bounds, Point } from "./geography";

export type Style = "orbital" | "atlas" | "grid";
type View = {
  globe: number;
  ellipse: number;
  center: Point;
  width: number;
  height: number;
};
type Props = {
  style: Style;
  stage: "globe" | "world" | "detail";
  land: MultiPolygon;
  motionLand: MultiPolygon;
  outline?: MultiPolygon;
  areas: Area[];
  signal: Area[];
  motionSignal: Area[];
  bounds: Bounds;
  rows: Observation[];
  showPoints: boolean;
  sector?: Bounds;
  hovered: Area | null;
  selectedPoint: Observation | null;
  onHover: (area: Area | null) => void;
  onOpen: (area: Area) => void;
  onPoint: (row: Observation) => void;
  onHoverPoint: (row: Observation | null) => void;
};

const radians = Math.PI / 180;
const initialCenter: Point = [22, 12];
const graticule = geoGraticule10();
const motionGraticule = geoGraticule().step([30, 30])();
const sphere = { type: "Sphere" } as const;
const ovalAspect = 2;
const palette = {
  orbital: {
    ocean: "#101d20",
    rim: "#8ab8b6",
    land: "#283e3b",
    line: "#668582",
    accent: "#ffb477",
  },
  atlas: {
    ocean: "#141d2a",
    rim: "#83a4c1",
    land: "#293b4c",
    line: "#7b9bae",
    accent: "#fbb87d",
  },
  grid: {
    ocean: "#1b1827",
    rim: "#b1a2ce",
    land: "#352f48",
    line: "#8274a3",
    accent: "#e9daff",
  },
};
const mix = (from: number, to: number, t: number) => from + (to - from) * t;

function viewFor(props: Props): View {
  if (props.stage === "globe") {
    return {
      globe: 1,
      ellipse: 0,
      center: initialCenter,
      width: 360,
      height: 180,
    };
  }
  if (props.stage === "world" && props.style === "orbital") {
    return { globe: 0, ellipse: 1, center: [0, 0], width: 360, height: 180 };
  }
  const [w, s, e, n] = props.bounds;
  return {
    globe: 0,
    ellipse: 0,
    center: [(w + e) / 2, (s + n) / 2],
    width: e - w,
    height: n - s,
  };
}

/** Render the same geographic coordinates through every frame of the globe-to-atlas motion. */
function projection(
  view: View,
  width: number,
  height: number,
  moving: boolean,
) {
  const { globe, ellipse, center } = view;
  const longitudeScale = Math.max(0.44, Math.cos(center[1] * radians));
  const xScale = mix(longitudeScale, 1, ellipse);
  const planarScale = Math.min(
    (width * 0.93) / (view.width * radians * xScale),
    (height * 0.88) / (view.height * radians),
  );
  const globeScale = Math.min(width, height) * 0.437;
  const scale = mix(planarScale, globeScale, globe);
  return geoProjection((lon, lat) => {
    let theta = lat;
    if (ellipse > 0.001) {
      for (let i = 0; i < 7; i++) {
        const derivative = 2 + 2 * Math.cos(2 * theta);
        if (derivative < 0.000001) break;
        theta -=
          (2 * theta + Math.sin(2 * theta) - Math.PI * Math.sin(lat)) /
          derivative;
      }
    }
    const mapX = mix(lon * longitudeScale, lon * Math.cos(theta), ellipse);
    const mapY = mix(lat, (Math.sin(theta) * Math.PI) / 2, ellipse);
    return [
      mix(mapX, Math.cos(lat) * Math.sin(lon), globe),
      mix(mapY, Math.sin(lat), globe),
    ];
  })
    .precision(moving ? 2.5 : globe > 0.97 ? 0.7 : 1.2)
    .translate([width / 2, height / 2])
    .rotate([-center[0], -center[1] * globe, 0])
    .center([0, center[1] * (1 - globe)])
    .scale(scale)
    .clipAngle(globe > 0.018 ? 90 + Math.pow(1 - globe, 1.5) * 89.9 : null)
    .clipExtent([
      [0, 0],
      [width, height],
    ]);
}

type Hit = {
  area: Area;
  path?: Path2D;
  x?: number;
  y?: number;
  radius?: number;
};
type PointHit = { row: Observation; x: number; y: number };

export default function AtlasMap(props: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const latest = useRef(props);
  latest.current = props;
  const refresh = useRef<(() => void) | undefined>(undefined);
  const reduced = useReducedMotion();

  useLayoutEffect(() => {
    const el = canvas.current!;
    const ctx = el.getContext("2d");
    if (!ctx) return;
    let width = 1;
    let height = 1;
    let dpr = 1;
    let frame = 0;
    let hits: Hit[] = [];
    let pointHits: PointHit[] = [];
    let desired = viewFor(latest.current);
    let current = desired;
    let from = desired;
    let started = 0;
    let gesture: {
      x: number;
      y: number;
      center: Point;
      moved: boolean;
    } | null = null;
    let activeProjection: GeoProjection;
    let lastHover: Area | null = null;
    let lastPoint: Observation | null = null;
    let hoverPosition: Point | null = null;

    function draw() {
      const {
        style,
        stage,
        land,
        motionLand,
        outline,
        areas,
        signal,
        motionSignal,
        hovered,
        rows,
        showPoints,
        sector,
        selectedPoint,
      } = latest.current;
      const color = palette[style];
      const transitioning = frame !== 0;
      const moving = transitioning || Boolean(gesture?.moved);
      activeProjection = projection(current, width, height, moving);
      const path = geoPath(activeProjection, ctx).pointRadius(1.45);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx!.clearRect(0, 0, width, height);
      const globe = current.globe > 0.001;
      const oval = current.ellipse > 0.001;
      const opening = current.globe < 0.995 && current.globe > 0.015;
      const surfaceAlpha = opening
        ? 0.76 + 0.24 * Math.abs(2 * current.globe - 1)
        : 1;
      const isWorld =
        globe || oval || (current.width > 350 && current.height > 170);
      function paint(
        shape: GeoPermissibleObjects,
        fill?: string,
        stroke?: string,
        lineWidth = 0.8,
      ) {
        ctx!.beginPath();
        path(shape);
        if (fill) {
          ctx!.fillStyle = fill;
          ctx!.fill("evenodd");
        }
        if (stroke) {
          ctx!.strokeStyle = stroke;
          ctx!.lineWidth = lineWidth;
          ctx!.stroke();
        }
      }

      ctx!.save();
      if (current.globe >= 0.985) {
        const r = Math.min(width, height) * 0.437;
        const halo = ctx!.createRadialGradient(
          width / 2,
          height / 2,
          r * 0.965,
          width / 2,
          height / 2,
          r + 24,
        );
        halo.addColorStop(0, color.rim + "66");
        halo.addColorStop(1, color.rim + "00");
        ctx!.fillStyle = halo;
        ctx!.fillRect(0, 0, width, height);
      }
      const orbitalMask = style === "orbital" && (globe || oval);
      function surface() {
        ctx!.beginPath();
        if (orbitalMask) {
          const r = Math.min(width, height) * 0.437;
          const halfWidth = Math.min(width * 0.465, height * 0.44 * ovalAspect);
          const halfHeight = halfWidth / ovalAspect;
          ctx!.ellipse(
            width / 2,
            height / 2,
            mix(halfWidth, r, current.globe),
            mix(halfHeight, r, current.globe),
            0,
            0,
            2 * Math.PI,
          );
        } else {
          path(sphere);
        }
      }
      if (globe || oval) {
        surface();
        ctx!.clip();
      }
      const ocean = ctx!.createRadialGradient(
        width * 0.45,
        height * 0.33,
        10,
        width * 0.49,
        height * 0.5,
        width * 0.6,
      );
      ocean.addColorStop(0, color.ocean);
      ocean.addColorStop(1, "#080d14");
      ctx!.globalAlpha = surfaceAlpha;
      ctx!.fillStyle = ocean;
      ctx!.fillRect(0, 0, width, height);
      ctx!.globalAlpha = globe ? 0.22 : 0.2;
      paint(moving ? motionGraticule : graticule, undefined, color.line, 0.65);
      ctx!.globalAlpha = 1;
      ctx!.globalAlpha = surfaceAlpha;
      paint(moving ? motionLand : land, color.land, color.line, 0.65);
      ctx!.globalAlpha = 1;

      if (globe) {
        const shade = ctx!.createLinearGradient(
          width * 0.18,
          height * 0.19,
          width * 0.77,
          height * 0.84,
        );
        shade.addColorStop(0, "rgba(153,190,208,0.20)");
        shade.addColorStop(0.55, "rgba(6,11,14,0)");
        shade.addColorStop(1, "rgba(4,9,14,0.78)");
        ctx!.fillStyle = shade;
        ctx!.fillRect(0, 0, width, height);
      }

      if (outline && !moving) {
        ctx!.globalAlpha = 0.55;
        paint(
          outline,
          style === "grid" ? "#403351" : "#405451",
          color.rim,
          0.9,
        );
        ctx!.globalAlpha = 1;
      }

      hits = [];
      pointHits = [];
      const svgPath = geoPath(activeProjection).digits(1);
      if (!moving) {
        const max = areas[0]?.rows.length || 1;
        if (stage !== "globe" || style === "grid") {
          for (const area of [...areas].reverse()) {
            if (area.kind === "region" && !area.geometry) continue;
            const shape = area.bounds
              ? cellOutline(area.bounds)
              : area.geometry;
            if (!shape) continue;
            const d = svgPath(shape);
            if (!d) continue;
            const shapePath = new Path2D(d);
            const selected = area.id === hovered?.id;
            const intensity = Math.log1p(area.rows.length) / Math.log1p(max);
            ctx!.fillStyle = color.accent;
            ctx!.globalAlpha = selected
              ? 0.5
              : area.kind === "sector"
                ? 0.045 + intensity * 0.39
                : area.kind === "region"
                  ? 0
                  : 0.04 + intensity * 0.29;
            ctx!.fill(shapePath, "evenodd");
            ctx!.globalAlpha = selected
              ? 1
              : area.kind === "sector"
                ? 0.37
                : area.kind === "region"
                  ? 0
                  : 0.55;
            ctx!.strokeStyle = selected ? "#fff6e7" : color.line;
            ctx!.lineWidth = selected ? 1.5 : 0.65;
            ctx!.stroke(shapePath);
            ctx!.globalAlpha = 1;
            hits.push({ area, path: shapePath });
          }
        }
      }

      const live = moving ? [] : areas;
      if (!showPoints) {
        for (const area of moving && current.width > 180
          ? motionSignal
          : signal) {
          const [lon, lat] = area.point;
          if (globe && !visibleOnGlobe(area.point, current)) continue;
          const [x, y] = activeProjection([lon, lat])!;
          if (x < 0 || y < 0 || x > width || y > height) continue;
          const radius = Math.min(
            6.2,
            1.5 + Math.log2(area.rows.length + 1) * 0.45,
          );
          if (stage !== "detail")
            drawFire(ctx!, x - 5, y, Math.min(15, 8 + radius));
        }
      } else {
        if (sector && !transitioning) {
          const [w, s, e, n] = sector;
          const sectorPath = cellOutline(sector);
          paint(sectorPath, color.accent + "0a", color.accent + "90", 1.2);
          for (const lon of [w, (w + e) / 2, e]) {
            for (const lat of [s, (s + n) / 2, n]) {
              const [x, y] = activeProjection([lon, lat])!;
              ctx!.beginPath();
              ctx!.moveTo(x - 4, y);
              ctx!.lineTo(x + 4, y);
              ctx!.moveTo(x, y - 4);
              ctx!.lineTo(x, y + 4);
              ctx!.strokeStyle = color.accent + "80";
              ctx!.lineWidth = 1;
              ctx!.stroke();
            }
          }
        }
        for (const row of rows) {
          if (globe && !visibleOnGlobe([row.lon, row.lat], current)) continue;
          const p = activeProjection([row.lon, row.lat]);
          if (!p) continue;
          const [x, y] = p;
          const selected = selectedPoint?.id === row.id;
          ctx!.beginPath();
          ctx!.rect(
            x - (selected ? 4 : 1.8),
            y - (selected ? 4 : 1.8),
            selected ? 8 : 3.6,
            selected ? 8 : 3.6,
          );
          ctx!.fillStyle = selected ? "#fff3dc" : "#e7774c";
          ctx!.globalAlpha = selected ? 1 : 0.68;
          ctx!.fill();
          ctx!.globalAlpha = 1;
          pointHits.push({ row, x, y });
        }
      }

      const labels: Point[] = [];
      for (const area of live) {
        const isLabel =
          stage === "globe"
            ? area.kind !== "sector" &&
              (style !== "orbital" || labels.length < 5)
            : area.kind === "region" ||
              area.kind === "continent" ||
              area.id === hovered?.id;
        if (!isLabel || !area.rows.length || area.id === "Outside mapped land")
          continue;
        if (globe && !visibleOnGlobe(area.point, current, 0.2)) continue;
        const [x, y] = activeProjection(area.point)!;
        if (x < 12 || y < 12 || x > width - 12 || y > height - 12) continue;
        const selected = area.id === hovered?.id;
        const radius = stage === "globe" ? 10 : 7;
        if (
          !selected &&
          labels.some(
            ([lx, ly]) =>
              Math.hypot(x - lx, y - ly) < (stage === "globe" ? 75 : 48),
          )
        )
          continue;
        labels.push([x, y]);
        if (area.kind !== "sector") drawFire(ctx!, x - 7, y, 18, selected);
        if (
          stage === "globe" ||
          selected ||
          (width > 610 && labels.length < 7 && area.kind !== "sector")
        ) {
          ctx!.font = '600 14px "DM Sans", sans-serif';
          ctx!.fillStyle = "#f4ead8";
          ctx!.textAlign = "center";
          ctx!.lineWidth = 3;
          ctx!.strokeStyle = "#101617";
          ctx!.strokeText(area.name, x, y + radius + 13, 132);
          ctx!.fillText(area.name, x, y + radius + 13, 132);
        }
        hits.push({ area, x, y, radius: Math.max(23, radius + 5) });
      }
      ctx!.restore();
      if (globe || oval) {
        ctx!.globalAlpha = 0.67;
        surface();
        ctx!.strokeStyle = color.rim;
        ctx!.lineWidth = 1;
        ctx!.stroke();
        ctx!.globalAlpha = 1;
      } else if (!isWorld) {
        ctx!.strokeStyle = color.line;
        ctx!.globalAlpha = 0.18;
        ctx!.strokeRect(10.5, 10.5, width - 21, height - 21);
        ctx!.globalAlpha = 1;
      }

      if (!transitioning && hoverPosition && (lastHover || lastPoint)) {
        const label = lastHover?.name ?? "Heat seen from space";
        const detail = lastHover
          ? `${integer(lastHover.rows.length)} heat detections`
          : lastPoint?.frp == null
            ? "FRP unavailable"
            : `${number(lastPoint.frp)} MW`;
        const tipWidth = 190;
        const [px, py] = hoverPosition;
        const x = Math.max(5, Math.min(width - tipWidth - 5, px + 14));
        const y = py + 64 > height ? Math.max(4, py - 58) : py + 12;
        ctx!.beginPath();
        ctx!.roundRect(x, y, tipWidth, 47, 5);
        ctx!.fillStyle = "#0a1117f5";
        ctx!.strokeStyle = color.rim;
        ctx!.lineWidth = 1;
        ctx!.fill();
        ctx!.stroke();
        ctx!.textAlign = "left";
        ctx!.font = '600 12px "DM Sans",sans-serif';
        ctx!.fillStyle = "#f4f1e9";
        ctx!.fillText(label, x + 10, y + 18, tipWidth - 20);
        ctx!.font = '10px "IBM Plex Mono",monospace';
        ctx!.fillStyle = color.accent;
        ctx!.fillText(detail, x + 10, y + 35, tipWidth - 20);
      }
    }

    function tick(now: number) {
      const progress = Math.min(
        1,
        (now - started) / (latest.current.style === "orbital" ? 920 : 720),
      );
      const t =
        progress < 0.5 ? 4 * progress ** 3 : 1 - (-2 * progress + 2) ** 3 / 2;
      current = {
        globe: mix(from.globe, desired.globe, t),
        ellipse: mix(from.ellipse, desired.ellipse, t),
        center: [
          mix(from.center[0], desired.center[0], t),
          mix(from.center[1], desired.center[1], t),
        ],
        width: mix(from.width, desired.width, t),
        height: mix(from.height, desired.height, t),
      };
      frame = progress < 1 ? requestAnimationFrame(tick) : 0;
      draw();
    }

    function update() {
      const next = viewFor(latest.current);
      if (latest.current.hovered === null) lastHover = null;
      if (JSON.stringify(next) === JSON.stringify(desired)) {
        if (!frame) draw();
        return;
      }
      cancelAnimationFrame(frame);
      hoverPosition = null;
      lastHover = null;
      lastPoint = null;
      desired = next;
      if (reduced) {
        current = desired;
        frame = 0;
        draw();
        return;
      }
      from = current;
      started = performance.now();
      frame = requestAnimationFrame(tick);
    }

    function mousePoint(event: PointerEvent): Point {
      const rect = el.getBoundingClientRect();
      return [event.clientX - rect.left, event.clientY - rect.top];
    }

    function findArea(x: number, y: number) {
      for (let i = hits.length - 1; i >= 0; i--) {
        const hit = hits[i];
        if (
          hit.path &&
          ctx!.isPointInPath(hit.path, x * dpr, y * dpr, "evenodd")
        )
          return hit.area;
        if (
          hit.radius !== undefined &&
          Math.hypot(x - hit.x!, y - hit.y!) < hit.radius
        )
          return hit.area;
      }
      return null;
    }

    function findPoint(x: number, y: number) {
      let distance = 12;
      let row: Observation | null = null;
      for (const hit of pointHits) {
        const d = Math.hypot(x - hit.x, y - hit.y);
        if (d < distance) {
          distance = d;
          row = hit.row;
        }
      }
      return row;
    }

    function move(event: PointerEvent) {
      const [x, y] = mousePoint(event);
      if (gesture && latest.current.stage === "globe" && !frame) {
        const dx = x - gesture.x;
        const dy = y - gesture.y;
        if (Math.hypot(dx, dy) > 5 || gesture.moved) {
          gesture.moved = true;
          current = {
            ...current,
            center: [
              ((gesture.center[0] - dx * 0.33 + 540) % 360) - 180,
              Math.max(-78, Math.min(78, gesture.center[1] + dy * 0.33)),
            ],
          };
          hoverPosition = null;
          if (lastHover) {
            lastHover = null;
            latest.current.onHover(null);
          }
          draw();
          return;
        }
      }
      const area = findArea(x, y);
      const row = area ? null : findPoint(x, y);
      hoverPosition =
        event.pointerType !== "touch" && (area || row) ? [x, y] : null;
      if (lastPoint?.id !== row?.id) {
        lastPoint = row;
        latest.current.onHoverPoint(row);
      }
      if (lastHover?.id !== area?.id) {
        lastHover = area;
        latest.current.onHover(area);
      }
      el.style.cursor =
        area || row
          ? "pointer"
          : latest.current.stage === "globe"
            ? "grab"
            : "default";
    }

    function down(event: PointerEvent) {
      const [x, y] = mousePoint(event);
      gesture = { x, y, center: current.center, moved: false };
      el.setPointerCapture(event.pointerId);
    }

    function up(event: PointerEvent) {
      const [x, y] = mousePoint(event);
      const start = gesture;
      gesture = null;
      if (start?.moved) {
        draw();
        return;
      }
      if (!start || Math.hypot(x - start.x, y - start.y) > 8 || frame) return;
      const area = findArea(x, y);
      if (area) {
        latest.current.onOpen(area);
      } else {
        const row = findPoint(x, y);
        if (row) latest.current.onPoint(row);
      }
    }

    function leave() {
      gesture = null;
      hoverPosition = null;
      lastHover = null;
      lastPoint = null;
      latest.current.onHover(null);
      latest.current.onHoverPoint(null);
    }

    function resize() {
      width = el.clientWidth;
      height = el.clientHeight;
      dpr = Math.min(window.devicePixelRatio, 2);
      el.width = Math.max(1, width * dpr);
      el.height = Math.max(1, height * dpr);
      draw();
    }

    const observer = new ResizeObserver(resize);
    observer.observe(el);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointerleave", leave);
    el.addEventListener("pointercancel", leave);
    refresh.current = update;
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointerleave", leave);
      el.removeEventListener("pointercancel", leave);
      refresh.current = undefined;
    };
  }, [reduced]);
  useLayoutEffect(() => refresh.current?.(), [props]);
  const description =
    props.stage === "globe"
      ? "Draggable globe showing grouped satellite hotspots."
      : "Interactive map showing geographic areas, sectors, and satellite hotspots.";
  return (
    <canvas
      ref={canvas}
      role="img"
      aria-label={description}
      className="orb-map-canvas"
    />
  );
}

function visibleOnGlobe([lon, lat]: Point, view: View, threshold = 0.015) {
  const [x, y] = view.center;
  return (
    Math.sin(lat * radians) * Math.sin(y * radians) +
      Math.cos(lat * radians) *
        Math.cos(y * radians) *
        Math.cos((lon - x) * radians) >
    threshold
  );
}

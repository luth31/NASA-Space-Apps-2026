import { useEffect, useImperativeHandle, useRef, useState } from "react";
import {
  Map,
  NavigationControl,
  ScaleControl,
  setWorkerUrl,
  Marker,
} from "maplibre-gl";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import type {
  GeoJSONSource,
  MapGeoJSONFeature,
  ExpressionSpecification,
} from "maplibre-gl";
import { geoContains } from "d3-geo";
import { useReducedMotion } from "motion/react";
import type { FeatureCollection, Point, MultiPolygon } from "geojson";
import type { CaseStudy, Observation } from "../data";
import {
  coordinates,
  dateLabel,
  integer,
  sensorLabel,
  timeLabel,
} from "../data";
import type { Area, Bounds } from "./geography";
import LocationInset, { viewportCountry, type Viewport } from "./LocationInset";
import { boundsOf } from "./geography";
import { mapPalette } from "./map-palette";
import cachedTiles from "./cached-tiles.json";
import "maplibre-gl/dist/maplibre-gl.css";

export type MapDepth = "globe" | "continents" | "countries" | "points";
export type Camera = {
  id: string;
  center?: [number, number];
  zoom?: number;
  bounds?: Bounds;
  kind?: Area["kind"];
};
export type MapHandle = {
  reset: () => void;
  zoom: (direction: number) => void;
  level: (depth: MapDepth) => void;
};
type Props = {
  ref?: React.Ref<MapHandle>;
  rows: Observation[];
  continents: Area[];
  countries: Area[];
  camera: Camera;
  region: Area | null;
  selected: Observation | null;
  cases: CaseStudy[];
  onCase: (study: CaseStudy) => void;
  rotating: boolean;
  onRegion: (area: Area) => void;
  onArea: (lon: number, lat: number) => void;
  onPoint: (row: Observation) => void;
  onInteract: () => void;
  onView: (depth: MapDepth, area: Area | null) => void;
};
const basemap =
  "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/BlueMarble_NextGeneration/default/GoogleMapsCompatible_Level8";
setWorkerUrl(workerUrl);
const localTiles = new Set(cachedTiles);
export function depthAt(zoom: number, home: number): MapDepth {
  const distance = zoom - home;
  return distance < 0.4
    ? "globe"
    : distance < 1.45
      ? "continents"
      : distance < 3.25
        ? "countries"
        : "points";
}
function points(rows: Observation[]): FeatureCollection<Point> {
  return {
    type: "FeatureCollection",
    features: rows.map((row) => ({
      type: "Feature",
      id: row.id,
      geometry: { type: "Point", coordinates: [row.lon, row.lat] },
      properties: { id: row.id, sensor: row.sensor },
    })),
  };
}
function polygons(areas: Area[]): FeatureCollection<MultiPolygon> {
  const maximum = Math.max(1, ...areas.map((a) => a.rows.length));
  return {
    type: "FeatureCollection",
    features: areas.flatMap((a) =>
      a.geometry
        ? [
            {
              type: "Feature" as const,
              id: a.id,
              geometry: a.geometry,
              properties: {
                id: a.id,
                name: a.name,
                count: a.rows.length,
                strength: Math.log1p(a.rows.length) / Math.log1p(maximum),
              },
            },
          ]
        : [],
    ),
  };
}
const ramp = (...stops: number[]): ExpressionSpecification => [
  "interpolate",
  ["linear"],
  ["zoom"],
  ...stops,
];

// Zoom must remain the top-level expression for MapLibre's camera evaluator.
function alpha(
  fade: ExpressionSpecification,
  factor: number | ExpressionSpecification,
): ExpressionSpecification {
  return fade.map((value, index) =>
    index >= 4 && index % 2 === 0 ? ["*", value, factor] : value,
  ) as ExpressionSpecification;
}

export default function ContinuousMap(props: Props) {
  const host = useRef<HTMLDivElement>(null);
  const casePicker = useRef<HTMLElement>(null);
  const mapRef = useRef<Map | null>(null);
  const baseZoom = useRef(2.2);
  const latest = useRef(props);
  latest.current = props;
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [imageryError, setImageryError] = useState(false);
  const [viewport, setViewport] = useState<Viewport | null>(null);
  const [insetCountry, setInsetCountry] = useState<Area | null>(null);
  const [caseChoices, setCaseChoices] = useState<CaseStudy[]>([]);
  const [hover, setHover] = useState<{
    area?: Area;
    row?: Observation;
    count?: number;
    x: number;
    y: number;
  } | null>(null);
  const reduced = useReducedMotion();
  const reducedRef = useRef(reduced);
  reducedRef.current = reduced;
  useImperativeHandle(
    props.ref,
    () => ({
      reset() {
        mapRef.current?.flyTo({
          center: [24, 19],
          zoom: baseZoom.current,
          bearing: 0,
          pitch: 0,
          duration: reduced ? 0 : 1700,
        });
      },
      zoom(direction) {
        const m = mapRef.current;
        if (m)
          m.zoomTo(Math.max(0.6, Math.min(11, m.getZoom() + direction)), {
            duration: reduced ? 0 : 700,
          });
      },
      level(depth) {
        const m = mapRef.current;
        if (m)
          m.easeTo({
            zoom:
              baseZoom.current +
              { globe: 0, continents: 0.85, countries: 2.1, points: 3.8 }[
                depth
              ],
            duration: reduced ? 0 : 1400,
          });
      },
    }),
    [reduced],
  );

  useEffect(() => {
    const el = host.current!;
    const home = Math.log2(
      (Math.min(el.parentElement!.clientWidth, el.parentElement!.clientHeight) *
        0.86) /
        145,
    );
    baseZoom.current = home;
    let map: Map;
    try {
      map = new Map({
        container: el,
        center: [24, 19],
        zoom: home,
        minZoom: 0.6,
        maxZoom: 11,
        maxPitch: 45,
        attributionControl: { compact: true },
        style: {
          version: 8,
          projection: { type: "globe" },
          sources: {
            base: {
              type: "raster",
              tiles: [`${basemap}/{z}/{y}/{x}.jpeg`],
              tileSize: 256,
              maxzoom: 8,
              attribution: "NASA GIBS · Blue Marble",
            },
          },
          layers: [
            {
              id: "base",
              type: "raster",
              source: "base",
              paint: {
                "raster-saturation": -0.18,
                "raster-contrast": 0.18,
                "raster-brightness-max": ramp(home, 0.63, home + 2, 0.84),
                "raster-fade-duration": 400,
              },
            },
          ],
          sky: {
            "sky-color": "#0c1712",
            "horizon-color": "#6c9985",
            "fog-color": "#0c1712",
            "atmosphere-blend": ramp(home, 0.7, home + 1.3, 0.45, home + 3, 0),
          },
        },
        transformRequest(url) {
          if (url.startsWith(basemap)) {
            const path = url.slice(basemap.length);
            if (localTiles.has(path.slice(1).replace(/\.jpeg$/, "")))
              return { url: `/assets/basemap${path}` };
          }
          return { url };
        },
      });
    } catch {
      setFailed(true);
      return;
    }
    mapRef.current = map;
    el.dataset.depth = "globe";
    let currentDepth: MapDepth = "globe";
    let pointerInside = false;
    let spinning = false;
    let frame = 0;
    let lastTime = 0;
    let speed = 0;
    let lastContext = "";
    let highlighted: { source: string; id: string | number } | null = null;
    const canvas = map.getCanvas();
    function clearHighlight() {
      if (highlighted) {
        map.setFeatureState(highlighted, { hover: false });
        highlighted = null;
      }
    }
    function clearMapHover() {
      clearHighlight();
      setHover(null);
      canvas.style.cursor = "";
    }
    function clearHoverOnControls(event: Event) {
      if (event.target !== canvas) clearMapHover();
    }
    const emitContext = (area: Area | null) => {
      const key = `${currentDepth}:${area?.id ?? ""}`;
      if (key !== lastContext) {
        lastContext = key;
        latest.current.onView(currentDepth, area);
      }
    };
    const readViewport = (): Viewport => {
      const { clientWidth: w, clientHeight: h } = el;
      const c = map.getCenter();
      return {
        zoom: map.getZoom(),
        center: [c.lng, c.lat],
        corners: [
          [0, 0],
          [w, 0],
          [w, h],
          [0, h],
        ].map(([x, y]) => {
          const p = map.unproject([x, y]);
          return [p.lng, p.lat];
        }),
      };
    };
    function move() {
      const z = map.getZoom();
      const next = depthAt(z, home);
      el.dataset.longitude = map.getCenter().lng.toFixed(4);
      el.dataset.latitude = map.getCenter().lat.toFixed(4);
      el.dataset.zoom = z.toFixed(3);
      if (next !== currentDepth) {
        currentDepth = next;
        el.dataset.depth = next;
        emitContext(null);
      }
      // The globe animates in the renderer. React only tracks the close-up inset.
      if (z >= home + 1.45 && !spinning) setViewport(readViewport());
    }
    function settle() {
      if (spinning) return;
      const view = readViewport();
      const country =
        view.zoom >= home + 1.45
          ? viewportCountry(latest.current.countries, {
              ...view,
              zoom: Math.max(4.5, view.zoom),
            })
          : null;
      setInsetCountry(country);
      if (country) setViewport(view);
      const normalized: [number, number] = [
        ((view.center[0] + 540) % 360) - 180,
        view.center[1],
      ];
      const continent =
        latest.current.continents.find(
          (a) => a.geometry && geoContains(a.geometry, normalized),
        ) ?? null;
      emitContext(
        currentDepth === "globe"
          ? null
          : currentDepth === "continents"
            ? continent
            : (country ?? continent),
      );
    }
    map.on("move", move);
    map.on("moveend", settle);
    function enter() {
      pointerInside = true;
    }
    function leave() {
      pointerInside = false;
      clearMapHover();
    }
    el.addEventListener("mouseenter", enter);
    el.addEventListener("mouseleave", leave);
    el.addEventListener("pointerover", clearHoverOnControls, true);
    el.addEventListener("focusin", clearHoverOnControls);
    function spin(now: number) {
      frame = requestAnimationFrame(spin);
      const dt = Math.min(0.05, (now - (lastTime || now)) / 1000);
      lastTime = now;
      const allowed =
        latest.current.rotating &&
        !reducedRef.current &&
        !pointerInside &&
        !document.hidden &&
        map.getZoom() < home + 0.35 &&
        !map.isMoving();
      speed += ((allowed ? 0.85 : 0) - speed) * Math.min(1, dt * 5);
      el.dataset.rotating = allowed ? "true" : "false";
      if (allowed && dt > 0) {
        spinning = true;
        const c = map.getCenter();
        map.jumpTo({ center: [c.lng + speed * dt, c.lat] });
        spinning = false;
      }
    }
    frame = requestAnimationFrame(spin);
    map.on("movestart", (event) => {
      if (!spinning) clearMapHover();
      if (event.originalEvent) latest.current.onInteract();
    });
    // Buttons and wheel are user input too; rotation should not fight a zoom.
    const stopOnInput = () => latest.current.onInteract();
    el.addEventListener("pointerdown", stopOnInput);
    el.addEventListener("wheel", stopOnInput, { passive: true });
    map.on("error", (event) => {
      if ("sourceId" in event && event.sourceId === "base")
        setImageryError(true);
    });
    map.addControl(
      new NavigationControl({ showCompass: false }),
      "bottom-right",
    );
    map.addControl(new ScaleControl({ maxWidth: 100 }), "bottom-left");
    map.on("load", () => {
      map.addSource("continents", {
        type: "geojson",
        data: polygons(latest.current.continents),
        promoteId: "id",
      });
      map.addSource("countries", {
        type: "geojson",
        data: polygons(latest.current.countries),
        promoteId: "id",
      });
      const continentFade = ramp(
        home,
        0.001,
        home + 0.45,
        0.45,
        home + 0.95,
        0.55,
        home + 1.45,
        0,
      );
      const countryFade = ramp(
        home + 1.1,
        0,
        home + 1.6,
        0.65,
        home + 2.8,
        0.5,
        home + 3.5,
        0,
      );
      for (const [id, fade] of [
        ["continents", continentFade],
        ["countries", countryFade],
      ] as const) {
        map.addLayer({
          id: `${id}-fill`,
          type: "fill",
          source: id,
          paint: {
            "fill-color": [
              "interpolate",
              ["linear"],
              ["get", "strength"],
              0,
              "#4d342b",
              0.3,
              "#953a31",
              1,
              "#fc5b4d",
            ],
            "fill-opacity": alpha(fade, [
              "case",
              ["==", ["get", "count"], 0],
              0.04,
              ["+", 0.25, ["*", 0.75, ["get", "strength"]]],
            ]),
            "fill-opacity-transition": { duration: 250 },
          },
        });
        map.addLayer({
          id: `${id}-edge`,
          type: "line",
          source: id,
          paint: {
            "line-color": [
              "case",
              ["boolean", ["feature-state", "hover"], false],
              "#ffe1cb",
              "#ee997f",
            ],
            "line-width": [
              "case",
              ["boolean", ["feature-state", "hover"], false],
              1.6,
              0.5,
            ],
            "line-opacity": id === "continents" ? 0 : fade,
          },
        });
      }
      // Unclustered overview lights preserve the familiar luminous globe.
      map.addSource("lights", {
        type: "geojson",
        data: points(latest.current.rows),
      });
      const overviewFade = ramp(
        home,
        1,
        home + 0.35,
        0.95,
        home + 0.95,
        0.1,
        home + 1.5,
        0,
      );
      map.addLayer({
        id: "light-halo",
        type: "circle",
        source: "lights",
        paint: {
          "circle-color": "#ff5e44",
          "circle-radius": 4.5,
          "circle-blur": 0.95,
          "circle-opacity": alpha(overviewFade, 0.26),
        },
      });
      map.addLayer({
        id: "light-core",
        type: "circle",
        source: "lights",
        paint: {
          "circle-color": "#ffb183",
          "circle-radius": 1.15,
          "circle-opacity": alpha(overviewFade, 0.9),
        },
      });
      map.addSource("observations", {
        type: "geojson",
        data: points(latest.current.rows),
        cluster: true,
        clusterRadius: 24,
        clusterMaxZoom: 7,
      });
      const detailFade = ramp(home + 2.7, 0, home + 3.4, 1);
      map.addLayer({
        id: "clusters-glow",
        type: "circle",
        source: "observations",
        filter: ["has", "point_count"],
        paint: {
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["get", "point_count"],
            2,
            9,
            100,
            17,
            1000,
            25,
          ],
          "circle-color": "#ff564b",
          "circle-blur": 0.8,
          "circle-opacity": alpha(detailFade, 0.5),
        },
      });
      map.addLayer({
        id: "clusters",
        type: "circle",
        source: "observations",
        filter: ["has", "point_count"],
        paint: {
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["get", "point_count"],
            2,
            3.5,
            100,
            6,
            1000,
            10,
          ],
          "circle-color": "#ff8b68",
          "circle-opacity": detailFade,
          "circle-stroke-color": "#ffd9ba",
          "circle-stroke-width": 0.7,
          "circle-stroke-opacity": detailFade,
        },
      });
      map.addLayer({
        id: "points-halo",
        type: "circle",
        source: "observations",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-radius": 7,
          "circle-color": "#ff514d",
          "circle-blur": 0.8,
          "circle-opacity": alpha(detailFade, 0.45),
        },
      });
      map.addLayer({
        id: "points",
        type: "circle",
        source: "observations",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-radius": ramp(home + 2.7, 1.5, 10, 3.2),
          "circle-color": [
            "match",
            ["get", "sensor"],
            "MODIS",
            mapPalette.modis,
            mapPalette.viirs,
          ],
          "circle-opacity": detailFade,
          "circle-stroke-width": 0.5,
          "circle-stroke-color": "#ffdfc5",
          "circle-stroke-opacity": detailFade,
        },
      });
      map.addSource("selection", { type: "geojson", data: points([]) });
      map.addLayer({
        id: "selection",
        type: "circle",
        source: "selection",
        paint: {
          "circle-radius": 12,
          "circle-opacity": 0,
          "circle-stroke-color": "#fff8de",
          "circle-stroke-width": 2,
        },
      });
      setReady(true);
      move();
      settle();
    });
    function hitArea(point: { x: number; y: number }) {
      const source =
        currentDepth === "globe" || currentDepth === "continents"
          ? "continents"
          : "countries";
      const f = map.queryRenderedFeatures([point.x, point.y], {
        layers: [`${source}-fill`],
      })[0];
      if (!f) return null;
      return {
        area: (source === "continents"
          ? latest.current.continents
          : latest.current.countries
        ).find((a) => a.id === f.properties.id),
        source,
        id: f.id!,
      };
    }
    function hitPoint(point: { x: number; y: number }) {
      return map.queryRenderedFeatures(
        [
          [point.x - 6, point.y - 6],
          [point.x + 6, point.y + 6],
        ],
        { layers: ["points", "clusters"] },
      )[0];
    }
    const rowFor = (f: MapGeoJSONFeature) =>
      latest.current.rows.find((r) => r.id === f.properties.id);
    let lastHover = 0;
    map.on("mousemove", (e) => {
      if (
        e.originalEvent.target !== canvas ||
        casePicker.current ||
        !map.getLayer("points") ||
        map.isMoving() ||
        performance.now() - lastHover < 35
      )
        return;
      lastHover = performance.now();
      if (currentDepth !== "points") {
        const hit = hitArea(e.point);
        clearHighlight();
        if (hit?.area) {
          highlighted = { source: hit.source, id: hit.id };
          map.setFeatureState(highlighted, { hover: true });
        }
        setHover(
          hit?.area ? { area: hit.area, x: e.point.x, y: e.point.y } : null,
        );
        canvas.style.cursor = hit?.area ? "pointer" : "grab";
      } else {
        const f = hitPoint(e.point);
        clearHighlight();
        setHover(
          f
            ? {
                row: f.properties.cluster ? undefined : rowFor(f),
                count: f.properties.point_count,
                x: e.point.x,
                y: e.point.y,
              }
            : null,
        );
        canvas.style.cursor = f ? "pointer" : "grab";
      }
    });
    map.on("click", (e) => {
      if (e.originalEvent.target !== canvas || !map.getLayer("points")) return;
      if (casePicker.current) {
        setCaseChoices([]);
        return;
      }
      latest.current.onInteract();
      if (currentDepth !== "points") {
        const hit = hitArea(e.point);
        if (hit?.area) latest.current.onRegion(hit.area);
        return;
      }
      const f = hitPoint(e.point);
      if (!f) return;
      if (f.properties.cluster) {
        const p = f.geometry as Point;
        latest.current.onArea(p.coordinates[0], p.coordinates[1]);
      } else {
        const row = rowFor(f);
        if (row) latest.current.onPoint(row);
      }
    });
    const resize = new ResizeObserver(() => map.resize());
    resize.observe(el);
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      el.removeEventListener("mouseenter", enter);
      el.removeEventListener("mouseleave", leave);
      el.removeEventListener("pointerover", clearHoverOnControls, true);
      el.removeEventListener("focusin", clearHoverOnControls);
      el.removeEventListener("pointerdown", stopOnInput);
      el.removeEventListener("wheel", stopOnInput);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    (map.getSource("lights") as GeoJSONSource).setData(points(props.rows));
    (map.getSource("observations") as GeoJSONSource).setData(
      points(props.rows),
    );
    (map.getSource("continents") as GeoJSONSource).setData(
      polygons(props.continents),
    );
    (map.getSource("countries") as GeoJSONSource).setData(
      polygons(props.countries),
    );
    setHover(null);
  }, [ready, props.rows, props.continents, props.countries]);
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    const { bounds, center, zoom, kind } = props.camera;
    const options = {
      duration: reduced ? 0 : 1750,
      essential: false,
      bearing: 0,
      pitch: 0,
    };
    if (bounds)
      map.fitBounds(
        [
          [bounds[0], bounds[1]],
          [bounds[2], bounds[3]],
        ],
        {
          ...options,
          padding: 80,
          maxZoom: kind === "continent" ? baseZoom.current + 2.1 : 9,
        },
      );
    else
      map.flyTo({
        ...options,
        center: center ?? [24, 19],
        zoom: zoom ?? baseZoom.current + (kind === "continent" ? 1.85 : 0),
        curve: 1.3,
      });
  }, [ready, props.camera, reduced]);
  useEffect(() => {
    const map = mapRef.current;
    if (ready && map)
      (map.getSource("selection") as GeoJSONSource).setData(
        points(props.selected ? [props.selected] : []),
      );
  }, [ready, props.selected]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    let markers: Marker[] = [];
    function placeCases() {
      if (host.current?.dataset.rotating === "true" && markers.length) return;
      markers.forEach((marker) => marker.remove());
      markers = [];
      const groups: { studies: CaseStudy[]; x: number; y: number }[] = [];
      for (const study of latest.current.cases) {
        const point = map!.project(study.center);
        const group = groups.find(
          (g) => Math.hypot(g.x - point.x, g.y - point.y) < 46,
        );
        if (group) group.studies.push(study);
        else groups.push({ studies: [study], x: point.x, y: point.y });
      }
      for (const { studies } of groups) {
        const study = studies[0];
        const button = document.createElement("button");
        button.className = "living-case-pin";
        button.dataset.caseId = study.id;
        button.setAttribute(
          "aria-label",
          studies.length > 1
            ? `Explore ${studies.length} historical case studies near ${study.name}`
            : `Open ${study.name} case study, ${dateLabel(study.date)}`,
        );
        button.title = studies
          .map((s) => `${s.name} · ${dateLabel(s.date)}`)
          .join("\n");
        const dot = document.createElement("i");
        const label = document.createElement("span");
        label.textContent = `${study.name}${studies.length > 1 ? ` +${studies.length - 1}` : ""}`;
        const caption = document.createElement("small");
        caption.textContent =
          studies.length > 1
            ? "Historical case studies"
            : `Case study · ${study.date.slice(0, 4)}`;
        label.append(caption);
        button.append(dot, label);
        button.addEventListener("pointerdown", (e) => e.stopPropagation());
        button.addEventListener("click", (e) => {
          e.stopPropagation();
          setHover(null);
          latest.current.onInteract();
          if (studies.length === 1) latest.current.onCase(study);
          else setCaseChoices(studies);
        });
        markers.push(
          new Marker({
            element: button,
            anchor: "left",
            offset: [-9, 0],
            opacityWhenCovered: 0,
          })
            .setLngLat(study.center)
            .addTo(map!),
        );
      }
    }
    placeCases();
    // Group nearby pins after flights/zooms; MapLibre moves them with every frame.
    map.on("moveend", placeCases);
    return () => {
      map.off("moveend", placeCases);
      markers.forEach((m) => m.remove());
    };
  }, [ready, props.cases]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    let places: { name: string; point: [number, number]; rank: number }[] = [];
    let markers: Marker[] = [];
    let active = true;
    const label = () => {
      if (!map || host.current?.dataset.rotating === "true") return;
      markers.forEach((m) => m.remove());
      markers = [];
      const depth = depthAt(map.getZoom(), baseZoom.current);
      if (depth === "globe") return;
      const candidates =
        depth === "continents"
          ? latest.current.continents
          : depth === "countries"
            ? latest.current.countries
            : places;
      const occupied: { x: number; y: number }[] = [];
      for (const place of candidates) {
        if (!map.getBounds().contains(place.point)) continue;
        const p = map.project(place.point);
        if (
          p.x < 15 ||
          p.x > map.getContainer().clientWidth - 15 ||
          p.y < 15 ||
          p.y > map.getContainer().clientHeight - 15
        )
          continue;
        if (
          occupied.some(
            (o) => Math.abs(o.x - p.x) < 120 && Math.abs(o.y - p.y) < 40,
          )
        )
          continue;
        const el = document.createElement("span");
        el.className = "mission-place-label";
        el.textContent = place.name;
        markers.push(
          new Marker({ element: el, anchor: "center" })
            .setLngLat(place.point)
            .addTo(map),
        );
        occupied.push(p);
        if (markers.length >= 28) break;
      }
    };
    fetch("/assets/map-context/places.json")
      .then((r) => (r.ok ? r.json() : []))
      .then((v) => {
        if (active) {
          places = v;
          label();
        }
      })
      .catch(() => {});
    map.on("moveend", label);
    return () => {
      active = false;
      map.off("moveend", label);
      markers.forEach((m) => m.remove());
    };
  }, [ready]);
  const area = hover?.area;
  return (
    <div className="mission-map" ref={host}>
      {caseChoices.length > 0 && (
        <section
          ref={casePicker}
          className="living-case-picker"
          aria-label="Historical case studies"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
        >
          <header>
            <span>Historical case studies</span>
            <button
              aria-label="Close case studies"
              onClick={() => setCaseChoices([])}
            >
              ×
            </button>
          </header>
          <p>Open a dated investigation, separate from the current snapshot.</p>
          {caseChoices.map((study) => (
            <button key={study.id} onClick={() => props.onCase(study)}>
              <strong>{study.name}</strong>
              <span>{dateLabel(study.date)} ↗</span>
            </button>
          ))}
        </section>
      )}
      {viewport && insetCountry && (
        <LocationInset
          country={insetCountry}
          viewport={viewport}
          point={props.selected}
          onBack={() => {
            latest.current.onInteract();
            const [w, s, e, n] = boundsOf(insetCountry);
            mapRef.current?.fitBounds(
              [
                [w, s],
                [e, n],
              ],
              { padding: 80, duration: reduced ? 0 : 1300, maxZoom: 8 },
            );
          }}
        />
      )}
      {failed && (
        <div className="map-failure">
          The globe could not start. Choose a place from the list to explore the
          available records.
        </div>
      )}
      {imageryError && (
        <div className="mission-map-notice" role="status">
          Some background imagery could not load. Fire signals are still
          available.
        </div>
      )}
      {hover && (
        <div
          className="mission-hover living-hover"
          role="tooltip"
          style={{
            left: Math.max(
              12,
              Math.min((host.current?.clientWidth ?? 500) - 260, hover.x + 16),
            ),
            top: Math.max(
              65,
              Math.min((host.current?.clientHeight ?? 600) - 150, hover.y - 35),
            ),
          }}
        >
          <span className="eyebrow">
            {area?.kind === "continent"
              ? "CONTINENT"
              : area
                ? "COUNTRY"
                : "FIRE SIGNAL"}
          </span>
          <strong>
            {area?.name ??
              (hover.row ? "Heat spotted here" : "A group of fire signals")}
          </strong>
          <p>
            {area
              ? `${integer(area.rows.length)} reported fire signals`
              : hover.row
                ? `${dateLabel(hover.row.time)} · ${timeLabel(hover.row.time)}`
                : `${integer(hover.count ?? 0)} signals close together`}
          </p>
          <small>
            {area
              ? area.rows.length
                ? "Redder places have more signals in this snapshot."
                : "No signals reported in this snapshot."
              : hover.row
                ? `${sensorLabel(hover.row.sensor)} · ${coordinates(hover.row.lon, hover.row.lat)}`
                : "Several detections may belong to the same fire."}
          </small>
          <span>
            {area
              ? area.kind === "continent"
                ? "Click to explore countries ↗"
                : "Click to look closer ↗"
              : "Click to see more ↗"}
          </span>
        </div>
      )}
    </div>
  );
}

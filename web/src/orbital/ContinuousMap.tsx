import {
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  useMemo,
} from "react";
import {
  Map,
  NavigationControl,
  ScaleControl,
  setWorkerUrl,
  Marker,
} from "maplibre-gl";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import type { GeoJSONSource, MapGeoJSONFeature } from "maplibre-gl";
import { geoContains } from "d3-geo";
import { useReducedMotion } from "motion/react";
import type { FeatureCollection, Point } from "geojson";
import type { Observation, CaseStudy } from "../data";
import {
  coordinates,
  dateLabel,
  integer,
  number,
  sensorLabel,
  timeLabel,
} from "../data";
import type { Area, Bounds } from "./geography";
import cachedTiles from "./cached-tiles.json";
import "maplibre-gl/dist/maplibre-gl.css";

export type Camera = {
  id: string;
  center?: [number, number];
  zoom?: number;
  bounds?: Bounds;
};
export type MapHandle = {
  reset: () => void;
  zoom: (direction: number) => void;
};
type Props = {
  ref?: React.Ref<MapHandle>;
  rows: Observation[];
  regions: Area[];
  countries: Area[];
  camera: Camera;
  region: Area | null;
  selected: Observation | null;
  study: CaseStudy | null;
  sensor: "all" | "MODIS" | "VIIRS";
  onRegion: (area: Area) => void;
  onArea: (lon: number, lat: number) => void;
  onPoint: (row: Observation) => void;
  onInteract: () => void;
};

function features(rows: Observation[]): FeatureCollection<Point> {
  return {
    type: "FeatureCollection",
    features: rows.map((row) => ({
      type: "Feature",
      id: row.id,
      geometry: { type: "Point", coordinates: [row.lon, row.lat] },
      properties: { id: row.id, sensor: row.sensor, frp: row.frp },
    })),
  };
}

const basemap =
  "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/BlueMarble_NextGeneration/default/GoogleMapsCompatible_Level8";
setWorkerUrl(workerUrl);
const localTiles = new Set(cachedTiles);
function worldZoom(map: Map) {
  const container = map.getContainer();
  return Math.log2(
    (Math.min(container.clientWidth, container.clientHeight) * 0.78) / 145,
  );
}

export default function ContinuousMap(props: Props) {
  const host = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const latest = useRef(props);
  latest.current = props;
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [imageryError, setImageryError] = useState(false);
  const [hover, setHover] = useState<{
    area?: Area;
    row?: Observation;
    count?: number;
    x: number;
    y: number;
  } | null>(null);
  const reduced = useReducedMotion();
  useImperativeHandle(
    props.ref,
    () => ({
      reset() {
        const map = mapRef.current;
        if (map)
          map.flyTo({
            center: [20, 15],
            zoom: worldZoom(map),
            bearing: 0,
            pitch: 0,
            duration: reduced ? 0 : 1800,
          });
      },
      zoom(direction) {
        mapRef.current?.zoomTo(
          Math.max(0.6, Math.min(10, mapRef.current.getZoom() + direction)),
          { duration: reduced ? 0 : 650 },
        );
      },
    }),
    [reduced],
  );

  useEffect(() => {
    let map: Map;
    try {
      map = new Map({
        container: host.current!,
        center: [20, 15],
        zoom: Math.log2(
          (Math.min(host.current!.clientWidth, host.current!.clientHeight) *
            0.78) /
            145,
        ),
        minZoom: 0.6,
        maxZoom: 10,
        maxPitch: 50,
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
                "raster-saturation": -0.2,
                "raster-brightness-max": 0.85,
                "raster-fade-duration": 350,
              },
            },
          ],
          sky: {
            "sky-color": "#0b1827",
            "horizon-color": "#71a5ba",
            "fog-color": "#0b1827",
            "atmosphere-blend": [
              "interpolate",
              ["linear"],
              ["zoom"],
              0,
              0.8,
              3,
              0.6,
              5,
              0,
            ],
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
    map.on("error", (event) => {
      if (
        "sourceId" in event &&
        (event.sourceId === "case-image" || event.sourceId === "base")
      )
        setImageryError(true);
    });
    map.addControl(
      new NavigationControl({ showCompass: false }),
      "bottom-right",
    );
    map.addControl(new ScaleControl({ maxWidth: 100 }), "bottom-left");
    map.on("load", () => {
      map.addSource("observations", {
        type: "geojson",
        data: features(latest.current.rows),
        cluster: true,
        clusterRadius: 22,
        clusterMaxZoom: 6,
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
            4,
            100,
            7,
            1000,
            12,
            10000,
            17,
          ],
          "circle-color": "#d86738",
          "circle-opacity": 0.45,
          "circle-stroke-color": "#f1a56e",
          "circle-stroke-width": 1,
        },
      });
      const symbol = document.createElement("canvas");
      symbol.width = 24;
      symbol.height = 24;
      const context = symbol.getContext("2d")!;
      context.fillStyle = "white";
      context.fillRect(8, 8, 8, 8);
      context.strokeStyle = "white";
      context.lineWidth = 1.5;
      context.strokeRect(3, 3, 18, 18);
      map.addImage("thermal-pixel", context.getImageData(0, 0, 24, 24), {
        sdf: true,
      });
      map.addLayer({
        id: "points",
        type: "symbol",
        source: "observations",
        filter: ["!", ["has", "point_count"]],
        layout: {
          "icon-image": "thermal-pixel",
          "icon-size": [
            "interpolate",
            ["linear"],
            ["zoom"],
            2,
            0.25,
            8,
            0.5,
            10,
            0.8,
          ],
          "icon-allow-overlap": true,
        },
        paint: {
          "icon-color": [
            "match",
            ["get", "sensor"],
            "MODIS",
            "#f0b581",
            "#79d4cd",
          ],
          "icon-opacity": 0.9,
        },
      });
      map.addSource("selection", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.addLayer({
        id: "selection",
        type: "circle",
        source: "selection",
        paint: {
          "circle-radius": 14,
          "circle-opacity": 0,
          "circle-stroke-color": "#fff1d6",
          "circle-stroke-width": 2,
        },
      });
      map.addSource("region", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.addLayer({
        id: "region",
        type: "line",
        source: "region",
        paint: {
          "line-color": "#c8dfe1",
          "line-opacity": 0.35,
          "line-width": 1,
        },
      });
      map.addSource("analysis", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.addLayer({
        id: "analysis",
        type: "line",
        source: "analysis",
        paint: {
          "line-color": "#e8d9bb",
          "line-width": 1,
          "line-opacity": 0.65,
          "line-dasharray": [4, 3],
        },
      });
      setReady(true);
    });
    const rowFor = (feature: MapGeoJSONFeature) =>
      latest.current.rows.find((row) => row.id === feature.properties.id);
    map.on("mousemove", (event) => {
      if (!map.getLayer("points") || map.isMoving()) return;
      const found = map.queryRenderedFeatures(
        [
          [event.point.x - 6, event.point.y - 6],
          [event.point.x + 6, event.point.y + 6],
        ],
        { layers: ["points", "clusters"] },
      )[0];
      const area =
        map.getZoom() < 4 && !latest.current.study
          ? latest.current.regions.find(
              (a) =>
                a.geometry &&
                geoContains(a.geometry, [event.lngLat.lng, event.lngLat.lat]),
            )
          : undefined;
      const row =
        found && !found.properties.cluster ? rowFor(found) : undefined;
      map.getCanvas().style.cursor = found || area ? "pointer" : "grab";
      setHover(
        found || area
          ? {
              area,
              row,
              count: found?.properties.point_count,
              x: event.point.x,
              y: event.point.y,
            }
          : null,
      );
    });
    map.on("mouseout", () => setHover(null));
    map.on("movestart", (event) => {
      setHover(null);
      if (event.originalEvent) latest.current.onInteract();
    });
    map.on("click", (event) => {
      if (!map.getLayer("points")) return;
      const found = map.queryRenderedFeatures(
        [
          [event.point.x - 8, event.point.y - 8],
          [event.point.x + 8, event.point.y + 8],
        ],
        { layers: ["points", "clusters"] },
      )[0];
      if (map.getZoom() < 3.5 && !latest.current.study) {
        const area = latest.current.regions.find(
          (a) =>
            a.geometry &&
            geoContains(a.geometry, [event.lngLat.lng, event.lngLat.lat]),
        );
        if (area) {
          latest.current.onRegion(area);
          return;
        }
      }
      if (found?.properties.cluster) {
        const point = found.geometry as Point;
        latest.current.onArea(point.coordinates[0], point.coordinates[1]);
      } else if (found) {
        const row = rowFor(found);
        if (row) {
          if (!latest.current.region && !latest.current.study) {
            const area = latest.current.regions.find((a) =>
              a.rows.some((r) => r.id === row.id),
            );
            if (area) latest.current.onRegion(area);
          }
          latest.current.onPoint(row);
        }
      }
    });
    const resize = new ResizeObserver(() => map.resize());
    resize.observe(host.current!);
    return () => {
      resize.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    let places: { name: string; point: [number, number]; rank: number }[] = [];
    let markers: Marker[] = [];
    let active = true;
    function labelPlaces() {
      if (!map) return;
      markers.forEach((m) => m.remove());
      markers = [];
      const zoom = map.getZoom();
      if (zoom < 3.2) return;
      const candidates =
        zoom < 6
          ? latest.current.countries.map((c) => ({
              name: c.name,
              point: c.point,
              rank: 0,
            }))
          : places;
      const occupied: { x: number; y: number }[] = [];
      for (const place of candidates) {
        if (!map.getBounds().contains(place.point)) continue;
        const p = map.project(place.point);
        if (
          occupied.some(
            (o) => Math.abs(o.x - p.x) < 110 && Math.abs(o.y - p.y) < 35,
          )
        )
          continue;
        const element = document.createElement("span");
        element.className = "mission-place-label";
        element.textContent = place.name;
        markers.push(
          new Marker({ element, anchor: "center" })
            .setLngLat(place.point)
            .addTo(map),
        );
        occupied.push(p);
        if (markers.length >= 35) break;
      }
    }
    fetch("/assets/map-context/places.json")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (active) {
          places = data;
          labelPlaces();
        }
      })
      .catch(() => {});
    map.on("moveend", labelPlaces);
    labelPlaces();
    return () => {
      active = false;
      map.off("moveend", labelPlaces);
      markers.forEach((m) => m.remove());
    };
  }, [ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    (map.getSource("observations") as GeoJSONSource).setData(
      features(
        props.rows.filter(
          (r) => props.sensor === "all" || r.sensor === props.sensor,
        ),
      ),
    );
  }, [ready, props.rows, props.sensor]);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    const { bounds, center, zoom } = props.camera;
    const options = {
      duration: reduced ? 0 : 1900,
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
        { ...options, padding: 65, maxZoom: 7.8 },
      );
    else
      map.flyTo({
        ...options,
        center: center ?? [20, 15],
        zoom: zoom ?? worldZoom(map),
        curve: 1.25,
      });
  }, [ready, props.camera, reduced]);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    (map.getSource("selection") as GeoJSONSource).setData(
      features(props.selected ? [props.selected] : []),
    );
    (map.getSource("region") as GeoJSONSource).setData({
      type: "FeatureCollection",
      features: props.region?.geometry
        ? [{ type: "Feature", properties: {}, geometry: props.region.geometry }]
        : [],
    });
  }, [ready, props.region, props.selected]);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    if (map.getLayer("case-image")) map.removeLayer("case-image");
    if (map.getSource("case-image")) map.removeSource("case-image");
    if (props.study) {
      const [w, s, e, n] = props.study.sceneBounds;
      map.addSource("case-image", {
        type: "image",
        url: `/assets/map-context/${props.study.id}-mercator.jpg`,
        coordinates: [
          [w, n],
          [e, n],
          [e, s],
          [w, s],
        ],
      });
      map.addLayer(
        {
          id: "case-image",
          type: "raster",
          source: "case-image",
          paint: { "raster-opacity": 1, "raster-fade-duration": 500 },
        },
        "clusters",
      );
    }
    setImageryError(false);
    const bbox = props.study?.bbox;
    (map.getSource("analysis") as GeoJSONSource).setData({
      type: "FeatureCollection",
      features: bbox
        ? [
            {
              type: "Feature",
              properties: {},
              geometry: {
                type: "Polygon",
                coordinates: [
                  [
                    [bbox[0], bbox[1]],
                    [bbox[2], bbox[1]],
                    [bbox[2], bbox[3]],
                    [bbox[0], bbox[3]],
                    [bbox[0], bbox[1]],
                  ],
                ],
              },
            },
          ]
        : [],
    });
  }, [ready, props.study]);

  const area = hover?.area;
  const acquiredRange = useMemo(() => {
    const dates = area?.rows.map((r) => r.time).sort();
    return dates?.length
      ? `${dateLabel(dates[0])}–${dateLabel(dates[dates.length - 1])}`
      : "—";
  }, [area]);
  return (
    <div className="mission-map" ref={host}>
      {failed && (
        <div className="map-failure">
          The interactive map could not start. Use the place list or open a
          historical investigation.
        </div>
      )}
      {imageryError && (
        <div className="mission-map-notice" role="status">
          Some imagery could not load. Observation coordinates are still
          available.
        </div>
      )}
      {hover && (
        <div
          className="mission-hover"
          style={{
            left: Math.max(
              12,
              Math.min((host.current?.clientWidth ?? 500) - 272, hover.x + 16),
            ),
            top: Math.max(
              55,
              Math.min((host.current?.clientHeight ?? 600) - 178, hover.y - 45),
            ),
          }}
        >
          <strong>
            {area?.name ??
              (hover.row
                ? coordinates(hover.row.lon, hover.row.lat)
                : "Satellite observations")}
          </strong>
          <dl>
            <div>
              <dt>
                {area
                  ? "Detections"
                  : hover.row
                    ? "Fire radiative power"
                    : "Nearby detections"}
              </dt>
              <dd>
                {area
                  ? integer(area.rows.length)
                  : hover.row
                    ? `${number(hover.row.frp)} MW`
                    : integer(hover.count ?? 0)}
              </dd>
            </div>
            <div>
              <dt>{area ? "Highest FRP" : "Sensor"}</dt>
              <dd>
                {area
                  ? `${number(area.peak?.frp)} MW`
                  : hover.row
                    ? sensorLabel(hover.row.sensor)
                    : "Grouped observations"}
              </dd>
            </div>
            <div>
              <dt>Acquisition date</dt>
              <dd>
                {area
                  ? acquiredRange
                  : hover.row
                    ? dateLabel(hover.row.time)
                    : "Select to inspect"}
              </dd>
            </div>
            <div>
              <dt>{area ? "Daytime detections" : "Acquired"}</dt>
              <dd>
                {area
                  ? integer(area.daytime)
                  : hover.row
                    ? timeLabel(hover.row.time)
                    : "Tap to resolve"}
              </dd>
            </div>
          </dl>
          <span>
            {area
              ? "Select to explore this region"
              : "Select for the satellite reading"}
          </span>
        </div>
      )}
    </div>
  );
}

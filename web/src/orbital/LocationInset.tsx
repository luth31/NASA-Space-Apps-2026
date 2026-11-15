import { useId, useMemo } from "react";
import { geoContains, geoMercator, geoPath } from "d3-geo";
import type { Area, Point } from "./geography";
import type { Observation } from "../data";
import { sensorColor } from "./map-palette";

export type Viewport = { zoom: number; center: Point; corners: Point[] };

// Camera geography works for archived cases too: it does not depend on the
// global snapshot's observation-to-country assignment table.
export function viewportCountry(countries: Area[], view: Viewport) {
  if (view.zoom < 4.5) return null;
  // An island/coastal country's fitted view can have water at its center and
  // all four corners. Include visible country anchors, nearest first, so its
  // overview does not lose context and fall back to unrelated global rows.
  const near = (lon: number) =>
    lon + Math.round((view.center[0] - lon) / 360) * 360;
  const west = Math.min(...view.corners.map((p) => near(p[0])));
  const east = Math.max(...view.corners.map((p) => near(p[0])));
  const south = Math.min(...view.corners.map((p) => p[1]));
  const north = Math.max(...view.corners.map((p) => p[1]));
  const distance = (p: Point) =>
    Math.hypot(
      (near(p[0]) - view.center[0]) *
        Math.cos((view.center[1] * Math.PI) / 180),
      p[1] - view.center[1],
    );
  const anchors = countries
    .filter(
      ({ point: [lon, lat] }) =>
        near(lon) >= west && near(lon) <= east && lat >= south && lat <= north,
    )
    .map((country) => country.point)
    .sort((a, b) => distance(a) - distance(b));
  for (const point of [view.center, ...anchors, ...view.corners]) {
    const normalized: Point = [((point[0] + 540) % 360) - 180, point[1]];
    const country = countries.find(
      (c) => c.geometry && geoContains(c.geometry, normalized),
    );
    if (country) {
      if (!country.adminId) return country;
      // Keep distant overseas territories in their local geographic context.
      const units = countries.filter(
        (c) => c.adminId === country.adminId && c.parent === country.parent,
      );
      return {
        ...country,
        name: country.adminName ?? country.name,
        geometry: {
          type: "MultiPolygon" as const,
          coordinates: units.flatMap((c) => c.geometry?.coordinates ?? []),
        },
      };
    }
  }
  return null;
}

export default function LocationInset({
  country,
  point,
  viewport,
  onBack,
  overviewLabel = "Country overview",
}: {
  country: Area;
  point: Observation | null;
  viewport: Viewport;
  onBack: () => void;
  overviewLabel?: string;
}) {
  const clipId = useId();
  const context = useMemo(() => {
    if (!country.geometry) return null;
    const projection = geoMercator()
      .rotate([-country.point[0], 0])
      .fitExtent(
        [
          [12, 10],
          [208, 132],
        ],
        country.geometry,
      );
    return { projection, path: geoPath(projection)(country.geometry) };
  }, [country]);
  const drawing = useMemo(() => {
    if (!context || !country.geometry) return null;
    const { projection, path } = context;
    const selected =
      point && geoContains(country.geometry, [point.lon, point.lat])
        ? point
        : null;
    const project = (p: Point) =>
      projection([
        p[0] + Math.round((country.point[0] - p[0]) / 360) * 360,
        p[1],
      ]);
    return {
      path,
      viewport: viewport.corners
        .map(project)
        .filter(Boolean)
        .map((p) => p!.join(","))
        .join(" "),
      point: selected ? project([selected.lon, selected.lat]) : null,
    };
  }, [context, country, point, viewport]);
  if (!drawing) return null;
  return (
    <button
      className="mission-location-inset"
      onClick={onBack}
      aria-label={`Current view in ${country.name}. Rectangle shows the map viewport. ${overviewLabel}.`}
    >
      <span>{country.name}</span>
      <svg viewBox="0 0 220 142" aria-hidden="true">
        <defs>
          <clipPath id={clipId}>
            <rect width="220" height="142" />
          </clipPath>
        </defs>
        <g clipPath={`url(#${clipId})`}>
          <path
            d={drawing.path ?? ""}
            fill="#2a4932"
            stroke="#a9c39a"
            strokeWidth=".8"
          />
          <polygon
            className="inset-viewport"
            points={drawing.viewport}
            fill="#c1d9a222"
            stroke="#ffffff"
            strokeWidth="1.5"
          />
          {drawing.point && point && (
            <>
              <circle
                cx={drawing.point[0]}
                cy={drawing.point[1]}
                r="7"
                fill="#102016"
                stroke="white"
                strokeWidth="1.5"
              />
              <circle
                cx={drawing.point[0]}
                cy={drawing.point[1]}
                r="3.5"
                fill={sensorColor(point.sensor)}
              />
            </>
          )}
        </g>
      </svg>
      <small>
        <i className="inset-viewport-key" /> Current view
        {drawing.point ? " · selected pixel" : ""}
      </small>
      <small>{overviewLabel} ↗</small>
    </button>
  );
}

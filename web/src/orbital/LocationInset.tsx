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
  for (const point of [view.center, ...view.corners]) {
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
  const drawing = useMemo(() => {
    if (!country.geometry) return null;
    const projection = geoMercator()
      .rotate([-country.point[0], 0])
      .fitExtent(
        [
          [12, 10],
          [208, 132],
        ],
        {
          type: "GeometryCollection",
          geometries: [
            country.geometry,
            { type: "MultiPoint", coordinates: viewport.corners },
          ],
        },
      );
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
      path: geoPath(projection)(country.geometry),
      viewport: viewport.corners
        .map(project)
        .filter(Boolean)
        .map((p) => p!.join(","))
        .join(" "),
      point: selected ? project([selected.lon, selected.lat]) : null,
    };
  }, [country, point, viewport]);
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
            fill="#233c55"
            stroke="#91b1d1"
            strokeWidth=".8"
          />
          <polygon
            className="inset-viewport"
            points={drawing.viewport}
            fill="#75c5ff22"
            stroke="#ffffff"
            strokeWidth="1.5"
          />
          {drawing.point && point && (
            <>
              <circle
                cx={drawing.point[0]}
                cy={drawing.point[1]}
                r="7"
                fill="#0b1726"
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

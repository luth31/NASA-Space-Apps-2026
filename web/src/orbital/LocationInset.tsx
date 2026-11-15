import { useMemo } from "react";
import { geoMercator, geoPath } from "d3-geo";
import type { Area } from "./geography";
import type { Observation } from "../data";

export default function LocationInset({
  country,
  point,
  onBack,
}: {
  country: Area;
  point: Observation;
  onBack: () => void;
}) {
  const drawing = useMemo(() => {
    if (!country.geometry) return null;
    const projection = geoMercator().fitExtent(
      [
        [10, 8],
        [190, 106],
      ],
      country.geometry,
    );
    return {
      path: geoPath(projection)(country.geometry),
      point: projection([point.lon, point.lat]),
    };
  }, [country, point]);
  if (!drawing?.point) return null;
  return (
    <button
      className="mission-location-inset"
      onClick={onBack}
      aria-label={`Selected observation in ${country.name}. Return to regional overview.`}
    >
      <span>{country.name}</span>
      <svg viewBox="0 0 200 115" aria-hidden="true">
        <path
          d={drawing.path ?? ""}
          fill="#29434a"
          stroke="#8ca6ad"
          strokeWidth=".6"
        />
        <circle
          cx={drawing.point[0]}
          cy={drawing.point[1]}
          r="5"
          fill="#ecb37e"
          stroke="#15262f"
          strokeWidth="2"
        />
        <circle
          cx={drawing.point[0]}
          cy={drawing.point[1]}
          r="10"
          fill="none"
          stroke="#ecb37e"
          strokeWidth=".8"
        />
      </svg>
      <small>Return to regional overview ↗</small>
    </button>
  );
}

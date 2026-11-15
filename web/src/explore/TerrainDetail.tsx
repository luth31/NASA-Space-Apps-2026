import { useState } from "react";
import type { Bounds } from "./geography";
import type { fitProjection } from "./contour-data";

/** Static NASA geographic context. This never requests a fire-date image or changes observations. */
export default function TerrainDetail({
  projection,
  height,
  enabled,
}: {
  projection: ReturnType<typeof fitProjection>;
  height: number;
  enabled: boolean;
}) {
  const [ready, setReady] = useState("");
  const [failed, setFailed] = useState("");
  if (!enabled) return null;
  const a = projection.invert(0, height),
    b = projection.invert(1000, 0);
  const extent: Bounds = [
    Math.max(-180, a[0]),
    Math.max(-85, a[1]),
    Math.min(180, b[0]),
    Math.min(85, b[1]),
  ];
  if (extent[2] <= extent[0] || extent[3] <= extent[1]) return null;
  const width = 1800,
    rasterHeight = Math.max(
      256,
      Math.min(
        2048,
        Math.round((width * (extent[3] - extent[1])) / (extent[2] - extent[0])),
      ),
    );
  const params = new URLSearchParams({
    SERVICE: "WMS",
    VERSION: "1.1.1",
    REQUEST: "GetMap",
    LAYERS: "BlueMarble_ShadedRelief_Bathymetry",
    STYLES: "",
    SRS: "EPSG:4326",
    BBOX: extent.map((v) => v.toFixed(4)).join(","),
    WIDTH: String(width),
    HEIGHT: String(rasterHeight),
    FORMAT: "image/jpeg",
  });
  const url = `https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi?${params}`;
  const top = projection.project(extent[0], extent[3]),
    bottom = projection.project(extent[2], extent[1]);
  return (
    <image
      key={url}
      href={url}
      x={top[0]}
      y={top[1]}
      width={bottom[0] - top[0]}
      height={bottom[1] - top[1]}
      preserveAspectRatio="none"
      aria-hidden="true"
      className="contour-terrain terrain-detail terrain-on-demand"
      style={{ opacity: ready === url && failed !== url ? 1 : 0 }}
      onLoad={() => setReady(url)}
      onError={() => setFailed(url)}
      data-terrain-detail={
        failed === url
          ? "bundled-fallback"
          : ready === url
            ? "ready"
            : "loading"
      }
    />
  );
}

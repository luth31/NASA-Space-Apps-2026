import type { Observation } from "../data";

type Bounds = [number, number, number, number];

/** Local equirectangular reference grid, not a reconstruction of sensor swaths. */
export function resolutionMesh(bounds: Bounds, scene: Bounds, metres: number) {
  const latitude = (bounds[1] + bounds[3]) / 2;
  const longitudeStep =
    metres / (111_320 * Math.cos((latitude * Math.PI) / 180));
  const latitudeStep = metres / 111_320;
  const units = 1000 / (scene[2] - scene[0]);
  return {
    x: (bounds[0] - scene[0]) * units,
    y: (scene[3] - bounds[3]) * units,
    width: (bounds[2] - bounds[0]) * units,
    height: (bounds[3] - bounds[1]) * units,
    cellWidth: longitudeStep * units,
    cellHeight: latitudeStep * units,
    longitudeStep,
    latitudeStep,
  };
}

export function occupiedMeshCells(
  observations: Observation[],
  bounds: Bounds,
  scene: Bounds,
  metres: number,
) {
  const grid = resolutionMesh(bounds, scene, metres);
  const cells = new Map<
    string,
    { key: string; x: number; y: number; count: number }
  >();
  for (const o of observations) {
    if (
      o.lon < bounds[0] ||
      o.lon >= bounds[2] ||
      o.lat < bounds[1] ||
      o.lat >= bounds[3]
    )
      continue;
    const col = Math.floor((o.lon - bounds[0]) / grid.longitudeStep);
    const row = Math.floor((bounds[3] - o.lat) / grid.latitudeStep);
    const key = `${col}:${row}`;
    const cell = cells.get(key);
    if (cell) cell.count++;
    else
      cells.set(key, {
        key,
        x: grid.x + col * grid.cellWidth,
        y: grid.y + row * grid.cellHeight,
        count: 1,
      });
  }
  return { ...grid, cells: [...cells.values()] };
}

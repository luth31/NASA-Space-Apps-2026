import { describe, expect, it } from "vitest";
import { decode } from "../../data";
import { occupiedMeshCells, resolutionMesh } from "./resolution-mesh";

describe("nominal resolution reference mesh", () => {
  const bounds: [number, number, number, number] = [25.6, 40.65, 26.5, 41.4];
  const scene: [number, number, number, number] = [23, 39.8, 27.8, 42.2];
  it("preserves the 1000:375 scale and accounts for longitude convergence", () => {
    const coarse = resolutionMesh(bounds, scene, 1000);
    const fine = resolutionMesh(bounds, scene, 375);
    expect(coarse.cellWidth / fine.cellWidth).toBeCloseTo(1000 / 375);
    expect(coarse.cellHeight / fine.cellHeight).toBeCloseTo(1000 / 375);
    expect(coarse.cellWidth * Math.cos((41.025 * Math.PI) / 180)).toBeCloseTo(
      coarse.cellHeight,
    );
  });
  it("conserves repeated detections in occupied cells and respects the analysis boundary", () => {
    const point = decode([
      [
        "one",
        26,
        41,
        "2023-08-22T11:48:00Z",
        "VIIRS",
        "nominal",
        null,
        0.4,
        0.6,
        "2",
        "D",
        0,
      ],
    ])[0];
    const mesh = occupiedMeshCells(
      [point, { ...point, id: "two" }, { ...point, id: "outside", lon: 26.5 }],
      bounds,
      scene,
      375,
    );
    expect(mesh.cells).toHaveLength(1);
    expect(mesh.cells[0].count).toBe(2);
    expect(mesh.cells[0].x).toBeGreaterThanOrEqual(mesh.x);
    expect(mesh.cells[0].y).toBeGreaterThanOrEqual(mesh.y);
  });
});

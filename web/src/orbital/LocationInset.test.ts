import { describe, expect, it } from "vitest";
import geography from "./map-units.json";
import { groupGeography, type Geography } from "./geography";
import { viewportCountry, type Viewport } from "./LocationInset";

const countries = groupGeography(
  geography as unknown as Geography,
  [],
).countries;
const view = (center: [number, number], zoom = 7): Viewport => ({
  zoom,
  center,
  corners: [center, center, center, center],
});
describe("camera-driven country context", () => {
  it("appears on regional zoom without any observations or selected point", () => {
    expect(viewportCountry(countries, view([26.05, 41.025]))?.name).toBe(
      "Greece",
    );
    expect(viewportCountry(countries, view([26.05, 41.025], 4.49))).toBeNull();
  });
  it("follows a camera pan into another country", () => {
    expect(viewportCountry(countries, view([4.35, 50.85]))?.name).toBe(
      "Belgium",
    );
    expect(viewportCountry(countries, view([2.35, 48.86]))?.name).toBe(
      "France",
    );
  });
  it("handles wrapped world longitude and coastal viewports", () => {
    expect(viewportCountry(countries, view([386.05, 41.025]))?.name).toBe(
      "Greece",
    );
    expect(
      viewportCountry(countries, {
        ...view([0, 0]),
        corners: [[26.05, 41.025]],
      })?.name,
    ).toBe("Greece");
    expect(viewportCountry(countries, view([-30, 0]))).toBeNull();
  });
});

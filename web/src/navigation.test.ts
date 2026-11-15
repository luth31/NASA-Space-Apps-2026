import { describe, expect, it } from "vitest";
import { readRoute, monthlyAvailability } from "./navigation";
import type { CaseStudy } from "./data";
describe("investigation routes and missing records", () => {
  it("restores every section, including an unsupported but syntactically valid month", () => {
    expect(
      readRoute("?tab=report&case=gran-chaco&month=2023-08&sensor=modis"),
    ).toEqual({
      view: "report",
      caseId: "gran-chaco",
      month: "2023-08",
      sensor: "modis",
    });
    expect(readRoute("?tab=methods").view).toBe("methods");
    expect(readRoute("?tab=__proto__&month=2023-99").view).toBe("explore");
    expect(readRoute("?month=2023-99").month).toBeUndefined();
  });
  it("distinguishes absent sensors, partial records and complete source zeros", () => {
    const study = {
      months: [
        { month: "2010-08", modis: 0, viirs: null },
        { month: "2023-08", modis: 0, viirs: 0 },
      ],
    } as CaseStudy;
    expect(monthlyAvailability(study, "2010-08", "VIIRS")).toBe("missing");
    expect(monthlyAvailability(study, "2010-08", "all")).toBe("partial");
    expect(monthlyAvailability(study, "2010-08", "MODIS")).toBe("zero");
    expect(monthlyAvailability(study, "2023-08", "all")).toBe("zero");
    expect(monthlyAvailability(study, "2026-08", "all")).toBe("missing");
  });
});

import { describe, it, expect } from "vitest";
import { historicalMedian, decode, within, clusterMarkers } from "./data";
import type { CaseStudy, Manifest, Month } from "./data";
import { exportInvestigation, investigationCsv } from "./exports";

describe("scientific display contract", () => {
  it("excludes selected year and ineligible months from the historical reference", () => {
    const rows = [
      ["2020-08", 10, true],
      ["2021-08", 20, true],
      ["2022-08", 999, false],
      ["2023-08", 80, true],
      ["2020-07", 300, true],
    ].map(([month, estimate, eligible]) => ({
      month,
      estimate,
      eligible,
    })) as Month[];
    expect(historicalMedian(rows, "2023-08", "estimate")).toEqual({
      value: 15,
      n: 2,
    });
  });
  it("preserves a missing FRP retrieval and the original confidence category", () => {
    const o = decode([
      [
        "id",
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
    expect(o.frp).toBeNull();
    expect(o.confidence).toBe("nominal");
    expect(within(o, [26, 41, 27, 42])).toBe(true);
    expect(within(o, [25, 40, 26, 41])).toBe(false);
  });
  it("rejects exports for observation-only investigations before generating a file", async () => {
    await expect(
      exportInvestigation(
        "csv",
        {
          months: [{ month: "2023-08", eligible: false }],
          harmonized: false,
        } as never,
        "2023-08",
        [],
        {} as never,
      ),
    ).rejects.toThrow("supported historical comparison");
  });
});


it("clustering conserves detections while keeping sensors and a pinned point separate", () => {
  const source = decode([["one",26,41,"2023-08-22T11:48:00Z","MODIS","90",null,1,1,"61.03","D",0]])[0];
  const points = [source,{...source,id:"two"},{...source,id:"three",sensor:"VIIRS" as const}].map((o,i)=>({key:o.id,o,x:10+i,y:10,count:1}));
  const grouped=clusterMarkers(points,10);
  expect(grouped.reduce((sum,p)=>sum+p.count,0)).toBe(3);
  expect(grouped).toHaveLength(2);
  expect(clusterMarkers(points,10,"one")).toHaveLength(3);
});

it("exports a rectangular CSV and retains only observations in the chosen month and boundary", () => {
  const months=[2017,2018,2019,2020].map(year=>({month:`${year}-08`,modis:1,viirs:0,estimate:2,interval:null,coverage:"verified",status:"validated",eligible:true}));
  const study={id:"fixture",name:"Fixture",bbox:[25,40,27,42],months,harmonized:true} as CaseStudy;
  const manifest={validationStatus:"validated",bundleVersion:"test-only"} as Manifest;
  const o=decode([["inside",26,41,"2020-08-01T12:00:00Z","MODIS","90",null,1,1,"61.03","D",0]])[0];
  const csv=investigationCsv(study,"2020-08",[o,{...o,id:"outside",lon:28},{...o,id:"wrong-month",time:"2020-07-01T12:00:00Z"}],manifest);
  const lines=csv.split("\r\n");
  expect(lines).toHaveLength(3);
  expect(new Set(lines.map(line=>line.split(",").length)).size).toBe(1);
  expect(csv).toContain('"inside"');
  expect(csv).not.toContain('"outside"');
  expect(csv).not.toContain('"wrong-month"');
  expect(()=>investigationCsv(study,"2020-08",[o],{...manifest,validationStatus:"observations_only"})).toThrow("supported historical comparison");
});

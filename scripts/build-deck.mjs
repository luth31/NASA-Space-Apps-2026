/** Local editable submission deck. Requires the Codex bundled artifact runtime.
 * Usage: <bundled-node> scripts/build-deck.mjs
 * CAPTURE_DIR defaults to deliverables/captures; copy lead-verified captures first.
 * Run --pdf-only after the PDF skill operation marker to render the final deck.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const runtime =
  process.env.ARTIFACT_RUNTIME ??
  "/Users/andramariasmarandache/.cache/codex-runtimes/codex-primary-runtime/dependencies";
process.env.RUNTIME_NODE_MODULES ??= path.join(runtime, "node/node_modules");
const skill =
  process.env.PRESENTATIONS_SKILL ??
  "/Users/andramariasmarandache/.codex/plugins/cache/openai-primary-runtime/presentations/26.1112.11011/skills/presentations";
const { Presentation, PresentationFile, FileBlob } = await import(
  pathToFileURL(
    path.join(
      runtime,
      "node/node_modules/@oai/artifact-tool/dist/artifact_tool.mjs",
    ),
  ).href
);
const {
  finalizePresentation,
  resolvePresentationFont,
  applyPresentationChartFont,
} = await import(
  pathToFileURL(path.join(skill, "container_tools/artifact_tool_utils.mjs"))
    .href
);
const draft = process.argv.includes("--draft");
const out = path.join(
  root,
  draft ? ".presentation-build/draft" : "deliverables/deck",
);
const work = path.join(root, ".presentation-build");
await fs.mkdir(path.join(out, "slides"), { recursive: true });
await fs.mkdir(path.join(out, "assets"), { recursive: true });
await fs.mkdir(path.join(work, "finalized"), { recursive: true });
const pptxPath = path.join(out, "pyrobridge-seven-slides.pptx");
const writeBlob = async (destination, blob) =>
  fs.writeFile(destination, new Uint8Array(await blob.arrayBuffer()));
if (process.argv.includes("--pdf-only")) {
  const deck = await PresentationFile.importPptx(await FileBlob.load(pptxPath));
  // The bundled direct PDF exporter cannot resolve #standard-fonts/Helvetica.
  // Keep the editable PPTX authoritative; assemble its rendered pages locally.
  const pdfPages = path.join(work, "pdf-pages");
  await fs.mkdir(pdfPages, { recursive: true });
  for (const [index, slide] of deck.slides.items.entries()) {
    await writeBlob(
      path.join(pdfPages, `page-${String(index + 1).padStart(2, "0")}.png`),
      await deck.export({ slide, format: "png", scale: 2 }),
    );
  }
  const python = `from reportlab.pdfgen import canvas
from pathlib import Path
import sys
files=sorted(Path(sys.argv[1]).glob('page-*.png'))
assert len(files)==7
c=canvas.Canvas(sys.argv[2],pagesize=(960,540),pageCompression=1)
c.setTitle('PyroBridge - Read the fire record')
c.setAuthor('PyroBridge team - provisional identity')
c.setSubject('Seven-slide NASA Space Apps project presentation; rendered companion to editable PPTX')
for f in files:
 c.drawImage(str(f),0,0,width=960,height=540)
 c.showPage()
c.save()
`;
  execFileSync(
    path.join(runtime, "python/bin/python3"),
    ["-c", python, pdfPages, path.join(out, "pyrobridge-seven-slides.pdf")],
    { stdio: "inherit" },
  );
  console.log("Rendered seven-page PDF from the final editable PPTX.");
  process.exit(0);
}
const captureDir =
  process.env.CAPTURE_DIR ?? path.join(root, "deliverables/captures");
const inputs = {
  report: "report-overview.png",
  region: "regional-comparison.png",
  atlas: process.env.ATLAS_CAPTURE ?? "explore-atlas.png",
  globe: process.env.GLOBE_CAPTURE ?? "explore-globe.png",
};
for (const [key, filename] of Object.entries(inputs)) {
  const destination = path.join(out, "assets", `${key}.png`);
  try {
    await fs.copyFile(path.join(captureDir, filename), destination);
  } catch (error) {
    try {
      await fs.access(destination);
    } catch {
      if (draft) {
        inputs[key] = null;
        continue;
      }
      throw new Error(`Missing verified ${key} capture: ${filename}`, {
        cause: error,
      });
    }
  }
  inputs[key] = destination;
}
const coverImage = path.join(out, "assets", "evia-2021-08-10.jpg");
await fs.copyFile(
  path.join(root, "web/public/assets/evia-2021-08-10.jpg"),
  coverImage,
);
const font = resolvePresentationFont({ fontFamily: "Avenir Next" });
const palette = {
  bg: "#101B17",
  ink: "#F3F0E4",
  muted: "#B9C7B1",
  gold: "#E9C38B",
  mint: "#A4CEBE",
  quiet: "#263C32",
};
const deck = Presentation.create({ slideSize: { width: 1280, height: 720 } });
deck.theme.defaultFont = font;
function text(
  slide,
  value,
  x,
  y,
  width,
  height,
  size = 26,
  color = palette.ink,
  bold = false,
) {
  const shape = slide.shapes.add({
    geometry: "textbox",
    position: { left: x, top: y, width, height },
    fill: "none",
    line: { fill: "none", width: 0 },
  });
  shape.text = value;
  shape.text.style = {
    typeface: font,
    fontSize: size,
    color,
    bold,
    verticalAlignment: "top",
    alignment: "left",
    wrap: "square",
    insets: 0,
  };
  return shape;
}
async function photo(
  slide,
  filename,
  x,
  y,
  width,
  height,
  fit = "contain",
  alt = "Actual application capture",
) {
  if (!filename) return; // Only private draft builds allow a pending capture.
  const bytes = await fs.readFile(filename);
  return slide.images.add({
    blob: bytes.buffer.slice(
      bytes.byteOffset,
      bytes.byteOffset + bytes.byteLength,
    ),
    contentType: filename.endsWith(".jpg") ? "image/jpeg" : "image/png",
    alt,
    fit,
    position: { left: x, top: y, width, height },
  });
}
function slide(title, n) {
  const s = deck.slides.add();
  s.background.fill = palette.bg;
  text(s, title, 62, 48, 1156, 128, 50);
  text(s, String(n).padStart(2, "0"), 1183, 675, 35, 25, 17, palette.muted);
  return s;
}
const noteText = [];
function notes(s, narrative, sources) {
  const content = `${narrative}\n\nSources and credits:\n${sources.join("\n")}`;
  s.speakerNotes.text = content;
  noteText.push(content);
}
const fir =
  "NASA FIRMS: https://firms.modaps.eosdis.nasa.gov/ (observations; thermal pixels, not unique fires)";
const bundle =
  "Local bundle 20261114T172758Z: web/public/data/manifest.json, observations/, schema.json; independently checked in docs/science-audit.md on 15 November 2026.";
const imagery =
  "Local image: NASA EOSDIS GIBS / Aqua MODIS, 10 Aug 2021 daily true-color composite. Source and bounding box: web/public/assets/assets-manifest.json. This is dated context imagery, not exact-time hotspot imagery.";
const report = JSON.parse(
  await fs.readFile(path.join(root, "web/public/data/models.json"), "utf8"),
);
// 1 — A quiet title, real dated satellite imagery, clear audience.
{
  const s = deck.slides.add();
  s.background.fill = palette.bg;
  await photo(
    s,
    coverImage,
    694,
    0,
    586,
    720,
    "cover",
    "NASA Aqua MODIS daily context imagery of Evia, 10 August 2021",
  );
  text(s, "pyrobridge", 64, 64, 570, 50, 34, palette.gold);
  text(s, "Read the\nfire record", 64, 178, 605, 210, 82);
  text(
    s,
    "A satellite observatory for people\ninvestigating burning activity.",
    68,
    438,
    560,
    94,
    29,
    palette.muted,
  );
  text(
    s,
    "For fire managers, researchers\nand curious communities",
    68,
    570,
    550,
    78,
    23,
    palette.ink,
  );
  text(
    s,
    "PROVISIONAL IDENTITY · NASA SPACE APPS",
    68,
    674,
    560,
    24,
    16,
    palette.muted,
  );
  notes(
    s,
    "The problem: a satellite hotspot count is easy to see and easy to misread. PyroBridge helps people investigate location, timing, and differences between instruments before drawing a historical conclusion. This is a working observation product with a separate research pipeline, not an operational warning service.",
    [fir, imagery, bundle],
  );
}
// 2 — Native sensor evidence rather than an invented detection illustration.
{
  const s = slide("A changing satellite record", 2);
  text(
    s,
    "More pixels do not necessarily\nmean more fires.",
    64,
    190,
    600,
    106,
    40,
    palette.gold,
  );
  text(
    s,
    "A thermal detection is a pixel observed\nduring an overpass. One fire can appear\nin many pixels and many passes.",
    66,
    334,
    560,
    140,
    27,
    palette.muted,
  );
  text(
    s,
    "A continuous history needs a tested\ncomparison, including the opportunity\nto observe.",
    66,
    520,
    560,
    118,
    27,
    palette.ink,
  );
  const t = s.tables.add({
    rows: 4,
    columns: 3,
    left: 680,
    top: 198,
    width: 540,
    height: 360,
    columnWidths: [190, 175, 175],
    values: [
      ["Bundled studies", "Aqua\nMODIS", "S-NPP\nVIIRS"],
      ["Nominal pixel", "1 km", "375 m"],
      ["Greece record", "2003-2025", "2012-2025"],
      ["What it counts", "Thermal\npixels", "Thermal\npixels"],
    ],
  });
  t.borders.assign({ fill: "#4D6655", width: 1, style: "solid" });
  for (let r = 0; r < 4; r++)
    for (let c = 0; c < 3; c++) {
      const cell = t.getCell(r, c);
      cell.fill = r === 0 ? "#263C32" : palette.bg;
      cell.text.style = {
        typeface: font,
        fontSize: 23,
        color: c === 0 ? palette.muted : palette.ink,
        bold: r === 0,
      };
    }
  t.cells
    .block({ row: 0, column: 0, rowCount: 4, columnCount: 3 })
    .assign({
      margins: { left: 14, right: 12, top: 16, bottom: 12 },
      anchor: "center",
    });
  text(
    s,
    "Source availability is not observing effort.",
    680,
    590,
    540,
    52,
    22,
    palette.muted,
  );
  notes(
    s,
    "Aqua MODIS and S-NPP VIIRS have different detection characteristics and observation opportunities. The displayed ranges describe the bundled Greek study records, not complete mission availability. The nominal pixel dimensions are not a fire perimeter, burned area, or unique-event size. The start of VIIRS creates a measurement discontinuity; raw totals cannot harmonize it by themselves.",
    [
      fir,
      bundle,
      "MODIS User Guide: https://modis-land.gsfc.nasa.gov/pdf/MODIS_C6_C6.1_Fire_User_Guide_1.0.pdf",
      "NASA VIIRS active fire documentation: https://viirsland.gsfc.nasa.gov/Products/NASA/FireESDR.html",
    ],
  );
}
// 3 — The actual atlas is the dominant visual.
{
  const s = slide("Unfold the world. Keep your place", 3);
  const atlasPhoto = await photo(
    s,
    inputs.atlas,
    64,
    182,
    1152,
    430,
    "contain",
    "Actual unfolded Explore atlas in the working app",
  );
  if (atlasPhoto)
    atlasPhoto.crop = {
      left: 140 / 2560,
      top: 445 / 1412,
      right: 0,
      bottom: 132 / 1412,
    };
  text(
    s,
    "Globe → atlas → study area → observations",
    64,
    630,
    1090,
    42,
    27,
    palette.gold,
  );
  text(
    s,
    "NOAA-20 VIIRS · 13–14 Nov 2026 · raw counts per 5° bin",
    64,
    678,
    1090,
    24,
    16,
    palette.muted,
  );
  notes(
    s,
    "Explore progressively reveals geography. Use the controls in the live app to unfold the globe, select geography, and open one of the bundled studies. Administrative boundaries and study rectangles have different meanings. The historical study data remain separate from the global snapshot. This actual application capture is cropped in the slide to show the atlas surface; the full capture is preserved in assets. The 13–14 November 2026 NOAA-20 VIIRS snapshot contains 74,304 raw detections. Its markers summarize counts per 5° bin without observation-effort adjustment.",
    [
      bundle,
      "Actual local app capture: " +
        (inputs.atlas
          ? path.basename(inputs.atlas)
          : "PENDING IN PRIVATE DRAFT"),
      "Natural Earth boundaries: https://www.naturalearthdata.com/about/terms-of-use/ (public domain); map scope and attribution in the app.",
    ],
  );
}
// 4 — One genuine finding, with the actual Report and exact scope.
{
  const s = slide("August dominates this recorded year", 4);
  text(s, "89%", 64, 207, 354, 155, 116, palette.gold);
  text(s, "4,178 of 4,685\nVIIRS detections", 70, 383, 328, 96, 30);
  text(
    s,
    "Evros + Evia studies\n2023 · raw observations",
    70,
    515,
    335,
    80,
    23,
    palette.muted,
  );
  await photo(
    s,
    inputs.report,
    427,
    185,
    790,
    454,
    "contain",
    "Actual Report annual overview for Greek studies, 2023 VIIRS",
  );
  text(
    s,
    "A concentration in the source record, not a calibrated fire-risk estimate.",
    64,
    665,
    1080,
    30,
    18,
    palette.muted,
  );
  notes(
    s,
    "The real Report finding is 4,178 August detections divided by 4,685 annual S-NPP VIIRS detections, or 89.178%, rounded to 89%. The scope is the Evros and Evia rectangular studies. Direct exploration reveals 1,938 detections on 22 August and 1,009 acquired in the 00 UTC hour. Acquisition time is not ignition time. Monthly source completeness does not establish full observing effort.",
    [
      fir,
      bundle,
      "Actual local app capture: report-overview.png",
      "Audit: docs/science-audit.md; no unique-fire, burned-area, causal, anomaly, or prediction claim.",
    ],
  );
}
// 5 — Editable native chart, all controls, real evaluation scope.
{
  const s = slide("A simple baseline leads the pilot", 5);
  text(s, "Our contribution", 64, 181, 420, 46, 29, palette.gold);
  text(
    s,
    "Match usable coverage.\nKeep the historical inputs honest.\nTest controls on withheld regions.",
    64,
    250,
    425,
    151,
    27,
  );
  text(
    s,
    "48 sampled cell-passes\n2 regions · 6 positive targets",
    64,
    445,
    440,
    93,
    29,
    palette.mint,
  );
  text(
    s,
    "This is feasibility evidence.\nMonthly validation is still missing.",
    64,
    570,
    445,
    83,
    24,
    palette.muted,
  );
  const values = report.models.map((m) => Number(m.mae.toFixed(3)));
  const chart = s.charts.add("bar", {
    position: { left: 530, top: 190, width: 690, height: 382 },
    categories: [
      "Unchanged MODIS",
      "Seasonal scaling",
      "Negative binomial",
      "LightGBM",
    ],
    series: [
      {
        name: "Mean regional MAE",
        values,
        fill: "#698B78",
        points: [{ idx: 1, fill: palette.gold }],
      },
    ],
    barOptions: { direction: "bar", grouping: "clustered", gapWidth: 70 },
    hasLegend: false,
    chartFill: palette.bg,
    chartLine: { fill: "none", width: 0 },
    plotAreaFill: palette.bg,
    plotAreaLine: { fill: "none", width: 0 },
    xAxis: {
      textStyle: { typeface: font, fontSize: 21, fill: palette.ink },
      line: { fill: "none", width: 0 },
    },
    yAxis: {
      min: 0,
      max: 12,
      majorUnit: 4,
      numberFormatCode: "0",
      textStyle: { typeface: font, fontSize: 20, fill: palette.muted },
      line: { fill: "#4D6655", width: 1 },
      majorGridlines: { fill: "#2D4337", width: 1 },
    },
    dataLabels: {
      showValue: true,
      position: "outEnd",
      numberFormatCode: "0.000",
      textStyle: { typeface: font, fontSize: 22, fill: palette.ink },
    },
  });
  applyPresentationChartFont(chart, { fontFamily: font });
  text(
    s,
    "Mean absolute error · lower is better",
    550,
    585,
    650,
    38,
    23,
    palette.muted,
  );
  text(
    s,
    "Hotspot pixels per 0.25° cell and paired pass",
    550,
    625,
    650,
    36,
    21,
    palette.muted,
  );
  notes(
    s,
    "A coverage-aware, reproducible pipeline compares an unchanged MODIS-rate control, seasonal scaling, negative binomial and LightGBM. Mean regional MAE was recomputed from held-out predictions, with one whole region withheld per fold. Values: 4.1250304804, 2.6203901313, 5.9243154744, 11.2208318022. Forty-two of 48 targets are zero and six are positive. Evia and Evros contribute 24 rows each. This small selected sample cannot establish monthly transfer, global performance, calibrated intervals, or a generic accuracy percentage. The later-time diagnostic remains exploratory.",
    [
      bundle,
      "models/held-out-predictions.json; models/training-report.json; web/public/data/models.json",
      "config/release-policy.json; docs/science-audit.md",
      "Model artifact SHA-256 values were checked against the published report.",
    ],
  );
}
// 6 — Present capability and the next gate without hiding either.
{
  const s = slide("Useful today, with a defined next test", 6);
  text(s, "Investigate the observations", 64, 183, 430, 74, 32, palette.gold);
  text(
    s,
    "Compare sensors in place.\nInspect timing and concentration.\nRead dated source context.",
    64,
    295,
    430,
    155,
    26,
  );
  text(s, "Before monthly estimates", 64, 484, 430, 47, 29, palette.mint);
  text(
    s,
    "Complete observing-effort records\nand independent monthly holdouts.\nThe release gate stays closed.",
    64,
    552,
    430,
    112,
    24,
    palette.muted,
  );
  await photo(
    s,
    inputs.region,
    515,
    178,
    700,
    447,
    "contain",
    "Actual Evros regional satellite comparison, August 2023",
  );
  text(
    s,
    "Evros study · August 2023 · raw sensor comparison",
    540,
    641,
    670,
    30,
    18,
    palette.muted,
  );
  notes(
    s,
    "The current user value is careful investigation of observed geography, UTC timing and sensor differences. The screenshot is the Evros study in August 2023, with 625 Aqua MODIS and 4,175 S-NPP VIIRS detections. It is narrower than the two-study Report finding. The next validation milestone is a complete monthly observation inventory and declared reference effort, followed by independent region-month and later-time holdouts under a frozen protocol. Current release.json has monthlyRelease=false and zero published estimates; uncertainty and gated exports remain unavailable.",
    [
      fir,
      bundle,
      "Actual local app capture: regional-comparison.png",
      "Background: NASA EOSDIS GIBS / Aqua MODIS, fixed daily imagery 22 Aug 2023, separately labelled in the app.",
      "web/public/data/release.json; config/release-policy.json",
    ],
  );
}
// 7 — Invitation and honest credits, with a separate actual globe capture.
{
  const s = deck.slides.add();
  s.background.fill = palette.bg;
  text(s, "pyrobridge", 64, 55, 640, 50, 32, palette.gold);
  text(s, "See the signal.\nKeep the evidence.", 64, 161, 710, 171, 64);
  text(
    s,
    "Open Explore. Follow a place.\nRead its fire record.",
    66,
    400,
    665,
    95,
    31,
    palette.muted,
  );
  const globePhoto = await photo(
    s,
    inputs.globe,
    755,
    134,
    465,
    450,
    "cover",
    "Cropped detail of the actual Explore globe in the working app",
  );
  if (globePhoto)
    globePhoto.crop = {
      left: 965 / 2560,
      top: 575 / 1412,
      right: 825 / 2560,
      bottom: 92 / 1412,
    };
  text(
    s,
    "NOAA-20 VIIRS · 13–14 Nov 2026",
    765,
    596,
    455,
    28,
    17,
    palette.muted,
  );
  text(s, "READ THE FIRE RECORD", 66, 560, 670, 43, 26, palette.gold);
  text(
    s,
    "NASA FIRMS / GIBS · Natural Earth · React / Three.js / Motion\nAI-assisted implementation and presentation; claims checked against bundled evidence.",
    66,
    640,
    1110,
    58,
    17,
    palette.muted,
  );
  notes(
    s,
    "Invite the judges to explore a place, inspect its observation record, and see what is supported and what is not. The provisional name is not a finalized brand decision. The actual globe capture is cropped in the slide to emphasize its geographic view; the full capture is preserved in assets. Its NOAA-20 VIIRS snapshot contains 74,304 detections spanning 13 November 2026 00:15 UTC to 14 November 2026 13:33 UTC. Marker size represents raw counts per 5° bin, not calibrated risk. Blue Marble is static geographic context.\n\nAI disclosure: OpenAI Codex assisted with research, code, testing, design, source text and presentation generation. Human team review and scientific validation remain required. No generated scientific observations or model accuracy values are presented.",
    [
      fir,
      bundle,
      "NASA imagery attribution: web/public/assets/assets-manifest.json",
      "Natural Earth: public domain boundaries, https://www.naturalearthdata.com/about/terms-of-use/",
      "Tools: React, TypeScript, Vite, Three.js, Motion, Lucide, jsPDF; Python scientific stack; @oai/artifact-tool for editable slides. Full dependencies and licenses are in repository lockfiles.",
      "Actual local app capture: " +
        (inputs.globe
          ? path.basename(inputs.globe)
          : "PENDING IN PRIVATE DRAFT"),
    ],
  );
}
await fs.writeFile(
  path.join(work, "deck.json"),
  JSON.stringify(deck.toProto()),
);
for (const [index, s] of deck.slides.items.entries()) {
  await writeBlob(
    path.join(out, "slides", `slide-${String(index + 1).padStart(2, "0")}.png`),
    await deck.export({ slide: s, format: "png", scale: 1.5 }),
  );
}
const candidate = path.join(work, "candidate.pptx");
await (await PresentationFile.exportPptx(deck)).save(candidate);
const buildId = Date.now();
const finalPath = path.join(work, "finalized", `deck-${buildId}.pptx`);
const receiptPath = path.join(work, `validation-${buildId}.json`);
const result = await finalizePresentation({
  workspaceDir: root,
  candidatePath: candidate,
  finalPath,
  pythonExecutable: path.join(runtime, "python/bin/python3"),
  integrityValidatorPath: path.join(
    skill,
    "container_tools/inspect_presentation_package_integrity.py",
  ),
  layoutValidatorPath: path.join(
    skill,
    "container_tools/inspect_presentation_layout_geometry.py",
  ),
  layoutArgs: [
    "--expected-slide-size-emu",
    "12192000,6858000",
    "--validate-bullet-geometry",
    "--validate-heading-fit",
    "--require-native-table-slide",
    "2",
  ],
  explicitTotalSlideCount: 7,
  requiredNativeTableOwnerSlides: [2],
  requiredNativeChartOwnerSlides: [5],
  materializeLiteralChartWorkbooks: true,
  fontPolicy: { basis: "design", families: [font] },
  verifyArtifactToolImport: true,
  receiptPath,
});
await fs.copyFile(finalPath, pptxPath);
await fs.writeFile(
  path.join(work, "finalizer-result.json"),
  JSON.stringify({ ...result, receiptPath }, null, 2),
);
await fs.writeFile(
  path.join(out, "speaker-notes.txt"),
  noteText
    .map((n, i) => `SLIDE ${i + 1}\n${n}`)
    .join(
      "\n\n------------------------------------------------------------\n\n",
    ),
);
const assets = {};
for (const [name, filename] of Object.entries(inputs))
  if (filename) {
    const bytes = await fs.readFile(filename);
    assets[name] = {
      file: path.relative(out, filename),
      sha256: createHash("sha256").update(bytes).digest("hex"),
    };
  }
assets.cover = {
  file: path.relative(out, coverImage),
  sha256: createHash("sha256")
    .update(await fs.readFile(coverImage))
    .digest("hex"),
  attribution:
    "NASA EOSDIS GIBS / Aqua MODIS, 10 August 2021 daily true-color context composite; source bounds and URL in web/public/assets/assets-manifest.json",
};
await fs.writeFile(
  path.join(out, "sources.json"),
  JSON.stringify(
    {
      bundle: "20261114T172758Z",
      checked: "2026-11-15",
      provisionalBrand: "PyroBridge",
      assets,
      modelMAE: report.models.map((m) => ({
        name: m.name,
        exact: m.mae,
        displayed: Number(m.mae.toFixed(3)),
      })),
      format: {
        slides: 7,
        width: 1280,
        height: 720,
        editableTableSlide: 2,
        editableChartSlide: 5,
      },
    },
    null,
    2,
  ),
);
console.log(
  "Created seven editable slides and individual PNG renders:",
  pptxPath,
);

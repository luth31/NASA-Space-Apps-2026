import type { CaseStudy, Manifest, Observation } from "./data";
import { dateLabel, historicalMedian, number, within } from "./data";

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const csvCell = (value: unknown) =>
  `"${String(value ?? "").replaceAll('"', '""')}"`;
function supportedRecord(study: CaseStudy, month: string, manifest: Manifest) {
  const record = study.months.find((m) => m.month === month);
  if (
    !record?.eligible ||
    record.status !== "validated" ||
    record.estimate == null ||
    !Number.isFinite(record.estimate) ||
    record.estimate < 0 ||
    historicalMedian(study.months, month, "estimate").n < 3 ||
    !study.harmonized ||
    manifest.validationStatus !== "validated"
  ) {
    throw new Error("Exports require a supported historical comparison.");
  }
  return record;
}
function selectedObservations(
  study: CaseStudy,
  month: string,
  observations: Observation[],
) {
  return observations.filter(
    (o) => o.time.startsWith(month + "-") && within(o, study.bbox),
  );
}

/** A single rectangular CSV. record_type separates calendar and observation rows. */
export function investigationCsv(
  study: CaseStudy,
  month: string,
  observations: Observation[],
  manifest: Manifest,
) {
  const record = supportedRecord(study, month, manifest);
  const columns = [
    "record_type",
    "region",
    "month",
    "bundle_version",
    "analysis_bounds_ws_en",
    "unit",
    "aqua_reported_count",
    "snpp_reported_count",
    "viirs_equivalent_estimate",
    "lower_90_interval",
    "upper_90_interval",
    "coverage",
    "model",
    "model_sha256",
    "reference_effort",
    "observation_id",
    "longitude",
    "latitude",
    "timestamp_utc",
    "sensor",
    "confidence",
    "frp_mw",
    "scan_km",
    "track_km",
    "source_version",
    "day_night",
    "source_type",
  ];
  const common = {
    region: study.id,
    month,
    bundle_version: manifest.bundleVersion,
    analysis_bounds_ws_en: study.bbox.join(";"),
  };
  const records: Record<string, unknown>[] = [
    {
      ...common,
      record_type: "calendar",
      unit: record.unit,
      aqua_reported_count: record.modis,
      snpp_reported_count: record.viirs,
      viirs_equivalent_estimate: record.estimate,
      lower_90_interval: record.interval?.[0],
      upper_90_interval: record.interval?.[1],
      coverage: record.coverage,
      model: record.model,
      model_sha256: record.modelSha256,
      reference_effort: record.referenceEffortId,
    },
    ...selectedObservations(study, month, observations).map((o) => ({
      ...common,
      record_type: "observation",
      unit: "reported satellite detection",
      observation_id: o.id,
      longitude: o.lon,
      latitude: o.lat,
      timestamp_utc: o.time,
      sensor: o.sensor,
      confidence: o.confidence,
      frp_mw: o.frp,
      scan_km: o.scan,
      track_km: o.track,
      source_version: o.version,
      day_night: o.daynight,
      source_type: o.type,
    })),
  ];
  return [columns, ...records.map((r) => columns.map((c) => r[c]))]
    .map((row) => row.map(csvCell).join(","))
    .join("\r\n");
}

export async function investigationPdf(
  study: CaseStudy,
  month: string,
  observations: Observation[],
  manifest: Manifest,
) {
  const pdfNumber = (n: number | null | undefined) =>
    n == null ? "Not available" : number(n);
  const record = supportedRecord(study, month, manifest);
  const rows = selectedObservations(study, month, observations);
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF();
  pdf.setProperties({
    title: `PyroBridge - ${study.name} - ${month}`,
    subject: "Satellite observation and supported historical comparison",
    author: "PyroBridge",
  });
  pdf.setFillColor(20, 27, 25);
  pdf.rect(0, 0, 210, 55, "F");
  pdf.setTextColor(235, 232, 215);
  pdf.setFontSize(10);
  pdf.text("PYROBRIDGE / INVESTIGATION BRIEF", 16, 18);
  pdf.setFontSize(25);
  pdf.text(`${study.name}, ${study.country}`, 16, 34);
  pdf.setFontSize(10);
  pdf.text(
    dateLabel(month + "-01", { month: "long", year: "numeric" }) + " / UTC",
    16,
    44,
  );

  const image = new Image();
  image.src = "/assets/" + study.image;
  await image.decode();
  const ratio =
    (study.sceneBounds[3] - study.sceneBounds[1]) /
    (study.sceneBounds[2] - study.sceneBounds[0]);
  const canvas = document.createElement("canvas");
  canvas.width = 1400;
  canvas.height = Math.round(1400 * ratio);
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  const xy = (lon: number, lat: number) => [
    ((lon - study.sceneBounds[0]) /
      (study.sceneBounds[2] - study.sceneBounds[0])) *
      canvas.width,
    ((study.sceneBounds[3] - lat) /
      (study.sceneBounds[3] - study.sceneBounds[1])) *
      canvas.height,
  ];
  for (const o of rows) {
    const [x, y] = xy(o.lon, o.lat);
    ctx.fillStyle = o.sensor === "MODIS" ? "#b8d8db" : "#ff985e";
    ctx.beginPath();
    ctx.arc(x, y, 2, 0, Math.PI * 2);
    ctx.fill();
  }
  const start = xy(study.bbox[0], study.bbox[3]),
    end = xy(study.bbox[2], study.bbox[1]);
  ctx.strokeStyle = "#fff8df";
  ctx.lineWidth = 2;
  ctx.setLineDash([7, 7]);
  ctx.strokeRect(start[0], start[1], end[0] - start[0], end[1] - start[1]);
  const mapWidth = Math.min(178, 100 / ratio),
    mapHeight = mapWidth * ratio;
  pdf.addImage(
    canvas.toDataURL("image/jpeg", 0.92),
    "JPEG",
    16 + (178 - mapWidth) / 2,
    63,
    mapWidth,
    mapHeight,
  );
  let y = 63 + mapHeight + 7;
  pdf.setTextColor(72, 82, 72);
  pdf.setFontSize(8);
  pdf.text(
    `Imagery ${study.date} / NASA GIBS / Aqua MODIS daily composite`,
    16,
    y,
  );
  pdf.text(
    "Dots: original reported detections. Dashed line: analysis boundary.",
    16,
    y + 5,
  );
  y += 16;
  const median = historicalMedian(study.months, month, "estimate");
  const summary = [
    [
      "Reported detections",
      `Aqua MODIS ${pdfNumber(record.modis)} / S-NPP VIIRS ${pdfNumber(record.viirs)}`,
    ],
    ["VIIRS-equivalent estimate", pdfNumber(record.estimate)],
    [
      "90% prediction interval",
      record.interval
        ? record.interval.map(pdfNumber).join(" - ")
        : "Not published",
    ],
    [
      "Same-month historical median",
      `${pdfNumber(median.value)} / ${median.n} eligible years; selected year excluded`,
    ],
    ["Selected method", record.model ?? "Unspecified"],
    ["Coverage", record.coverage],
  ];
  pdf.setFontSize(10);
  for (const [label, value] of summary) {
    pdf.setDrawColor(213, 221, 208);
    pdf.line(16, y - 4, 194, y - 4);
    pdf.setTextColor(90, 100, 86);
    pdf.text(label, 16, y);
    pdf.setTextColor(29, 41, 29);
    pdf.text(value, 91, y);
    y += 10;
  }
  pdf.addPage();
  pdf.setTextColor(29, 41, 29);
  pdf.setFontSize(20);
  pdf.text("Sources and interpretation", 16, 23);
  pdf.setFontSize(9);
  y = 36;
  const years = new Set([month.slice(0, 4), ...(record.historicalYears ?? [])]);
  const files = manifest.sources.filter(
    (s) =>
      (study.sourceCountries ?? [study.country]).some((c) =>
        s.file.includes(c),
      ) && [...years].some((year) => s.file.includes(year)),
  );
  const notes = [
    `Bundle ${manifest.bundleVersion}. Built ${manifest.builtAt}.`,
    `Estimate unit: ${record.unit ?? "VIIRS-equivalent hotspot count at reference effort"}.`,
    `Reference observation effort: ${record.referenceEffortId ?? "Unspecified"}.`,
    `Model SHA256: ${record.modelSha256 ?? "Unspecified"}.`,
    `Analysis bounds (west, south, east, north): ${study.bbox.join(", ")}.`,
    "Counts describe detected thermal pixels. Several pixels can belong to one event; industrial and volcanic sources can also be detected.",
    "Locations are reported pixel centers. Background imagery and detection acquisition times are labeled separately. FRP is radiant power in MW at observation time.",
    `Original processing versions: ${study.versions.join(", ")}. Observations and model estimates retain separate units and status.`,
    ...study.context.map((c) => `${c.publisher}: ${c.title}. ${c.url}`),
    ...files.map((s) => `${s.file}\n${s.url}\nSHA256 ${s.sha256}`),
  ];
  for (const note of notes) {
    const lines = pdf.splitTextToSize(note, 178);
    if (y + lines.length * 4.5 > 278) {
      pdf.addPage();
      y = 22;
    }
    pdf.text(lines, 16, y);
    y += lines.length * 4.5 + 5;
  }
  const pages = pdf.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    pdf.setPage(page);
    pdf.setDrawColor(215, 221, 210);
    pdf.line(16, 284, 194, 284);
    pdf.setFontSize(8);
    pdf.setTextColor(104, 116, 98);
    pdf.text(`PYROBRIDGE / ${study.id} / ${month}`, 16, 290);
    pdf.text(`${page} / ${pages}`, 194, 290, { align: "right" });
  }
  return pdf;
}

export async function exportInvestigation(
  format: "csv" | "pdf",
  study: CaseStudy,
  month: string,
  observations: Observation[],
  manifest: Manifest,
) {
  const name = `pyrobridge-${study.id}-${month}`;
  if (format === "csv") {
    download(
      new Blob([investigationCsv(study, month, observations, manifest)], {
        type: "text/csv;charset=utf-8",
      }),
      name + ".csv",
    );
  } else {
    (await investigationPdf(study, month, observations, manifest)).save(
      name + ".pdf",
    );
  }
}

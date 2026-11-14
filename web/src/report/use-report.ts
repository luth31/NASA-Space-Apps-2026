import { useEffect, useMemo, useState } from "react";
import type { Manifest, Observation } from "../data";
import { loadObservations, within } from "../data";
import {
  archiveBuckets,
  archiveCount,
  casesForGeo,
  geographySelection,
  initialSelection,
  observationBuckets,
  periodLabel,
  previousPrefix,
  rawChange,
  selectedRows,
  sensorMatches,
} from "./report-data";
import type { Count, Geography, Selection } from "./report-data";

export function useReport(manifest: Manifest) {
  const [selection, setSelection] = useState<Selection>(initialSelection);
  const [retry, setRetry] = useState(0);
  const [detail, setDetail] = useState<{
    key: string;
    status: "loading" | "ready" | "error";
    byCase: Record<string, Observation[]>;
  }>({ key: "", status: "ready", byCase: {} });
  const cases = useMemo(
    () => casesForGeo(manifest.cases, selection.geo),
    [manifest.cases, selection.geo],
  );
  const years = useMemo(
    () => [...new Set(cases.flatMap((c) => c.years))].sort((a, b) => a - b),
    [cases],
  );
  const key = selection.month
    ? `${selection.month}:${cases.map((c) => c.id).join(",")}`
    : "";
  useEffect(() => {
    if (!selection.month) return;
    let active = true;
    const month = selection.month;
    setDetail({ key, status: "loading", byCase: {} });
    Promise.all(
      cases.map(async (c) => {
        const m = c.months.find((m) => m.month === month);
        const rows =
          m && (m.modis ?? 0) + (m.viirs ?? 0) > 0
            ? await loadObservations(`/data/observations/${c.id}/${month}.json`)
            : [];
        return [
          c.id,
          rows.filter((o) => o.time.startsWith(month) && within(o, c.bbox)),
        ] as const;
      }),
    )
      .then((entries) => {
        if (active)
          setDetail({
            key,
            status: "ready",
            byCase: Object.fromEntries(entries),
          });
      })
      .catch(() => {
        if (active) setDetail({ key, status: "error", byCase: {} });
      });
    return () => {
      active = false;
    };
  }, [key, cases, selection.month, retry]);
  const ready = detail.key === key && detail.status === "ready";
  const failed = !!key && detail.key === key && detail.status === "error";
  const busy = !!key && !ready && !failed;
  const rows = useMemo(
    () => (ready ? Object.values(detail.byCase).flat() : []),
    [ready, detail.byCase],
  );
  const filtered = useMemo(
    () => selectedRows(rows, selection),
    [rows, selection],
  );
  const prefix = selection.record
    ? ""
    : (selection.month ?? String(selection.year));
  const summary = useMemo(
    () => archiveCount(cases, prefix, selection.sensor),
    [cases, prefix, selection.sensor],
  );
  const count = selection.day
    ? {
        ...summary,
        value: ready && summary.value !== null ? filtered.length : null,
      }
    : summary;
  const previous = previousPrefix(selection);
  const prior: Count = !previous
    ? { value: null, available: 0, expected: 1 }
    : selection.day
      ? ready &&
        previous.startsWith(selection.month!) &&
        summary.available === summary.expected
        ? {
            ...summary,
            value: rows.filter(
              (o) =>
                sensorMatches(o, selection.sensor) &&
                o.time.startsWith(previous),
            ).length,
          }
        : { value: null, available: 0, expected: 1 }
      : archiveCount(cases, previous, selection.sensor);
  const change = rawChange(count, prior);
  const buckets = useMemo(
    () =>
      selection.month
        ? ready && summary.value !== null
          ? observationBuckets(rows, selection).map((b) => ({
              ...b,
              available: summary.available,
              expected: summary.expected,
            }))
          : []
        : archiveBuckets(cases, selection),
    [selection, ready, summary, rows, cases],
  );
  const peak = useMemo(
    () => [...buckets].sort((a, b) => (b.value ?? -1) - (a.value ?? -1))[0],
    [buckets],
  );
  const total = buckets.reduce((n, b) => n + (b.value ?? 0), 0);
  const share =
    peak?.value && total ? Math.round((peak.value / total) * 100) : 0;
  const resolution = selection.day
    ? "hour"
    : selection.month
      ? "day"
      : selection.record
        ? "year"
        : "month";
  const depth = selection.hour
    ? 4
    : selection.day
      ? 3
      : selection.month
        ? 2
        : selection.record
          ? 0
          : 1;
  function update(next: Partial<Selection>) {
    setSelection((s) => ({ ...s, ...next }));
  }
  function selectPeriod(period: string) {
    if (period.length === 4)
      update({
        year: Number(period),
        record: false,
        month: null,
        day: null,
        hour: null,
      });
    else if (period.length === 7)
      update({
        year: Number(period.slice(0, 4)),
        record: false,
        month: period,
        day: null,
        hour: null,
      });
    else if (period.length === 10) update({ day: period, hour: null });
    else update({ hour: period });
  }
  function back() {
    if (selection.hour) update({ hour: null });
    else if (selection.day) update({ day: null });
    else if (selection.month) update({ month: null });
    else update({ record: true });
  }
  function selectGeo(geo: Geography) {
    setSelection((s) => geographySelection(manifest.cases, s, geo));
  }
  function geoCount(geo: Geography): Count {
    const group = casesForGeo(manifest.cases, geo);
    const c = archiveCount(group, prefix, selection.sensor);
    if (!selection.day) return c;
    if (
      !ready ||
      c.value === null ||
      group.some((c) => detail.byCase[c.id] === undefined)
    )
      return { ...c, value: null };
    return {
      ...c,
      value: selectedRows(
        group.flatMap((c) => detail.byCase[c.id]),
        selection,
      ).length,
    };
  }
  const timeRows = selectedRows(rows, { ...selection, sensor: "all" });
  const sensorCounts = Object.fromEntries(
    (["modis", "viirs"] as const).map((sensor) => {
      const c = archiveCount(cases, prefix, sensor);
      return [
        sensor,
        selection.day
          ? ready && c.value !== null
            ? timeRows.filter((o) => sensorMatches(o, sensor)).length
            : null
          : c.value,
      ];
    }),
  ) as Record<"modis" | "viirs", number | null>;
  const represented = cases.filter((c) =>
    c.months.some((m) => m.month.startsWith(prefix)),
  ).length;
  return {
    selection,
    update,
    selectPeriod,
    back,
    selectGeo,
    geoCount,
    reset: () => setSelection({ ...initialSelection }),
    retry: () => setRetry((v) => v + 1),
    years,
    cases,
    busy,
    failed,
    ready,
    rows: filtered,
    allRows: rows,
    buckets,
    peak,
    total,
    share,
    count,
    summary,
    change,
    resolution,
    depth,
    label: periodLabel(selection),
    sensorCounts,
    represented,
  };
}
export type ReportModel = ReturnType<typeof useReport>;

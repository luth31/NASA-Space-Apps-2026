import { useMemo, useState } from "react";
import type { RefObject } from "react";
import { ArrowDownRight, ArrowUpRight, GitCompareArrows } from "lucide-react";
import type { Manifest } from "../data";
import { integer } from "../data";
import { geoNames, monthName } from "./report-data";
import type { Geography, ReportSensor, Selection } from "./report-data";
import { seasonalFingerprint, fingerprintDifference } from "./discovery-data";
import type { Fingerprint } from "./discovery-data";
import { relatedReadings } from "./pattern-data";
import "./discovery.css";

type Focus = (geo: Geography, month: string) => void;
const places: Geography[] = ["greece", "evros", "evia", "chaco", "all"];
const names = (p: Fingerprint) => `${geoNames[p.geo]} · ${p.year}`;
const peakLabel = (p: Fingerprint) =>
  p.peaks.length
    ? p.peaks.map((i) => p.months[i].label).join(" / ")
    : p.total === 0
      ? "No recorded peak"
      : "Incomplete record";
const percent = (n: number | null) => (n === null ? "—" : `${n.toFixed(1)}%`);

export default function DiscoveryWorkbench({
  manifest,
  selection: s,
  onFocus,
  onSensor,
  onPeriods,
  headingRef,
}: {
  manifest: Manifest;
  selection: Selection;
  onFocus: Focus;
  onSensor: (sensor: ReportSensor) => void;
  onPeriods: () => void;
  headingRef: RefObject<HTMLHeadingElement | null>;
}) {
  const [reference, setReference] = useState<{ geo: Geography; year: number }>({
    geo: s.geo,
    year: s.year - 1,
  });
  const [scale, setScale] = useState<"share" | "raw">("share");
  const [inspected, setInspected] = useState(
    Number(s.month?.slice(5) ?? "08") - 1,
  );
  const a = useMemo(
    () => seasonalFingerprint(manifest.cases, s.geo, s.year, s.sensor),
    [manifest.cases, s.geo, s.year, s.sensor],
  );
  const b = useMemo(
    () =>
      seasonalFingerprint(
        manifest.cases,
        reference.geo,
        reference.year,
        s.sensor,
      ),
    [manifest.cases, reference, s.sensor],
  );
  const delta = fingerprintDifference(a, b);
  const years = [
    ...new Set([
      ...manifest.cases.flatMap((c) => c.years),
      s.year,
      reference.year,
    ]),
  ].sort((a, b) => b - a);
  const geos = [...new Set([...places, s.geo, reference.geo])];
  const value = (p: Fingerprint, i: number) =>
    scale === "share" ? p.months[i].share : p.months[i].value;
  const max =
    scale === "share"
      ? 100
      : Math.max(
          1,
          ...[a, b].flatMap((p) => p.months.map((m) => m.value ?? 0)),
        );
  const segments = (p: Fingerprint) =>
    p.months
      .map((_, i) =>
        value(p, i) === null
          ? ""
          : `${i && value(p, i - 1) !== null ? "L" : "M"}${45 + i * 80},${235 - (value(p, i)! / max) * 200}`,
      )
      .join(" ");
  return (
    <section
      className="rd-workbench"
      aria-label="Compare annual seasonal fingerprints"
    >
      <header className="rd-heading">
        <span className="jy-eyebrow">ASK A MORE PRECISE QUESTION</span>
        <h1 ref={headingRef} tabIndex={-1}>
          What changed: timing, or amount?
        </h1>
        <p>
          Lay two annual records on the same calendar. Compare years, places, or
          both — then open a month to investigate.
        </p>
      </header>
      <div className="rd-controls">
        <div className="rd-current">
          <span className="rd-dot rd-a" />
          <div>
            <small>YOUR REPORT · A</small>
            <strong>{names(a)}</strong>
          </div>
        </div>
        <label>
          Compare with place
          <select
            value={reference.geo}
            onChange={(e) =>
              setReference((r) => ({ ...r, geo: e.target.value as Geography }))
            }
          >
            {geos.map((geo) => (
              <option key={geo} value={geo}>
                {geoNames[geo]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Reference year
          <select
            value={reference.year}
            onChange={(e) =>
              setReference((r) => ({ ...r, year: Number(e.target.value) }))
            }
          >
            {years.map((y) => (
              <option key={y}>{y}</option>
            ))}
          </select>
        </label>
        <label>
          One measurement
          <select
            value={s.sensor}
            onChange={(e) => onSensor(e.target.value as ReportSensor)}
          >
            <option value="viirs">S-NPP VIIRS</option>
            <option value="modis">Aqua MODIS</option>
            <option value="all">Both sensors · summed</option>
          </select>
        </label>
      </div>
      <div className="rd-prompts" aria-label="Comparison starting points">
        <span>Try a question</span>
        <button onClick={() => setReference({ geo: s.geo, year: s.year - 1 })}>
          Same place, previous year
        </button>
        <button
          onClick={() =>
            setReference({
              geo: s.geo === "evia" ? "evros" : "evia",
              year: s.year,
            })
          }
        >
          Another Greek study, same year
        </button>
        <button onClick={() => setReference({ geo: "chaco", year: s.year })}>
          Gran Chaco, same year
        </button>
      </div>
      {s.month && (
        <p className="rd-scope">
          This lens shows the whole of {s.year}. Your {s.day ?? s.month}
          {s.hour ? `, ${s.hour.slice(11)}:00 UTC` : ""} selection is retained
          when you return to The season.
        </p>
      )}
      <div className="rd-chart-head">
        <div className="rd-legend">
          <span>
            <i className="rd-dot rd-a" /> A · {names(a)}
          </span>
          <span>
            <i className="rd-dot rd-b" /> B · {names(b)}
          </span>
        </div>
        <div className="rd-toggle" role="group" aria-label="Comparison scale">
          <button
            aria-pressed={scale === "share"}
            onClick={() => setScale("share")}
          >
            Share of each year
          </button>
          <button
            aria-pressed={scale === "raw"}
            onClick={() => setScale("raw")}
          >
            Raw detections
          </button>
        </div>
      </div>
      <p className="rd-mobile-hint">
        Swipe the profile to see all 12 months. Tap a month for exact values.
      </p>
      <div className="rd-fingerprint">
        <svg
          viewBox="0 0 970 275"
          role="img"
          aria-label={`Monthly ${scale === "share" ? "share of each annual total" : "raw recorded detections"}; A solid gold, B dashed mint. Exact values in month controls and readout below.`}
        >
          {[0, 0.5, 1].map((f) => (
            <g key={f}>
              <line
                x1="45"
                x2="925"
                y1={235 - f * 200}
                y2={235 - f * 200}
                stroke="currentColor"
                opacity=".16"
              />
              <text x="8" y={239 - f * 200}>
                {scale === "share"
                  ? `${f * 100}%`
                  : integer(Math.round(f * max))}
              </text>
            </g>
          ))}
          {a.months.map(
            (m, i) =>
              (value(a, i) === null || value(b, i) === null) && (
                <rect
                  key={m.key}
                  x={25 + i * 80}
                  y="32"
                  width="40"
                  height="204"
                  className="rd-gap"
                />
              ),
          )}
          <line
            x1={45 + inspected * 80}
            x2={45 + inspected * 80}
            y1="26"
            y2="239"
            className="rd-cursor"
          />
          <path d={segments(a)} className="rd-line-a" />
          <path d={segments(b)} className="rd-line-b" />
          {[a, b].map((p, n) =>
            p.months.map(
              (m, i) =>
                value(p, i) !== null && (
                  <circle
                    key={`${n}-${m.key}`}
                    cx={45 + i * 80}
                    cy={235 - (value(p, i)! / max) * 200}
                    r={inspected === i ? 5 : 3}
                    className={n ? "rd-point-b" : "rd-point-a"}
                  />
                ),
            ),
          )}
        </svg>
        <div
          className="rd-months"
          role="group"
          aria-label="Inspect a month in both records"
        >
          {a.months.map((m, i) => (
            <button
              key={m.key}
              aria-pressed={inspected === i}
              onClick={() => setInspected(i)}
              onFocus={() => setInspected(i)}
              onKeyDown={(e) => {
                const next =
                  e.key === "ArrowRight"
                    ? (i + 1) % 12
                    : e.key === "ArrowLeft"
                      ? (i + 11) % 12
                      : e.key === "Home"
                        ? 0
                        : e.key === "End"
                          ? 11
                          : null;
                if (next !== null) {
                  e.preventDefault();
                  e.currentTarget.parentElement
                    ?.querySelectorAll<HTMLButtonElement>("button")
                    [next]?.focus();
                }
              }}
            >
              {m.label}
              <small>
                {value(a, i) === null || value(b, i) === null ? "gap" : "·"}
              </small>
            </button>
          ))}
        </div>
      </div>
      <div className="rd-readout" aria-live="polite">
        <strong>{monthName(a.months[inspected].key, true)}</strong>
        {[a, b].map((p, i) => (
          <div key={i}>
            <span>
              {i ? "B" : "A"} · {names(p)}
            </span>
            <b>
              {p.months[inspected].value === null
                ? "Source incomplete"
                : `${integer(p.months[inspected].value!)} detections`}
            </b>
            <small>
              {p.months[inspected].share === null
                ? "Annual share unavailable"
                : `${percent(p.months[inspected].share)} of this year`}
            </small>
            <button
              disabled={p.months[inspected].value === null}
              onClick={() => onFocus(p.geo, p.months[inspected].key)}
            >
              Open this month <ArrowDownRight size={14} />
            </button>
          </div>
        ))}
      </div>
      <div className="rd-completeness">
        {[a, b].map((p, i) => (
          <span key={i}>
            {i ? "B" : "A"}: {p.source.available}/{p.source.expected}{" "}
            sensor-month source records{" "}
            {p.complete ? "· complete" : "· incomplete"}
          </span>
        ))}
        <span>
          {delta.pairedMonths}/12 months have complete sources in both records.
        </span>
      </div>
      <p className="rd-caution">
        Shaded months have unavailable values. Annual shares need a complete,
        nonzero annual source total. A complete source record does not establish
        equal cloud cover or observing effort. Raw totals also depend on
        study-area size; these are not fire rates or calibrated anomalies.
      </p>
      <button className="rd-period-action" onClick={onPeriods}>
        Compare specific selected periods <GitCompareArrows size={14} />
      </button>
      <div
        className="rd-findings"
        aria-label="Questions answered by this comparison"
      >
        <button
          disabled={!a.peaks.length}
          onClick={() => onFocus(a.geo, a.months[a.peaks[0]].key)}
        >
          <small>WHEN DOES IT CLUSTER?</small>
          <strong>
            {peakLabel(a)} <span>↔ {peakLabel(b)}</span>
          </strong>
          <p>
            {delta.peakMonthDistance === null
              ? "A unique peak in each complete, nonzero year is needed to compare timing."
              : delta.peakMonthDistance === 0
                ? "Both annual records peak in the same calendar month."
                : `A peaks ${Math.abs(delta.peakMonthDistance)} calendar month${Math.abs(delta.peakMonthDistance) > 1 ? "s" : ""} ${delta.peakMonthDistance > 0 ? "later" : "earlier"} than B.`}
          </p>
          <em>
            {a.peaks.length > 1
              ? "Open A’s first tied peak"
              : "Investigate A’s peak"}{" "}
            <ArrowDownRight size={13} />
          </em>
        </button>
        <div>
          <small>HOW COMPRESSED IS THE YEAR?</small>
          <strong>
            {percent(a.topThreeShare)} <span>in A’s top 3 months</span>
          </strong>
          <p>
            B: {percent(b.topThreeShare)}.{" "}
            {a.activeMonths === null
              ? "A’s annual source is incomplete."
              : `${a.activeMonths} of 12 months in A contain recorded detections.`}{" "}
            This describes concentration, not fire duration.
          </p>
        </div>
        <div>
          <small>HOW MUCH WAS RECORDED?</small>
          <strong>
            {delta.count === null
              ? "Comparison withheld"
              : `${delta.count > 0 ? "+" : ""}${integer(delta.count)}`}
            <span>{delta.count !== null ? " A minus B" : ""}</span>
          </strong>
          <p>
            {delta.percent === null
              ? "Percentage change needs complete sources and a nonzero reference."
              : `${delta.percent > 0 ? "+" : ""}${delta.percent.toFixed(1)}% relative to B, using the same sensor selection.`}{" "}
            Counts are thermal pixels, not unique fires.
          </p>
        </div>
      </div>
      <div className="rd-contributions">
        <div>
          <span className="jy-eyebrow">WHERE IS A’S SIGNAL COMING FROM?</span>
          <p>
            Contribution to {s.year} within {geoNames[s.geo]}. Select a study to
            open its busiest recorded month.
          </p>
        </div>
        <div>
          {a.contributions.map((c) => {
            const p = seasonalFingerprint(
              manifest.cases,
              c.id as Geography,
              s.year,
              s.sensor,
            );
            return (
              <button
                key={c.id}
                disabled={!p.peaks.length}
                onClick={() =>
                  onFocus(c.id as Geography, p.months[p.peaks[0]].key)
                }
              >
                <span>
                  {geoNames[c.id as Geography]}
                  <b>{percent(c.share)}</b>
                </span>
                <i>
                  <i style={{ width: `${c.share ?? 0}%` }} />
                </i>
                <small>
                  {c.count.value === null
                    ? "No source"
                    : `${integer(c.count.value)} recorded detections`}
                  {c.share === null ? " · share unavailable" : ""}
                </small>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function EvidenceTrail({
  selection: s,
  onFocus,
  onCompare,
}: {
  selection: Selection;
  onFocus: Focus;
  onCompare: () => void;
}) {
  const relevant = relatedReadings(s.geo, s.year, s.month, s.record, s.day);
  const stories = relevant.filter((r) => r.kind === "Reporting");
  const methods = relevant.filter((r) => r.kind !== "Reporting");
  return (
    <section
      className="rd-evidence"
      id="report-evidence"
      aria-labelledby="report-evidence-heading"
    >
      <header>
        <div>
          <span className="jy-eyebrow">FROM A PATTERN TO A QUESTION</span>
          <h2 id="report-evidence-heading">What might help explain it?</h2>
          <p>
            Put the satellite record beside dated reporting. These sources add
            context; they do not establish the cause of an individual detection.
          </p>
        </div>
        <button onClick={onCompare}>
          <GitCompareArrows size={16} /> Compare places & years
        </button>
      </header>
      <div className="rd-evidence-grid">
        <div className="rd-timeline">
          <h3>Reporting around this selection</h3>
          <p className="rd-scope">
            {geoNames[s.geo]} ·{" "}
            {s.record ? "available archive" : (s.day ?? s.month ?? s.year)}.
            Open a comparison month to move this evidence trail with it.
          </p>
          {stories.length ? (
            stories.map((r) => (
              <article key={r.id}>
                <div className="rd-evidence-date">
                  <small>PUBLISHED</small>
                  <time>{r.date}</time>
                  <span>{r.publisher}</span>
                </div>
                <div>
                  {r.image && (
                    <img
                      src={r.image}
                      alt={`Dated satellite context for ${r.title}`}
                      loading="lazy"
                    />
                  )}
                  <h4>
                    <a href={r.url} target="_blank" rel="noreferrer">
                      {r.title} <ArrowUpRight size={15} />
                    </a>
                  </h4>
                  <p>{r.summary}</p>
                  {r.conditions && (
                    <p className="rd-reported-conditions">
                      <strong>
                        Reported conditions · {r.publisher}, {r.date}
                      </strong>
                      {r.conditions}
                    </p>
                  )}
                  <p className="rd-source-context">{r.why}</p>
                  <small>
                    Context discussed: {r.contextFrom} – {r.contextTo}
                  </small>
                  {r.imageDate && <small>{r.imageDate}</small>}
                  <button
                    onClick={() => onFocus(s.geo, r.contextFrom!.slice(0, 7))}
                  >
                    Open the covered month <ArrowDownRight size={14} />
                  </button>
                </div>
              </article>
            ))
          ) : (
            <div className="rd-no-report">
              <strong>No curated reporting matches this selection.</strong>
              <p>
                This is a gap in our context collection, not evidence that
                nothing happened. The measurement references remain useful; a
                comparison can reveal which month deserves a closer look.
              </p>
              <button onClick={onCompare}>
                Find a period to investigate <ArrowDownRight size={14} />
              </button>
            </div>
          )}
        </div>
        <aside>
          <h3>Before interpreting a change</h3>
          <ol>
            <li>
              <strong>Timing</strong>
              <p>
                Does the seasonal peak recur, or move to a different month?
                Inspect complete years in Across years.
              </p>
            </li>
            <li>
              <strong>Measurement</strong>
              <p>
                Does the pattern survive switching sensors? MODIS extends
                further back; missing VIIRS years remain gaps.
              </p>
            </li>
            <li>
              <strong>Context</strong>
              <p>
                Check dated regional reporting and imagery. Smoke, burned area
                and ignition time require separate evidence.
              </p>
            </li>
          </ol>
          <h3>Research & measurement</h3>
          {methods.map((r) => (
            <a
              className="rd-method"
              key={r.id}
              href={r.url}
              target="_blank"
              rel="noreferrer"
            >
              <small>
                {r.kind} · {r.date}
              </small>
              <strong>
                {r.title} <ArrowUpRight size={13} />
              </strong>
              <span>{r.publisher}</span>
            </a>
          ))}
        </aside>
      </div>
    </section>
  );
}

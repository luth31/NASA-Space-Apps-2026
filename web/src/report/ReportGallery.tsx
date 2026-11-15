import { useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Heart,
  SlidersHorizontal,
} from "lucide-react";
import type { CSSProperties } from "react";
import type { Concept, Experiment } from "./report-data";
import { archiveCount } from "./report-data";
import { concepts, ideaParts } from "./concepts";
import type { ReportConcept } from "./concepts";
import type { ReportModel } from "./use-report";
import type { PicksModel } from "./use-idea-picks";
import { treemap, sensorBuckets } from "./experiment-data";
import { integer } from "../data";

export function IdeaPicker({
  id,
  picks,
  compact = false,
}: {
  id: Experiment;
  picks: PicksModel;
  compact?: boolean;
}) {
  const pick = picks.picks[id];
  return (
    <details className={`idea-picker ${compact ? "compact" : ""}`}>
      <summary>
        <Heart size={13} fill={pick?.parts.length ? "currentColor" : "none"} />
        {pick?.parts.length
          ? `${pick.parts.length} things saved`
          : "Pick the parts you like"}
        <SlidersHorizontal size={12} />
      </summary>
      <div
        className="idea-part-buttons"
        role="group"
        aria-label={`Save parts of ${concepts.find((c) => c.id === id)?.name}`}
      >
        {ideaParts.map((part) => (
          <button
            key={part}
            aria-pressed={pick?.parts.includes(part) ?? false}
            onClick={() => picks.toggle(id, part)}
          >
            {pick?.parts.includes(part) && <Check size={11} />} {part}
          </button>
        ))}
      </div>
      <label className="idea-note-label">
        What would you keep or change?
        <textarea
          value={pick?.note ?? ""}
          maxLength={2000}
          rows={2}
          onChange={(e) => picks.note(id, e.target.value)}
          placeholder="e.g. Keep this layout, with the particles from The Spark"
        />
      </label>
    </details>
  );
}
export function IdeaPreview({
  concept,
  model,
}: {
  concept: ReportConcept;
  model: ReportModel;
}) {
  const buckets = model.buckets,
    max = Math.max(1, ...buckets.map((b) => b.value ?? 0));
  const values = buckets.map((b) => (b.value ?? 0) / max);
  const path = values
    .map(
      (v, i) =>
        `${i ? "L" : "M"}${20 + (i / Math.max(1, values.length - 1)) * 360},${142 - v * 105}`,
    )
    .join(" ");
  const tiles = treemap(buckets);
  const modis = sensorBuckets(model, "modis"),
    viirs = sensorBuckets(model, "viirs");
  const cm = Math.max(
    1,
    ...modis.map((b) => b.value ?? 0),
    ...viirs.map((b) => b.value ?? 0),
  );
  return (
    <svg
      className={`idea-preview idea-preview-${concept.id}`}
      viewBox="0 0 400 190"
      aria-hidden="true"
    >
      <defs>
        <linearGradient
          id={`idea-fill-${concept.id}`}
          x1="0"
          y1="0"
          x2="1"
          y2="1"
        >
          <stop stopColor={concept.accent} />
          <stop offset="1" stopColor="#67785c" />
        </linearGradient>
      </defs>
      {concept.id === "story" && (
        <g>
          {[35, 55, 75].map((r) => (
            <circle
              key={r}
              cx="200"
              cy="95"
              r={r}
              fill="none"
              stroke="#eac19020"
            />
          ))}
          {values.map((v, i) => {
            const a = ((i + 0.5) / values.length) * Math.PI * 2 - Math.PI / 2;
            return (
              <g key={i}>
                {Array.from({ length: Math.round(v * 70) }, (_, j) => {
                  const angle =
                      a +
                      (Math.sin(j * 13.1) * 0.35) /
                        Math.max(1, values.length / 12),
                    r = 43 + ((j * 17) % 35);
                  return (
                    <circle
                      key={j}
                      cx={200 + Math.cos(angle) * r}
                      cy={95 + Math.sin(angle) * r}
                      r={1.1 + (j % 3) * 0.3}
                      fill={concept.accent}
                      opacity={0.35 + (j % 4) * 0.16}
                    />
                  );
                })}
              </g>
            );
          })}
          <text x="200" y="95" textAnchor="middle" fill="#f3d2ab" fontSize="32">
            {model.share}%
          </text>
          <text x="200" y="115" textAnchor="middle" fill="#9caf95" fontSize="9">
            one moment stands out
          </text>
        </g>
      )}
      {concept.id === "dashboard" && (
        <g>
          {values.map((v, i) => (
            <rect
              key={i}
              x={22 + (i / Math.max(1, values.length)) * 360}
              y={155 - v * 105}
              width={Math.max(2, 310 / Math.max(1, values.length))}
              height={Math.max(1, v * 105)}
              rx="2"
              fill={`url(#idea-fill-${concept.id})`}
              opacity={0.5 + v * 0.5}
            />
          ))}
          <text x="24" y="34" fill="#c9d7b6" fontSize="10">
            COLUMNS ↔ ORBIT ↔ RIVER
          </text>
        </g>
      )}
      {concept.id === "timeline" && (
        <g>
          <path d={`${path} L380,166 L20,166 Z`} fill="#c7a46e19" />
          <path d={path} fill="none" stroke={concept.accent} strokeWidth="2" />
          <line
            x1="255"
            x2="255"
            y1="30"
            y2="167"
            stroke="#e4d8b966"
            strokeDasharray="3 5"
          />
          <rect x="22" y="171" width="355" height="2" fill="#6c745a" />
          <circle cx="255" cy="172" r="5" fill={concept.accent} />
        </g>
      )}
      {concept.id === "mosaic" && (
        <g>
          {tiles.map((t, i) => (
            <g key={t.key}>
              <rect
                x={18 + t.x * 3.64}
                y={15 + t.y * 1.55}
                width={Math.max(0, t.w * 3.64 - 3)}
                height={Math.max(0, t.h * 1.55 - 3)}
                rx="3"
                fill={["#dfb8ec", "#acb6f1", "#9dd8c3", "#d4bd88"][i % 4]}
                opacity={0.9 - i * 0.03}
              />
              {t.w * t.h > 500 && (
                <text
                  x={27 + t.x * 3.64}
                  y={37 + t.y * 1.55}
                  fill="#232837"
                  fontSize="12"
                >
                  {t.label}
                </text>
              )}
            </g>
          ))}
        </g>
      )}
      {concept.id === "tapestry" && (
        <g>
          {Array.from({ length: 7 }, (_, row) =>
            Array.from({ length: 12 }, (_, month) => {
              const key = `${model.selection.year - 6 + row}-${String(month + 1).padStart(2, "0")}`,
                count = archiveCount(model.cases, key, model.selection.sensor);
              const a =
                count.value === null
                  ? 0
                  : Math.min(1, Math.log10(1 + count.value) / 4);
              return (
                <rect
                  key={key}
                  x={25 + month * 29.5}
                  y={17 + row * 23}
                  width="24"
                  height="17"
                  rx="2"
                  fill={
                    count.value === null
                      ? "#ffffff08"
                      : `rgba(166,218,195,${0.08 + a * 0.92})`
                  }
                  stroke={row === 6 ? "#e6efc733" : "none"}
                />
              );
            }),
          )}
        </g>
      )}
      {concept.id === "sculpture" && (
        <g transform="translate(35 12)">
          {values.map((v, i) => {
            const x = i * 25 + 15,
              y = 130 - (i % 2) * 8,
              h = 3 + v * 95;
            return (
              <g key={i}>
                <path
                  d={`M${x} ${y}v-${h}l12 -7 12 7v${h}l-12 7z`}
                  fill={concept.accent}
                  opacity={0.45 + v * 0.5}
                />
                <path
                  d={`M${x} ${y - h}l12 7 12 -7M${x + 12} ${y - h + 7}v${h}`}
                  stroke="#15253d"
                  fill="none"
                  strokeWidth="1"
                />
              </g>
            );
          })}
        </g>
      )}
      {concept.id === "split" && (
        <g>
          {modis.map((b, i) => {
            const v = (b.value ?? 0) / cm;
            return (
              <rect
                key={b.key}
                x={20 + (i / Math.max(1, modis.length)) * 360}
                y={92 - v * 65}
                width={Math.max(2, 280 / Math.max(1, modis.length))}
                height={Math.max(1, v * 65)}
                fill="#a2dde2"
              />
            );
          })}
          {viirs.map((b, i) => {
            const v = (b.value ?? 0) / cm;
            return (
              <rect
                key={b.key}
                x={20 + (i / Math.max(1, viirs.length)) * 360}
                y="99"
                width={Math.max(2, 280 / Math.max(1, viirs.length))}
                height={Math.max(1, v * 65)}
                fill="#efbb8a"
              />
            );
          })}
          <line x1="15" x2="385" y1="95" y2="95" stroke="#ffffff22" />
          <text x="23" y="20" fill="#a2dde2" fontSize="10">
            MODIS
          </text>
          <text x="23" y="181" fill="#efbb8a" fontSize="10">
            VIIRS
          </text>
        </g>
      )}
      {concept.id === "dispatch" && (
        <g>
          <rect width="400" height="190" fill="#e9e2d2" />
          <text
            x="24"
            y="35"
            fill="#30392f"
            fontFamily="Georgia,serif"
            fontSize="13"
          >
            THE FIRE DISPATCH
          </text>
          <line x1="24" x2="376" y1="46" y2="46" stroke="#313a3044" />
          <text
            x="24"
            y="91"
            fill="#31392f"
            fontFamily="Georgia,serif"
            fontSize="34"
          >
            A year in
          </text>
          <text
            x="24"
            y="127"
            fill="#9c583e"
            fontFamily="Georgia,serif"
            fontSize="34"
          >
            a single glance.
          </text>
          <text
            x="267"
            y="126"
            fill="#31392f"
            fontFamily="Georgia,serif"
            fontSize="45"
          >
            {model.share}%
          </text>
          <text x="26" y="168" fill="#68725e" fontSize="9">
            TURN THE PAGE →
          </text>
        </g>
      )}
      {concept.id === "sequencer" && (
        <g>
          {values.slice(0, 16).map((v, i) => (
            <g key={i}>
              <rect
                x={30 + (i % 4) * 87}
                y={20 + Math.floor(i / 4) * 48}
                width="74"
                height="36"
                rx="7"
                fill={v > 0.5 ? concept.accent : "#263623"}
                stroke={concept.accent}
                strokeOpacity={0.12 + v * 0.5}
              />
              <text
                x={67 + (i % 4) * 87}
                y={43 + Math.floor(i / 4) * 48}
                textAnchor="middle"
                fill={v > 0.5 ? "#24311c" : "#a5b592"}
                fontSize="10"
              >
                {buckets[i]?.label}
              </text>
            </g>
          ))}
        </g>
      )}
    </svg>
  );
}

export default function ReportGallery({
  model,
  picks,
  onOpen,
}: {
  model: ReportModel;
  picks: PicksModel;
  onOpen: (id: Concept) => void;
}) {
  const [filter, setFilter] = useState("all");
  const visible = concepts.filter((c) =>
    filter === "all" || filter === "picked"
      ? filter !== "picked" ||
        !!picks.picks[c.id]?.parts.length ||
        !!picks.picks[c.id]?.note
      : c.category === filter,
  );
  return (
    <section className="report-gallery">
      <div className="gallery-intro">
        <div>
          <span className="x-kicker">
            <i /> THE REPORT PLAYGROUND · 09 EXPERIMENTS
          </span>
          <h1>
            Nine ways to see fire.
            <br />
            <span>Pick what moves you.</span>
          </h1>
          <p>
            Try radically different ways of telling the same story.
            <br />
            Keep a whole idea, or mix the best parts of several.
          </p>
        </div>
        <div className="gallery-picks-total">
          <Heart size={23} />
          <strong>{picks.count}</strong>
          <span>
            ideas on your shortlist
            <br />
            <small>
              {picks.saved
                ? "Saved in this browser"
                : "Session only · browser storage unavailable"}
            </small>
          </span>
        </div>
      </div>
      <div className="gallery-toolbar">
        <div role="group" aria-label="Filter report ideas">
          {[
            { id: "all", name: "All nine" },
            { id: "story", name: "Stories" },
            { id: "pattern", name: "Patterns" },
            { id: "play", name: "Playgrounds" },
            { id: "picked", name: `My shortlist (${picks.count})` },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              aria-pressed={filter === f.id}
              className={filter === f.id ? "active" : ""}
            >
              {f.name}
            </button>
          ))}
        </div>
        <span>Live previews · {model.label}</span>
      </div>
      <div className="gallery-grid">
        {visible.map((c) => {
          const index = concepts.indexOf(c),
            picked = picks.picks[c.id]?.parts.includes("Whole idea") ?? false;
          return (
            <article
              key={c.id}
              className={`gallery-card gallery-${c.id}`}
              style={{ "--idea-accent": c.accent } as CSSProperties}
            >
              <div className="gallery-card-top">
                <span>
                  0{index + 1} / {c.type}
                </span>
                <button
                  className="idea-heart"
                  aria-label={`${picked ? "Unsave" : "Save"} whole idea ${c.name}`}
                  aria-pressed={picked}
                  onClick={() => picks.toggle(c.id, "Whole idea")}
                >
                  <Heart
                    size={16}
                    fill={
                      picks.picks[c.id]?.parts.includes("Whole idea")
                        ? "currentColor"
                        : "none"
                    }
                  />
                </button>
              </div>
              <button
                className="gallery-art"
                aria-label={`Preview ${c.name}`}
                onClick={() => onOpen(c.id)}
              >
                <IdeaPreview concept={c} model={model} />
                {model.count.value === null && (
                  <b className="gallery-no-data">
                    No source data for this lens
                  </b>
                )}
                <span>
                  Step inside <ArrowUpRight size={16} />
                </span>
              </button>
              <div className="gallery-card-copy">
                <h2>
                  <c.icon size={19} />
                  {c.name}
                </h2>
                <p>{c.description}</p>
                <details className="idea-tradeoffs">
                  <summary>Why try it?</summary>
                  <p>{c.strength}</p>
                  <small>{c.tradeoff}</small>
                </details>
                <div className="gallery-card-actions">
                  <button onClick={() => onOpen(c.id)}>
                    Open experiment <ArrowRight size={14} />
                  </button>
                  <a
                    href={`?tab=report&concept=${c.id}`}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`Open ${c.name} in a new tab`}
                  >
                    <ArrowUpRight size={16} />
                  </a>
                </div>
                <IdeaPicker id={c.id} picks={picks} />
              </div>
            </article>
          );
        })}
      </div>
      {!visible.length && (
        <div className="gallery-empty">
          <Heart size={30} />
          <h2>Your mix starts here.</h2>
          <p>
            Save an idea or a part of an idea, then come back to compare your
            shortlist.
          </p>
          <button className="x-primary" onClick={() => setFilter("all")}>
            Explore all nine <ArrowRight size={15} />
          </button>
        </div>
      )}
      <div className="gallery-bottom-note">
        <strong>Nothing is locked in.</strong>
        <p>
          The experiments share your filters and real NASA data. Your shortlist
          is for collecting ideas, not choosing a final version. Each experience
          has the same time and place controls; scientific limits remain
          available under “How to read this”.
        </p>
        <span>
          {model.count.value === null
            ? "Source data unavailable for the current lens"
            : `${integer(model.count.value)} reported detections in the current lens`}{" "}
          · no sample data
        </span>
      </div>
    </section>
  );
}

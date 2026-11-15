import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ArrowRight,
  ArrowUpRight,
  AudioLines,
  ChevronLeft,
  ChevronRight,
  Layers3,
  LoaderCircle,
  Pause,
  Play,
  Satellite,
  Volume2,
  VolumeX,
} from "lucide-react";
import type { Manifest } from "../data";
import { integer } from "../data";
import { archiveCount, geoChildren, geoNames, monthName } from "./report-data";
import type { Bucket, Experiment, Geography } from "./report-data";
import { Counter, bucketName, readout } from "./primitives";
import type { ReportModel } from "./use-report";
import { sensorBuckets, treemap } from "./experiment-data";
const DataLandscape = lazy(() => import("./DataLandscape"));
interface Props {
  id: Experiment;
  model: ReportModel;
  manifest: Manifest;
  paused: boolean;
  onSelect: (key: string) => void;
}

function Rail({
  buckets,
  onSelect,
  active,
  onPreview,
}: {
  buckets: Bucket[];
  onSelect: (key: string) => void;
  active?: number;
  onPreview?: (i: number) => void;
}) {
  return (
    <div className="exp-rail" role="group" aria-label="Exact period counts">
      {buckets.map((b, i) => (
        <button
          key={b.key}
          className={`x-period ${active === i ? "active" : ""} ${b.value === null ? "missing" : ""}`}
          aria-pressed={active === i}
          aria-label={`${onPreview ? "Preview" : "Explore"} ${bucketName(b)} · ${readout(b)}`}
          onClick={() => (onPreview ? onPreview(i) : onSelect(b.key))}
          onKeyDown={(e) => {
            const next =
              e.key === "ArrowRight"
                ? i + 1
                : e.key === "ArrowLeft"
                  ? i - 1
                  : e.key === "Home"
                    ? 0
                    : e.key === "End"
                      ? buckets.length - 1
                      : null;
            if (next !== null) {
              e.preventDefault();
              e.currentTarget.parentElement
                ?.querySelectorAll<HTMLButtonElement>("button")
                [Math.max(0, Math.min(buckets.length - 1, next))]?.focus();
            }
          }}
        >
          <span>
            {b.label}
            {b.key.length === 13 ? "h" : ""}
          </span>
          <strong>{b.value === null ? "—" : integer(b.value)}</strong>
        </button>
      ))}
    </div>
  );
}
function Intro({
  number,
  kicker,
  title,
  children,
  total,
}: {
  number: string;
  kicker: string;
  title: string;
  children: React.ReactNode;
  total: number | null;
}) {
  return (
    <div className="exp-intro">
      <div>
        <span className="x-kicker">
          <i />
          {number} — {kicker}
        </span>
        <h1>{title}</h1>
        <p>{children}</p>
      </div>
      <div className="exp-current-total">
        <Counter value={total} />
        <span>reported detections in your current lens</span>
      </div>
    </div>
  );
}

function Mosaic({ model, onSelect }: Props) {
  const [mode, setMode] = useState<"time" | "place">("time"),
    [hover, setHover] = useState<string | null>(null);
  const children = geoChildren[model.selection.geo],
    geos = children.length ? children : [model.selection.geo];
  const items =
    mode === "time"
      ? model.buckets
      : geos.map((geo) => ({
          key: geo,
          label: geoNames[geo],
          ...model.geoCount(geo),
        }));
  const tiles = treemap(items),
    total = items.reduce((n, b) => n + (b.value ?? 0), 0);
  const inspected =
    items.find((i) => i.key === hover) ??
    [...items].sort((a, b) => (b.value ?? -1) - (a.value ?? -1))[0];
  const reduced = useReducedMotion();
  function choose(key: string) {
    if (mode === "time") onSelect(key);
    else model.selectGeo(key as Geography);
  }
  return (
    <>
      <Intro
        number="04"
        kicker="SIGNAL MOSAIC"
        title="Give a moment some space."
        total={model.count.value}
      >
        A tile’s area is its share of detections. The bigger the moment, the
        more room it takes.
      </Intro>
      <div className="mosaic-tools">
        <div role="group" aria-label="Mosaic grouping">
          <button
            className={mode === "time" ? "active" : ""}
            aria-pressed={mode === "time"}
            onClick={() => setMode("time")}
          >
            By {model.resolution}
          </button>
          <button
            className={mode === "place" ? "active" : ""}
            aria-pressed={mode === "place"}
            onClick={() => setMode("place")}
          >
            By place
          </button>
        </div>
        <span>
          {mode === "place"
            ? `${geoNames[model.selection.geo]} · study areas only`
            : `${model.label} · all tile areas use the same scale`}
        </span>
      </div>
      <section className="mosaic-stage">
        <aside>
          <span className="x-eyebrow">MAKE ROOM FOR THE STANDOUT</span>
          <strong>
            {inspected?.value && total
              ? Math.round((inspected.value / total) * 100)
              : 0}
            <small>%</small>
          </strong>
          <h3>
            {mode === "time" && inspected
              ? bucketName(inspected as Bucket)
              : (inspected?.label ?? "No reported detections")}
          </h3>
          <p>
            {inspected?.value === null
              ? "No source data"
              : `${integer(inspected?.value ?? 0)} reported detections`}
          </p>
          <button
            disabled={
              !inspected ||
              !inspected.value ||
              (mode === "place" && !children.length)
            }
            onClick={() => inspected && choose(inspected.key)}
          >
            Step inside <ArrowUpRight size={16} />
          </button>
          <span className="mosaic-aside-note">
            Positive counts become tiles. Zero counts and missing sources stay
            in the list below.
          </span>
        </aside>
        <div className="mosaic-board" aria-label="Proportional detection tiles">
          {tiles.map((tile, i) => (
            <motion.button
              key={tile.key}
              className={`mosaic-tile x-period ${tile.w * tile.h < 150 ? "tiny" : ""}`}
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{
                opacity: 1,
                scale: 1,
                left: `${tile.x}%`,
                top: `${tile.y}%`,
                width: `${tile.w}%`,
                height: `${tile.h}%`,
              }}
              transition={{
                duration: reduced ? 0 : 0.65,
                ease: [0.2, 0.8, 0.2, 1],
              }}
              style={{
                background: [
                  "#d7b6eb",
                  "#a7b9de",
                  "#9ecebd",
                  "#e5c28b",
                  "#c9cb94",
                ][i % 5],
              }}
              onPointerEnter={() => setHover(tile.key)}
              onPointerLeave={() => setHover(null)}
              onFocus={() => setHover(tile.key)}
              onBlur={() => setHover(null)}
              onClick={() => choose(tile.key)}
              aria-label={`Explore ${mode === "time" ? bucketName(tile as unknown as Bucket) : tile.label} · ${integer(tile.value!)} detections`}
            >
              <span>{tile.label}</span>
              <strong>{integer(tile.value!)}</strong>
              <ArrowUpRight size={18} />
            </motion.button>
          ))}
          {!tiles.length && (
            <p className="mosaic-zero">
              No positive counts to size into tiles. An empty record does not
              establish no fire.
            </p>
          )}
        </div>
      </section>
      {mode === "time" ? (
        <Rail buckets={model.buckets} onSelect={onSelect} />
      ) : (
        <div className="mosaic-place-list">
          {items.map((item) => (
            <button
              key={item.key}
              disabled={!children.length}
              onClick={() => choose(item.key)}
            >
              {item.label}
              <strong>
                {item.value === null ? "Unavailable" : integer(item.value)}
              </strong>
              <ArrowRight size={13} />
            </button>
          ))}
        </div>
      )}
    </>
  );
}

function Loom({ model, onSelect }: Props) {
  const [hover, setHover] = useState<Bucket | null>(null);
  const annual = !model.selection.month;
  const cells: Bucket[] = annual
    ? model.years.flatMap((year) =>
        Array.from({ length: 12 }, (_, month) => {
          const key = `${year}-${String(month + 1).padStart(2, "0")}`;
          return {
            key,
            label: monthName(key),
            ...archiveCount(model.cases, key, model.selection.sensor),
          };
        }),
      )
    : model.buckets;
  const max = Math.max(1, ...cells.map((c) => c.value ?? 0));
  const active = hover ?? model.peak;
  const paint = (value: number | null) =>
    value === null
      ? undefined
      : `rgba(177,222,191,${0.045 + (Math.log1p(value) / Math.log1p(max)) * 0.9})`;
  return (
    <>
      <Intro
        number="05"
        kicker="THE FIRE LOOM"
        title="Find the pattern in the fabric."
        total={model.count.value}
      >
        Read a year as one thread in a longer record. Bright stitches reveal
        concentration; gaps remain gaps.
      </Intro>
      <section className="loom-stage">
        <div className="loom-readout">
          <div>
            <span className="x-eyebrow">
              {annual
                ? `${model.years[0]}–${model.years.at(-1)} · YOUR YEAR IS HIGHLIGHTED`
                : model.label}
            </span>
            <h3>{active ? bucketName(active) : "Explore a stitch"}</h3>
          </div>
          <div>
            <Counter value={active?.value ?? null} />
            <span>reported detections in this period</span>
          </div>
          <p>
            {annual
              ? "Move across months. Scan down years. Select a stitch to open its days."
              : `You’re inside the record. Select a ${model.resolution} to go closer.`}
          </p>
        </div>
        {annual ? (
          <div className="loom-scroll">
            <div className="loom-month-head">
              <span>YEAR</span>
              {Array.from({ length: 12 }, (_, i) => (
                <span key={i}>
                  {monthName(`2023-${String(i + 1).padStart(2, "0")}`)}
                </span>
              ))}
            </div>
            <div role="group" aria-label="Monthly heat tapestry">
              {model.years.map((year, row) => (
                <div
                  className={`loom-row ${year === model.selection.year ? "selected-year" : ""}`}
                  key={year}
                >
                  <button
                    className="loom-year"
                    aria-pressed={year === model.selection.year}
                    onClick={() => onSelect(String(year))}
                  >
                    {year}
                  </button>
                  {cells.slice(row * 12, row * 12 + 12).map((c, col) => (
                    <button
                      className={`loom-cell x-period ${c.value === null ? "missing" : ""}`}
                      key={c.key}
                      style={{ backgroundColor: paint(c.value) }}
                      aria-label={`Explore ${bucketName(c)} · ${readout(c)}${c.available < c.expected ? " · partial archive" : ""}`}
                      onPointerEnter={() => setHover(c)}
                      onPointerLeave={() => setHover(null)}
                      onFocus={() => setHover(c)}
                      onBlur={() => setHover(null)}
                      onClick={() => onSelect(c.key)}
                      onKeyDown={(e) => {
                        const current = row * 12 + col,
                          offset =
                            e.key === "ArrowRight"
                              ? 1
                              : e.key === "ArrowLeft"
                                ? -1
                                : e.key === "ArrowDown"
                                  ? 12
                                  : e.key === "ArrowUp"
                                    ? -12
                                    : 0;
                        if (offset) {
                          e.preventDefault();
                          document
                            .querySelectorAll<HTMLButtonElement>(".loom-cell")
                            [
                              Math.max(
                                0,
                                Math.min(cells.length - 1, current + offset),
                              )
                            ]?.focus();
                        }
                      }}
                    >
                      {c.value === null ? (
                        "—"
                      ) : c.value > max * 0.3 ? (
                        <span>{integer(c.value)}</span>
                      ) : (
                        ""
                      )}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div
            className={`loom-detail ${model.resolution === "hour" ? "hours" : ""}`}
            role="group"
            aria-label="Detailed heat tapestry"
          >
            {cells.map((c) => (
              <button
                className="loom-detail-cell x-period"
                style={{ backgroundColor: paint(c.value) }}
                key={c.key}
                onPointerEnter={() => setHover(c)}
                onPointerLeave={() => setHover(null)}
                onFocus={() => setHover(c)}
                onClick={() => onSelect(c.key)}
                aria-label={`Explore ${bucketName(c)} · ${readout(c)}`}
              >
                <span>
                  {c.label}
                  {model.resolution === "hour" ? ":00" : ""}
                </span>
                <strong>{c.value === null ? "—" : integer(c.value)}</strong>
                <small>detections</small>
              </button>
            ))}
          </div>
        )}
        <div className="loom-legend">
          <span>0 reported</span>
          <i />
          <span>{integer(max)} detections · logarithmic color scale</span>
          <b /> Missing source
        </div>
      </section>
      <p className="exp-fine">
        Current metrics follow {model.label}. The annual tapestry shows the
        longer available record. Colors use a log scale to make quieter periods
        visible; numbers remain untransformed. Dark filled cells mean zero
        detections, not verified absence of fire.
      </p>
    </>
  );
}

function Sculpture(props: Props) {
  const { model, onSelect, paused } = props;
  return (
    <>
      <Intro
        number="06"
        kicker="DATA LANDSCAPE"
        title="Make time tangible."
        total={model.count.value}
      >
        A year becomes a skyline. Orbit the sculpture, compare the heights, then
        enter a tower.
      </Intro>
      <section className="sculpture-stage">
        <Suspense
          fallback={
            <div className="exp-loading">
              <LoaderCircle size={24} /> Building the data sculpture…
            </div>
          }
        >
          <DataLandscape
            buckets={model.buckets}
            onSelect={onSelect}
            paused={paused}
          />
        </Suspense>
        <Rail buckets={model.buckets} onSelect={onSelect} />
      </section>
      <div className="sculpture-caption">
        <span>
          <Layers3 size={17} /> Height is proportional to raw reported
          detections.
        </span>
        <p>
          This is a 3D chart, not a map or a prediction. Camera perspective
          affects appearance. Use the exact counts below each period for precise
          comparisons.
        </p>
      </div>
    </>
  );
}

function SensorSplit({ model, onSelect }: Props) {
  const [divider, setDivider] = useState(50),
    [together, setTogether] = useState(false);
  const modis = sensorBuckets(model, "modis"),
    viirs = sensorBuckets(model, "viirs");
  const max = Math.max(
      1,
      ...modis.map((b) => b.value ?? 0),
      ...viirs.map((b) => b.value ?? 0),
    ),
    n = Math.max(1, modis.length);
  function bars(rows: Bucket[], sensor: "modis" | "viirs") {
    return rows.map((b, i) => (
      <g key={b.key}>
        <rect
          x={
            20 +
            ((i + 0.15) / n) * 960 +
            (together && sensor === "viirs" ? (960 / n) * 0.36 : 0)
          }
          y={265 - ((b.value ?? 0) / max) * 215}
          width={(960 / n) * (together ? 0.32 : 0.7)}
          height={
            b.value === null
              ? 0
              : Math.max(b.value > 0 ? 1 : 0, ((b.value ?? 0) / max) * 215)
          }
          rx="2"
          fill={sensor === "modis" ? "#9edce2" : "#f1bd8e"}
        />
        {b.value === null && (
          <text
            x={20 + ((i + 0.5) / n) * 960}
            y="260"
            fill="#8faaa1"
            fontSize="9"
            textAnchor="middle"
          >
            —
          </text>
        )}
      </g>
    ));
  }
  return (
    <>
      <Intro
        number="07"
        kicker="TWO WAYS OF SEEING"
        title="A different eye. A different count."
        total={model.count.value}
      >
        Slide between satellites on a shared time axis. Then put them side by
        side. More pixels does not mean more individual fires.
      </Intro>
      <section className="split-stage">
        <div className="split-totals">
          <div>
            <span>AQUA MODIS · 1 KM NOMINAL PIXELS</span>
            <Counter value={model.sensorCounts.modis} />
            <small>reported detections</small>
          </div>
          <button
            onClick={() => setTogether((v) => !v)}
            aria-pressed={together}
          >
            {together ? "Try the reveal slider" : "Compare together"}
            <Layers3 size={14} />
          </button>
          <div>
            <span>S-NPP VIIRS · 375 M NOMINAL PIXELS</span>
            <Counter value={model.sensorCounts.viirs} />
            <small>reported detections</small>
          </div>
        </div>
        <div className="split-chart">
          <svg
            viewBox="0 0 1000 290"
            preserveAspectRatio="none"
            role="img"
            aria-label="MODIS and VIIRS detections on a shared linear count scale"
          >
            <defs>
              <clipPath id="split-left">
                <rect width={divider * 10} height="290" />
              </clipPath>
              <clipPath id="split-right">
                <rect
                  x={divider * 10}
                  width={1000 - divider * 10}
                  height="290"
                />
              </clipPath>
            </defs>
            {[50, 120, 190, 265].map((y) => (
              <line
                key={y}
                x1="18"
                x2="982"
                y1={y}
                y2={y}
                stroke="#aec5bd18"
                strokeDasharray="3 5"
              />
            ))}
            <g clipPath={together ? undefined : "url(#split-left)"}>
              {bars(modis, "modis")}
            </g>
            <g clipPath={together ? undefined : "url(#split-right)"}>
              {bars(viirs, "viirs")}
            </g>
            {!together && (
              <line
                x1={divider * 10}
                x2={divider * 10}
                y1="12"
                y2="275"
                stroke="#f3e3c2"
                strokeWidth="1.5"
              />
            )}
          </svg>
          <span className="split-scale">
            SHARED COUNT SCALE · MAX {integer(max)}
          </span>
        </div>
        {!together && (
          <label className="split-slider">
            <span>MODIS</span>
            <input
              type="range"
              aria-label="Reveal satellite comparison"
              min="0"
              max="100"
              value={divider}
              onChange={(e) => setDivider(Number(e.target.value))}
            />
            <span>VIIRS</span>
          </label>
        )}
        <div
          className="split-periods"
          role="group"
          aria-label="Satellite comparison periods"
        >
          {modis.map((b, i) => (
            <button
              className="x-period"
              key={b.key}
              onClick={() => onSelect(b.key)}
              aria-label={`Explore ${bucketName(b)} · MODIS ${b.value === null ? "unavailable" : integer(b.value)} · VIIRS ${viirs[i]?.value === null ? "unavailable" : integer(viirs[i]?.value ?? 0)}`}
            >
              <strong>{b.label}</strong>
              <span>{b.value === null ? "—" : integer(b.value)}</span>
              <span>
                {viirs[i]?.value === null ? "—" : integer(viirs[i]?.value ?? 0)}
              </span>
            </button>
          ))}
        </div>
        <p className="exp-fine">
          Counts above share your time and geography. The main report metric
          follows your sensor filter; this comparison deliberately shows both
          sensors. Different resolution, passes, and observing effort affect
          reported counts. Neither is a count of unique fires.
        </p>
      </section>
    </>
  );
}

function Dispatch({ model, manifest, onSelect }: Props) {
  const [page, setPage] = useState(0),
    reduced = useReducedMotion();
  const pages = ["The year", "The places", "The eyes", "The moment"];
  const study =
    [...model.cases].sort(
      (a, b) =>
        (archiveCount(
          [b],
          model.selection.month ?? String(model.selection.year),
          model.selection.sensor,
        ).value ?? 0) -
        (archiveCount(
          [a],
          model.selection.month ?? String(model.selection.year),
          model.selection.sensor,
        ).value ?? 0),
    )[0] ?? manifest.cases[0];
  const geos = geoChildren[model.selection.geo];
  const max = Math.max(1, ...model.buckets.map((b) => b.value ?? 0));
  return (
    <section className="dispatch-experience">
      <div className="dispatch-masthead">
        <span>08 / AN INTERACTIVE FIELD JOURNAL</span>
        <strong>The Fire Dispatch</strong>
        <span>{model.label}</span>
      </div>
      <nav className="dispatch-page-nav" aria-label="Magazine chapters">
        {pages.map((name, i) => (
          <button
            key={name}
            className={page === i ? "active" : ""}
            aria-pressed={page === i}
            onClick={() => setPage(i)}
          >
            <span>0{i + 1}</span>
            {name}
          </button>
        ))}
      </nav>
      <div className="dispatch-page-area">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={page}
            className="dispatch-sheet"
            initial={{
              opacity: 0,
              x: reduced ? 0 : 45,
              rotateY: reduced ? 0 : 7,
            }}
            animate={{ opacity: 1, x: 0, rotateY: 0 }}
            exit={{
              opacity: 0,
              x: reduced ? 0 : -35,
              rotateY: reduced ? 0 : -5,
            }}
            transition={{ duration: reduced ? 0 : 0.4 }}
            drag={reduced ? false : "x"}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.12}
            onDragEnd={(_, info) => {
              if (Math.abs(info.offset.x) > 60)
                setPage((p) =>
                  Math.max(0, Math.min(3, p + (info.offset.x < 0 ? 1 : -1))),
                );
            }}
          >
            {page === 0 && (
              <div className="dispatch-cover">
                <div>
                  <span className="dispatch-kicker">
                    A CLOSER READING OF{" "}
                    {model.selection.record
                      ? "THE ARCHIVE"
                      : model.selection.year}
                  </span>
                  <h1>
                    {model.share >= 50
                      ? "A whole story.\nOne striking moment."
                      : "A year of signals.\nA pattern to find."}
                  </h1>
                  <p>
                    {model.peak?.value
                      ? `${bucketName(model.peak)} holds ${model.share}% of the detections in this chart.`
                      : "This selection has no reported detections."}{" "}
                    One satellite pixel can be one glimpse of a much larger
                    event.
                  </p>
                  <div className="dispatch-cover-count">
                    <Counter value={model.count.value} />
                    <span>
                      reported detections
                      <br />
                      in your selected lens
                    </span>
                  </div>
                  <button onClick={() => setPage(1)}>
                    Turn the page <ArrowRight size={17} />
                  </button>
                </div>
                <figure>
                  <img
                    src={`/assets/${study.image}`}
                    alt={`NASA archival imagery of ${study.name} on ${study.date}`}
                  />
                  <span className="dispatch-photo-stat">
                    {model.share}
                    <small>%</small>
                  </span>
                  <figcaption>
                    Archive imagery · {study.name} · {study.date}. Background
                    imagery does not change with your period filter.
                  </figcaption>
                </figure>
              </div>
            )}
            {page === 1 && (
              <div className="dispatch-places">
                <span className="dispatch-kicker">A STORY HAS A SETTING</span>
                <h1>Place changes the picture.</h1>
                <p>
                  Your lens is {geoNames[model.selection.geo]}. These are
                  selected study boundaries, not whole-country totals.
                </p>
                <div>
                  {(geos.length ? geos : [model.selection.geo]).map((geo) => (
                    <button
                      key={geo}
                      disabled={!geos.length}
                      onClick={() => model.selectGeo(geo)}
                    >
                      <span>{geoNames[geo]}</span>
                      <strong>
                        {model.geoCount(geo).value === null
                          ? "Open available record"
                          : `${integer(model.geoCount(geo).value!)} detections`}
                      </strong>
                      <ArrowUpRight size={22} />
                    </button>
                  ))}
                </div>
                <img src={`/assets/${study.image}`} alt="" />
                <small>
                  Archival {study.name} imagery · {study.date} · a
                  representative study image, not a map.
                </small>
              </div>
            )}
            {page === 2 && (
              <div className="dispatch-eyes">
                <span className="dispatch-kicker">
                  THE SAME WORLD, TWO DIFFERENT EYES
                </span>
                <h1>
                  More pixels.
                  <br />
                  The same question.
                </h1>
                <p>
                  A fire can be observed across many pixels and satellite
                  passes. Different sensors return different counts. Neither
                  count tells us how many unique fires burned.
                </p>
                <div>
                  {(["modis", "viirs"] as const).map((sensor) => (
                    <button
                      key={sensor}
                      className={
                        model.selection.sensor === sensor ? "active" : ""
                      }
                      aria-pressed={model.selection.sensor === sensor}
                      onClick={() => model.update({ sensor })}
                    >
                      <Satellite size={27} />
                      <span>
                        {sensor === "modis" ? "Aqua MODIS" : "S-NPP VIIRS"}
                      </span>
                      <Counter value={model.sensorCounts[sensor]} />
                      <small>
                        {sensor === "modis" ? "1 km" : "375 m"} nominal pixels ·
                        reported detections
                      </small>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {page === 3 && (
              <div className="dispatch-moment">
                <span className="dispatch-kicker">THE DETAIL IS THE STORY</span>
                <h1>Pull the thread.</h1>
                <p>
                  {model.label}. Choose a {model.resolution} to discover the
                  finer record. Acquisition hours are in UTC.
                </p>
                <div className="dispatch-lollipop">
                  {model.buckets.map((b) => (
                    <button
                      key={b.key}
                      className="x-period"
                      onClick={() => onSelect(b.key)}
                      aria-label={`Explore ${bucketName(b)} · ${readout(b)}`}
                    >
                      <span
                        style={{
                          height: `${((b.value ?? 0) / max) * 160 + 4}px`,
                        }}
                      >
                        <i />
                      </span>
                      <strong>{b.label}</strong>
                      <small>{b.value === null ? "—" : integer(b.value)}</small>
                    </button>
                  ))}
                </div>
                <div className="dispatch-closeup">
                  <span>
                    {model.peak ? bucketName(model.peak) : "No reported peak"}
                  </span>
                  <strong>{model.share}%</strong>
                  <button
                    disabled={!model.peak?.value}
                    onClick={() => model.peak && onSelect(model.peak.key)}
                  >
                    Open the standout <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="dispatch-pagination">
        <button onClick={() => setPage((p) => p - 1)} disabled={page === 0}>
          <ChevronLeft size={17} /> Previous page
        </button>
        <span>
          {String(page + 1).padStart(2, "0")} / 04 · {pages[page]}
        </span>
        <button onClick={() => setPage((p) => p + 1)} disabled={page === 3}>
          Turn the page <ChevronRight size={17} />
        </button>
      </div>
    </section>
  );
}

function Symphony({ model, onSelect, paused }: Props) {
  const [active, setActive] = useState(
      Math.max(
        0,
        model.buckets.findIndex((b) => b.key === model.peak?.key),
      ),
    ),
    [playing, setPlaying] = useState(false),
    [sound, setSound] = useState(false),
    [strike, setStrike] = useState(0),
    [bpm, setBpm] = useState(90),
    [audioError, setAudioError] = useState("");
  const ctx = useRef<AudioContext | null>(null),
    reduced = useReducedMotion(),
    signature = model.buckets.map((b) => b.key).join(",");
  const bucket = model.buckets[active] ?? model.peak,
    max = Math.max(1, ...model.buckets.map((b) => b.value ?? 0));
  useEffect(() => {
    setActive(
      Math.max(
        0,
        model.buckets.findIndex((b) => b.key === model.peak?.key),
      ),
    );
    setPlaying(false);
  }, [signature]);
  useEffect(() => {
    if (!playing || paused || reduced || !model.buckets.length) return;
    const id = setInterval(() => {
      setActive((i) => (i + 1) % model.buckets.length);
      setStrike((n) => n + 1);
    }, 60000 / bpm);
    return () => clearInterval(id);
  }, [playing, paused, reduced, model.buckets.length, bpm]);
  useEffect(() => {
    const stop = () => {
      if (document.hidden) setPlaying(false);
    };
    document.addEventListener("visibilitychange", stop);
    return () => document.removeEventListener("visibilitychange", stop);
  }, []);
  useEffect(
    () => () => {
      void ctx.current?.close();
      ctx.current = null;
    },
    [],
  );
  useEffect(() => {
    if (
      !sound ||
      !bucket?.value ||
      !ctx.current ||
      ctx.current.state !== "running"
    )
      return;
    const audio = ctx.current,
      osc = audio.createOscillator(),
      gain = audio.createGain(),
      now = audio.currentTime;
    osc.type = "sine";
    osc.frequency.value =
      130.81 * Math.pow(2, Math.round(Math.sqrt(bucket.value / max) * 24) / 12);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.025, now + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
    osc.connect(gain);
    gain.connect(audio.destination);
    osc.start(now);
    osc.stop(now + 0.38);
    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
    };
  }, [active, sound, bucket?.value, max, strike]);
  async function toggleSound() {
    try {
      if (sound) {
        setSound(false);
        await ctx.current?.suspend();
        return;
      }
      if (typeof AudioContext === "undefined") {
        setAudioError(
          "Audio is unavailable here; the visual instrument still works.",
        );
        return;
      }
      if (!ctx.current) ctx.current = new AudioContext();
      await ctx.current.resume();
      setSound(true);
      setAudioError("");
    } catch {
      setAudioError("Audio could not start. Keep exploring the visual pads.");
    }
  }
  return (
    <>
      <Intro
        number="09"
        kicker="SIGNAL SYMPHONY"
        title="Play the shape of a year."
        total={model.count.value}
      >
        Each pad is a real period. Tap its count, follow the rhythm, or switch
        on sound to hear the differences.
      </Intro>
      <section className="symphony-console">
        <div className="symphony-top">
          <div>
            <AudioLines size={18} />
            <span>THE RECORD, REIMAGINED AS AN INSTRUMENT</span>
          </div>
          <button onClick={toggleSound} aria-pressed={sound}>
            {sound ? <Volume2 size={16} /> : <VolumeX size={16} />}Sound{" "}
            {sound ? "on" : "off"}
          </button>
        </div>
        <div className="symphony-readout">
          <div>
            <span>{playing ? "PLAYING" : "PREVIEWING"}</span>
            <h3>{bucket ? bucketName(bucket) : "No source data"}</h3>
          </div>
          <div>
            <Counter value={bucket?.value ?? null} />
            <span>reported detections</span>
          </div>
          <button
            disabled={!bucket || bucket.value === null}
            onClick={() => bucket && onSelect(bucket.key)}
          >
            Enter this {model.resolution}
            <ArrowUpRight size={18} />
          </button>
        </div>
        <div
          className="symphony-pads"
          role="group"
          aria-label="Detection instrument pads"
        >
          {model.buckets.map((b, i) => (
            <button
              key={b.key}
              className={`x-period symphony-pad ${active === i ? "active" : ""} ${b.value === null ? "missing" : ""}`}
              aria-label={`Preview ${bucketName(b)} · ${readout(b)}`}
              aria-pressed={active === i}
              style={
                {
                  "--pad-intensity": (b.value ?? 0) / max,
                } as React.CSSProperties
              }
              onClick={() => {
                setActive(i);
                setStrike((n) => n + 1);
                setPlaying(false);
              }}
              onKeyDown={(e) => {
                const offset =
                  e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
                if (offset) {
                  e.preventDefault();
                  e.currentTarget.parentElement
                    ?.querySelectorAll<HTMLButtonElement>("button")
                    [
                      Math.max(
                        0,
                        Math.min(model.buckets.length - 1, i + offset),
                      )
                    ]?.focus();
                }
              }}
            >
              <span>{String(i + 1).padStart(2, "0")}</span>
              <strong>
                {b.label}
                {model.resolution === "hour" ? "h" : ""}
              </strong>
              <small>{b.value === null ? "—" : integer(b.value)}</small>
              <i />
            </button>
          ))}
        </div>
        <div className="symphony-transport">
          <button
            className="symphony-play"
            disabled={paused || !!reduced || !model.buckets.length}
            onClick={() => setPlaying((v) => !v)}
            aria-pressed={playing}
            aria-label={
              playing ? "Pause signal sequence" : "Play signal sequence"
            }
          >
            {playing ? (
              <Pause size={17} />
            ) : (
              <Play size={17} fill="currentColor" />
            )}
            {playing ? "Pause" : "Play the record"}
          </button>
          <label>
            Tempo
            <select
              aria-label="Sequence tempo"
              value={bpm}
              onChange={(e) => setBpm(Number(e.target.value))}
            >
              <option value={60}>60 BPM</option>
              <option value={90}>90 BPM</option>
            </select>
          </label>
          <span>
            {active + 1} / {model.buckets.length} periods
          </span>
        </div>
        <p className="exp-fine">
          Sound starts only when you turn it on. Higher notes represent larger
          reported counts, normalized to the current chart’s maximum. Zero and
          missing counts produce no note; silence does not establish no fire.
          Sound is a data illustration, not a recording of fire. {audioError}
        </p>
      </section>
    </>
  );
}

export default function Experiments(props: Props) {
  const { model, id } = props;
  const missing = model.count.value === null && !model.busy;
  return (
    <div className={`new-experiment experiment-${id}`}>
      {model.selection.hour && (
        <p className="exp-hour-context">
          The charts show the surrounding day, {model.selection.day}, in 24 UTC
          hours. Your current metrics follow the selected hour,{" "}
          {model.selection.hour.slice(11)}:00–{model.selection.hour.slice(11)}
          :59 UTC.
        </p>
      )}
      {missing ? (
        <div className="exp-empty">
          <Satellite size={30} />
          <h2>A gap in this view.</h2>
          <p>
            There is no selected-sensor source data for this period. Missing
            data is not zero fire activity.
          </p>
          <button
            className="x-primary"
            onClick={() => model.update({ sensor: "modis" })}
          >
            Try MODIS <ArrowRight size={15} />
          </button>
        </div>
      ) : (
        <>
          {id === "mosaic" && <Mosaic {...props} />}{" "}
          {id === "tapestry" && <Loom {...props} />}{" "}
          {id === "sculpture" && <Sculpture {...props} />}{" "}
          {id === "split" && <SensorSplit {...props} />}{" "}
          {id === "dispatch" && <Dispatch {...props} />}{" "}
          {id === "sequencer" && <Symphony {...props} />}
        </>
      )}
      {model.busy && (
        <div className="exp-fetch-overlay" role="status">
          <LoaderCircle size={23} /> Opening the next layer…
        </div>
      )}
      {model.failed && (
        <div className="exp-error" role="alert">
          This detailed file could not load.
          <button onClick={model.retry}>Retry detail</button>
        </div>
      )}
    </div>
  );
}

import { ArrowUpRight, Database, FileCheck2 } from "lucide-react";
import { useState } from "react";
import type { Manifest } from "./data";
import { dateLabel, integer, timeLabel } from "./data";
export default function Sources({ manifest }: { manifest: Manifest }) {
  const [query, setQuery] = useState("");
  const [all, setAll] = useState(false);
  const matching = manifest.sources.filter((s) =>
    s.file.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <div className="sources-view">
      <div className="page-heading">
        <div>
          <span className="eyebrow">DATA & PROVENANCE</span>
          <h1>
            Follow every number<span>.</span>
          </h1>
          <p>
            Public NASA observations, original processing labels, and a
            reproducible snapshot.
          </p>
        </div>
      </div>
      <div className="source-overview">
        <Database size={27} />
        <div>
          <h2>NASA Fire Information for Resource Management System</h2>
          <p>
            The global snapshot contains {manifest.globalSensor} detections.
            Historical cases use Aqua MODIS and S-NPP VIIRS.
          </p>
          <a
            href="https://firms.modaps.eosdis.nasa.gov/"
            target="_blank"
            rel="noreferrer"
          >
            Visit NASA FIRMS <ArrowUpRight size={14} />
          </a>
        </div>
      </div>
      <div className="source-facts">
        <div>
          <span className="eyebrow">GLOBAL SNAPSHOT</span>
          <strong>{dateLabel(manifest.snapshotEnd)}</strong>
          <small>Last acquisition {timeLabel(manifest.snapshotEnd)}</small>
        </div>
        <div>
          <span className="eyebrow">OBSERVATIONS</span>
          <strong>{integer(manifest.globalCount)}</strong>
          <small>
            {manifest.globalSensorCounts?.MODIS !== undefined &&
            manifest.globalSensorCounts["NOAA-20"] !== undefined
              ? `${integer(manifest.globalSensorCounts.MODIS)} Aqua MODIS · ${integer(manifest.globalSensorCounts["NOAA-20"])} NOAA-20 VIIRS`
              : manifest.globalSensor}
          </small>
        </div>
        <div>
          <span className="eyebrow">SOURCE FILES</span>
          <strong>{manifest.sources.length}</strong>
          <small>Checksum-pinned in the bundle</small>
        </div>
      </div>
      <div className="source-rules">
        <h2>How to read the record</h2>
        <dl>
          {manifest.globalSensorCounts?.MODIS !== undefined && (
            <div>
              <dt>Global snapshot window</dt>
              <dd>
                Aqua MODIS is filtered to the first and last acquisition times
                of the pinned NOAA-20 VIIRS snapshot, inclusive. The satellites
                have different overpasses and observing conditions. The point
                counts are raw observations.
              </dd>
            </div>
          )}
          <div>
            <dt>Reported detections</dt>
            <dd>
              Satellite pixels with a detected thermal anomaly. Multiple pixels
              may belong to the same event; some sources are industrial or
              volcanic.
            </dd>
          </div>
          <div>
            <dt>Zero and missing</dt>
            <dd>
              Zero reported rows does not certify a clear observation without
              fire. Coverage remains unknown until original masks and QA
              establish the opportunity to observe.
            </dd>
          </div>
          <div>
            <dt>Confidence</dt>
            <dd>
              MODIS uses its original numeric confidence. VIIRS uses low,
              nominal and high categories. These are sensor quality flags, not
              model accuracy probabilities.
            </dd>
          </div>
          <div>
            <dt>Fire radiative power</dt>
            <dd>
              Measured radiant power in megawatts at observation time. Summing
              repeat detections does not yield the event’s total energy.
            </dd>
          </div>
          <div>
            <dt>Imagery</dt>
            <dd>
              Regional scenes are dated Aqua MODIS daily composites from NASA
              GIBS. The globe uses NASA GIBS Blue Marble background imagery.
              Dated scenes are reprojected to Web Mercator for the continuous
              map. Background imagery does not establish exact acquisition-time
              alignment.{" "}
              <a
                href="/assets/map-context/provenance.json"
                target="_blank"
                rel="noreferrer"
              >
                Map asset checksums and sources
              </a>{" "}
              include the pinned NASA tiles and public-domain Natural Earth
              place labels.
            </dd>
          </div>
          <div>
            <dt>Monthly estimates</dt>
            <dd>
              Seasonal scaling and LightGBM predict monthly VIIRS counts from
              MODIS, season and location. Each overlap year is excluded from its
              own prediction; older years use the full fit.{" "}
              <a href="/data/monthly-harmonization.json" download>
                Download predictions and year-fold scores
              </a>
              . Estimates are experimental archive counts, without cloud or
              overpass normalization.
            </dd>
          </div>
          <div>
            <dt>History</dt>
            <dd>
              Collections and processing versions remain visible. Older country
              exports may differ from the collection required for calibrated
              analysis.
            </dd>
          </div>
          <div>
            <dt>Analysis boundaries</dt>
            <dd>
              Case rectangles and wider scene bounds use records from every
              intersecting source country. Border observations remain in the
              spatial count. Bounds include their western and southern edges and
              exclude their eastern and northern edges.
            </dd>
          </div>
          <div>
            <dt>Offline rehearsal</dt>
            <dd>
              The production app saves the global snapshot, the three featured
              case months, calendar summaries, science reports and scene imagery
              locally. The footer confirms when the bundle is ready. Other
              months are saved after viewing them online.
            </dd>
          </div>
        </dl>
      </div>
      <div className="section-heading">
        <h2>Source manifest</h2>
        <a className="text-button" href="/data/manifest.json" download>
          Download provenance <FileCheck2 size={15} />
        </a>
      </div>
      <div className="source-search">
        <input
          aria-label="Filter source files"
          placeholder="Filter by country, year or sensor…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <span className="mono">{matching.length} FILES</span>
        <a href="/assets/assets-manifest.json" target="_blank" rel="noreferrer">
          Imagery credits ↗
        </a>
        <a href="/data/coverage.json" target="_blank" rel="noreferrer">
          Fire-mask provenance ↗
        </a>
      </div>
      <div className="source-file-list">
        {(all || query ? matching : matching.slice(0, 12)).map((s) => (
          <a key={s.file} href={s.url} target="_blank" rel="noreferrer">
            <FileCheck2 size={17} />
            <div>
              <strong>{s.file}</strong>
              <span className="mono">SHA256 {s.sha256}</span>
            </div>
            <small>{(s.bytes / 1e6).toFixed(2)} MB</small>
            <ArrowUpRight size={14} />
          </a>
        ))}
      </div>
      {!query && matching.length > 12 && (
        <button
          className="source-expand text-button"
          onClick={() => setAll((v) => !v)}
        >
          {all
            ? "Show fewer sources"
            : `Show all ${matching.length} source files`}{" "}
          <ArrowUpRight size={14} />
        </button>
      )}
      <div className="source-footer mono">
        BUNDLE {manifest.bundleVersion} · BUILT {manifest.builtAt}
        <br />
        NASA SPACE APPS PROJECT · ADDITIONAL CONTEXT CREDITED TO COPERNICUS EMS
        AND NASA EARTH OBSERVATORY
      </div>
    </div>
  );
}

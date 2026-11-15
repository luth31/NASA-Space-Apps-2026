import { ArrowUpRight } from "lucide-react";
import type { CaseStudy } from "./data";
import { dateLabel, integer } from "./data";

export default function Investigations({
  cases,
  onCase,
}: {
  cases: CaseStudy[];
  onCase: (study: CaseStudy) => void;
}) {
  return (
    <section className="investigations-page">
      <p className="eyebrow">HISTORICAL INVESTIGATIONS</p>
      <h1>From a signal to its context.</h1>
      <p>
        Explore {cases.length} documented fire landscapes with dated NASA
        imagery, original satellite readings, official reports, and a monthly
        observation archive.
      </p>
      <div className="investigation-cards">
        {cases.map((study) => (
          <button key={study.id} onClick={() => onCase(study)}>
            <img
              src={`/assets/${study.image}`}
              alt={`NASA Aqua MODIS daily composite of ${study.name} on ${dateLabel(study.date)}`}
            />
            <div>
              <span>
                {study.country} · {dateLabel(study.date)}
              </span>
              <h2>
                {study.name}
                <ArrowUpRight size={23} />
              </h2>
              <p>{study.description}</p>
              <small>
                {integer(study.rawCount)} archived detections ·{" "}
                {study.years.length}{" "}
                {study.years.length === 1 ? "year" : "years"}
              </small>
            </div>
          </button>
        ))}
      </div>
      <p className="mission-note">
        These cases were selected for feasibility and demonstration. They are
        not a representative global validation sample. All calendar counts
        retain their original sensor.
      </p>
    </section>
  );
}

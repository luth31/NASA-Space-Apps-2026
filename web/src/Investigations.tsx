import { ArrowUpRight } from "lucide-react";
import type { CaseStudy } from "./data";
import { dateLabel, integer } from "./data";
import "./investigations-compact.css";

export default function Investigations({
  cases,
  onCase,
}: {
  cases: CaseStudy[];
  onCase: (study: CaseStudy) => void;
}) {
  return (
    <section className="investigations-page investigations-compact">
      <header className="investigations-heading">
        <div>
          <span className="eyebrow">HISTORICAL INVESTIGATIONS</span>
          <h1>Every fire has a story.</h1>
        </div>
        <p>
          {cases.length} landscapes · satellite readings, monthly records &
          official reports
        </p>
      </header>
      <div className="compact-case-grid">
        {cases.map((study, index) => (
          <button
            className="compact-case-card"
            key={study.id}
            onClick={() => onCase(study)}
          >
            <div className="compact-case-image">
              <img
                src={`/assets/${study.image}`}
                alt={`NASA Aqua MODIS daily composite of ${study.name} on ${dateLabel(study.date)}`}
              />
              <span className="compact-case-number">0{index + 1}</span>
              <span className="compact-case-date">{dateLabel(study.date)}</span>
              <span className="compact-case-source">NASA Aqua · MODIS</span>
            </div>
            <div className="compact-case-copy">
              <span className="compact-case-country">{study.country}</span>
              <h2>
                {study.name}
                <ArrowUpRight size={21} aria-hidden="true" />
              </h2>
              <div className="compact-case-stats">
                <span>
                  <strong>{integer(study.rawCount)}</strong> detections
                </span>
                <span>
                  {study.years.length}{" "}
                  {study.years.length === 1 ? "year" : "years"} archived
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

import "./orbital/mission.css";

export type Destination =
  | "dashboard"
  | "explore"
  | "investigations"
  | "calendar"
  | "methods"
  | "sources";
const destinations: [Destination, string][] = [
  ["dashboard", "Dashboard"],
  ["explore", "Explore"],
  ["investigations", "Investigations"],
  ["calendar", "Fire calendar"],
  ["methods", "Models & validation"],
  ["sources", "Data & sources"],
];

export default function Navigation({
  active,
  onNavigate,
  online = true,
}: {
  online?: boolean;
  active: Destination;
  onNavigate: (view: Destination) => void;
}) {
  return (
    <header className="mission-header">
      <button
        className="mission-brand"
        onClick={() => onNavigate("dashboard")}
        aria-label="PyroBridge dashboard"
      >
        <span className="mission-brand-mark" aria-hidden="true" />
        pyrobridge
      </button>
      <nav aria-label="Main navigation">
        {destinations.map(([view, name]) => (
          <button
            key={view}
            className={active === view ? "active" : ""}
            aria-current={active === view ? "page" : undefined}
            onClick={() => onNavigate(view)}
          >
            {name}
          </button>
        ))}
      </nav>
      <span className="mission-status">
        <i />
        {online ? "NASA observations" : "Offline observations"}
      </span>
    </header>
  );
}

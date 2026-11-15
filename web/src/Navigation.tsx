import { useEffect, useRef } from "react";

export type Destination =
  | "dashboard"
  | "explore"
  | "investigations"
  | "report"
  | "calendar"
  | "methods"
  | "sources";
const destinations: [Destination, string][] = [
  ["dashboard", "Dashboard"],
  ["investigations", "Investigations"],
  ["report", "Report"],
  ["calendar", "Calendar"],
  ["methods", "Models"],
  ["sources", "Sources"],
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
  const nav = useRef<HTMLElement>(null);
  const current = active === "explore" ? "dashboard" : active;
  useEffect(() => {
    const activeButton = nav.current?.querySelector<HTMLElement>(
      '[aria-current="page"]',
    );
    if (
      nav.current &&
      activeButton &&
      nav.current.scrollWidth > nav.current.clientWidth
    ) {
      nav.current.scrollLeft = Math.max(
        0,
        activeButton.offsetLeft - nav.current.offsetLeft - 14,
      );
    }
  }, [active]);
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
      <nav ref={nav} aria-label="Main navigation">
        {destinations.map(([view, name]) => (
          <button
            key={view}
            className={current === view ? "active" : ""}
            aria-current={current === view ? "page" : undefined}
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

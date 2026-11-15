import { describe, expect, it } from "vitest";
import { offlineStatusMatches } from "./offline-status";

describe("offline readiness identity", () => {
  it("accepts the completed current app and data bundle on first install", () => {
    expect(
      offlineStatusMatches(
        { ready: true, version: "data-1", buildId: "app-new" },
        "data-1",
        "app-new",
      ),
    ).toBe(true);
  });
  it("rejects an old worker after a frontend-only upgrade", () => {
    expect(
      offlineStatusMatches(
        { ready: true, version: "data-1", buildId: "app-old" },
        "data-1",
        "app-new",
      ),
    ).toBe(false);
    expect(
      offlineStatusMatches(
        { ready: true, version: "data-1" },
        "data-1",
        "app-new",
      ),
    ).toBe(false);
  });
  it("rejects missing identities, a changed data bundle, and incomplete caching", () => {
    expect(offlineStatusMatches({ ready: true }, undefined, undefined)).toBe(
      false,
    );
    expect(
      offlineStatusMatches(
        { ready: true, version: "data-old", buildId: "app-new" },
        "data-1",
        "app-new",
      ),
    ).toBe(false);
    expect(
      offlineStatusMatches(
        { ready: false, version: "data-1", buildId: "app-new" },
        "data-1",
        "app-new",
      ),
    ).toBe(false);
  });
});

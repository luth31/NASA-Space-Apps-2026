import { describe, expect, it, vi } from "vitest";
import { runInNewContext } from "node:vm";
import { createServiceWorker } from "./service-worker.mjs";

function worker({
  upgrading = false,
  failure = false,
  pendingNavigation = false,
} = {}) {
  const events = new Map();
  const calls = [];
  const stores = new Map(upgrading ? [["pyrobridge-old", new Map()]] : []);
  const pages = [
    "http://localhost:4188/",
    "http://localhost:4188/?phone-review",
  ].map((url) => ({
    url,
    navigate: vi.fn(() => {
      calls.push("navigate:" + url);
      return pendingNavigation ? new Promise(() => {}) : Promise.resolve();
    }),
    postMessage: vi.fn(),
  }));
  const self = {
    location: { origin: "http://localhost:4188" },
    registration: { scope: "http://localhost:4188/" },
    addEventListener: (name, handler) => events.set(name, handler),
    skipWaiting: vi.fn(async () => calls.push("activate-ready")),
    clients: {
      claim: vi.fn(async () => calls.push("claim")),
      matchAll: vi.fn(async () => pages),
    },
  };
  const caches = {
    open: async (name) => {
      if (!stores.has(name)) stores.set(name, new Map());
      const store = stores.get(name);
      return {
        put: async (key, response) => {
          store.set(key, response);
          calls.push("cache:" + key);
        },
        match: async (key) => store.get(key),
      };
    },
    keys: async () => [...stores.keys()],
    delete: async (key) => {
      calls.push("delete:" + key);
      return stores.delete(key);
    },
  };
  runInNewContext(
    createServiceWorker({
      cacheName: "pyrobridge-new",
      bundleVersion: "same-data-new-ui",
      urls: ["/index.html", "/assets/blue.css"],
    }),
    {
      self,
      caches,
      URL,
      Request: class {
        constructor(url) {
          this.url = url;
        }
      },
      fetch: async (request) => ({
        ok: !(failure && request.url.endsWith("blue.css")),
        clone() {
          return this;
        },
      }),
    },
  );
  const dispatch = async (name, details = {}) => {
    let pending;
    events.get(name)({
      ...details,
      waitUntil: (value) => {
        pending = value;
      },
    });
    await pending;
  };
  return { dispatch, self, pages, stores, calls };
}

describe("production preview upgrades", () => {
  it("activates a completely cached update even while older app tabs stay open", async () => {
    const app = worker({ upgrading: true });
    await app.dispatch("install");
    expect(app.self.skipWaiting).toHaveBeenCalledOnce();
    expect(app.calls.at(-1)).toBe("activate-ready");
    expect(app.stores.get("pyrobridge-new").size).toBe(3);
  });
  it("reloads every existing app tab onto the new complete bundle", async () => {
    const app = worker({ upgrading: true });
    await app.dispatch("install");
    await app.dispatch("activate");
    for (const page of app.pages)
      expect(page.navigate).toHaveBeenCalledWith(page.url);
    expect(app.calls.indexOf("claim")).toBeLessThan(
      app.calls.indexOf("navigate:" + app.pages[0].url),
    );
    expect(app.stores.has("pyrobridge-old")).toBe(false);
  });
  it("finishes activation while replacement navigations wait for the worker", async () => {
    const app = worker({ upgrading: true, pendingNavigation: true });
    await app.dispatch("install");
    const result = await Promise.race([
      app.dispatch("activate").then(() => "activated"),
      new Promise((resolve) => setTimeout(() => resolve("blocked"), 30)),
    ]);
    expect(result).toBe("activated");
  });
  it("does not reload a first visit or interrupt offline caching", async () => {
    const app = worker();
    await app.dispatch("install");
    await app.dispatch("activate");
    for (const page of app.pages) expect(page.navigate).not.toHaveBeenCalled();
    expect(app.self.clients.claim).toHaveBeenCalledOnce();
  });
  it("keeps the old version active if a new core asset is unavailable", async () => {
    const app = worker({ upgrading: true, failure: true });
    await expect(app.dispatch("install")).rejects.toThrow(
      "Offline asset unavailable",
    );
    expect(app.self.skipWaiting).not.toHaveBeenCalled();
    expect(app.stores.has("pyrobridge-old")).toBe(true);
    for (const page of app.pages) expect(page.navigate).not.toHaveBeenCalled();
  });
});

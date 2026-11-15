import { readdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { createServiceWorker } from "./service-worker.mjs";

const root = fileURLToPath(new URL("../dist/", import.meta.url));
const manifest = JSON.parse(
  await readFile(path.join(root, "data/manifest.json"), "utf8"),
);
async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (
    await Promise.all(
      entries.map((e) =>
        e.isDirectory()
          ? walk(path.join(directory, e.name))
          : path.join(directory, e.name),
      ),
    )
  ).flat();
}
const assets = (await walk(path.join(root, "assets"))).map(
  (file) => "/" + path.relative(root, file),
);
const selected = manifest.cases
  .flatMap((c) => [
    `/context/${c.id}/${c.date.slice(0, 7)}.json`,
    `/observations/${c.id}/${c.date.slice(0, 7)}.json`,
    `/scenes/${c.id}.json`,
  ])
  .map((file) => "/data" + file);
const urls = [
  "/index.html",
  "/favicon.svg",
  "/data/manifest.json",
  "/data/global.json",
  "/data/models.json",
  "/data/monthly-harmonization.json",
  "/data/held-out-predictions.json",
  "/data/coverage.json",
  "/data/release.json",
  "/data/schema.json",
  ...selected,
  ...assets,
];
const hash = createHash("sha256");
let bytes = 0;
for (const url of urls) {
  const content = await readFile(path.join(root, url));
  bytes += content.length;
  hash.update(url).update(content);
}
const cacheName = "pyrobridge-" + hash.digest("hex").slice(0, 16);
const offline = {
  bundleVersion: manifest.bundleVersion,
  cacheName,
  bytes,
  files: urls.length,
  scope:
    "Global snapshot, three featured case months, complete calendar summaries, methods, provenance and local imagery. Additional month partitions are cached when viewed online.",
};
await writeFile(path.join(root, "offline.json"), JSON.stringify(offline));
const worker = createServiceWorker({
  cacheName,
  bundleVersion: manifest.bundleVersion,
  urls,
});
await writeFile(path.join(root, "service-worker.js"), worker);
console.log(
  `Offline rehearsal bundle: ${urls.length + 1} files, ${(bytes / 1e6).toFixed(1)} MB. Other months cache on first use.`,
);

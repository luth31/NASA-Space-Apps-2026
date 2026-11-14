import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";

const observations = await readFile(
  new URL("../public/data/global.json", import.meta.url),
);
const geography = JSON.parse(
  await readFile(
    new URL("../src/orbital/map-units.json", import.meta.url),
    "utf8",
  ),
);
const hash = createHash("sha256").update(observations).digest("hex");
if (hash !== geography.observationSha256) {
  throw new Error(
    "Atlas geography belongs to a different observation snapshot. From the repository root run: uv run --no-project --with shapely python web/scripts/build-geography.py",
  );
}
console.log("Atlas geography matches the pinned observation snapshot.");

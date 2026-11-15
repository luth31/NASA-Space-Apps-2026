"""Reproduce map context. Run: uv run --with pillow python web/scripts/build-map-context.py.

No imagery is synthesized. Dated EPSG:4326 NASA browse images are resampled
to Web Mercator so a MapLibre image source aligns with geographic detections.
"""

import concurrent.futures
import json
import math
from hashlib import sha256
from pathlib import Path
from urllib.request import urlopen

import numpy as np
from PIL import Image
from scipy.ndimage import map_coordinates

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "public/assets"
OUT = ASSETS / "map-context"
GIBS = "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/BlueMarble_NextGeneration/default/GoogleMapsCompatible_Level8"
PLACES = "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_10m_populated_places_simple.geojson"


def mercator(latitude):
    return math.asinh(math.tan(math.radians(latitude)))


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    manifest = json.loads((ROOT / "public/data/manifest.json").read_text())
    records = []
    tiles = {(z, y, x) for z in range(4) for y in range(2**z) for x in range(2**z)}
    for study in manifest["cases"]:
        source = ASSETS / study["image"]
        pixels = np.asarray(Image.open(source).convert("RGB"))
        height, width = pixels.shape[:2]
        west, south, east, north = study["sceneBounds"]
        # Destination pixel centers, then inverse project to source pixel centers.
        y = mercator(north) - (np.arange(height) + .5) / height * (mercator(north) - mercator(south))
        latitude = np.degrees(np.arctan(np.sinh(y)))
        source_y = (north - latitude) / (north - south) * height - .5
        yy, xx = np.meshgrid(source_y, np.arange(width), indexing="ij")
        projected = np.stack([map_coordinates(pixels[:, :, c], [yy, xx], order=1, mode="nearest") for c in range(3)], axis=-1)
        target = OUT / f"{study['id']}-mercator.jpg"
        Image.fromarray(projected).save(target, quality=92)
        records.append({"file": target.name, "sourceFile": study["image"], "sourceSha256": sha256(source.read_bytes()).hexdigest(), "sha256": sha256(target.read_bytes()).hexdigest(), "crs": "EPSG:3857", "geographicBounds": study["sceneBounds"], "resampling": "bilinear; outer bounds preserved", "date": study["date"]})
        # A one-tile buffer around each featured scene supports offline camera motion.
        for z in range(4, 9):
            size = 2**z
            x0, x1 = [int((lon + 180) / 360 * size) for lon in (west, east)]
            y0, y1 = [int((1 - mercator(lat) / math.pi) / 2 * size) for lat in (north, south)]
            tiles.update((z, y, x) for y in range(max(0, y0-1), min(size, y1+2)) for x in range(max(0, x0-1), min(size, x1+2)))

    def tile(item):
        z, y, x = item
        path = ASSETS / "basemap" / f"{z}/{y}/{x}.jpeg"
        if not path.exists():
            path.parent.mkdir(parents=True, exist_ok=True)
            with urlopen(f"{GIBS}/{z}/{y}/{x}.jpeg", timeout=45) as response:
                content = response.read()
            if not content.startswith(b"\xff\xd8"):
                raise ValueError("Expected a JPEG tile")
            path.write_bytes(content)
        return {"key": f"{z}/{y}/{x}", "sha256": sha256(path.read_bytes()).hexdigest(), "bytes": path.stat().st_size}

    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
        tile_records = list(pool.map(tile, sorted(tiles)))
    with urlopen(PLACES, timeout=60) as response:
        source = response.read()
    places = [{"name": f["properties"]["name"], "point": f["geometry"]["coordinates"], "rank": f["properties"]["scalerank"]} for f in json.loads(source)["features"]]
    places.sort(key=lambda p: (p["rank"], p["name"]))
    (OUT / "places.json").write_text(json.dumps(places, separators=(",", ":")) + "\n")
    provenance = {"imagery": records, "basemap": {"sourceTemplate": GIBS + "/{z}/{y}/{x}.jpeg", "credit": "NASA GIBS Blue Marble Next Generation", "tiles": tile_records}, "places": {"source": PLACES, "sourceSha256": sha256(source).hexdigest(), "credit": "Natural Earth v5.1.2, public domain", "count": len(places), "note": "Selected settlements for orientation; not an exhaustive gazetteer."}}
    (OUT / "provenance.json").write_text(json.dumps(provenance, indent=2) + "\n")
    (ROOT / "src/orbital/cached-tiles.json").write_text(json.dumps([t["key"] for t in tile_records], separators=(",", ":")) + "\n")
    print(f"{len(tile_records)} pinned background tiles, {sum(t['bytes'] for t in tile_records)/1e6:.2f} MB; {len(places)} place labels; 3 reprojected scenes")


if __name__ == "__main__":
    main()

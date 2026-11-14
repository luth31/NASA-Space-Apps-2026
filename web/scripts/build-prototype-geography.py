"""Generate local prototype geography and point assignments.

Run from the repository root:
    uv run --no-project --with shapely python web/scripts/build-prototype-geography.py
"""

import json
from pathlib import Path
from urllib.request import urlopen

import shapely
from shapely.geometry import MultiPolygon, shape
from shapely.geometry.polygon import orient

SOURCE = (
    "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/"
    "v5.1.2/geojson/ne_50m_admin_0_map_units.geojson"
)
ROOT = Path(__file__).resolve().parents[1]


def rounded_coordinates(value):
    if isinstance(value[0], (int, float)):
        return [round(number, 4) for number in value[:2]]
    return [rounded_coordinates(item) for item in value]


def display_polygons(geometry, tolerance):
    simplified = geometry.simplify(tolerance, preserve_topology=True)
    # D3 uses clockwise exterior rings for spherical features.
    return rounded_coordinates([
        orient(part, sign=-1).__geo_interface__["coordinates"]
        for part in shapely.get_parts(simplified)
        if part.geom_type == "Polygon" and not part.is_empty
    ])


def main():
    with urlopen(SOURCE, timeout=30) as response:
        original = json.load(response)

    units = []
    geometries = []
    unit_indices = []
    for feature in original["features"]:
        props = feature["properties"]
        if not feature["geometry"]:
            continue
        geometry = shape(feature["geometry"])
        parts = list(shapely.get_parts(geometry))
        geometries.extend(parts)
        unit_indices.extend([len(units)] * len(parts))
        units.append(
            {
                "id": props["GU_A3"],
                "name": props["GEOUNIT"],
                "continent": props["CONTINENT"],
                "region": props["SUBREGION"],
                "point": [props["LABEL_X"], props["LABEL_Y"]],
                "polygons": display_polygons(geometry, 0.06),
            }
        )

    observations = json.loads((ROOT / "public/data/global.json").read_text())
    points = shapely.points([row[1:3] for row in observations])
    tree = shapely.STRtree(geometries)
    point_hits, geometry_hits = tree.query(points, predicate="covered_by")
    assignments = {}
    for point_index, geometry_index in zip(point_hits, geometry_hits):
        key = observations[point_index][0]
        unit = unit_indices[geometry_index]
        previous = assignments.get(key)
        # If two polygons share the point, keep one deterministic assignment.
        assignments[key] = unit if previous is None else min(previous, unit)

    land = shapely.union_all([shapely.make_valid(part) for part in geometries])
    land_parts = [part for part in shapely.get_parts(land) if part.geom_type == "Polygon"]
    land_geometry = MultiPolygon(land_parts)
    coarse_land = MultiPolygon([part for part in land_parts if part.area > 1.4])
    payload = {
        "land": display_polygons(land_geometry, 0.13),
        "motionLand": display_polygons(coarse_land, 0.8),
        "source": SOURCE,
        "features": units,
        "assignments": assignments,
        "observationCount": len(observations),
    }
    target = ROOT / "src/prototype/map-units.json"
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(payload, separators=(",", ":")) + "\n")
    print(f"{len(assignments):,} of {len(observations):,} detections matched a map unit")


if __name__ == "__main__":
    main()

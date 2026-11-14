from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "data" / "raw"
WORK = ROOT / "data" / "work"
PUBLIC = ROOT / "web" / "public" / "data"
FIRMS_BASE = "https://firms.modaps.eosdis.nasa.gov/data/country/csvs/"
GLOBAL_URL = "https://firms.modaps.eosdis.nasa.gov/data/active_fire/noaa-20-viirs-c2/csv/J1_VIIRS_C2_Global_24h.csv"
COLLECTIONS = {
    "MYD14": "C2278858993-LPCLOUD",
    "MYD03": "C1379841358-LAADS",
    "VNP14IMG": "C2734202914-LPCLOUD",
    "VNP03IMG": "C2105092163-LAADS",
}
CASES = [
    {
        "id": "evros",
        "name": "Evros",
        "country": "Greece",
        "eyebrow": "MEDITERRANEAN FOREST",
        "sourceCountries": ["Greece", "Turkey", "Bulgaria"],
        "date": "2023-08-22",
        "window": ["2023-08-19", "2023-08-31"],
        "bbox": [25.6, 40.65, 26.5, 41.4],
        "sceneBounds": [23, 39.8, 27.8, 42.2],
        "center": [26.05, 41.025],
        "image": "evros-2023-08-22.jpg",
        "description": "Two satellites. One unfolding event. Follow the August observations across northeastern Greece.",
        "context": [
            {
                "title": "Evros emergency mapping",
                "publisher": "Copernicus EMS",
                "url": "https://mapping.emergency.copernicus.eu/activations/EMSR686/",
                "relation": "Official mapping of the August 2023 event",
            },
            {
                "title": "August wildfires in Greece",
                "publisher": "Copernicus Atmosphere",
                "url": "https://atmosphere.copernicus.eu/august-wildfires-ravage-northern-central-greece",
                "relation": "Regional event context",
            },
        ],
    },
    {
        "id": "evia",
        "name": "Evia",
        "country": "Greece",
        "eyebrow": "ISLAND LANDSCAPE",
        "sourceCountries": ["Greece"],
        "date": "2021-08-07",
        "window": ["2021-08-03", "2021-08-14"],
        "bbox": [22.9, 38.55, 23.65, 39.1],
        "sceneBounds": [21.65, 37.65, 25.25, 39.85],
        "center": [23.275, 38.825],
        "image": "evia-2021-08-07.jpg",
        "description": "An earlier overlap. Compare the satellite record over the island of Evia in August 2021.",
        "context": [
            {
                "title": "Fire consumes large swaths of Greece",
                "publisher": "NASA Earth Observatory",
                "url": "https://science.nasa.gov/earth/earth-observatory/fire-consumes-large-swaths-of-greece-148682/",
                "relation": "Dated imagery and regional reporting",
            }
        ],
    },
    {
        "id": "chaco",
        "name": "Gran Chaco",
        "country": "Argentina",
        "eyebrow": "DRY FOREST & AGRICULTURE",
        "sourceCountries": ["Argentina", "Bolivia", "Paraguay", "Brazil"],
        "date": "2020-05-10",
        "window": ["2020-05-05", "2020-05-16"],
        "bbox": [-63.6, -27.8, -58, -22],
        "sceneBounds": [-63.6, -27.8, -56.6, -21.8],
        "center": [-60.8, -24.9],
        "image": "gran-chaco-2020-05-10.jpg",
        "description": "A different fire landscape. Explore reported activity in the Argentine part of the Gran Chaco.",
        "context": [
            {
                "title": "Fires in northern Argentina",
                "publisher": "NASA MODIS",
                "url": "https://modis.gsfc.nasa.gov/gallery/individual.php?db_date=2020-05-12",
                "relation": "Aqua imagery acquired May 10, 2020",
            }
        ],
    },
]

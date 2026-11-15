// Sensor identity stays constant across maps, clusters, and selection markers.
export const mapPalette = {
  modis: "#f0b581",
  viirs: "#75c5ff",
  mixed: "#b5c5d6",
  selection: "#ffffff",
} as const;

export function sensorColor(sensor: string) {
  return sensor === "MODIS" ? mapPalette.modis : mapPalette.viirs;
}

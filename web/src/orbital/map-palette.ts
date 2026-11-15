// Sensor identity stays constant across maps, clusters, and selection markers.
export const mapPalette = {
  modis: "#f7a16b",
  viirs: "#ff665c",
  mixed: "#f27b60",
  selection: "#ffffff",
} as const;

export function sensorColor(sensor: string) {
  return sensor === "MODIS" ? mapPalette.modis : mapPalette.viirs;
}

/** Shared fire intensity scale with readable text at every intensity. */
export function calendarColors(count: number | null, maximum: number) {
  if (count === null) return { backgroundColor: "#101b14", color: "#ffffff" };
  if (count === 0) return { backgroundColor: "#1b2d20", color: "#ffffff" };
  const t = Math.min(1, Math.log1p(count) / Math.log1p(Math.max(1, maximum)));
  const lightness = 0.24 + t * 0.54;
  const chroma = (1 - Math.abs(2 * lightness - 1)) * (0.45 + t * 0.35);
  // HSL at a constant 8° hue; convert once to evaluate actual contrast.
  const rgb = [
    lightness + chroma / 2,
    lightness - chroma / 2 + chroma * (8 / 60),
    lightness - chroma / 2,
  ].map((x) => Math.round(x * 255));
  const linear = rgb.map((x) =>
    x / 255 <= 0.04045 ? x / 255 / 12.92 : ((x / 255 + 0.055) / 1.055) ** 2.4,
  );
  const luminance =
    0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
  return {
    backgroundColor: `rgb(${rgb.join(",")})`,
    color: luminance > 0.179 ? "#000000" : "#ffffff",
  };
}

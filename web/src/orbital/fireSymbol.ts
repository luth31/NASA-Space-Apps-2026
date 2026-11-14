/** A map symbol for satellite heat detections, never a fire perimeter. */
export function drawFire(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  selected = false,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 24, size / 24);
  ctx.beginPath();
  ctx.moveTo(12, -13);
  ctx.bezierCurveTo(15, -6, 8, -5, 13, 0);
  ctx.bezierCurveTo(16, -2, 17, -4, 17, -6);
  ctx.bezierCurveTo(27, 6, 20, 14, 12, 14);
  ctx.bezierCurveTo(3, 14, -2, 6, 4, -3);
  ctx.bezierCurveTo(6, 2, 8, 2, 8, -2);
  ctx.bezierCurveTo(7, -7, 10, -10, 12, -13);
  ctx.closePath();
  ctx.fillStyle = selected ? "#ffdaab" : "#e86735";
  ctx.strokeStyle = "#713623";
  ctx.lineWidth = 1.2;
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(12, 1);
  ctx.bezierCurveTo(11, 6, 6, 7, 9, 11);
  ctx.bezierCurveTo(14, 16, 20, 9, 12, 1);
  ctx.fillStyle = "#ffbd71";
  ctx.fill();
  ctx.restore();
}

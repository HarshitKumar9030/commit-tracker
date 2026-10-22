import {
  BOARD_WIDTH,
  BOARD_HEIGHT,
  type CanvasInk,
  type CanvasPoint,
  type CanvasStroke,
} from "./canvas";
export function renderInk(ctx: CanvasRenderingContext2D, stroke: CanvasInk) {
  const points = stroke.points;
  if (!points.length) return;
  ctx.save();
  ctx.strokeStyle = stroke.color;
  ctx.fillStyle = stroke.color;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  if (stroke.tool === "highlighter") {
    ctx.globalAlpha = 0.25;
    ctx.lineWidth = stroke.width * 3;
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    for (const p of points.slice(1)) ctx.lineTo(p[0], p[1]);
    if (points.length === 1) ctx.lineTo(points[0][0] + 0.1, points[0][1]);
    ctx.stroke();
  } else {
    for (let i = 0; i < points.length; i++) {
      const p = points[i],
        previous = points[Math.max(0, i - 1)];
      ctx.lineWidth = stroke.width * (0.4 + (p[2] + previous[2]) * 0.6);
      ctx.beginPath();
      ctx.moveTo(previous[0], previous[1]);
      ctx.lineTo(p[0] + (i === 0 ? 0.01 : 0), p[1]);
      ctx.stroke();
    }
  }
  ctx.restore();
}
export function distanceToSegment(
  point: CanvasPoint,
  a: CanvasPoint,
  b: CanvasPoint,
) {
  const dx = b[0] - a[0],
    dy = b[1] - a[1],
    length = dx * dx + dy * dy,
    t = length
      ? Math.max(
          0,
          Math.min(
            1,
            ((point[0] - a[0]) * dx + (point[1] - a[1]) * dy) / length,
          ),
        )
      : 0;
  return Math.hypot(point[0] - a[0] - t * dx, point[1] - a[1] - t * dy);
}
export function hitStroke(point: CanvasPoint, strokes: CanvasStroke[]) {
  return strokes
    .slice()
    .reverse()
    .find(
      (s) =>
        !s.hidden &&
        s.points.some(
          (p, i) =>
            distanceToSegment(point, s.points[Math.max(0, i - 1)], p) <
            16 + s.width * (s.tool === "highlighter" ? 1.5 : 1),
        ),
    );
}
export function exportCanvasSvg(strokes: CanvasStroke[]) {
  const paths = strokes
    .filter((s) => !s.hidden)
    .map((s) => {
      const p = s.points
        .map((p, i) => `${i ? "L" : "M"}${p[0]},${p[1]}`)
        .join(" ");
      return `<path d="${p}${s.points.length === 1 ? " l0.1,0" : ""}" fill="none" stroke="${s.color}" stroke-width="${s.width * (s.tool === "highlighter" ? 3 : 1)}" stroke-linecap="round" stroke-linejoin="round"${s.tool === "highlighter" ? ' opacity="0.25"' : ""}/>`;
    })
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${BOARD_WIDTH}" height="${BOARD_HEIGHT}" viewBox="0 0 ${BOARD_WIDTH} ${BOARD_HEIGHT}"><rect width="100%" height="100%" fill="white"/>${paths}</svg>`;
}

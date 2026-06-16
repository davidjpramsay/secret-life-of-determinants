import { useEffect, useRef } from "react";
import {
  applyMatrix,
  determinant,
  firstColumn,
  formatNumber,
  inverseMatrix,
  lerp,
  lerpMatrix,
  multiplyMatrix,
  rank,
  secondColumn,
  type Matrix2,
  type Vec2,
} from "./math";
import type { SceneId } from "./scenes";

type MatrixCanvasProps = {
  matrix: Matrix2;
  bMatrix: Matrix2;
  sceneId: SceneId;
  rhs: [number, number];
  onMatrixChange: (matrix: Matrix2) => void;
  vectorField: boolean;
  showGrid: boolean;
  showUnitSquare: boolean;
  showParallelogram: boolean;
  opacity: number;
  playing: boolean;
};

type View = {
  width: number;
  height: number;
  cx: number;
  cy: number;
  scale: number;
};

type DragTarget = "first" | "second" | null;

const CYAN = "#39dff7";
const AMBER = "#ffd44d";
const MAGENTA = "#ff4f98";
const GREEN = "#7af56d";
const GRID = "rgba(183, 207, 228, 0.11)";
const GRID_MAJOR = "rgba(220, 235, 245, 0.25)";
const PANEL = "rgba(8, 13, 18, 0.72)";

const SOURCE_PARTICLES: Vec2[] = Array.from({ length: 2400 }, (_, index) => {
  const a = ((index * 73) % 997) / 997;
  const b = ((index * 191) % 991) / 991;
  const radius = Math.sqrt(a) * 2.2;
  const theta = b * Math.PI * 2;
  return [Math.cos(theta) * radius, Math.sin(theta) * radius];
});

const GRID_POINTS: Vec2[] = [];
for (let x = -2; x <= 2; x += 0.5) {
  for (let y = -2; y <= 2; y += 0.5) {
    GRID_POINTS.push([x, y]);
  }
}

function worldToScreen(view: View, [x, y]: Vec2): Vec2 {
  return [view.cx + x * view.scale, view.cy - y * view.scale];
}

function screenToWorld(view: View, [x, y]: Vec2): Vec2 {
  return [(x - view.cx) / view.scale, (view.cy - y) / view.scale];
}

function distance(a: Vec2, b: Vec2): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

function withAlpha(color: string, alpha: number): string {
  if (color.startsWith("#")) {
    const hex = color.slice(1);
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return color;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r = 8) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  options: {
    size?: number;
    color?: string;
    weight?: number | string;
    align?: CanvasTextAlign;
    font?: string;
    alpha?: number;
  } = {},
) {
  const size = options.size ?? 14;
  const color = options.color ?? "#f5fbff";
  ctx.save();
  ctx.globalAlpha = options.alpha ?? 1;
  ctx.font = `${options.weight ?? 500} ${size}px ${options.font ?? "Inter, ui-sans-serif, system-ui"}`;
  ctx.fillStyle = color;
  ctx.textAlign = options.align ?? "left";
  ctx.textBaseline = "middle";
  ctx.fillText(text, x, y);
  ctx.restore();
}

function drawGrid(ctx: CanvasRenderingContext2D, view: View, limit = 4, showGrid = true) {
  if (!showGrid) return;
  ctx.save();
  ctx.lineWidth = 1;
  for (let i = -limit; i <= limit; i += 0.5) {
    const major = Math.abs(i % 1) < 0.001;
    ctx.strokeStyle = major ? GRID_MAJOR : GRID;
    ctx.beginPath();
    let p = worldToScreen(view, [i, -limit]);
    ctx.moveTo(p[0], p[1]);
    p = worldToScreen(view, [i, limit]);
    ctx.lineTo(p[0], p[1]);
    p = worldToScreen(view, [-limit, i]);
    ctx.moveTo(p[0], p[1]);
    p = worldToScreen(view, [limit, i]);
    ctx.lineTo(p[0], p[1]);
    ctx.stroke();
  }

  ctx.strokeStyle = "rgba(242, 250, 255, 0.72)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  let p = worldToScreen(view, [-limit, 0]);
  ctx.moveTo(p[0], p[1]);
  p = worldToScreen(view, [limit, 0]);
  ctx.lineTo(p[0], p[1]);
  p = worldToScreen(view, [0, -limit]);
  ctx.moveTo(p[0], p[1]);
  p = worldToScreen(view, [0, limit]);
  ctx.lineTo(p[0], p[1]);
  ctx.stroke();

  drawAxisArrow(ctx, view, [limit, 0], "x");
  drawAxisArrow(ctx, view, [0, limit], "y");

  ctx.fillStyle = "rgba(242, 250, 255, 0.68)";
  ctx.font = "500 12px Inter, system-ui";
  ctx.textAlign = "center";
  for (let i = -3; i <= 3; i += 1) {
    if (i === 0) continue;
    p = worldToScreen(view, [i, 0]);
    ctx.fillText(`${i}`, p[0], p[1] + 18);
    p = worldToScreen(view, [0, i]);
    ctx.fillText(`${i}`, p[0] - 18, p[1] + 4);
  }
  ctx.restore();
}

function drawAxisArrow(ctx: CanvasRenderingContext2D, view: View, point: Vec2, label: string) {
  const p = worldToScreen(view, point);
  const origin = worldToScreen(view, [0, 0]);
  const angle = Math.atan2(origin[1] - p[1], p[0] - origin[0]);
  ctx.save();
  ctx.strokeStyle = "rgba(242, 250, 255, 0.72)";
  ctx.fillStyle = "rgba(242, 250, 255, 0.72)";
  ctx.beginPath();
  ctx.moveTo(p[0], p[1]);
  ctx.lineTo(p[0] - 10 * Math.cos(angle - 0.4), p[1] + 10 * Math.sin(angle - 0.4));
  ctx.moveTo(p[0], p[1]);
  ctx.lineTo(p[0] - 10 * Math.cos(angle + 0.4), p[1] + 10 * Math.sin(angle + 0.4));
  ctx.stroke();
  drawText(ctx, label, p[0] + (label === "x" ? 16 : 12), p[1] + (label === "x" ? -8 : -14), {
    color: "rgba(242,250,255,.72)",
    size: 16,
    weight: 500,
    font: "Georgia, serif",
  });
  ctx.restore();
}

function drawTransformedGrid(ctx: CanvasRenderingContext2D, view: View, m: Matrix2, opacity: number, color = CYAN) {
  ctx.save();
  ctx.lineWidth = 1;
  ctx.strokeStyle = withAlpha(color, opacity);
  for (let x = -3; x <= 3; x += 0.5) {
    ctx.beginPath();
    for (let step = 0; step <= 64; step += 1) {
      const y = -3 + (6 * step) / 64;
      const p = worldToScreen(view, applyMatrix(m, [x, y]));
      if (step === 0) ctx.moveTo(p[0], p[1]);
      else ctx.lineTo(p[0], p[1]);
    }
    ctx.stroke();
  }
  ctx.strokeStyle = withAlpha(AMBER, opacity * 0.85);
  for (let y = -3; y <= 3; y += 0.5) {
    ctx.beginPath();
    for (let step = 0; step <= 64; step += 1) {
      const x = -3 + (6 * step) / 64;
      const p = worldToScreen(view, applyMatrix(m, [x, y]));
      if (step === 0) ctx.moveTo(p[0], p[1]);
      else ctx.lineTo(p[0], p[1]);
    }
    ctx.stroke();
  }
  ctx.restore();
}

function drawVector(
  ctx: CanvasRenderingContext2D,
  view: View,
  vector: Vec2,
  color: string,
  label: string,
  width = 3,
  handle = false,
) {
  const start = worldToScreen(view, [0, 0]);
  const end = worldToScreen(view, vector);
  const angle = Math.atan2(end[1] - start[1], end[0] - start[0]);
  ctx.save();
  ctx.shadowBlur = 16;
  ctx.shadowColor = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(start[0], start[1]);
  ctx.lineTo(end[0], end[1]);
  ctx.stroke();

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(end[0], end[1]);
  ctx.lineTo(end[0] - 14 * Math.cos(angle - 0.42), end[1] - 14 * Math.sin(angle - 0.42));
  ctx.lineTo(end[0] - 14 * Math.cos(angle + 0.42), end[1] - 14 * Math.sin(angle + 0.42));
  ctx.closePath();
  ctx.fill();

  if (handle) {
    ctx.shadowBlur = 20;
    ctx.fillStyle = "#091017";
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(end[0], end[1], 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  drawText(ctx, label, end[0] + 14, end[1] - 14, {
    color,
    size: 20,
    weight: 650,
    font: "Georgia, serif",
  });
  ctx.restore();
}

function polygonPoints(m: Matrix2): Vec2[] {
  return [
    applyMatrix(m, [0, 0]),
    applyMatrix(m, [1, 0]),
    applyMatrix(m, [1, 1]),
    applyMatrix(m, [0, 1]),
  ];
}

function drawPolygon(
  ctx: CanvasRenderingContext2D,
  view: View,
  points: Vec2[],
  stroke: string,
  fill: string,
  width = 2,
) {
  ctx.save();
  ctx.beginPath();
  points.forEach((point, index) => {
    const p = worldToScreen(view, point);
    if (index === 0) ctx.moveTo(p[0], p[1]);
    else ctx.lineTo(p[0], p[1]);
  });
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.shadowBlur = 14;
  ctx.shadowColor = stroke;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = width;
  ctx.stroke();
  ctx.restore();
}

function drawOrientationLoop(ctx: CanvasRenderingContext2D, view: View, m: Matrix2, det: number, alpha = 1) {
  const points = polygonPoints(m);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = det >= 0 ? withAlpha(GREEN, 0.75) : withAlpha(MAGENTA, 0.84);
  ctx.lineWidth = 2;
  for (let i = 0; i < 4; i += 1) {
    const from = points[i];
    const to = points[(i + 1) % 4];
    const mid: Vec2 = [lerp(from[0], to[0], 0.6), lerp(from[1], to[1], 0.6)];
    const previous: Vec2 = [lerp(from[0], to[0], 0.42), lerp(from[1], to[1], 0.42)];
    drawMiniArrow(ctx, view, previous, mid, det >= 0 ? GREEN : MAGENTA);
  }
  ctx.restore();
}

function drawMiniArrow(ctx: CanvasRenderingContext2D, view: View, from: Vec2, to: Vec2, color: string) {
  const a = worldToScreen(view, from);
  const b = worldToScreen(view, to);
  const angle = Math.atan2(b[1] - a[1], b[0] - a[0]);
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(a[0], a[1]);
  ctx.lineTo(b[0], b[1]);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(b[0], b[1]);
  ctx.lineTo(b[0] - 8 * Math.cos(angle - 0.55), b[1] - 8 * Math.sin(angle - 0.55));
  ctx.lineTo(b[0] - 8 * Math.cos(angle + 0.55), b[1] - 8 * Math.sin(angle + 0.55));
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawUnitSquare(ctx: CanvasRenderingContext2D, view: View, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  drawPolygon(ctx, view, [[0, 0], [1, 0], [1, 1], [0, 1]], CYAN, "rgba(57, 223, 247, 0.18)", 2);
  drawText(ctx, "Area = 1", ...worldToScreen(view, [0.5, 0.5]), {
    color: CYAN,
    size: 15,
    weight: 650,
    align: "center",
    font: "Georgia, serif",
  });
  ctx.restore();
}

function drawTransformCore(
  ctx: CanvasRenderingContext2D,
  view: View,
  m: Matrix2,
  options: {
    showUnitSquare: boolean;
    showParallelogram: boolean;
    vectorField: boolean;
    showGrid: boolean;
    opacity: number;
    handles?: boolean;
    basisLabels?: boolean;
  },
) {
  const det = determinant(m);
  drawGrid(ctx, view, 4, options.showGrid);
  if (options.vectorField) {
    drawTransformedGrid(ctx, view, m, Math.min(0.26, 0.1 + options.opacity * 0.18));
  }
  if (options.showUnitSquare) drawUnitSquare(ctx, view, 0.78);
  if (options.showParallelogram) {
    const areaColor = det >= 0 ? "rgba(255, 212, 77, 0.26)" : "rgba(255, 79, 152, 0.24)";
    drawPolygon(ctx, view, polygonPoints(m), det >= 0 ? AMBER : MAGENTA, areaColor, 3);
    drawOrientationLoop(ctx, view, m, det, 0.9);
  }
  drawVector(ctx, view, firstColumn(m), CYAN, options.basisLabels ? "Ae₁" : "e₁", 3, options.handles);
  drawVector(ctx, view, secondColumn(m), AMBER, options.basisLabels ? "Ae₂" : "e₂", 3, options.handles);
}

function drawHudPanel(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  ctx.save();
  roundRect(ctx, x, y, w, h);
  ctx.fillStyle = PANEL;
  ctx.strokeStyle = "rgba(196, 221, 237, 0.22)";
  ctx.lineWidth = 1;
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawAreaBadge(ctx: CanvasRenderingContext2D, view: View, m: Matrix2) {
  const det = determinant(m);
  if (view.width < 560) {
    drawHudPanel(ctx, 16, 86, 190, 64);
    drawText(ctx, `det(A) = ${formatNumber(det, 4)}`, 111, 109, {
      color: det < 0 ? MAGENTA : AMBER,
      size: 15,
      weight: 760,
      align: "center",
      font: "Georgia, serif",
    });
    drawText(ctx, `Area = ${formatNumber(Math.abs(det), 4)}`, 111, 134, {
      color: "#f5fbff",
      size: 12,
      align: "center",
    });
    return;
  }
  const p = worldToScreen(view, [1.7, 1.25]);
  const panelX = Math.min(Math.max(12, p[0] - 110), view.width - 232);
  const textX = panelX + 110;
  drawHudPanel(ctx, panelX, p[1] - 34, 220, 74);
  drawText(ctx, `det(A) = ${formatNumber(det, 4)}`, textX, p[1] - 10, {
    color: det < 0 ? MAGENTA : AMBER,
    size: 18,
    weight: 760,
    align: "center",
    font: "Georgia, serif",
  });
  drawText(ctx, `Area = |det(A)| = ${formatNumber(Math.abs(det), 4)}`, textX, p[1] + 20, {
    color: "#f5fbff",
    size: 13,
    align: "center",
  });
}

function drawSignIndicator(ctx: CanvasRenderingContext2D, view: View, m: Matrix2, time: number) {
  const det = determinant(m);
  const label = det >= 0 ? "Orientation preserved" : "Orientation flipped";
  const color = det >= 0 ? GREEN : MAGENTA;
  const pulse = 0.65 + 0.35 * Math.sin(time * 0.006);
  const x = view.width - 250;
  const y = 66;
  drawHudPanel(ctx, x, y, 214, 78);
  drawText(ctx, det >= 0 ? "det(A) > 0" : "det(A) < 0", x + 107, y + 25, {
    color,
    size: 18,
    weight: 800,
    align: "center",
    font: "Georgia, serif",
    alpha: pulse,
  });
  drawText(ctx, label, x + 107, y + 53, { color: "#eaf6ff", size: 13, weight: 640, align: "center" });
}

function drawSingularity(ctx: CanvasRenderingContext2D, view: View, m: Matrix2, time: number, options: MatrixCanvasProps) {
  drawGrid(ctx, view, 4, options.showGrid);
  drawTransformedGrid(ctx, view, m, 0.36, MAGENTA);
  ctx.save();
  for (const source of GRID_POINTS) {
    const out = applyMatrix(m, source);
    const a = worldToScreen(view, source);
    const b = worldToScreen(view, out);
    ctx.strokeStyle = "rgba(138, 165, 184, 0.17)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.stroke();
    ctx.fillStyle = "rgba(210, 226, 236, 0.28)";
    ctx.beginPath();
    ctx.arc(a[0], a[1], 2.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255, 212, 77, 0.62)";
    ctx.beginPath();
    ctx.arc(b[0], b[1], 2.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  if (options.showParallelogram) {
    drawPolygon(ctx, view, polygonPoints(m), MAGENTA, "rgba(255, 79, 152, 0.2)", 3);
  }
  drawVector(ctx, view, firstColumn(m), CYAN, "v₁", 3.4, true);
  drawVector(ctx, view, secondColumn(m), AMBER, "v₂", 3.4, true);

  const pulse = 0.72 + 0.28 * Math.sin(time * 0.005);
  drawText(ctx, "INFORMATION IS BEING DESTROYED.", view.width / 2, 82, {
    color: MAGENTA,
    size: view.width < 640 ? 18 : 26,
    weight: 800,
    align: "center",
    font: "ui-monospace, SFMono-Regular, Menlo, monospace",
    alpha: pulse,
  });
  drawText(ctx, "Many inputs  →  the same output", view.width / 2, 116, {
    color: "rgba(255, 179, 211, 0.9)",
    size: 15,
    weight: 650,
    align: "center",
    font: "ui-monospace, SFMono-Regular, Menlo, monospace",
  });
  const badgeX = view.width - 310;
  const badgeY = view.height - 130;
  drawHudPanel(ctx, badgeX, badgeY, 260, 88);
  drawText(ctx, `det(A) ≈ ${formatNumber(determinant(m), 5)}`, badgeX + 130, badgeY + 28, {
    color: MAGENTA,
    size: 18,
    weight: 760,
    align: "center",
    font: "Georgia, serif",
  });
  drawText(ctx, "Near zero: a dimension is collapsing", badgeX + 130, badgeY + 60, {
    color: "rgba(255, 201, 225, 0.92)",
    size: 12,
    align: "center",
  });
}

function drawPointCloud(
  ctx: CanvasRenderingContext2D,
  view: View,
  m: Matrix2,
  time: number,
  mode: "inverse" | "compression",
) {
  const inverse = inverseMatrix(m);
  const det = determinant(m);
  const singular = !inverse;
  const progress = mode === "compression" ? 0.5 + 0.5 * Math.sin(time * 0.0011) : 0.72;
  ctx.save();
  SOURCE_PARTICLES.forEach((point, index) => {
    const transformed = applyMatrix(m, point);
    const blended: Vec2 = [
      lerp(point[0], transformed[0], progress),
      lerp(point[1], transformed[1], progress),
    ];
    const p = worldToScreen(view, blended);
    const warm = index % 3 === 0;
    ctx.fillStyle = warm
      ? `rgba(255, 212, 77, ${mode === "compression" ? 0.48 : 0.38})`
      : `rgba(57, 223, 247, ${mode === "compression" ? 0.34 : 0.3})`;
    ctx.beginPath();
    ctx.arc(p[0], p[1], mode === "compression" ? 1.7 : 2.1, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();

  if (mode === "inverse") {
    const panelX = view.width - 330;
    const panelY = view.height - 150;
    drawHudPanel(ctx, panelX, panelY, 292, 104);
    if (singular) {
      drawText(ctx, "No unique reverse transformation exists.", panelX + 146, panelY + 34, {
        color: MAGENTA,
        size: 15,
        weight: 760,
        align: "center",
      });
      drawText(ctx, "Whole regions have collapsed onto a line.", panelX + 146, panelY + 68, {
        color: "rgba(235, 245, 255, 0.72)",
        size: 12,
        align: "center",
      });
    } else {
      drawText(ctx, "Reverse transformation restores the cloud.", panelX + 146, panelY + 34, {
        color: GREEN,
        size: 15,
        weight: 760,
        align: "center",
      });
      drawText(ctx, `det(A) = ${formatNumber(det, 4)} keeps information separated.`, panelX + 146, panelY + 68, {
        color: "rgba(235, 245, 255, 0.72)",
        size: 12,
        align: "center",
      });
    }
  }
}

function linePoints(a: number, b: number, c: number, limit = 4): [Vec2, Vec2] | null {
  if (Math.abs(a) < 1e-8 && Math.abs(b) < 1e-8) return null;
  if (Math.abs(b) > Math.abs(a)) {
    return [
      [-limit, (c - a * -limit) / b],
      [limit, (c - a * limit) / b],
    ];
  }
  return [
    [c / a, -limit],
    [(c - b * limit) / a, limit],
  ];
}

function drawEquationLine(
  ctx: CanvasRenderingContext2D,
  view: View,
  a: number,
  b: number,
  c: number,
  color: string,
  label: string,
) {
  const points = linePoints(a, b, c);
  if (!points) return;
  const p1 = worldToScreen(view, points[0]);
  const p2 = worldToScreen(view, points[1]);
  ctx.save();
  ctx.strokeStyle = color;
  ctx.shadowBlur = 12;
  ctx.shadowColor = color;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(p1[0], p1[1]);
  ctx.lineTo(p2[0], p2[1]);
  ctx.stroke();
  drawText(ctx, label, p2[0] - 44, p2[1] + 22, { color, size: 14, weight: 720 });
  ctx.restore();
}

function drawLinearSystems(ctx: CanvasRenderingContext2D, view: View, m: Matrix2, rhs: [number, number]) {
  drawGrid(ctx, view, 4, true);
  const [a, b, c, d] = m;
  const [e, f] = rhs;
  drawEquationLine(ctx, view, a, b, e, CYAN, "Line 1");
  drawEquationLine(ctx, view, c, d, f, AMBER, "Line 2");

  const det = determinant(m);
  const sameLine =
    Math.abs(det) < 1e-5 &&
    Math.abs(a * f - c * e) < 1e-5 &&
    Math.abs(b * f - d * e) < 1e-5;
  const panelX = 32;
  const panelY = 34;
  drawHudPanel(ctx, panelX, panelY, 334, 126);
  drawText(ctx, `${formatNumber(a, 2)}x + ${formatNumber(b, 2)}y = ${formatNumber(e, 2)}`, panelX + 22, panelY + 34, {
    color: CYAN,
    size: 16,
    weight: 720,
    font: "Georgia, serif",
  });
  drawText(ctx, `${formatNumber(c, 2)}x + ${formatNumber(d, 2)}y = ${formatNumber(f, 2)}`, panelX + 22, panelY + 66, {
    color: AMBER,
    size: 16,
    weight: 720,
    font: "Georgia, serif",
  });

  if (Math.abs(det) > 1e-5) {
    const solution: Vec2 = [(e * d - b * f) / det, (a * f - e * c) / det];
    const p = worldToScreen(view, solution);
    ctx.save();
    ctx.fillStyle = GREEN;
    ctx.shadowBlur = 18;
    ctx.shadowColor = GREEN;
    ctx.beginPath();
    ctx.arc(p[0], p[1], 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    drawText(ctx, `Unique solution: (${formatNumber(solution[0], 2)}, ${formatNumber(solution[1], 2)})`, panelX + 22, panelY + 100, {
      color: GREEN,
      size: 13,
      weight: 760,
    });
  } else if (sameLine) {
    drawText(ctx, "Infinite solutions: both equations are the same line.", panelX + 22, panelY + 100, {
      color: AMBER,
      size: 13,
      weight: 760,
    });
  } else {
    drawText(ctx, "No solution: parallel lines never intersect.", panelX + 22, panelY + 100, {
      color: MAGENTA,
      size: 13,
      weight: 760,
    });
  }
}

function miniView(rect: { x: number; y: number; w: number; h: number }): View {
  return {
    width: rect.w,
    height: rect.h,
    cx: rect.x + rect.w / 2,
    cy: rect.y + rect.h * 0.58,
    scale: Math.min(rect.w / 5.2, rect.h / 4.6),
  };
}

function drawMiniTransformPanel(
  ctx: CanvasRenderingContext2D,
  rect: { x: number; y: number; w: number; h: number },
  title: string,
  m: Matrix2,
  color: string,
) {
  drawHudPanel(ctx, rect.x, rect.y, rect.w, rect.h);
  drawText(ctx, title, rect.x + 18, rect.y + 24, { color: "#f5fbff", size: 15, weight: 760 });
  const view = miniView(rect);
  drawGrid(ctx, view, 2.4, true);
  drawUnitSquare(ctx, view, 0.28);
  drawPolygon(ctx, view, polygonPoints(m), color, withAlpha(color, 0.18), 2.2);
  drawVector(ctx, view, firstColumn(m), CYAN, "", 2, false);
  drawVector(ctx, view, secondColumn(m), AMBER, "", 2, false);
  drawText(ctx, `det = ${formatNumber(determinant(m), 3)}`, rect.x + rect.w - 18, rect.y + rect.h - 24, {
    color,
    size: 13,
    weight: 720,
    align: "right",
    font: "Georgia, serif",
  });
}

function drawMultiplication(ctx: CanvasRenderingContext2D, view: View, a: Matrix2, b: Matrix2, time: number) {
  drawGrid(ctx, view, 4, true);
  const product = multiplyMatrix(a, b);
  const gap = 18;
  const panelW = Math.max(210, (view.width - 90 - gap * 2) / 3);
  const panelH = Math.min(310, view.height - 190);
  const startX = 34;
  const y = 118;
  const rects = [
    { x: startX, y, w: panelW, h: panelH },
    { x: startX + panelW + gap, y, w: panelW, h: panelH },
    { x: startX + 2 * (panelW + gap), y, w: panelW, h: panelH },
  ];
  drawText(ctx, "Unit square  →  transformed by B  →  then transformed by A", view.width / 2, 72, {
    color: "#f5fbff",
    size: view.width < 740 ? 14 : 20,
    weight: 760,
    align: "center",
  });
  drawMiniTransformPanel(ctx, rects[0], "Start", [1, 0, 0, 1], CYAN);
  drawMiniTransformPanel(ctx, rects[1], "B acts first", b, AMBER);
  drawMiniTransformPanel(ctx, rects[2], "A(Bx) = ABx", product, MAGENTA);

  const pulse = 0.72 + 0.28 * Math.sin(time * 0.004);
  const badgeX = view.width / 2 - 238;
  const badgeY = view.height - 76;
  drawHudPanel(ctx, badgeX, badgeY, 476, 50);
  drawText(
    ctx,
    `det(AB) = ${formatNumber(determinant(product), 4)} = det(A) × det(B) = ${formatNumber(
      determinant(a),
      3,
    )} × ${formatNumber(determinant(b), 3)}`,
    badgeX + 238,
    badgeY + 25,
    {
      color: AMBER,
      size: view.width < 720 ? 12 : 15,
      weight: 760,
      align: "center",
      font: "Georgia, serif",
      alpha: pulse,
    },
  );
}

function drawSummary(ctx: CanvasRenderingContext2D, view: View, m: Matrix2, options: MatrixCanvasProps) {
  drawTransformCore(ctx, view, m, {
    showUnitSquare: options.showUnitSquare,
    showParallelogram: options.showParallelogram,
    vectorField: options.vectorField,
    showGrid: options.showGrid,
    opacity: options.opacity,
    handles: true,
    basisLabels: true,
  });
  const det = determinant(m);
  const bottomY = view.height - 120;
  drawHudPanel(ctx, 34, bottomY, Math.min(650, view.width - 68), 84);
  drawText(ctx, "A determinant is not merely a number.", 58, bottomY + 27, {
    color: "#f5fbff",
    size: 19,
    weight: 790,
  });
  drawText(ctx, "It measures how much area survives a transformation.", 58, bottomY + 56, {
    color: AMBER,
    size: 18,
    weight: 780,
    font: "Georgia, serif",
  });
  if (Math.abs(det) < 0.08) {
    drawText(ctx, "The transformation destroys a dimension.", view.width - 44, bottomY + 42, {
      color: MAGENTA,
      size: 17,
      weight: 800,
      align: "right",
    });
  }
}

function drawScene(ctx: CanvasRenderingContext2D, view: View, props: MatrixCanvasProps, m: Matrix2, b: Matrix2, time: number) {
  ctx.clearRect(0, 0, view.width, view.height);

  const background = ctx.createLinearGradient(0, 0, view.width, view.height);
  background.addColorStop(0, "#05080c");
  background.addColorStop(0.56, "#081017");
  background.addColorStop(1, "#030508");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, view.width, view.height);

  if (props.sceneId === "multiplication") {
    drawMultiplication(ctx, view, m, b, time);
    return;
  }

  if (props.sceneId === "systems") {
    drawLinearSystems(ctx, view, m, props.rhs);
    return;
  }

  if (props.sceneId === "singularity") {
    drawSingularity(ctx, view, m, time, props);
    return;
  }

  if (props.sceneId === "inverse") {
    drawGrid(ctx, view, 4, props.showGrid);
    drawTransformedGrid(ctx, view, m, 0.28, determinant(m) === 0 ? MAGENTA : CYAN);
    drawPointCloud(ctx, view, m, time, "inverse");
    drawTransformCore(ctx, view, m, {
      showUnitSquare: false,
      showParallelogram: props.showParallelogram,
      vectorField: false,
      showGrid: false,
      opacity: props.opacity,
      handles: true,
      basisLabels: true,
    });
    return;
  }

  if (props.sceneId === "compression") {
    drawGrid(ctx, view, 4, props.showGrid);
    drawTransformedGrid(ctx, view, m, 0.2, MAGENTA);
    drawPointCloud(ctx, view, m, time, "compression");
    drawTransformCore(ctx, view, m, {
      showUnitSquare: false,
      showParallelogram: props.showParallelogram,
      vectorField: false,
      showGrid: false,
      opacity: props.opacity,
      handles: true,
      basisLabels: true,
    });
    drawText(ctx, Math.abs(determinant(m)) < 0.02 ? "Plane → line" : "Area survives in proportion to |det(A)|", 42, 94, {
      color: Math.abs(determinant(m)) < 0.02 ? MAGENTA : AMBER,
      size: view.width < 760 ? 18 : 22,
      weight: 800,
    });
    return;
  }

  drawTransformCore(ctx, view, m, {
    showUnitSquare: props.showUnitSquare,
    showParallelogram: props.showParallelogram,
    vectorField: props.vectorField,
    showGrid: props.showGrid,
    opacity: props.opacity,
    handles: true,
    basisLabels: props.sceneId === "basis" || props.sceneId === "summary",
  });

  if (props.sceneId === "area" || props.sceneId === "explorer" || props.sceneId === "unit") {
    drawAreaBadge(ctx, view, m);
  }
  if (props.sceneId === "area" || props.sceneId === "explorer") {
    drawSignIndicator(ctx, view, m, time);
  }
  if (props.sceneId === "basis") {
    drawHudPanel(ctx, 34, 34, 360, 112);
    drawText(ctx, `Ae₁ = first column = (${formatNumber(m[0], 2)}, ${formatNumber(m[2], 2)})`, 58, 70, {
      color: CYAN,
      size: 15,
      weight: 720,
      font: "Georgia, serif",
    });
    drawText(ctx, `Ae₂ = second column = (${formatNumber(m[1], 2)}, ${formatNumber(m[3], 2)})`, 58, 106, {
      color: AMBER,
      size: 15,
      weight: 720,
      font: "Georgia, serif",
    });
  }
  if (props.sceneId === "summary") {
    drawSummary(ctx, view, m, props);
  }
}

export default function MatrixCanvas(props: MatrixCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const propsRef = useRef(props);
  const visualMatrixRef = useRef<Matrix2>(props.matrix);
  const visualBRef = useRef<Matrix2>(props.bMatrix);
  const viewRef = useRef<View>({ width: 1, height: 1, cx: 0, cy: 0, scale: 80 });
  const dragRef = useRef<DragTarget>(null);

  useEffect(() => {
    propsRef.current = props;
  }, [props]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let frame = 0;
    let last = performance.now();

    const render = (now: number) => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const width = Math.max(320, rect.width);
      const height = Math.max(320, rect.height);
      if (canvas.width !== Math.floor(width * dpr) || canvas.height !== Math.floor(height * dpr)) {
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const delta = Math.min(48, now - last);
      last = now;
      const t = propsRef.current.playing ? 1 - Math.exp(-delta / 95) : 1;
      visualMatrixRef.current = lerpMatrix(visualMatrixRef.current, propsRef.current.matrix, t);
      visualBRef.current = lerpMatrix(visualBRef.current, propsRef.current.bMatrix, t);

      const view: View = {
        width,
        height,
        cx: width * 0.52,
        cy: height * 0.55,
        scale: Math.min(width / 8.1, height / 7.25),
      };
      viewRef.current = view;
      drawScene(ctx, view, propsRef.current, visualMatrixRef.current, visualBRef.current, now);
      frame = requestAnimationFrame(render);
    };

    frame = requestAnimationFrame(render);
    return () => cancelAnimationFrame(frame);
  }, []);

  const getPointerWorld = (event: React.PointerEvent<HTMLCanvasElement>): Vec2 => {
    const rect = event.currentTarget.getBoundingClientRect();
    const screen: Vec2 = [event.clientX - rect.left, event.clientY - rect.top];
    return screenToWorld(viewRef.current, screen);
  };

  const hitTest = (point: Vec2): DragTarget => {
    const matrix = visualMatrixRef.current;
    const threshold = 16 / viewRef.current.scale;
    if (distance(point, firstColumn(matrix)) <= threshold) return "first";
    if (distance(point, secondColumn(matrix)) <= threshold) return "second";
    return null;
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const point = getPointerWorld(event);
    const target = hitTest(point);
    if (!target) return;
    dragRef.current = target;
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!dragRef.current) return;
    const [x, y] = getPointerWorld(event);
    const current = propsRef.current.matrix;
    if (dragRef.current === "first") {
      propsRef.current.onMatrixChange([x, current[1], y, current[3]]);
    } else {
      propsRef.current.onMatrixChange([current[0], x, current[2], y]);
    }
  };

  const endDrag = (event: React.PointerEvent<HTMLCanvasElement>) => {
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  return (
    <canvas
      ref={canvasRef}
      className="matrix-canvas"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      aria-label="Interactive canvas showing how a two by two matrix transforms the plane and unit square"
    />
  );
}

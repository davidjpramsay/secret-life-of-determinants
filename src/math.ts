export type Vec2 = [number, number];
export type Matrix2 = [number, number, number, number];

export const IDENTITY: Matrix2 = [1, 0, 0, 1];

export function applyMatrix(m: Matrix2, [x, y]: Vec2): Vec2 {
  return [m[0] * x + m[1] * y, m[2] * x + m[3] * y];
}

export function determinant(m: Matrix2): number {
  return m[0] * m[3] - m[1] * m[2];
}

export function multiplyMatrix(a: Matrix2, b: Matrix2): Matrix2 {
  return [
    a[0] * b[0] + a[1] * b[2],
    a[0] * b[1] + a[1] * b[3],
    a[2] * b[0] + a[3] * b[2],
    a[2] * b[1] + a[3] * b[3],
  ];
}

export function inverseMatrix(m: Matrix2): Matrix2 | null {
  const det = determinant(m);
  if (Math.abs(det) < 1e-6) return null;
  return [m[3] / det, -m[1] / det, -m[2] / det, m[0] / det];
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function lerpMatrix(a: Matrix2, b: Matrix2, t: number): Matrix2 {
  return [
    lerp(a[0], b[0], t),
    lerp(a[1], b[1], t),
    lerp(a[2], b[2], t),
    lerp(a[3], b[3], t),
  ];
}

export function rank(m: Matrix2): 0 | 1 | 2 {
  if (Math.abs(determinant(m)) > 1e-5) return 2;
  return m.some((value) => Math.abs(value) > 1e-5) ? 1 : 0;
}

export function singularValues(m: Matrix2): [number, number] {
  const [a, b, c, d] = m;
  const trace = a * a + b * b + c * c + d * d;
  const detSquared = determinant(m) ** 2;
  const discriminant = Math.sqrt(Math.max(0, trace * trace - 4 * detSquared));
  const lambdaMax = Math.max(0, (trace + discriminant) / 2);
  const lambdaMin = Math.max(0, (trace - discriminant) / 2);
  return [Math.sqrt(lambdaMax), Math.sqrt(lambdaMin)];
}

export function conditionNumber(m: Matrix2): number {
  const [sigmaMax, sigmaMin] = singularValues(m);
  if (sigmaMax < 1e-8) return Number.POSITIVE_INFINITY;
  if (sigmaMin < 1e-8) return Number.POSITIVE_INFINITY;
  return sigmaMax / sigmaMin;
}

export function vectorLength([x, y]: Vec2): number {
  return Math.hypot(x, y);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function signedAngle(a: Vec2, b: Vec2): number {
  return Math.atan2(a[0] * b[1] - a[1] * b[0], a[0] * b[0] + a[1] * b[1]);
}

export function formatNumber(value: number, digits = 3): string {
  if (!Number.isFinite(value)) return "∞";
  if (Math.abs(value) > 9999 || (Math.abs(value) < 0.001 && value !== 0)) {
    return value.toExponential(2);
  }
  return value.toFixed(digits).replace(/\.?0+$/, "");
}

export function matrixFromColumns(first: Vec2, second: Vec2): Matrix2 {
  return [first[0], second[0], first[1], second[1]];
}

export function firstColumn(m: Matrix2): Vec2 {
  return [m[0], m[2]];
}

export function secondColumn(m: Matrix2): Vec2 {
  return [m[1], m[3]];
}

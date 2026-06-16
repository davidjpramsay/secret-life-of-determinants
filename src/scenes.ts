import type { Matrix2 } from "./math";

export type SceneId =
  | "unit"
  | "area"
  | "singularity"
  | "inverse"
  | "systems"
  | "multiplication"
  | "basis"
  | "compression"
  | "explorer"
  | "summary";

export type Scene = {
  id: SceneId;
  title: string;
  short: string;
  matrix: Matrix2;
  rhs?: [number, number];
};

export const scenes: Scene[] = [
  {
    id: "unit",
    title: "The Unit Square",
    short: "Basis vectors stretch the square",
    matrix: [1.25, 0.35, 0.2, 1.05],
  },
  {
    id: "area",
    title: "Determinant as Area",
    short: "Area and orientation become visible",
    matrix: [1.45, 0.85, 0.35, 1.35],
  },
  {
    id: "singularity",
    title: "Approaching Singularity",
    short: "The square collapses toward a line",
    matrix: [1.0, 1.18, 0.25, 0.295],
  },
  {
    id: "inverse",
    title: "Why Singular Means No Inverse",
    short: "Lost information cannot be restored",
    matrix: [1.0, 1.0, 0.35, 0.35],
  },
  {
    id: "systems",
    title: "Linear Systems",
    short: "Determinant decides intersections",
    matrix: [1.2, -0.85, 0.75, 1.05],
    rhs: [1.15, 0.45],
  },
  {
    id: "multiplication",
    title: "Matrix Multiplication",
    short: "Area scaling multiplies",
    matrix: [1.15, -0.55, 0.45, 1.2],
  },
  {
    id: "basis",
    title: "Basis Vector Interpretation",
    short: "Columns are transformed basis vectors",
    matrix: [1.4, -0.3, 0.7, 1.2],
  },
  {
    id: "compression",
    title: "Information Compression",
    short: "Area survival becomes dimensional loss",
    matrix: [1, 0, 0, 0.1],
  },
  {
    id: "explorer",
    title: "Determinant Explorer",
    short: "Compare familiar transformations",
    matrix: [0.866, -0.5, 0.5, 0.866],
  },
  {
    id: "summary",
    title: "The Grand Summary",
    short: "The determinant measures area survival",
    matrix: [1.1, 0.55, -0.25, 1.2],
  },
];

export const matrixPresets: Array<{ label: string; matrix: Matrix2; detail: string }> = [
  { label: "Rotation", matrix: [0.866, -0.5, 0.5, 0.866], detail: "det = 1" },
  { label: "Reflection", matrix: [1, 0, 0, -1], detail: "det = -1" },
  { label: "Scaling", matrix: [1.7, 0, 0, 0.8], detail: "det = 1.36" },
  { label: "Shear", matrix: [1, 1.15, 0, 1], detail: "det = 1" },
  { label: "Projection", matrix: [1, 0, 0, 0], detail: "rank 1" },
  { label: "Near Singular", matrix: [1, 1.12, 0.32, 0.36], detail: "κ grows" },
  { label: "Flip + Stretch", matrix: [-0.9, 0.25, 0.35, 1.5], detail: "det < 0" },
  { label: "Random Calm", matrix: [1.2, -0.45, 0.6, 0.9], detail: "invertible" },
];

export const systemCases = [
  {
    label: "Unique",
    matrix: [1.2, -0.8, 0.7, 1.1] as Matrix2,
    rhs: [1.1, 0.35] as [number, number],
    note: "Two lines meet once.",
  },
  {
    label: "No solution",
    matrix: [1, -0.7, 2, -1.4] as Matrix2,
    rhs: [0.8, 2.3] as [number, number],
    note: "Parallel lines never meet.",
  },
  {
    label: "Infinite",
    matrix: [1, -0.7, 2, -1.4] as Matrix2,
    rhs: [0.8, 1.6] as [number, number],
    note: "Both equations describe the same line.",
  },
];

export const compressionPresets: Array<{ label: string; matrix: Matrix2 }> = [
  { label: "det 2", matrix: [2, 0, 0, 1] },
  { label: "det 1", matrix: [1, 0.4, 0, 1] },
  { label: "det 0.5", matrix: [1, 0, 0, 0.5] },
  { label: "det 0.1", matrix: [1, 0.2, 0, 0.1] },
  { label: "det 0.01", matrix: [1, 0.08, 0, 0.01] },
  { label: "det 0", matrix: [1, 0.3, 0, 0] },
];

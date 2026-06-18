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
  question: string;
  watch: string;
  takeaway: string;
  matrix: Matrix2;
  rhs?: [number, number];
};

export const scenes: Scene[] = [
  {
    id: "unit",
    title: "The Unit Square",
    short: "Basis vectors stretch the square",
    question: "A matrix moves e1 and e2; the square follows.",
    watch: "Cyan and amber columns become the new sides.",
    takeaway: "det(A) is signed parallelogram area.",
    matrix: [1.25, 0.35, 0.2, 1.05],
  },
  {
    id: "area",
    title: "Determinant as Area",
    short: "Area and orientation become visible",
    question: "The sign tells whether orientation survived.",
    watch: "Loop arrows reverse when det(A) changes sign.",
    takeaway: "Area scaling is |det(A)|.",
    matrix: [1.45, 0.85, 0.35, 1.35],
  },
  {
    id: "singularity",
    title: "Approaching Singularity",
    short: "The square collapses toward a line",
    question: "Parallel columns crush the plane into a line.",
    watch: "Area shrinks, det(A) -> 0, and κ explodes.",
    takeaway: "At det(A) = 0, many inputs share one output.",
    matrix: [1.0, 1.18, 0.25, 0.295],
  },
  {
    id: "inverse",
    title: "Why Singular Means No Inverse",
    short: "Lost information cannot be restored",
    question: "An inverse needs one input per output.",
    watch: "Separated clouds can return; collapsed clouds cannot.",
    takeaway: "A crushed dimension cannot be rebuilt uniquely.",
    matrix: [1.0, 1.0, 0.35, 0.35],
  },
  {
    id: "systems",
    title: "Linear Systems",
    short: "Determinant decides intersections",
    question: "Solving Ax = b asks where two lines meet.",
    watch: "det(A) != 0 gives one crossing.",
    takeaway: "det(A) = 0 means parallel or identical lines.",
    matrix: [1.2, -0.85, 0.75, 1.05],
    rhs: [1.15, 0.45],
  },
  {
    id: "multiplication",
    title: "Matrix Multiplication",
    short: "Area scaling multiplies",
    question: "AB means B acts first, then A acts on the result.",
    watch: "Area changes once under B and again under A.",
    takeaway: "Area is scaled twice, so determinants multiply.",
    matrix: [1.15, -0.55, 0.45, 1.2],
  },
  {
    id: "basis",
    title: "Basis Vector Interpretation",
    short: "Columns are transformed basis vectors",
    question: "The columns of A are Ae1 and Ae2.",
    watch: "Drag a column vector; its entries update.",
    takeaway: "Two column images determine the whole map.",
    matrix: [1.4, -0.3, 0.7, 1.2],
  },
  {
    id: "compression",
    title: "Information Compression",
    short: "Area survival becomes dimensional loss",
    question: "Small determinant means the plane is being squeezed thin.",
    watch: "Particles pack into a thinner band as det(A) falls.",
    takeaway: "At det(A) = 0, plane becomes line.",
    matrix: [1, 0, 0, 0.1],
  },
  {
    id: "explorer",
    title: "Determinant Explorer",
    short: "Compare familiar transformations",
    question: "Every 2x2 preset has a determinant story.",
    watch: "Compare area, sign, rank, and invertibility.",
    takeaway: "One number connects several geometric facts.",
    matrix: [0.866, -0.5, 0.5, 0.866],
  },
  {
    id: "summary",
    title: "The Grand Summary",
    short: "The determinant measures area survival",
    question: "A determinant is not merely a number.",
    watch: "Connect basis vectors, area, rank, and systems.",
    takeaway: "It measures how much area survives a transformation.",
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
    badge: "det != 0",
    matrix: [1.2, -0.8, 0.7, 1.1] as Matrix2,
    rhs: [1.1, 0.35] as [number, number],
    note: "Two lines meet once.",
  },
  {
    label: "No solution",
    badge: "det = 0",
    matrix: [1, -0.7, 2, -1.4] as Matrix2,
    rhs: [0.8, 2.3] as [number, number],
    note: "Parallel lines never meet.",
  },
  {
    label: "Infinite",
    badge: "det = 0",
    matrix: [1, -0.7, 2, -1.4] as Matrix2,
    rhs: [0.8, 1.6] as [number, number],
    note: "Both equations describe the same line.",
  },
];

export const singularityPresets: Array<{ label: string; matrix: Matrix2; detail: string }> = [
  { label: "Wide area", matrix: [1.1, 0.15, 0.25, 1.05], detail: "det safely away from 0" },
  { label: "Nearly parallel", matrix: [1, 1.16, 0.25, 0.31], detail: "condition number rises" },
  { label: "Exact collapse", matrix: [1, 1.18, 0.25, 0.295], detail: "det = 0, rank 1" },
  { label: "Cross through zero", matrix: [1, 1.35, 0.25, 0.18], detail: "orientation flips after collapse" },
];

export const compressionPresets: Array<{ label: string; matrix: Matrix2; detail: string }> = [
  { label: "det 2", matrix: [2, 0, 0, 1], detail: "area doubles" },
  { label: "det 1", matrix: [1, 0.4, 0, 1], detail: "area preserved" },
  { label: "det 0.5", matrix: [1, 0, 0, 0.5], detail: "half survives" },
  { label: "det 0.1", matrix: [1, 0.2, 0, 0.1], detail: "thin band" },
  { label: "det 0.01", matrix: [1, 0.08, 0, 0.01], detail: "almost a line" },
  { label: "det 0", matrix: [1, 0.3, 0, 0], detail: "plane -> line" },
];

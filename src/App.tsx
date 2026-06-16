import {
  Activity,
  AlertTriangle,
  Columns3,
  Combine,
  Gauge,
  Grid3X3,
  Layers3,
  MoveDiagonal2,
  Pause,
  Play,
  RefreshCcw,
  RotateCcw,
  Search,
  Sigma,
  SlidersHorizontal,
  SquareFunction,
  Waypoints,
  type LucideIcon,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import MatrixCanvas from "./MatrixCanvas";
import {
  conditionNumber,
  determinant,
  firstColumn,
  formatNumber,
  multiplyMatrix,
  rank,
  secondColumn,
  singularValues,
  type Matrix2,
} from "./math";
import { compressionPresets, matrixPresets, scenes, systemCases, type Scene, type SceneId } from "./scenes";

const defaultB: Matrix2 = [0.85, 0.65, -0.45, 1.2];

const sceneIcons: Record<SceneId, LucideIcon> = {
  unit: Grid3X3,
  area: MoveDiagonal2,
  singularity: AlertTriangle,
  inverse: RefreshCcw,
  systems: SquareFunction,
  multiplication: Combine,
  basis: Columns3,
  compression: Waypoints,
  explorer: Search,
  summary: Sigma,
};

const matrixLabels = ["a", "b", "c", "d"];
type StatTone = "safe" | "danger" | "flip" | "muted";

function initialSceneIndex(): number {
  const sceneParam = new URLSearchParams(window.location.search).get("scene")?.toLowerCase();
  if (!sceneParam) return 0;
  const numeric = Number(sceneParam);
  if (Number.isInteger(numeric) && numeric >= 1 && numeric <= scenes.length) return numeric - 1;
  const byId = scenes.findIndex((scene) => scene.id === sceneParam);
  if (byId >= 0) return byId;
  const byTitle = scenes.findIndex((scene) => scene.title.toLowerCase().replace(/[^a-z0-9]+/g, "-") === sceneParam);
  return byTitle >= 0 ? byTitle : 0;
}

function updateMatrixEntry(matrix: Matrix2, index: number, value: number): Matrix2 {
  const next = [...matrix] as Matrix2;
  next[index] = value;
  return next;
}

function orientationLabel(det: number): string {
  if (Math.abs(det) < 1e-6) return "Collapsed";
  return det > 0 ? "Preserved" : "Flipped";
}

function invertibleLabel(det: number): string {
  return Math.abs(det) > 1e-6 ? "Yes" : "No";
}

function matrixClass(det: number): Exclude<StatTone, "muted"> {
  if (Math.abs(det) < 0.08) return "danger";
  if (det < 0) return "flip";
  return "safe";
}

function formatEquation(a: number, b: number, c: number) {
  const sign = b >= 0 ? "+" : "-";
  return `${formatNumber(a, 2)}x ${sign} ${formatNumber(Math.abs(b), 2)}y = ${formatNumber(c, 2)}`;
}

function SceneButton({
  scene,
  index,
  active,
  onClick,
}: {
  scene: Scene;
  index: number;
  active: boolean;
  onClick: () => void;
}) {
  const Icon = sceneIcons[scene.id];
  return (
    <button className={`scene-button ${active ? "active" : ""}`} onClick={onClick} type="button">
      <span className="scene-number">{index + 1}</span>
      <span className="scene-copy">
        <span>{scene.title}</span>
        <small>{scene.short}</small>
      </span>
      <Icon size={19} strokeWidth={1.7} />
    </button>
  );
}

function StatRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "safe" | "danger" | "flip" | "muted";
}) {
  return (
    <div className="stat-row">
      <span>{label}</span>
      <strong className={tone}>{value}</strong>
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="toggle-row">
      <span>{label}</span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
    </label>
  );
}

function MatrixEditor({
  title,
  matrix,
  onChange,
  compact = false,
}: {
  title: string;
  matrix: Matrix2;
  onChange: (matrix: Matrix2) => void;
  compact?: boolean;
}) {
  return (
    <section className={`panel-section ${compact ? "compact" : ""}`}>
      <div className="section-title">
        <span>{title}</span>
        <span className="matrix-bracket">2×2</span>
      </div>
      <div className="matrix-editor" aria-label={`${title} entries`}>
        {matrix.map((entry, index) => (
          <label className="matrix-cell" key={`${title}-${matrixLabels[index]}`}>
            <span>{matrixLabels[index]}</span>
            <input
              type="number"
              value={Number(entry.toFixed(3))}
              min={-3}
              max={3}
              step={0.01}
              onChange={(event) => onChange(updateMatrixEntry(matrix, index, Number(event.target.value)))}
            />
            <input
              type="range"
              min={-3}
              max={3}
              step={0.01}
              value={entry}
              onChange={(event) => onChange(updateMatrixEntry(matrix, index, Number(event.target.value)))}
            />
          </label>
        ))}
      </div>
    </section>
  );
}

function SceneControls({
  activeScene,
  matrix,
  rhs,
  bMatrix,
  onMatrix,
  onRhs,
  onBMatrix,
}: {
  activeScene: Scene;
  matrix: Matrix2;
  rhs: [number, number];
  bMatrix: Matrix2;
  onMatrix: (matrix: Matrix2) => void;
  onRhs: (rhs: [number, number]) => void;
  onBMatrix: (matrix: Matrix2) => void;
}) {
  if (activeScene.id === "systems") {
    return (
      <section className="panel-section">
        <div className="section-title">
          <span>System Morph</span>
          <SquareFunction size={16} />
        </div>
        <div className="case-buttons">
          {systemCases.map((systemCase) => (
            <button
              key={systemCase.label}
              type="button"
              onClick={() => {
                onMatrix(systemCase.matrix);
                onRhs(systemCase.rhs);
              }}
            >
              <strong>{systemCase.label}</strong>
              <span>{systemCase.note}</span>
            </button>
          ))}
        </div>
        <div className="equation-box">
          <span>{formatEquation(matrix[0], matrix[1], rhs[0])}</span>
          <span>{formatEquation(matrix[2], matrix[3], rhs[1])}</span>
        </div>
        <label className="rhs-slider">
          <span>c₁</span>
          <input
            type="range"
            min={-3}
            max={3}
            step={0.01}
            value={rhs[0]}
            onChange={(event) => onRhs([Number(event.target.value), rhs[1]])}
          />
          <strong>{formatNumber(rhs[0], 2)}</strong>
        </label>
        <label className="rhs-slider">
          <span>c₂</span>
          <input
            type="range"
            min={-3}
            max={3}
            step={0.01}
            value={rhs[1]}
            onChange={(event) => onRhs([rhs[0], Number(event.target.value)])}
          />
          <strong>{formatNumber(rhs[1], 2)}</strong>
        </label>
      </section>
    );
  }

  if (activeScene.id === "multiplication") {
    const product = multiplyMatrix(matrix, bMatrix);
    return (
      <>
        <MatrixEditor title="Matrix B" matrix={bMatrix} onChange={onBMatrix} compact />
        <section className="panel-section">
          <div className="section-title">
            <span>Area Product</span>
            <Combine size={16} />
          </div>
          <StatRow label="det(A)" value={formatNumber(determinant(matrix), 4)} />
          <StatRow label="det(B)" value={formatNumber(determinant(bMatrix), 4)} />
          <StatRow label="det(AB)" value={formatNumber(determinant(product), 4)} tone="safe" />
          <p className="insight-line">
            det(AB) tracks the two area changes multiplied in sequence.
          </p>
        </section>
      </>
    );
  }

  if (activeScene.id === "compression") {
    return (
      <section className="panel-section">
        <div className="section-title">
          <span>Compression Presets</span>
          <Waypoints size={16} />
        </div>
        <div className="preset-grid">
          {compressionPresets.map((preset) => (
            <button key={preset.label} type="button" onClick={() => onMatrix(preset.matrix)}>
              {preset.label}
            </button>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="panel-section">
      <div className="section-title">
        <span>Presets</span>
        <SlidersHorizontal size={16} />
      </div>
      <div className="preset-grid">
        {matrixPresets.map((preset) => (
          <button key={preset.label} type="button" onClick={() => onMatrix(preset.matrix)}>
            <strong>{preset.label}</strong>
            <span>{preset.detail}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function InsightPanel({ scene, matrix }: { scene: Scene; matrix: Matrix2 }) {
  const det = determinant(matrix);
  if (scene.id === "singularity") {
    return (
      <section className="warning-panel">
        <AlertTriangle size={24} />
        <div>
          <strong>Information is being destroyed.</strong>
          <span>As det(A) approaches zero, distinct inputs collapse together.</span>
        </div>
      </section>
    );
  }
  if (scene.id === "inverse" && Math.abs(det) < 1e-6) {
    return (
      <section className="warning-panel">
        <RefreshCcw size={24} />
        <div>
          <strong>No unique reverse transformation exists.</strong>
          <span>A collapsed dimension cannot be reconstructed uniquely.</span>
        </div>
      </section>
    );
  }
  if (scene.id === "summary") {
    return (
      <section className="quote-panel">
        <strong>A determinant is not merely a number.</strong>
        <span>It measures how much area survives a transformation.</span>
        {Math.abs(det) < 0.08 && <em>The transformation destroys a dimension.</em>}
      </section>
    );
  }
  return (
    <section className="quote-panel compact-quote">
      <strong>{scene.title}</strong>
      <span>{scene.short}</span>
    </section>
  );
}

function PlaybackBar({
  activeIndex,
  playing,
  onTogglePlaying,
  onScene,
  onReset,
}: {
  activeIndex: number;
  playing: boolean;
  onTogglePlaying: () => void;
  onScene: (index: number) => void;
  onReset: () => void;
}) {
  return (
    <footer className="playback">
      <button className="transport main" type="button" onClick={onTogglePlaying} aria-label={playing ? "Pause" : "Play"}>
        {playing ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
      </button>
      <button className="transport" type="button" onClick={onReset} aria-label="Reset scene">
        <RotateCcw size={18} />
      </button>
      <div className="timeline" aria-label="Scene timeline">
        {scenes.map((scene, index) => (
          <button
            key={scene.id}
            type="button"
            className={index === activeIndex ? "active" : ""}
            onClick={() => onScene(index)}
            aria-label={`Scene ${index + 1}: ${scene.title}`}
          >
            <span>{index + 1}</span>
          </button>
        ))}
      </div>
      <div className="scene-time">
        Scene {activeIndex + 1} / {scenes.length}
      </div>
    </footer>
  );
}

export default function App() {
  const startingIndex = useMemo(() => initialSceneIndex(), []);
  const [activeIndex, setActiveIndex] = useState(startingIndex);
  const [matrix, setMatrix] = useState<Matrix2>(scenes[startingIndex].matrix);
  const [bMatrix, setBMatrix] = useState<Matrix2>(defaultB);
  const [rhs, setRhs] = useState<[number, number]>(scenes[startingIndex].rhs ?? [1.15, 0.45]);
  const [vectorField, setVectorField] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [showUnitSquare, setShowUnitSquare] = useState(true);
  const [showParallelogram, setShowParallelogram] = useState(true);
  const [opacity, setOpacity] = useState(0.72);
  const [playing, setPlaying] = useState(true);
  const inspectorRef = useRef<HTMLElement | null>(null);

  const activeScene = scenes[activeIndex];
  const det = determinant(matrix);
  const cond = conditionNumber(matrix);
  const currentRank = rank(matrix);
  const [sigmaMax, sigmaMin] = singularValues(matrix);
  const first = firstColumn(matrix);
  const second = secondColumn(matrix);

  const facts = useMemo<Array<{ label: string; value: string; tone: StatTone }>>(
    () => [
      { label: "det(A)", value: formatNumber(det, 5), tone: matrixClass(det) },
      { label: "Area scaling", value: formatNumber(Math.abs(det), 5), tone: Math.abs(det) < 0.08 ? "danger" : "safe" },
      { label: "Orientation", value: orientationLabel(det), tone: matrixClass(det) },
      { label: "Invertible", value: invertibleLabel(det), tone: Math.abs(det) > 1e-6 ? "safe" : "danger" },
      { label: "Rank", value: String(currentRank), tone: currentRank === 2 ? "safe" : "danger" },
      { label: "Condition number", value: formatNumber(cond, 3), tone: cond > 80 ? "danger" : "safe" },
    ],
    [cond, currentRank, det],
  );

  const chooseScene = (index: number) => {
    const scene = scenes[index];
    setActiveIndex(index);
    setMatrix(scene.matrix);
    setRhs(scene.rhs ?? rhs);
    window.history.replaceState(null, "", `?scene=${scene.id}`);
    requestAnimationFrame(() => inspectorRef.current?.scrollTo({ top: 0 }));
  };

  const resetScene = () => {
    setMatrix(activeScene.matrix);
    setRhs(activeScene.rhs ?? [1.15, 0.45]);
    if (activeScene.id === "multiplication") setBMatrix(defaultB);
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">
            <Sigma size={20} />
          </span>
          <h1>The Secret Life of Determinants</h1>
        </div>
        <div className="top-actions">
          <span className={`status-dot ${matrixClass(det)}`} />
          <span>{Math.abs(det) < 0.08 ? "near singular" : "live transformation"}</span>
        </div>
      </header>

      <div className="workspace">
        <nav className="scene-rail" aria-label="Scenes">
          <div className="rail-title">
            <Layers3 size={17} />
            <span>Scenes</span>
          </div>
          <div className="scene-list">
            {scenes.map((scene, index) => (
              <SceneButton
                key={scene.id}
                scene={scene}
                index={index}
                active={index === activeIndex}
                onClick={() => chooseScene(index)}
              />
            ))}
          </div>
        </nav>

        <main className="stage">
          <div className="canvas-frame">
            <MatrixCanvas
              matrix={matrix}
              bMatrix={bMatrix}
              sceneId={activeScene.id}
              rhs={rhs}
              onMatrixChange={setMatrix}
              vectorField={vectorField}
              showGrid={showGrid}
              showUnitSquare={showUnitSquare}
              showParallelogram={showParallelogram}
              opacity={opacity}
              playing={playing}
            />
            <div className="scene-chip">
              <span>{activeIndex + 1}</span>
              <strong>{activeScene.title}</strong>
            </div>
          </div>
          <PlaybackBar
            activeIndex={activeIndex}
            playing={playing}
            onTogglePlaying={() => setPlaying((value) => !value)}
            onScene={chooseScene}
            onReset={resetScene}
          />
        </main>

        <aside className="inspector" ref={inspectorRef}>
          <MatrixEditor title="Matrix A" matrix={matrix} onChange={setMatrix} />

          <section className="panel-section">
            <div className="section-title">
              <span>Determinant & Geometry</span>
              <Activity size={16} />
            </div>
            <div className="stats">
              {facts.map((fact) => (
                <StatRow key={fact.label} label={fact.label} value={fact.value} tone={fact.tone} />
              ))}
            </div>
          </section>

          <section className="panel-section">
            <div className="section-title">
              <span>Columns</span>
              <Columns3 size={16} />
            </div>
            <div className="column-readouts">
              <span className="cyan">Ae₁ = ({formatNumber(first[0], 2)}, {formatNumber(first[1], 2)})</span>
              <span className="amber">Ae₂ = ({formatNumber(second[0], 2)}, {formatNumber(second[1], 2)})</span>
              <span>σ₁ = {formatNumber(sigmaMax, 3)} · σ₂ = {formatNumber(sigmaMin, 3)}</span>
            </div>
          </section>

          <section className="panel-section">
            <div className="section-title">
              <span>Visual Layers</span>
              <Gauge size={16} />
            </div>
            <Toggle label="Vector field" checked={vectorField} onChange={setVectorField} />
            <Toggle label="Grid" checked={showGrid} onChange={setShowGrid} />
            <Toggle label="Unit square" checked={showUnitSquare} onChange={setShowUnitSquare} />
            <Toggle label="Parallelogram" checked={showParallelogram} onChange={setShowParallelogram} />
            <label className="rhs-slider">
              <span>Trace opacity</span>
              <input
                type="range"
                min={0.15}
                max={1}
                step={0.01}
                value={opacity}
                onChange={(event) => setOpacity(Number(event.target.value))}
              />
              <strong>{Math.round(opacity * 100)}%</strong>
            </label>
          </section>

          <SceneControls
            activeScene={activeScene}
            matrix={matrix}
            rhs={rhs}
            bMatrix={bMatrix}
            onMatrix={setMatrix}
            onRhs={setRhs}
            onBMatrix={setBMatrix}
          />

          <InsightPanel scene={activeScene} matrix={matrix} />
        </aside>
      </div>
    </div>
  );
}

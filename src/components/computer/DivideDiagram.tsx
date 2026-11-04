import type { Vec3 } from "src/lib/computer/graphics/matrix";
import styles from "./Graphics.module.css";
import { fixed } from "./GraphicsParts";

const WIDTH = 520;
const HEIGHT = 210;
const LEFT = 26;
const RIGHT = 74;
const MIDDLE = HEIGHT / 2;

/**
 * The camera from the side, looking right. Height over distance is all a vertex
 * has left once it reaches the screen, so the ruler on the right shows y ÷ w.
 */
export function DivideDiagram({
  points,
  picked,
  fov,
  near,
  far,
}: {
  /** Camera-space positions. */
  points: readonly Vec3[];
  picked: number;
  fov: number;
  near: number;
  far: number;
}) {
  const tan = Math.tan((fov * Math.PI) / 360);
  const span = WIDTH - LEFT - RIGHT;
  const scale = Math.min(span / far, (HEIGHT / 2 - 10) / (far * tan));
  const toX = (depth: number) => LEFT + depth * scale;
  const toY = (y: number) => MIDDLE - y * scale;
  const rulerX = WIDTH - RIGHT + 26;
  const rulerSize = HEIGHT / 2 - 16;
  const onRuler = (ndcY: number) => MIDDLE - ndcY * rulerSize;
  const view = points[picked];
  const w = -view[2];
  const inFront = w > 0;
  const ndcY = inFront ? view[1] / w / tan : 0;

  return (
    <svg
      className={styles.diagram}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      role="img"
      aria-label={`Seen from the side: y ${fixed(view[1])} at distance w ${fixed(w)} lands at ${fixed(ndcY)} on the screen.`}
    >
      <path
        d={`M${LEFT} ${MIDDLE} L${toX(far)} ${toY(far * tan)} L${toX(far)} ${toY(-far * tan)} Z`}
        fill="#38e1ff12"
        stroke="#38e1ff"
        strokeWidth={1}
      />
      <line
        x1={toX(near)}
        y1={toY(near * tan)}
        x2={toX(near)}
        y2={toY(-near * tan)}
        stroke="#38e1ff"
        strokeWidth={3}
      />
      <line
        x1={LEFT}
        y1={MIDDLE}
        x2={toX(far)}
        y2={MIDDLE}
        stroke="#ffffff22"
        strokeDasharray="3 4"
      />
      {points.map((point, i) => {
        const depth = -point[2];
        if (depth <= 0 || i === picked) return null;
        return (
          <circle key={i} cx={toX(depth)} cy={toY(point[1])} r={2.2} fill="#8fa3ff" opacity={0.7} />
        );
      })}
      {inFront && (
        <>
          <line
            x1={LEFT}
            y1={MIDDLE}
            x2={toX(w)}
            y2={toY(view[1])}
            stroke="#fff"
            strokeWidth={1.4}
            strokeDasharray="5 4"
          />
          <line
            x1={toX(w)}
            y1={MIDDLE}
            x2={toX(w)}
            y2={toY(view[1])}
            stroke="#5ef0a0"
            strokeWidth={2.5}
          />
          <line x1={LEFT} y1={MIDDLE} x2={toX(w)} y2={MIDDLE} stroke="#ffd166" strokeWidth={2.5} />
          <text x={(LEFT + toX(w)) / 2} y={MIDDLE + (view[1] > 0 ? 15 : -7)} fill="#ffd166">
            w {fixed(w)}
          </text>
          <text x={toX(w) + 5} y={(MIDDLE + toY(view[1])) / 2 + 4} fill="#5ef0a0">
            y {fixed(view[1])}
          </text>
          <circle
            cx={toX(w)}
            cy={toY(view[1])}
            r={5}
            fill="#fff"
            stroke="#0a0c12"
            strokeWidth={1.5}
          />
        </>
      )}
      <circle cx={LEFT} cy={MIDDLE} r={5} fill="#38e1ff" stroke="#fff" strokeWidth={1.5} />

      {/* The screen, from -1 to 1, with every vertex where the divide lands it. */}
      <line
        x1={rulerX}
        y1={onRuler(1)}
        x2={rulerX}
        y2={onRuler(-1)}
        stroke="#dfe7ff"
        strokeWidth={2}
      />
      {[1, 0, -1].map((tick) => (
        <g key={tick}>
          <line
            x1={rulerX - 4}
            x2={rulerX + 4}
            y1={onRuler(tick)}
            y2={onRuler(tick)}
            stroke="#dfe7ff"
          />
          <text x={rulerX + 8} y={onRuler(tick) + 4} fill="#8d97ad" fontSize={10}>
            {tick}
          </text>
        </g>
      ))}
      {points.map((point, i) => {
        const depth = -point[2];
        if (depth <= 0 || i === picked) return null;
        const at = point[1] / depth / tan;
        if (Math.abs(at) > 1) return null;
        return <circle key={i} cx={rulerX} cy={onRuler(at)} r={2} fill="#8fa3ff" opacity={0.8} />;
      })}
      {inFront && Math.abs(ndcY) <= 1 && (
        <circle
          cx={rulerX}
          cy={onRuler(ndcY)}
          r={5}
          fill="#fff"
          stroke="#0a0c12"
          strokeWidth={1.5}
        />
      )}
      {inFront && (
        <text
          x={rulerX - 8}
          y={Math.min(HEIGHT - 6, Math.max(14, onRuler(Math.max(-1, Math.min(1, ndcY))) - 9))}
          textAnchor="end"
          fill="#fff"
        >
          {fixed(ndcY)}
        </text>
      )}
    </svg>
  );
}

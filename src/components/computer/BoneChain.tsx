import { type KeyboardEvent, type PointerEvent, useMemo, useRef, useState } from "react";
import { usePanelSound } from "src/hooks/usePanelSound";
import {
  type Mat,
  multiply,
  radians,
  rotate2,
  transform,
  translate2,
} from "src/lib/computer/graphics/matrix";
import styles from "./Graphics.module.css";
import {
  Bay,
  fixed,
  GraphicsPanel,
  MatrixGrid,
  PlayBar,
  Slider,
  Toggle,
  useAnimation,
  useTimeline,
} from "./GraphicsParts";

const WIDTH = 480;
const HEIGHT = 330;
const UNIT = 44;
const ROOT = [-3.6, -2.4] as const;
const LENGTHS = [1.9, 1.6, 1.3, 1];
// Rounded: a server and a browser may disagree on the last digit of a sine.
const toX = (x: number) => Math.round((WIDTH / 2 + x * UNIT) * 100) / 100;
const toY = (y: number) => Math.round((HEIGHT / 2 - y * UNIT) * 100) / 100;
const BONE_COLORS = ["#38e1ff", "#8b6cff", "#ff5cc8", "#ffd166"];
const FIRST_ANGLES = [58, -36, -28, 44];

const along = (m: Mat, x: number, y: number) => {
  const [a, b] = transform(m, [x, y, 1]);
  return [a, b] as const;
};

/** Four bones in a chain. Each stores only its own turn; its place in the world is multiplied up. */
export function BoneChain() {
  const sound = usePanelSound();
  const [angles, setAngles] = useState(FIRST_ANGLES);
  const [selected, setSelected] = useState(2);
  const [follow, setFollow] = useState(true);
  const [waving, setWaving] = useState(false);
  const [waveTime, setWaveTime] = useState(0);
  const pose = useTimeline(4);
  const held = useRef<number | null>(null);

  useAnimation(waving, (seconds) => setWaveTime((t) => t + seconds));

  // Posed one bone after another, from the root out.
  const shown = useMemo(() => {
    const at = pose.t * angles.length;
    return angles.map((angle, i) => {
      const amount = Math.max(0, Math.min(1, at - i));
      const wave = waving ? Math.sin(waveTime * 2 + i * 0.9) * 22 : 0;
      return angle * amount + wave;
    });
  }, [angles, pose.t, waving, waveTime]);

  const bones = useMemo(() => {
    let parent: Mat = translate2(ROOT[0], ROOT[1]);
    let offset = 0;
    return shown.map((angle, i) => {
      // Without a parent, each bone turns about its own resting place and nothing else.
      const local = multiply(translate2(i === 0 ? 0 : LENGTHS[i - 1], 0), rotate2(radians(angle)));
      const base = translate2(ROOT[0] + offset, ROOT[1]);
      const world = follow ? multiply(parent, local) : multiply(base, rotate2(radians(angle)));
      const before = parent;
      parent = world;
      offset += LENGTHS[i];
      return { local, world, parent: before };
    });
  }, [shown, follow]);

  const setAngle = (bone: number, value: number) =>
    setAngles((list) => list.map((angle, i) => (i === bone ? value : angle)));

  const pointerMove = (event: PointerEvent<SVGSVGElement>) => {
    if (held.current === null) return;
    const box = event.currentTarget.getBoundingClientRect();
    const x = (((event.clientX - box.left) / box.width) * WIDTH - WIDTH / 2) / UNIT;
    const y = (HEIGHT / 2 - ((event.clientY - box.top) / box.height) * HEIGHT) / UNIT;
    const bone = held.current;
    const [jx, jy] = along(bones[bone].world, 0, 0);
    const worldAngle = (Math.atan2(y - jy, x - jx) * 180) / Math.PI;
    const parentAngle = follow ? shown.slice(0, bone).reduce((sum, a) => sum + a, 0) : 0;
    let next = worldAngle - parentAngle;
    while (next > 180) next -= 360;
    while (next < -180) next += 360;
    setAngle(bone, Math.round(next));
  };

  const keyboard = (event: KeyboardEvent, bone: number) => {
    const step = { ArrowLeft: 5, ArrowUp: 5, ArrowRight: -5, ArrowDown: -5 }[event.key];
    if (!step) return;
    event.preventDefault();
    setAngle(bone, Math.max(-180, Math.min(180, angles[bone] + step)));
  };

  const worldAngle = (bone: number) =>
    follow ? shown.slice(0, bone + 1).reduce((sum, a) => sum + a, 0) : shown[bone];

  return (
    <GraphicsPanel title="A CHAIN OF BONES" sound={sound}>
      <Bay>
        <div className={styles.screen}>
          <svg
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            className={styles.plane}
            role="group"
            aria-label="A chain of four bones. Drag a bone to turn it."
            onPointerMove={pointerMove}
            onPointerUp={() => {
              held.current = null;
            }}
            onPointerCancel={() => {
              held.current = null;
            }}
          >
            <rect width={WIDTH} height={HEIGHT} fill="#0a0c12" />
            {Array.from({ length: 21 }, (_, i) => i - 10).map((i) => (
              <g key={i} stroke="#2c3652" strokeWidth={0.6} opacity={0.5}>
                <line x1={toX(i)} y1={0} x2={toX(i)} y2={HEIGHT} />
                <line x1={0} y1={toY(i)} x2={WIDTH} y2={toY(i)} />
              </g>
            ))}
            <line
              x1={toX(ROOT[0])}
              y1={toY(ROOT[1])}
              x2={toX(ROOT[0] + LENGTHS.reduce((sum, l) => sum + l, 0))}
              y2={toY(ROOT[1])}
              stroke="#8fa3ff"
              strokeDasharray="4 4"
              opacity={0.5}
            />
            {bones.map(({ world }, i) => {
              const [x0, y0] = along(world, 0, 0);
              const [x1, y1] = along(world, LENGTHS[i], 0);
              const dx = x1 - x0;
              const dy = y1 - y0;
              const girth = 0.14;
              const body = [
                [x0, y0],
                [x0 + dx * 0.15 - dy * girth, y0 + dy * 0.15 + dx * girth],
                [x1, y1],
                [x0 + dx * 0.15 + dy * girth, y0 + dy * 0.15 - dx * girth],
              ]
                .map(([x, y]) => `${toX(x).toFixed(1)},${toY(y).toFixed(1)}`)
                .join(" ");
              const isSelected = i === selected;
              return (
                <g
                  key={i}
                  className={styles.handle}
                  role="slider"
                  tabIndex={0}
                  aria-label={`Bone ${i + 1}`}
                  aria-valuenow={angles[i]}
                  aria-valuemin={-180}
                  aria-valuemax={180}
                  onPointerDown={(event) => {
                    held.current = i;
                    setSelected(i);
                    event.currentTarget.ownerSVGElement?.setPointerCapture?.(event.pointerId);
                  }}
                  onFocus={() => setSelected(i)}
                  onKeyDown={(event) => keyboard(event, i)}
                >
                  <polygon
                    points={body}
                    fill={BONE_COLORS[i]}
                    fillOpacity={isSelected ? 0.85 : 0.5}
                    stroke={isSelected ? "#fff" : BONE_COLORS[i]}
                    strokeWidth={isSelected ? 2 : 1}
                  />
                  <circle cx={toX(x0)} cy={toY(y0)} r={5} fill="#fff" stroke="#0a0c12" />
                </g>
              );
            })}
            {/* Each bone carries its own axes: its own small coordinate space. */}
            {bones.map(({ world }, i) => {
              const [ox, oy] = along(world, 0, 0);
              const [xx, xy] = along(world, 0.6, 0);
              const [yx, yy] = along(world, 0, 0.6);
              return (
                <g key={i} pointerEvents="none">
                  <line
                    x1={toX(ox)}
                    y1={toY(oy)}
                    x2={toX(xx)}
                    y2={toY(xy)}
                    stroke="#ff6b7a"
                    strokeWidth={2}
                  />
                  <line
                    x1={toX(ox)}
                    y1={toY(oy)}
                    x2={toX(yx)}
                    y2={toY(yy)}
                    stroke="#5ef0a0"
                    strokeWidth={2}
                  />
                </g>
              );
            })}
          </svg>
        </div>
        <PlayBar
          button="POSE IT"
          label="POSED"
          timeline={pose}
          format={(t) => `${fixed(t * angles.length, 1)}/${angles.length}`}
        />
        <fieldset className={styles.choice}>
          <legend>TRY</legend>
          <div className={styles.choiceRow}>
            <Toggle label="CHILDREN FOLLOW" on={follow} onChange={setFollow} />
            <Toggle label="WAVE" on={waving} onChange={setWaving} />
          </div>
        </fieldset>
      </Bay>

      <Bay head="WHAT EACH BONE STORES · WHERE IT ENDS UP">
        <ol className={styles.boneRows}>
          {bones.map(({ world }, i) => {
            const [x, y] = along(world, LENGTHS[i], 0);
            return (
              <li key={i}>
                <button
                  type="button"
                  className={styles.boneRow}
                  aria-pressed={i === selected}
                  onClick={() => {
                    setSelected(i);
                    sound.playButton();
                  }}
                >
                  <span>BONE {i + 1}</span>
                  <span>{Math.round(shown[i])}°</span>
                  <span>{Math.round(worldAngle(i))}°</span>
                  <span>
                    {fixed(x, 1)}, {fixed(y, 1)}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
        <Slider
          label={`BONE ${selected + 1}`}
          value={angles[selected]}
          min={-180}
          max={180}
          step={1}
          format={(v) => `${Math.round(v)}°`}
          onChange={(value) => setAngle(selected, value)}
        />
      </Bay>

      <Bay head={`BONE ${selected + 1} · WORLD = PARENT × LOCAL`}>
        <div className={styles.equation}>
          <MatrixGrid matrix={bones[selected].parent} axes label="PARENT WORLD" />
          <span>×</span>
          <MatrixGrid matrix={bones[selected].local} axes label="LOCAL" />
          <span>=</span>
          <MatrixGrid matrix={bones[selected].world} axes label="WORLD" />
        </div>
      </Bay>
    </GraphicsPanel>
  );
}

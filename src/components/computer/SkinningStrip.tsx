import { useMemo, useState } from "react";
import { usePanelSound } from "src/hooks/usePanelSound";
import {
  type Mat,
  multiply,
  radians,
  rotate2,
  transform,
  translate2,
} from "src/lib/computer/graphics/matrix";
import { invert } from "src/lib/computer/graphics/skeleton";
import styles from "./Graphics.module.css";
import {
  Bay,
  fixed,
  GraphicsPanel,
  MatrixGrid,
  PlayBar,
  Slider,
  Toggle,
  useTimeline,
} from "./GraphicsParts";

const WIDTH = 480;
const HEIGHT = 300;
const UNIT = 48;
// Rounded: a server and a browser may disagree on the last digit of a sine.
const toX = (x: number) => Math.round((WIDTH / 2 + x * UNIT) * 100) / 100;
const toY = (y: number) => Math.round((HEIGHT / 2 - y * UNIT) * 100) / 100;

const BONE_LENGTH = 2.4;
const HALF_WIDTH = 0.6;
const RINGS = 16;
const COLORS = ["#38e1ff", "#ff5cc8"];

const START = -2.4;
const JOINT = START + BONE_LENGTH;
const END = JOINT + BONE_LENGTH;

const REST_FIRST = translate2(START, 0);
const REST_SECOND = translate2(JOINT, 0);
const INVERSE_FIRST = invert(REST_FIRST);
const INVERSE_SECOND = invert(REST_SECOND);

/** The strip's vertices at rest: rings of three, along its length. */
const REST: readonly (readonly [number, number])[] = Array.from(
  { length: (RINGS + 1) * 3 },
  (_, i) => {
    const ring = Math.floor(i / 3);
    const side = i % 3;
    return [START + ((END - START) * ring) / RINGS, (side - 1) * HALF_WIDTH] as const;
  },
);

const smoothstep = (t: number) => {
  const c = Math.max(0, Math.min(1, t));
  return c * c * (3 - 2 * c);
};

const apply = (m: Mat, p: readonly number[]) => {
  const [x, y] = transform(m, [p[0], p[1], 1]);
  return [x, y] as const;
};
const svg = (p: readonly number[]) => `${toX(p[0]).toFixed(1)},${toY(p[1]).toFixed(1)}`;

const firstPicked = (RINGS / 2 + 2) * 3 + 2;

/** A strip of mesh over two bones: each bone carries its own copy, and weights blend the copies. */
export function SkinningStrip() {
  const sound = usePanelSound();
  const [angle, setAngle] = useState(70);
  const [blend, setBlend] = useState(1.6);
  const [picked, setPicked] = useState(firstPicked);
  const [showCopies, setShowCopies] = useState(true);
  const [override, setOverride] = useState<number | null>(null);
  const bend = useTimeline(3.5);
  const walk = useTimeline(4);

  const shownAngle = angle * (bend.t < 1 ? Math.sin((bend.t * Math.PI) / 2) : 1);

  const weightOfSecond = (index: number) => {
    if (index === picked && override !== null) return override;
    const x = REST[index][0];
    return blend < 0.02 ? (x >= JOINT ? 1 : 0) : smoothstep((x - JOINT) / blend + 0.5);
  };

  const { firstSkin, secondSkin, firstWorld, secondWorld } = useMemo(() => {
    const firstWorld = REST_FIRST;
    const secondWorld = multiply(translate2(JOINT, 0), rotate2(radians(shownAngle)));
    return {
      firstWorld,
      secondWorld,
      firstSkin: multiply(firstWorld, INVERSE_FIRST),
      secondSkin: multiply(secondWorld, INVERSE_SECOND),
    };
  }, [shownAngle]);

  const placed = REST.map((p, i) => {
    const a = apply(firstSkin, p);
    const b = apply(secondSkin, p);
    const w = weightOfSecond(i);
    return [a[0] * (1 - w) + b[0] * w, a[1] * (1 - w) + b[1] * w] as const;
  });

  const quads = (list: readonly (readonly number[])[]) => {
    const out: string[] = [];
    for (let ring = 0; ring < RINGS; ring++) {
      for (let side = 0; side < 2; side++) {
        const a = ring * 3 + side;
        out.push([a, a + 3, a + 4, a + 1].map((i) => svg(list[i])).join(" "));
      }
    }
    return out;
  };

  const point = REST[picked];
  const copyFirst = apply(firstSkin, point);
  const copySecond = apply(secondSkin, point);
  const secondShare = weightOfSecond(picked);
  const firstShare = 1 - secondShare;
  const landed = placed[picked];

  // The walk: from rest, each bone carries a copy; then the weights choose a point between them.
  const flight = Math.min(1, walk.t * 2);
  const settle = Math.max(0, walk.t * 2 - 1);
  const walking = walk.t < 1;
  const between = (from: readonly number[], to: readonly number[], t: number) =>
    [from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t] as const;
  const shownFirst = walking ? between(point, copyFirst, flight) : copyFirst;
  const shownSecond = walking ? between(point, copySecond, flight) : copySecond;
  const shownFinal =
    walking && settle === 0
      ? null
      : between(copyFirst, copySecond, secondShare * (walking ? settle : 1));

  // How thick the strip stays at the joint: this is where blending loses volume.
  const jointRing = RINGS / 2;
  const elbow = Math.hypot(
    placed[jointRing * 3][0] - placed[jointRing * 3 + 2][0],
    placed[jointRing * 3][1] - placed[jointRing * 3 + 2][1],
  );

  return (
    <GraphicsPanel title="SKINNING" sound={sound}>
      <Bay>
        <div className={styles.screen}>
          <svg
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            className={styles.plane}
            role="img"
            aria-label={`A strip of mesh over two bones, bent ${Math.round(shownAngle)} degrees. It keeps ${fixed(elbow / (HALF_WIDTH * 2))} of its width at the joint.`}
          >
            <rect width={WIDTH} height={HEIGHT} fill="#0a0c12" />
            {quads(REST).map((points, i) => (
              <polygon
                key={i}
                points={points}
                fill="none"
                stroke="#8fa3ff"
                strokeWidth={0.5}
                opacity={0.3}
              />
            ))}
            {showCopies &&
              [firstSkin, secondSkin].map((skin, b) =>
                quads(REST.map((p) => apply(skin, p))).map((points, i) => (
                  <polygon
                    key={`${b}-${i}`}
                    points={points}
                    fill={COLORS[b]}
                    fillOpacity={0.05}
                    stroke={COLORS[b]}
                    strokeWidth={0.6}
                    opacity={0.55}
                  />
                )),
              )}
            {quads(placed).map((points, i) => {
              const ring = Math.floor(i / 2);
              const w = weightOfSecond(ring * 3 + 1);
              const r = Math.round(56 + (255 - 56) * w);
              const g = Math.round(225 + (92 - 225) * w);
              const b = Math.round(255 + (200 - 255) * w);
              return (
                <polygon
                  key={i}
                  points={points}
                  fill={`rgb(${r},${g},${b})`}
                  fillOpacity={0.55}
                  stroke="#dfe7ff"
                  strokeWidth={0.8}
                />
              );
            })}
            {[firstWorld, secondWorld].map((world, b) => {
              const from = apply(world, [0, 0]);
              const to = apply(world, [BONE_LENGTH, 0]);
              return (
                <g key={b}>
                  <line
                    x1={toX(from[0])}
                    y1={toY(from[1])}
                    x2={toX(to[0])}
                    y2={toY(to[1])}
                    stroke={COLORS[b]}
                    strokeWidth={5}
                    strokeLinecap="round"
                  />
                  <circle cx={toX(from[0])} cy={toY(from[1])} r={6} fill="#fff" stroke="#0a0c12" />
                </g>
              );
            })}
            {REST.map((_, i) => (
              <circle
                key={i}
                cx={toX(placed[i][0])}
                cy={toY(placed[i][1])}
                r={2.4}
                fill="#fff"
                opacity={0.8}
                style={{ cursor: "pointer" }}
                onPointerDown={() => {
                  setPicked(i);
                  setOverride(null);
                  walk.play();
                }}
              />
            ))}
            {/* One vertex: a copy on each bone, and the point between them that its weights pick. */}
            <circle cx={toX(point[0])} cy={toY(point[1])} r={4} fill="none" stroke="#fff" />
            <line
              x1={toX(shownFirst[0])}
              y1={toY(shownFirst[1])}
              x2={toX(shownSecond[0])}
              y2={toY(shownSecond[1])}
              stroke="#fff"
              strokeWidth={1.5}
              strokeDasharray="4 3"
            />
            <circle
              cx={toX(shownFirst[0])}
              cy={toY(shownFirst[1])}
              r={6}
              fill={COLORS[0]}
              stroke="#fff"
              strokeWidth={1.5}
            />
            <circle
              cx={toX(shownSecond[0])}
              cy={toY(shownSecond[1])}
              r={6}
              fill={COLORS[1]}
              stroke="#fff"
              strokeWidth={1.5}
            />
            {shownFinal && (
              <circle
                cx={toX(shownFinal[0])}
                cy={toY(shownFinal[1])}
                r={7}
                fill="#fff"
                stroke="#0a0c12"
                strokeWidth={1.5}
              />
            )}
          </svg>
        </div>
        <div className={styles.sliders}>
          <Slider
            label="BEND"
            value={angle}
            min={-175}
            max={175}
            step={1}
            format={(v) => `${Math.round(v)}°`}
            onChange={(value) => {
              setAngle(value);
              bend.seek(1);
            }}
          />
          <Slider
            label="BLEND"
            value={blend}
            min={0}
            max={4.8}
            step={0.05}
            onChange={(value) => {
              setBlend(value);
              setOverride(null);
            }}
          />
        </div>
        <PlayBar button="BEND IT" label="BENT" timeline={bend} />
        <fieldset className={styles.choice}>
          <legend>SHOW</legend>
          <div className={styles.choiceRow}>
            <Toggle label="EACH BONE'S COPY" on={showCopies} onChange={setShowCopies} />
          </div>
        </fieldset>
        <dl className={styles.counts}>
          <div>
            <dt>WIDTH AT JOINT</dt>
            <dd className={elbow / (HALF_WIDTH * 2) < 0.5 ? styles.alert : undefined}>
              {Math.round((elbow / (HALF_WIDTH * 2)) * 100)}%
            </dd>
          </div>
        </dl>
      </Bay>

      <Bay head="ONE VERTEX">
        <PlayBar button="FOLLOW IT" label="FOLLOWED" timeline={walk} />
        <Slider
          label="WEIGHT"
          value={secondShare}
          min={0}
          max={1}
          step={0.01}
          onChange={setOverride}
        />
        <div className={styles.equation}>
          <span className={styles.term}>
            <b data-axis="x">{fixed(firstShare)}</b>
            <span>×</span>
            <span className={styles.matrix} style={{ gridTemplateColumns: "auto" }}>
              <span style={{ color: COLORS[0] }}>{fixed(copyFirst[0])}</span>
              <span style={{ color: COLORS[0] }}>{fixed(copyFirst[1])}</span>
            </span>
          </span>
          <span>+</span>
          <span className={styles.term}>
            <b data-axis="t">{fixed(secondShare)}</b>
            <span>×</span>
            <span className={styles.matrix} style={{ gridTemplateColumns: "auto" }}>
              <span style={{ color: COLORS[1] }}>{fixed(copySecond[0])}</span>
              <span style={{ color: COLORS[1] }}>{fixed(copySecond[1])}</span>
            </span>
          </span>
          <span>=</span>
          <span className={styles.matrix} style={{ gridTemplateColumns: "auto" }}>
            <span>{fixed(landed[0])}</span>
            <span>{fixed(landed[1])}</span>
          </span>
        </div>
      </Bay>

      <Bay head="BONE 2 · WHY THE INVERSE">
        <div className={styles.equation}>
          <MatrixGrid matrix={secondWorld} axes label="WHERE IT IS NOW" />
          <span>×</span>
          <MatrixGrid matrix={INVERSE_SECOND} axes label="UNDO WHERE IT WAS" />
          <span>=</span>
          <MatrixGrid matrix={secondSkin} axes label="WHAT IT DOES TO VERTICES" />
        </div>
      </Bay>
    </GraphicsPanel>
  );
}

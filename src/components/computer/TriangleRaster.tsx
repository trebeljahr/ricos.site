import { type KeyboardEvent, type PointerEvent, useMemo, useRef, useState } from "react";
import { usePanelSound } from "src/hooks/usePanelSound";
import type { Vec3 } from "src/lib/computer/graphics/matrix";
import { type ScanTriangle, scanTriangles } from "src/lib/computer/graphics/rasterizer";
import styles from "./Graphics.module.css";
import {
  Bay,
  Choice,
  fixed,
  GraphicsPanel,
  PlayBar,
  SceneCanvas,
  Slider,
  Toggle,
  useTimeline,
} from "./GraphicsParts";

const WIDTH = 24;
const HEIGHT = 18;

type Corners = [number, number][];

const FIRST_TRIANGLE: Corners = [
  [3.5, 15.5],
  [19.5, 12.5],
  [8.5, 2.5],
];
const SECOND_TRIANGLE: Corners = [
  [9.5, 16.5],
  [22.5, 15.5],
  [17.5, 3.5],
];

const CORNER_COLORS: readonly (readonly Vec3[])[] = [
  [
    [255, 72, 96],
    [72, 240, 140],
    [72, 140, 255],
  ],
  [
    [255, 209, 102],
    [201, 110, 255],
    [56, 225, 255],
  ],
];
const EDGE_NAMES = ["A", "B", "C"];
const OUTCOME = { outside: "OUTSIDE", written: "WRITTEN", behind: "BEHIND" } as const;

const mix = (colors: readonly Vec3[], w: Vec3): Vec3 => [
  colors[0][0] * w[0] + colors[1][0] * w[1] + colors[2][0] * w[2],
  colors[0][1] * w[0] + colors[1][1] * w[1] + colors[2][1] * w[2],
  colors[0][2] * w[0] + colors[1][2] * w[1] + colors[2][2] * w[2],
];
const rgb = (c: Vec3) => `rgb(${c.map(Math.round).join(",")})`;

/** One triangle on a coarse grid of pixels, tested one pixel centre at a time. */
export function TriangleRaster() {
  const sound = usePanelSound();
  const [first, setFirst] = useState<Corners>(FIRST_TRIANGLE);
  const [second, setSecond] = useState<Corners>(SECOND_TRIANGLE);
  const [useSecond, setUseSecond] = useState(false);
  const [firstDepth, setFirstDepth] = useState(0.3);
  const [secondDepth, setSecondDepth] = useState(0.6);
  const [buffer, setBuffer] = useState<"color" | "depth">("color");
  const timeline = useTimeline(14);
  const held = useRef<{ triangle: number; corner: number } | null>(null);

  const triangles: ScanTriangle[] = useMemo(() => {
    const list = [{ corners: first, depth: firstDepth }];
    if (useSecond) list.push({ corners: second, depth: secondDepth });
    return list;
  }, [first, second, useSecond, firstDepth, secondDepth]);
  const corners = useSecond ? [first, second] : [first];
  const steps = useMemo(() => scanTriangles(triangles, WIDTH, HEIGHT), [triangles]);

  const shown = Math.floor(timeline.t * steps.length);
  const finished = timeline.t >= 1;
  const current = finished ? null : (steps[Math.min(shown, steps.length - 1)] ?? null);
  const counts = useMemo(() => {
    const totals = { tested: 0, written: 0, behind: 0 };
    for (const step of steps.slice(0, finished ? steps.length : shown + 1)) {
      totals.tested++;
      if (step.outcome === "written") totals.written++;
      if (step.outcome === "behind") totals.behind++;
    }
    return totals;
  }, [steps, shown, finished]);

  const draw = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const unit = width / WIDTH;
    ctx.fillStyle = "#0a0c12";
    ctx.fillRect(0, 0, width, height);
    const upTo = finished ? steps.length : shown;
    for (let i = 0; i < upTo; i++) {
      const step = steps[i];
      if (step.outcome !== "written") continue;
      if (buffer === "depth") {
        const value = 240 - triangles[step.triangle].depth * 200;
        ctx.fillStyle = rgb([value, value, value]);
      } else {
        ctx.fillStyle = rgb(mix(CORNER_COLORS[step.triangle], step.weights));
      }
      ctx.fillRect(step.x * unit, step.y * unit, unit, unit);
    }
    // The grid, and a dot at the centre of each pixel: the only place a triangle is ever tested.
    ctx.strokeStyle = "#ffffff14";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= WIDTH; x++) {
      ctx.moveTo(x * unit, 0);
      ctx.lineTo(x * unit, height);
    }
    for (let y = 0; y <= HEIGHT; y++) {
      ctx.moveTo(0, y * unit);
      ctx.lineTo(width, y * unit);
    }
    ctx.stroke();
    ctx.fillStyle = "#ffffff38";
    for (let y = 0; y < HEIGHT; y++) {
      for (let x = 0; x < WIDTH; x++) {
        ctx.beginPath();
        ctx.arc((x + 0.5) * unit, (y + 0.5) * unit, 1.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    corners.forEach((triangle, index) => {
      const active = current?.triangle === index;
      triangle.forEach((corner, i) => {
        const next = triangle[(i + 1) % 3];
        // Each edge turns green or red for the pixel under test: which side of me is it on?
        let stroke = index === 0 ? "#dfe7ff" : "#ffd166";
        if (active && current) {
          // Corner i's weight comes from the edge opposite it, so edge i runs between the other two.
          const opposite = (i + 2) % 3;
          stroke = current.weights[opposite] >= 0 ? "#5ef0a0" : "#ff6b7a";
        }
        ctx.strokeStyle = stroke;
        ctx.lineWidth = active ? 2.5 : 1.5;
        ctx.beginPath();
        ctx.moveTo(corner[0] * unit, corner[1] * unit);
        ctx.lineTo(next[0] * unit, next[1] * unit);
        ctx.stroke();
      });
    });

    if (current) {
      const cx = (current.x + 0.5) * unit;
      const cy = (current.y + 0.5) * unit;
      if (current.inside) {
        // A line to each corner, as thick as that corner's share of this pixel.
        corners[current.triangle].forEach((corner, i) => {
          const color = CORNER_COLORS[current.triangle][i];
          ctx.strokeStyle = rgb(color);
          ctx.lineWidth = 0.5 + current.weights[i] * 7;
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(corner[0] * unit, corner[1] * unit);
          ctx.stroke();
        });
      }
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.strokeRect(current.x * unit, current.y * unit, unit, unit);
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(cx, cy, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  const setCorner = (triangle: number, corner: number, x: number, y: number) => {
    const clampedX = Math.max(0, Math.min(WIDTH, Math.round(x * 2) / 2));
    const clampedY = Math.max(0, Math.min(HEIGHT, Math.round(y * 2) / 2));
    const change = (list: Corners): Corners =>
      list.map((point, i) => (i === corner ? [clampedX, clampedY] : point));
    if (triangle === 0) setFirst(change);
    else setSecond(change);
    timeline.seek(1);
  };

  const move = (event: PointerEvent<SVGSVGElement>) => {
    if (!held.current) return;
    const box = event.currentTarget.getBoundingClientRect();
    setCorner(
      held.current.triangle,
      held.current.corner,
      ((event.clientX - box.left) / box.width) * WIDTH,
      ((event.clientY - box.top) / box.height) * HEIGHT,
    );
  };

  const keyboard = (event: KeyboardEvent, triangle: number, corner: number, at: number[]) => {
    const step = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
    }[event.key];
    if (!step) return;
    event.preventDefault();
    setCorner(triangle, corner, at[0] + step[0], at[1] + step[1]);
  };

  return (
    <GraphicsPanel title="FILLING IN A TRIANGLE" sound={sound}>
      <Bay>
        <div className={styles.screen}>
          <SceneCanvas
            aspect={WIDTH / HEIGHT}
            label={`A triangle on a grid of ${WIDTH} by ${HEIGHT} pixels, ${counts.written} of them filled.`}
            draw={draw}
          />
          <svg
            className={styles.overlay}
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            role="group"
            aria-label="Corners of the triangles"
            onPointerMove={move}
            onPointerUp={() => {
              held.current = null;
            }}
            onPointerCancel={() => {
              held.current = null;
            }}
          >
            {corners.flatMap((triangle, t) =>
              triangle.map((corner, c) => (
                <g
                  key={`${t}${c}`}
                  className={styles.handle}
                  role="slider"
                  tabIndex={0}
                  aria-label={`Corner ${EDGE_NAMES[c]} of triangle ${t + 1}`}
                  aria-valuenow={corner[0]}
                  aria-valuetext={`${corner[0]}, ${corner[1]}`}
                  onPointerDown={(event) => {
                    held.current = { triangle: t, corner: c };
                    event.currentTarget.ownerSVGElement?.setPointerCapture?.(event.pointerId);
                    event.stopPropagation();
                  }}
                  onKeyDown={(event) => keyboard(event, t, c, corner)}
                >
                  <circle cx={corner[0]} cy={corner[1]} r={1.2} fill="transparent" />
                  <circle
                    cx={corner[0]}
                    cy={corner[1]}
                    r={0.42}
                    fill={rgb(CORNER_COLORS[t][c])}
                    stroke="#fff"
                    strokeWidth={0.1}
                  />
                </g>
              )),
            )}
          </svg>
        </div>
        <PlayBar
          button="SCAN"
          label="SCANNED"
          timeline={timeline}
          format={(t) => `${Math.floor(t * steps.length)}`}
        />
        <fieldset className={styles.choice}>
          <legend>ADD</legend>
          <div className={styles.choiceRow}>
            <Toggle
              label="SECOND TRIANGLE"
              on={useSecond}
              onChange={(on) => {
                setUseSecond(on);
                timeline.seek(1);
                sound.playButton();
              }}
            />
          </div>
        </fieldset>
        {useSecond && (
          <>
            <div className={styles.sliders}>
              <Slider
                label="DEPTH 1"
                value={firstDepth}
                min={0.05}
                max={0.95}
                step={0.05}
                onChange={(value) => {
                  setFirstDepth(value);
                  timeline.seek(1);
                }}
              />
              <Slider
                label="DEPTH 2"
                value={secondDepth}
                min={0.05}
                max={0.95}
                step={0.05}
                onChange={(value) => {
                  setSecondDepth(value);
                  timeline.seek(1);
                }}
              />
            </div>
            <Choice
              label="BUFFER"
              value={buffer}
              options={[
                { value: "color", label: "COLOR" },
                { value: "depth", label: "DEPTH" },
              ]}
              onChange={(next) => {
                setBuffer(next);
                sound.playButton();
              }}
            />
          </>
        )}
      </Bay>

      <Bay head="THIS PIXEL" aside={current ? `${current.x}, ${current.y}` : "—"}>
        {current && (
          <>
            <div className={styles.bars}>
              {current.weights.map((weight, i) => (
                <div key={EDGE_NAMES[i]} className={styles.bar}>
                  <span>WEIGHT {EDGE_NAMES[i]}</span>
                  <i>
                    <b
                      style={{
                        width: `${Math.max(0, Math.min(1, weight)) * 100}%`,
                        background: rgb(CORNER_COLORS[current.triangle][i]),
                      }}
                    />
                  </i>
                  <span className={weight < 0 ? styles.alert : undefined}>{fixed(weight)}</span>
                </div>
              ))}
            </div>
            <ol className={styles.work}>
              <li>
                {current.weights.map((w) => (w >= 0 ? "+" : "−")).join(" ")} →{" "}
                {OUTCOME[current.outcome]}
              </li>
              {current.inside && (
                <>
                  <li>
                    DEPTH {fixed(triangles[current.triangle].depth)}{" "}
                    {current.outcome === "written" ? "<" : "≥"} BUFFER {fixed(current.depthBefore)}
                  </li>
                  <li>
                    COLOR{" "}
                    {mix(CORNER_COLORS[current.triangle], current.weights)
                      .map((value) => Math.round(value))
                      .join(" ")}{" "}
                    <i
                      className={styles.swatch}
                      style={{
                        background: rgb(mix(CORNER_COLORS[current.triangle], current.weights)),
                      }}
                    />
                  </li>
                </>
              )}
            </ol>
          </>
        )}
        <dl className={styles.counts}>
          <div>
            <dt>TESTED</dt>
            <dd>{counts.tested}</dd>
          </div>
          <div>
            <dt>WRITTEN</dt>
            <dd>{counts.written}</dd>
          </div>
          <div>
            <dt>BEHIND</dt>
            <dd>{counts.behind}</dd>
          </div>
        </dl>
      </Bay>
    </GraphicsPanel>
  );
}

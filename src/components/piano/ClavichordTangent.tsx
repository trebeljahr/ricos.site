import clsx from "clsx";
import { type PointerEvent, useEffect, useRef, useState } from "react";
import { keyTime } from "src/lib/piano/action";
import {
  bebungCents,
  initialTangent,
  KEY_DIP_MM,
  pressTangent,
  stepTangent,
  TANGENT_CONTACT,
  TANGENT_GAP_MM,
  TANGENT_RISE_MM,
  type TangentState,
  tangentLift,
} from "src/lib/piano/earlyActions";
import { strikeSpectrum } from "src/lib/piano/hammerHead";
import { type Pt, place, rect, type Scene, type View } from "./actionScene";
import { panelColors, useAnimation } from "./canvas";
import {
  capturePointer,
  formatMs,
  HoldButton,
  LineReadout,
  partUnder,
  type Slow,
  SlowSwitch,
  sceneOn,
  spaceHolds,
  TouchSlider,
  Trace,
  useRingingString,
} from "./mechanism";
import styles from "./piano.module.css";

// Left: key and tangent from the side; the strings run across the
// instrument, so here one is seen end-on. Right: that string from the front,
// heights six times larger, from the hitch pin through the listing cloth and
// the tangent to the bridge.
const VIEW: View = { x0: -8, x1: 612, y0: -24, y1: 150 };
const KEY_PIVOT: Pt = [120, 0];
const KEY_END = 262;
const TANGENT_X = 246;
const TANGENT_TOP = 70;
const STRING_Y = TANGENT_TOP + TANGENT_GAP_MM;
const HITCH_X = 350;
const CLOTH: [number, number] = [358, 392];
const FRONT_TANGENT_X = 430;
const BRIDGE_X = 596;
const FRONT_Y = 70;
const LIFT_ZOOM = 6;
const HZ = 220;
const SPEAKS_AT = 0.04;

/**
 * The clavichord: a brass tangent on the end of the key strikes the string
 * and stays on it, marking off the part that sounds. While the finger holds
 * it there, pressing harder stretches the string and raises the pitch.
 */
export function ClavichordTangent() {
  const panel = useRef<HTMLElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const traceCanvas = useRef<HTMLCanvasElement>(null);
  const sim = useRef<TangentState>(initialTangent());
  const scene = useRef<Scene | null>(null);
  const trace = useRef(new Trace());
  const last = useRef<number | null>(null);
  const held = useRef<{ y: number; pressure: number } | null>(null);
  const string = useRingingString(HZ, SPEAKS_AT, 0.4);

  const [slow, setSlow] = useState<Slow>("0.1");
  const [touch, setTouch] = useState(0.5);
  const [pressure, setPressure] = useState(0.3);
  const [hovered, setHovered] = useState<string | null>(null);
  const [readouts, setReadouts] = useState({ speed: "–", pitch: "–", string: "silent" });
  const fresh = useRef(new Set(["tangent", "listing cloth"])).current;

  useEffect(() => {
    sim.current.speed = 1 / keyTime(touch);
  }, [touch]);
  useEffect(() => {
    sim.current.pressure = pressure;
  }, [pressure]);

  const hold = (down: boolean) => pressTangent(sim.current, down);

  useAnimation(panel, (time) => {
    const s = sim.current;
    const dtReal = last.current === null ? 0 : Math.min(0.05, time - last.current);
    last.current = time;
    const dt = dtReal * Number(slow);
    let struck: number | null = null;
    for (const event of stepTangent(s, dt)) {
      if (event.type === "strike") {
        struck = event.speed;
        const size = Math.min(1, event.speed / 420);
        string.strike(size, size, strikeSpectrum(0.0004, HZ, 32));
      } else string.silence();
    }
    if (s.touching) string.retune(HZ * 2 ** (bebungCents(s.k) / 1200));
    string.advance(dtReal, dt, s.touching);

    const colors = panelColors(panel.current);
    const sc = sceneOn(canvas.current, VIEW, colors, fresh, hovered);
    if (sc) {
      drawClavichord(sc, s, (u) => string.at01(u));
      scene.current = sc;
    }
    trace.current.push(time, [s.k, Math.min(1, tangentLift(s.k) / TANGENT_RISE_MM)]);
    if (traceCanvas.current) {
      trace.current.draw(
        traceCanvas.current,
        time,
        [
          { column: 0, color: colors.muted, width: 1.5 },
          { column: 1, color: colors.accent },
        ],
        [{ level: TANGENT_CONTACT, color: colors.ink }],
        colors,
      );
    }
    setReadouts((old) => {
      const next = {
        speed: struck !== null ? `${Math.round(struck)} mm/s` : old.speed,
        pitch: s.touching ? `+${Math.round(bebungCents(s.k))} cents` : "–",
        string: s.touching
          ? string.amplitude > 0.01
            ? "ringing"
            : "pressed, silent"
          : string.amplitude > 0.01
            ? "stopped by the cloth"
            : "silent",
      };
      return old.speed === next.speed && old.pitch === next.pitch && old.string === next.string
        ? old
        : next;
    });
  });

  const down = (event: PointerEvent<HTMLCanvasElement>) => {
    const part = partUnder(scene.current, event);
    setHovered(part);
    if (part !== "key") return;
    event.preventDefault();
    capturePointer(event);
    held.current = { y: event.clientY, pressure };
    hold(true);
  };
  const move = (event: PointerEvent<HTMLCanvasElement>) => {
    const h = held.current;
    if (!h) {
      setHovered(partUnder(scene.current, event));
      return;
    }
    // Dragging down presses harder.
    setPressure(Math.min(1, Math.max(0, h.pressure + (event.clientY - h.y) / 60)));
  };
  const up = () => {
    if (!held.current) return;
    held.current = null;
    hold(false);
  };

  return (
    <section
      ref={panel}
      className={clsx(styles.panel, "not-prose")}
      aria-label="Clavichord tangent"
    >
      <canvas
        ref={canvas}
        className={styles.canvas}
        style={{
          aspectRatio: `${VIEW.x1 - VIEW.x0} / ${VIEW.y1 - VIEW.y0}`,
          height: "auto",
          cursor: hovered === "key" ? "pointer" : "default",
          touchAction: "none",
        }}
        tabIndex={0}
        {...spaceHolds(hold)}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        onPointerLeave={() => {
          if (!held.current) setHovered(null);
        }}
        role="img"
        aria-label="A clavichord key and tangent from the side, and the string it strikes from the front. Press the key to strike; drag down while holding to press harder."
      />
      <canvas
        ref={traceCanvas}
        className={clsx(styles.canvas, "mt-tight")}
        style={{ height: 64 }}
        aria-hidden
      />
      <dl className="mt-label grid grid-cols-2 gap-label sm:grid-cols-4" aria-live="polite">
        <LineReadout
          color="var(--accent)"
          label="tangent speed at the string"
          value={readouts.speed}
        />
        <div className={clsx(styles.readout, styles.wordy)}>
          <dt>string</dt>
          <dd>{readouts.string}</dd>
        </div>
        <div className={clsx(styles.readout, styles.wordy)}>
          <dt>pitch</dt>
          <dd>{readouts.pitch}</dd>
        </div>
        <div className={clsx(styles.readout, styles.wordy)}>
          <dt>part</dt>
          <dd>{hovered ?? "–"}</dd>
        </div>
      </dl>
      <div className="mt-para flex flex-wrap items-end gap-label">
        <HoldButton onHold={hold} />
        <TouchSlider
          value={touch}
          onChange={setTouch}
          readout={`key down in ${formatMs(keyTime(touch))}`}
        />
      </div>
      <div className="mt-label flex flex-wrap items-end gap-label">
        <SlowSwitch value={slow} onChange={setSlow} />
        <label className="flex min-w-0 flex-1 flex-col">
          <span className={clsx(styles.muted, "flex justify-between text-xs")}>
            <span>light</span>
            <span>finger pressure</span>
            <span>firm</span>
          </span>
          <input
            className={styles.slider}
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={pressure}
            aria-label="Finger pressure"
            onChange={(event) => setPressure(Number(event.target.value))}
          />
        </label>
      </div>
    </section>
  );
}

function drawClavichord(scene: Scene, s: TangentState, stringAt: (u: number) => number) {
  const keyPose = [{ pivot: KEY_PIVOT, angle: Math.atan2(KEY_DIP_MM, KEY_PIVOT[0]) * s.k }];
  const lift = tangentLift(s.k);
  const push = Math.max(0, lift - TANGENT_GAP_MM); // how far the tangent pushes the string up
  const metal = scene.dark ? "#c9ced3" : "#6d747b";

  // ── Side view ──
  scene.shape("keybed", rect(-8, -24, 300, -14), { material: "frame" });
  scene.shape(
    "balance rail",
    [
      [100, -14],
      [140, -14],
      [124, -1],
      [116, -1],
    ],
    { material: "rail" },
  );
  scene.shape("key", rect(0, 0, KEY_END, 18), { material: "wood" }, keyPose);
  scene.shape(
    "key",
    [
      [-2, 14],
      [100, 14],
      [100, 21],
      [0, 21],
      [-2, 18],
    ],
    { material: "ivory" },
    keyPose,
  );
  scene.shape(
    "tangent",
    [
      [TANGENT_X - 1.5, 18],
      [TANGENT_X + 1.5, 18],
      [TANGENT_X + 1.5, TANGENT_TOP],
      [TANGENT_X - 1.5, TANGENT_TOP],
    ],
    { material: "brass" },
    keyPose,
  );
  scene.shape("key guide", rect(KEY_END - 2, -14, KEY_END + 6, 10), { material: "rail" });
  const tip = place([TANGENT_X, TANGENT_TOP], keyPose);
  scene.shape("string", circle([tip[0], STRING_Y + push + 1]), { fill: metal });

  // ── Front view of the string, heights enlarged ──
  scene.shape(null, rect(320, -20, 612, 148), { fill: scene.colors.track, bare: true });
  const pushed = push * LIFT_ZOOM;
  const yAt = (x: number) => {
    if (x <= FRONT_TANGENT_X)
      return FRONT_Y + (pushed * (x - HITCH_X)) / (FRONT_TANGENT_X - HITCH_X);
    const u = (x - FRONT_TANGENT_X) / (BRIDGE_X - FRONT_TANGENT_X);
    return FRONT_Y + pushed * (1 - u) + stringAt(u) * 10;
  };
  scene.shape("hitch pin", circle([HITCH_X, FRONT_Y], 4), { material: "metal" });
  scene.shape(
    "bridge",
    [
      [BRIDGE_X - 8, FRONT_Y - 30],
      [BRIDGE_X + 8, FRONT_Y - 30],
      [BRIDGE_X + 4, FRONT_Y],
      [BRIDGE_X - 4, FRONT_Y],
    ],
    { material: "wood" },
  );
  const line: Pt[] = [];
  for (let x = HITCH_X; x <= BRIDGE_X; x += 2) line.push([x, yAt(x)]);
  scene.line("string", line, metal, 2.2);
  // The listing cloth, woven between the strings, keeps the short end quiet.
  for (let x = CLOTH[0]; x < CLOTH[1]; x += 8) {
    const y = yAt(x + 3);
    scene.shape("listing cloth", rect(x, y - 5, x + 6, y + 5), { material: "cloth" });
  }
  // The tangent seen edge-on from the front.
  const front = FRONT_Y - (TANGENT_GAP_MM - lift) * LIFT_ZOOM;
  scene.shape(
    "tangent",
    rect(
      FRONT_TANGENT_X - 9,
      front - 60,
      FRONT_TANGENT_X + 9,
      Math.min(front, FRONT_Y + pushed) - 1,
    ),
    {
      material: "brass",
    },
  );
}

const circle = (c: Pt, r = 1.6): Pt[] =>
  Array.from({ length: 20 }, (_, i) => {
    const a = (i / 20) * 2 * Math.PI;
    return [c[0] + r * Math.cos(a), c[1] + r * Math.sin(a)] as Pt;
  });

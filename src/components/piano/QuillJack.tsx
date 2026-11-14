import clsx from "clsx";
import { type PointerEvent, useEffect, useRef, useState } from "react";
import { keyTime } from "src/lib/piano/action";
import {
  initialJack,
  type JackState,
  jackLift,
  KEY_DIP_MM,
  PLUCK_MM,
  pressJack,
  QUILL_GAP_MM,
  QUILL_THICK_MM,
  stepJack,
} from "src/lib/piano/earlyActions";
import { pluckAmplitudes } from "src/lib/piano/stringModes";
import { arc, type Pt, place, rect, type Scene, type View } from "./actionScene";
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

// Left: the key and jack from the side, to scale. Right: the top of the jack
// from the front, seven times larger, where the quill meets the string.
const VIEW: View = { x0: -8, x1: 612, y0: -24, y1: 214 };
const KEY_PIVOT: Pt = [130, 0];
const KEY_END = 262;
const JACK_X = 244;
const STRING_Y = 150;
const ZOOM = 7;
const ZOOM_AT: Pt = [478, 70]; // where the string sits in the enlarged view
const PLUCK_AT = 0.12;
const HZ = 262;

const zoom = ([x, y]: Pt): Pt => [ZOOM_AT[0] + x * ZOOM, ZOOM_AT[1] + y * ZOOM];

const PHASE_WORDS: Record<JackState["phase"], string> = {
  below: "under the string",
  lifting: "lifting the string",
  above: "above the string",
  passing: "slipping back past it",
};

/**
 * The harpsichord's jack: the key lifts it, its quill catches the string,
 * bends and lets go. On the way down the hinged tongue swings back so the
 * quill slips past, and the damper cloth on top lands on the string.
 */
export function QuillJack() {
  const panel = useRef<HTMLElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const traceCanvas = useRef<HTMLCanvasElement>(null);
  const sim = useRef<JackState>(initialJack());
  const scene = useRef<Scene | null>(null);
  const trace = useRef(new Trace());
  const last = useRef<number | null>(null);
  const held = useRef(false);
  const string = useRingingString(HZ, PLUCK_AT, 0.45);
  const plucks = useRef<{ height: number; speed: number }[]>([]);

  const [slow, setSlow] = useState<Slow>("0.1");
  const [touch, setTouch] = useState(0.5);
  const [hovered, setHovered] = useState<string | null>(null);
  const [readouts, setReadouts] = useState({
    quill: PHASE_WORDS.below,
    string: "silent",
    last: "–",
  });
  const fresh = useRef(new Set(["quill", "tongue"])).current;

  useEffect(() => {
    sim.current.speed = 1 / keyTime(touch);
  }, [touch]);

  const hold = (down: boolean) => {
    held.current = down;
    pressJack(sim.current, down);
  };

  useAnimation(panel, (time) => {
    const s = sim.current;
    const dtReal = last.current === null ? 0 : Math.min(0.05, time - last.current);
    last.current = time;
    const dt = dtReal * Number(slow);
    for (const event of stepJack(s, dt)) {
      if (event.type === "pluck") {
        string.strike(1, 1, pluckAmplitudes(PLUCK_AT, 1, 32).map(Math.abs));
        plucks.current = [{ height: event.height, speed: event.speed }, ...plucks.current].slice(
          0,
          3,
        );
      } else string.silence();
    }
    const damped = jackLift(s.k) < 0.05 && s.phase === "below";
    string.advance(dtReal, dt, !damped);

    const colors = panelColors(panel.current);
    const sc = sceneOn(canvas.current, VIEW, colors, fresh, hovered);
    if (sc) {
      drawJack(sc, s, (u) => string.at01(u));
      sc.finish();
      scene.current = sc;
    }
    trace.current.push(time, [s.k, Math.min(1, jackLift(s.k) / 8)]);
    if (traceCanvas.current) {
      trace.current.draw(
        traceCanvas.current,
        time,
        [
          { column: 0, color: colors.muted, width: 1.5 },
          { column: 1, color: colors.accent },
        ],
        [{ level: (QUILL_GAP_MM + PLUCK_MM) / 8, color: colors.ink }],
        colors,
      );
    }

    const next = {
      quill: PHASE_WORDS[s.phase],
      string: damped
        ? string.amplitude > 0.01
          ? "stopped by the damper"
          : "under the damper"
        : string.amplitude > 0.01
          ? "ringing"
          : "silent",
      last: plucks.current.length
        ? plucks.current.map((p) => `${p.height.toFixed(1)} mm`).join(" · ")
        : "–",
    };
    setReadouts((old) =>
      old.quill === next.quill && old.string === next.string && old.last === next.last ? old : next,
    );
  });

  const down = (event: PointerEvent<HTMLCanvasElement>) => {
    const part = partUnder(scene.current, event);
    setHovered(part);
    if (part !== "key") return;
    event.preventDefault();
    capturePointer(event);
    hold(true);
  };
  const up = () => {
    if (held.current) hold(false);
  };

  return (
    <section ref={panel} className={clsx(styles.panel, "not-prose")} aria-label="Harpsichord jack">
      <canvas
        ref={canvas}
        className={styles.canvas}
        style={{
          aspectRatio: `${VIEW.x1 - VIEW.x0} / ${VIEW.y1 - VIEW.y0}`,
          height: "auto",
          cursor: hovered === "key" ? "pointer" : "default",
          touchAction: "manipulation",
        }}
        tabIndex={0}
        {...spaceHolds(hold)}
        onPointerDown={down}
        onPointerMove={(event) => {
          if (!held.current) setHovered(partUnder(scene.current, event));
        }}
        onPointerUp={up}
        onPointerCancel={up}
        onPointerLeave={() => {
          if (!held.current) setHovered(null);
        }}
        role="img"
        aria-label="A harpsichord key and jack from the side, and the top of the jack enlarged from the front. Press the key to pluck; space holds it down."
      />
      <canvas
        ref={traceCanvas}
        className={clsx(styles.canvas, "mt-tight")}
        style={{ height: 64 }}
        aria-hidden
      />
      <dl className="mt-label grid grid-cols-2 gap-label sm:grid-cols-4" aria-live="polite">
        <LineReadout color="var(--accent)" label="quill" value={readouts.quill} />
        <div className={clsx(styles.readout, styles.wordy)}>
          <dt>string</dt>
          <dd>{readouts.string}</dd>
        </div>
        <div className={clsx(styles.readout, styles.wordy)}>
          <dt>string lifted before release, last plucks</dt>
          <dd>{readouts.last}</dd>
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
      <div className="mt-label">
        <SlowSwitch value={slow} onChange={setSlow} />
      </div>
    </section>
  );
}

function drawJack(scene: Scene, s: JackState, stringAt: (u: number) => number) {
  const m = scene.material;
  const angle = Math.atan2(KEY_DIP_MM, KEY_PIVOT[0]) * s.k;
  const keyPose = [{ pivot: KEY_PIVOT, angle }];
  const j = jackLift(s.k);
  const lift = s.phase === "lifting" ? s.lift : 0;
  const ring = stringAt(PLUCK_AT);

  // ── Side view ──
  scene.shape("keybed", rect(-8, -24, 312, -14), { material: "frame" });
  scene.shape(
    "balance rail",
    [
      [106, -14],
      [154, -14],
      [136, -2],
      [124, -2],
    ],
    { material: "rail" },
  );
  scene.shape("balance pin", rect(128.5, -2, 131.5, 14), { material: "metal", plain: true });
  scene.shape(
    "key",
    [
      [0, 2],
      [2, 0],
      [KEY_END - 2, 0],
      [KEY_END, 2],
      [KEY_END, 17],
      [KEY_END - 2, 18],
      [0, 18],
    ],
    { material: "wood" },
    keyPose,
  );
  scene.shape(
    "key",
    [
      [-3, 12],
      [-1, 10],
      [108, 18],
      [110, 23],
      [0, 23],
      [-3, 21],
    ],
    { material: "ebony" },
    keyPose,
  );
  const keyTop = place([JACK_X, 18], keyPose)[1];
  // The jack stands on the key's far end and slides up through two guides.
  scene.shape(
    "jack",
    [
      [JACK_X - 5, keyTop],
      [JACK_X + 5, keyTop],
      [JACK_X + 5, keyTop + 146],
      [JACK_X + 3, keyTop + 150],
      [JACK_X - 5, keyTop + 150],
    ],
    { material: "wood" },
  );
  scene.shape("damper cloth", rect(JACK_X + 5, keyTop + 138, JACK_X + 11, keyTop + 147), {
    material: "damperFelt",
  });
  scene.shape("jack guide", rect(JACK_X - 22, 110, JACK_X - 6, 122), { material: "rail" });
  scene.shape(null, rect(JACK_X + 6, 110, JACK_X + 22, 122), { material: "rail" });
  scene.shape("jack rail", rect(JACK_X - 22, 194, JACK_X + 22, 206), { material: "rail" });
  scene.shape(null, rect(JACK_X - 20, 190, JACK_X + 20, 194), { material: "redFelt", bare: true });
  // The string runs along the key; at the jack it is lifted or ringing.
  const side: Pt[] = [];
  for (let x = 180; x <= 312; x += 2) {
    const u = (x - 180) / 124;
    const bump = lift * (u < PLUCK_AT * 4 ? u / (PLUCK_AT * 4) : (1 - u) / (1 - PLUCK_AT * 4));
    side.push([x, STRING_Y + bump + stringAt(u / 4) * 3]);
  }
  scene.shape(
    "nut",
    [
      [170, STRING_Y - 14],
      [186, STRING_Y - 14],
      [180, STRING_Y],
      [176, STRING_Y],
    ],
    { material: "wood" },
  );
  scene.line("string", side, scene.dark ? "#c9ced3" : "#9aa1a8", 2.2);

  // ── Front view of the jack's top, enlarged ──
  const box = rect(336, -14, 604, 210);
  scene.inset(box, [JACK_X, STRING_Y]);
  scene.clip(box);
  const jy = (y: number) => y + j; // jack-local height
  // Jack body with its slot, and the damper cloth on top.
  scene.shape(
    "jack",
    [zoom([-9, jy(-20)]), zoom([5, jy(-20)]), zoom([5, jy(12)]), zoom([-9, jy(12)])],
    { material: "wood" },
  );
  scene.shape(
    null,
    [zoom([-5, jy(-17)]), zoom([3, jy(-17)]), zoom([3, jy(8)]), zoom([-5, jy(8)])],
    { material: "rail", plain: true },
  );
  scene.shape(
    "damper cloth",
    [zoom([2, jy(1)]), zoom([13, jy(1)]), zoom([13, jy(9)]), zoom([2, jy(9)])],
    {
      material: "damperFelt",
    },
  );
  // The tongue swings back about its axle near the top; the quill sticks out of it.
  const axle: Pt = [-1, jy(4)];
  const tilt = s.tongue * 0.42;
  const pose = [{ pivot: axle, angle: tilt }];
  scene.shape(
    "tongue",
    [
      [-4, jy(-14)],
      [2, jy(-14)],
      [2, jy(6)],
      [-4, jy(6)],
    ].map((p) => zoom(place(p as Pt, pose))),
    {
      material: "wood",
    },
  );
  scene.pin(zoom(axle), undefined, 3);
  // The quill bends down a little while it holds the string up.
  const top = jy(-QUILL_GAP_MM);
  const bend = Math.min(0.6, lift * 0.45);
  const quill: Pt[] = [];
  for (let i = 0; i <= 10; i++) {
    const x = 2 + (i / 10) * 11;
    const sag = bend * ((x - 2) / 11) ** 2;
    quill.push([x, top - sag]);
  }
  const under = quill.map(([x, y]) => [x, y - QUILL_THICK_MM] as Pt).reverse();
  scene.shape(
    "quill",
    [...quill, ...under].map((p) => zoom(place(p, pose))),
    { material: "quill" },
  );
  // The bristle spring behind the tongue.
  scene.line(null, [zoom([-6, jy(-12)]), zoom(place([-3, jy(-6)], pose))], m.metal, 1.2);
  // The string, end-on.
  const sy = lift - bend * (6 / 11) ** 2 + ring * PLUCK_MM;
  scene.shape("string", arc(zoom([8, sy + 0.5]), 0.5 * ZOOM), {
    fill: scene.dark ? "#c9ced3" : "#9aa1a8",
    plain: true,
  });
  scene.unclip();
}

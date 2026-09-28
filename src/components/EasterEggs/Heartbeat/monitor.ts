/** Where the heart settles once it is left alone. */
export const REST_BPM = 60;
/** How much every click winds the heart up. */
const BPM_PER_CLICK = 12;
const MAX_BPM = 190;
/** A heart cannot beat again straight after a beat: the refractory period. A
    click inside it still winds the rate up, it just brings on no extra beat. */
const REFRACTORY_S = 0.28;
/** Left alone this long, the heart starts to calm down... */
const CALM_AFTER_S = 1.5;
/** ...and gets two thirds of the way back to rest in this long. */
const CALM_TAU_S = 3;
/** Within this of rest counts as rested. */
const RESTED_BPM = 1.5;
/** Rested for this long, the monitor switches off. */
const OFF_AFTER_S = 2;
/** Heights in CSS pixels: the R spike above the line, and room below it for
    the dips either side of it. */
const RISE = 16;
const DIP = 5;
/** The dark bar the sweep pushes ahead of itself, wiping the last pass. */
const GAP = 16;
/** How far along the trace fades from its newest part to its oldest. */
const FADE = 0.65;

/** Where the line sits in the canvas, and so how far above the footer's top
    edge the canvas starts. */
export const BASELINE = RISE + 2;
export const MONITOR_HEIGHT = BASELINE + DIP + 2;

type Beat = { at: number; rr: number; paced: boolean };

const bump = (s: number, at: number, width: number, height: number) =>
  height * Math.exp(-((s - at) ** 2) / (2 * width * width));

/**
 * One beat of the trace, `s` seconds from its R spike, in units of the spike's
 * height. A beat the heart paced itself has its P wave ahead of it; one a
 * click forced early comes out of nowhere and has none. The T wave comes in
 * closer the faster the heart goes, as it does on a real trace.
 */
function wave(s: number, { rr, paced }: Beat) {
  const squeeze = Math.sqrt(Math.min(rr, 1.2));
  return (
    (paced ? bump(s, -0.15 * squeeze - 0.02, 0.022, 0.1) : 0) +
    bump(s, -0.032, 0.008, -0.12) +
    bump(s, 0, 0.009, 1) +
    bump(s, 0.03, 0.01, -0.25) +
    bump(s, 0.23 * squeeze, 0.042, 0.22)
  );
}

type MonitorOptions = {
  color: string;
  /** Reduced motion: no sweep, the whole strip is redrawn in place instead. */
  calm: boolean;
  /** A beat, with how hard it is pounding: 0 at rest, 1 flat out. */
  onBeat: (effort: number, rr: number) => void;
  /** Back at rest and left alone: time to switch the monitor off. */
  onRest: () => void;
};

/**
 * A heart monitor drawn on a strip of canvas: a sweep crosses from left to
 * right writing the trace, and wraps around to write over its last pass.
 * Clicks wind the heart up, and left alone it calms back down to rest.
 */
export function startMonitor(canvas: HTMLCanvasElement, options: MonitorOptions) {
  const ctx = canvas.getContext("2d");
  const now = () => performance.now() / 1000;

  let bpm = REST_BPM;
  /** The rate the still strip was last drawn at, under reduced motion. */
  let drawnBpm = 0;
  let lastClick = now();
  let lastBeat = Number.NEGATIVE_INFINITY;
  let nextBeat = now() + 60 / REST_BPM;
  let beats: Beat[] = [];

  let width = 0;
  let levels = new Float32Array(0);
  let written = new Float64Array(0);
  let head = 0;
  let frameAt = now();
  let frame = 0;
  let restedSince = Number.POSITIVE_INFINITY;
  let resting = false;

  const effort = () => (bpm - REST_BPM) / (MAX_BPM - REST_BPM);

  const beat = (at: number, paced: boolean) => {
    const rr = 60 / bpm;
    beats = [...beats.filter((b) => at - b.at < 1.5), { at, rr, paced }];
    lastBeat = at;
    nextBeat = at + rr;
    options.onBeat(effort(), rr);
  };

  /** The trace at time `t`, summed over the beats either side of it. The
      next beat is not there yet, but its P wave already is. */
  const level = (t: number) => {
    let sum = 0;
    for (const b of beats) if (Math.abs(t - b.at) < 0.7) sum += wave(t - b.at, b);
    return sum + bump(t - nextBeat, -0.15 * Math.sqrt(60 / bpm) - 0.02, 0.022, 0.1);
  };

  /** Sizes the canvas to its box. A new size starts a clean strip. */
  const resize = () => {
    const dpr = window.devicePixelRatio || 1;
    const next = Math.round(canvas.clientWidth);
    if (next === width) return;
    width = next;
    canvas.width = width * dpr;
    canvas.height = MONITOR_HEIGHT * dpr;
    ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
    levels = new Float32Array(width).fill(Number.NaN);
    written = new Float64Array(width);
    head = Math.min(head, width);
    if (options.calm) still();
  };

  const y = (value: number) => BASELINE + 0.5 - value * RISE;

  const draw = (t: number) => {
    if (!ctx) return;
    ctx.clearRect(0, 0, width, MONITOR_HEIGHT);
    ctx.lineWidth = 1.5;
    ctx.lineJoin = "round";
    ctx.strokeStyle = options.color;
    const sweep = width / speed();
    // In runs of a few pixels, each run as faint as its oldest pixel is old.
    const RUN = 8;
    for (let from = 0; from < width; from += RUN) {
      ctx.globalAlpha = options.calm
        ? 1
        : 1 - FADE * Math.min(1, Math.max(0, (t - written[from]) / sweep));
      ctx.beginPath();
      let drawing = false;
      for (let x = from; x <= Math.min(width - 1, from + RUN); x++) {
        const ahead = (x - head + width) % width;
        const wiped = !options.calm && ahead > 0 && ahead <= GAP;
        if (Number.isNaN(levels[x]) || wiped) {
          drawing = false;
          continue;
        }
        if (drawing) ctx.lineTo(x, y(levels[x]));
        else ctx.moveTo(x, y(levels[x]));
        drawing = true;
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    if (options.calm) return;
    // The bright point of the sweep.
    const at = Math.min(width - 1, Math.floor(head));
    if (Number.isNaN(levels[at])) return;
    ctx.fillStyle = options.color;
    ctx.shadowColor = options.color;
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(at, y(levels[at]), 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  };

  /** Across a wide window in about seven seconds, like paper at 25 mm/s. */
  const speed = () => Math.min(200, Math.max(110, width / 7));

  /** Reduced motion: the whole strip at the current rate, held still. */
  const still = () => {
    const rr = 60 / bpm;
    const perPx = 1 / speed();
    for (let x = 0; x < width; x++) {
      const s = ((x * perPx) % rr) - rr / 2;
      levels[x] = wave(s, { at: 0, rr, paced: true });
    }
  };

  const tick = () => {
    const t = now();
    // A hidden tab gets no frames: pick up where it left off, not a sweep
    // across however long it was away.
    const dt = Math.min(t - frameAt, 0.1);
    resize();

    if (t - lastClick > CALM_AFTER_S) {
      bpm = REST_BPM + (bpm - REST_BPM) * Math.exp(-dt / CALM_TAU_S);
    }
    if (options.calm && Math.round(bpm) !== drawnBpm) {
      drawnBpm = Math.round(bpm);
      still();
    }

    if (!options.calm && width > 0) {
      if (t - nextBeat > 1) nextBeat = t;
      while (nextBeat <= t) beat(nextBeat, true);
      // Every pixel the sweep crossed this frame gets the trace at the moment
      // the sweep was over it.
      const from = head;
      head += speed() * dt;
      for (let x = Math.ceil(from); x <= head; x++) {
        const at = frameAt + (x - from) / speed();
        levels[x % width] = level(at);
        written[x % width] = at;
      }
      if (head >= width) head -= width;
    }

    frameAt = t;
    draw(t);

    const rested = t - lastClick > CALM_AFTER_S && bpm - REST_BPM < RESTED_BPM;
    restedSince = rested ? Math.min(restedSince, t) : Number.POSITIVE_INFINITY;
    if (!resting && t - restedSince > OFF_AFTER_S) {
      resting = true;
      options.onRest();
    }
    frame = window.requestAnimationFrame(tick);
  };

  resize();
  frame = window.requestAnimationFrame(tick);

  return {
    /** A click on the heart: faster, and a beat now if the heart is ready for one. */
    click() {
      const t = now();
      lastClick = t;
      resting = false;
      bpm = Math.min(MAX_BPM, bpm + BPM_PER_CLICK);
      if (options.calm) return;
      if (t - lastBeat > REFRACTORY_S) beat(t, false);
      else nextBeat = lastBeat + 60 / bpm;
    },
    stop() {
      window.cancelAnimationFrame(frame);
    },
  };
}

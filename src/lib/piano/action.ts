// A piano action as a handful of numbers: how far the key is down, how high
// the hammer is, and which part holds the hammer at the moment. The
// mechanism demos step this model and draw every lever from it. Pure; no
// drawing and no sound here.
//
// Units: the key depth `k` runs from 0 (at rest) to 1 (on the keybed); the
// hammer height `h` from 0 (at rest) to 1 (touching the string). Time is
// real mechanism time in seconds; the demos slow it down for the eye.

export type ActionParts = {
  /** The jack trips at the let-off point, so the hammer flies the last bit on its own. */
  escapement: boolean;
  /** A backcheck on the key catches the falling hammer while the key is down. */
  check: boolean;
  /** A damper rests on the string and lifts with the key. */
  damper: boolean;
  /** A repetition lever holds the hammer up so the jack can reset with the key half up. */
  repetition: boolean;
  /** Hammers stand upright and swing back on a spring, with a bridle tape. */
  upright: boolean;
};

export const NO_PARTS: ActionParts = {
  escapement: false,
  check: false,
  damper: false,
  repetition: false,
  upright: false,
};

export const GRAND: ActionParts = {
  escapement: true,
  check: true,
  damper: true,
  repetition: true,
  upright: false,
};

export const UPRIGHT: ActionParts = {
  escapement: true,
  check: true,
  damper: true,
  repetition: false,
  upright: true,
};

/** Hammer height per key depth while the jack pushes the hammer. */
export const RATIO = 1.12;
/** Key depth at which the jack trips: the hammer is then 2–3 mm below the string. */
export const LET_OFF = 0.85;
/** Hammer travel to the string, in millimetres; turns heights into speeds. */
export const HAMMER_TRAVEL_MM = 51;
/** Key travel from rest to the keybed, in millimetres. */
export const KEY_DIP_MM = 10;

const GRAVITY = 110; // hammer heights per second², a grand hammer falling back
const STRING_BOUNCE = 0.45; // a felt hammer leaves the string at about half its speed
const REST_BOUNCE = 0.5; // a hammer dropped on its rest rail, with nothing to catch it
const KEY_RETURN = 14; // key depths per second when the finger lets go
const JACK_SWING = 70; // how fast the jack swings out and back, per second
const DAMPER_FROM = 0.45; // key depth where the key starts lifting the damper
const DAMPER_FULL = 0.85;
const DAMPER_FALL = 14; // damper heights per second when it drops back
const CHECK_FROM = 0.6; // the backcheck can catch from this key depth on …
const CHECK_RELEASE = 0.55; // … and lets go once the key is back above this
const REPETITION_LIFT = 0.06; // how far the repetition lever lifts the hammer above the jack
const REPETITION_TOP = 0.88; // the drop screw stops the repetition lever here
const SINGLE_RESET = 0.12; // without one, only with the key nearly up and the hammer back down
const REPETITION_RESET = 0.72; // with a repetition lever the jack slips back with the key a quarter up
const UPRIGHT_RESET = 0.4; // an upright's jack spring pushes it back under the butt with the key half up
const REPETITION_RISE = 5; // hammer heights per second the repetition spring lifts the hammer
const BRIDLE = 0.3; // in an upright, the bridle tape keeps the hammer this close to the jack
const STEP = 1 / 5000;

/** Where the backcheck holds the hammer, for a key at depth `k`. */
export const checkHeight = (k: number) => 0.35 + 0.25 * k;

/** Where the spring of the repetition lever holds the hammer, for a key at depth `k`. */
export const repetitionHeight = (k: number) =>
  Math.min(REPETITION_TOP, RATIO * k + REPETITION_LIFT);

/** How far the dampers are lifted by a key at depth `k`, 0 resting to 1 fully up. */
export const damperLift = (k: number) =>
  Math.min(1, Math.max(0, (k - DAMPER_FROM) / (DAMPER_FULL - DAMPER_FROM)));

/** The jack top under the hammer, as a hammer height. */
export const jackHeight = (k: number) => RATIO * k;

/** Seconds from rest to keybed for a touch from 0 (softest) to 1 (hardest). */
export const keyTime = (touch: number) => 0.4 * (0.015 / 0.4) ** Math.min(1, Math.max(0, touch));

/** Hammer speed in metres per second from a speed in hammer heights per second. */
export const metresPerSecond = (speed: number) => (speed * HAMMER_TRAVEL_MM) / 1000;

export type HammerHolder = "jack" | "repetition" | "check" | "rest" | "string" | "air";

export type ActionState = {
  t: number;
  /** Key depth and its speed. */
  k: number;
  kv: number;
  /** The finger holds the key down. */
  held: boolean;
  /** A tap keeps pushing until the key reaches the bottom, then lets the finger decide. */
  latched: boolean;
  /** Key depths per second while the finger pushes. */
  speed: number;
  /** Hammer height and speed. */
  h: number;
  hv: number;
  holder: HammerHolder;
  /** The jack is under the hammer (false: tripped, swung out). */
  jackUnder: boolean;
  /** 0 under the hammer … 1 fully swung out; follows `jackUnder`. */
  jackSwing: number;
  checked: boolean;
  /** Damper lift, 0 on the string … 1 up. */
  damper: number;
  pedal: boolean;
  /** Times the key went down, and times the hammer reached the string. */
  presses: number;
  strikes: number;
  /** The hammer speed at the last strike, in hammer heights per second. */
  lastStrike: number;
};

export type ActionEvent =
  | { type: "strike"; speed: number; t: number }
  /** The string stopped being free to ring: a damper landed or the hammer stayed on it. */
  | { type: "silence"; by: "damper" | "hammer"; t: number };

export function initialAction(): ActionState {
  return {
    t: 0,
    k: 0,
    kv: 0,
    held: false,
    latched: false,
    speed: 1 / keyTime(0.6),
    h: 0,
    hv: 0,
    holder: "jack",
    jackUnder: true,
    jackSwing: 0,
    checked: false,
    damper: 0,
    pedal: false,
    presses: 0,
    strikes: 0,
    lastStrike: 0,
  };
}

/** Press (true) or let go (false). A press runs the key all the way down, however short. */
export function pressKey(state: ActionState, down: boolean) {
  if (down) {
    if (!state.held && !state.latched) state.presses += 1;
    state.held = true;
    state.latched = true;
  } else {
    state.held = false;
  }
}

/** True when nothing on the string stops it from ringing. */
export function stringFree(state: ActionState, parts: ActionParts) {
  if (state.holder === "string") return false;
  if (parts.damper && state.damper < 0.04) return false;
  return true;
}

/** How far down the key can go: without escapement, the hammer on the string stops it. */
const keyLimit = (state: ActionState, parts: ActionParts) =>
  parts.escapement || !state.jackUnder ? 1 : Math.min(1, 1 / RATIO);

/** Advances the action by `dt` seconds of mechanism time; returns what happened. */
export function stepAction(state: ActionState, parts: ActionParts, dt: number): ActionEvent[] {
  const events: ActionEvent[] = [];
  let left = dt;
  while (left > 1e-9) {
    const h = Math.min(STEP, left);
    left -= h;
    substep(state, parts, h, events);
  }
  return events;
}

function substep(s: ActionState, parts: ActionParts, dt: number, events: ActionEvent[]) {
  const wasFree = stringFree(s, parts);
  s.t += dt;

  // The key: pushed down at the touch's speed, or rising back on its own weight.
  const limit = keyLimit(s, parts);
  const before = s.k;
  if (s.held || s.latched) {
    s.k = Math.min(limit, s.k + s.speed * dt);
    if (s.k >= limit - 1e-9) s.latched = false;
  } else {
    s.k = Math.max(0, s.k - KEY_RETURN * dt);
  }
  s.kv = (s.k - before) / dt;

  // The jack trips at the let-off point and resets once it can get back under the hammer.
  if (parts.escapement) {
    if (s.jackUnder && s.k >= LET_OFF) s.jackUnder = false;
    else if (!s.jackUnder) {
      const reset = parts.repetition
        ? REPETITION_RESET
        : parts.upright
          ? UPRIGHT_RESET
          : SINGLE_RESET;
      if (s.k <= reset && jackHeight(s.k) <= s.h + 0.004) s.jackUnder = true;
    }
  }
  const swingTo = s.jackUnder ? 0 : 1;
  s.jackSwing +=
    Math.sign(swingTo - s.jackSwing) * Math.min(Math.abs(swingTo - s.jackSwing), JACK_SWING * dt);

  // The backcheck lets go when the key rises.
  if (s.checked && (!parts.check || s.k < CHECK_RELEASE)) s.checked = false;

  // The hammer: free flight, then whatever it meets.
  if (s.checked) {
    s.h = checkHeight(s.k);
    s.hv = 0;
    s.holder = "check";
  } else {
    const below = s.h;
    const pull = parts.upright ? 50 + 150 * s.h : GRAVITY;
    s.hv -= pull * dt;
    s.h += s.hv * dt;
    s.holder = "air";

    // In an upright the bridle tape drags the hammer back with the falling wippen.
    if (parts.upright && !s.jackUnder && s.kv < 0 && s.h > jackHeight(s.k) + BRIDLE) {
      s.h = jackHeight(s.k) + BRIDLE;
      s.hv = Math.min(s.hv, RATIO * s.kv);
    }

    // The string. Without escapement the jack keeps pushing, and the hammer stays on it.
    if (s.h >= 1) {
      const pushed = s.jackUnder && jackHeight(s.k) >= 1 - 1e-6;
      if (s.hv > 0.2 && below < 1) {
        s.strikes += 1;
        s.lastStrike = s.hv;
        events.push({ type: "strike", speed: s.hv, t: s.t });
      }
      s.h = 1;
      s.hv = pushed ? 0 : -STRING_BOUNCE * Math.max(0, s.hv);
    }

    // The backcheck catches the hammer on its way down while the key is down.
    if (parts.check && !s.jackUnder && s.hv < 0 && s.k >= CHECK_FROM && s.h <= checkHeight(s.k)) {
      s.checked = true;
      s.h = checkHeight(s.k);
      s.hv = 0;
      s.holder = "check";
    } else if (s.jackUnder) {
      // Riding on the jack, or landing on it.
      const floor = jackHeight(s.k);
      const floorSpeed = RATIO * s.kv;
      if (s.h <= floor) {
        s.h = floor;
        s.hv = Math.max(s.hv, floorSpeed);
        s.holder = floor >= 1 - 1e-6 ? "string" : "jack";
      }
    } else if (parts.repetition && s.k < CHECK_FROM) {
      // The repetition lever's spring lifts the hammer off the falling check and holds it.
      const floor = repetitionHeight(s.k);
      if (s.h <= floor) {
        s.h = Math.min(floor, below + REPETITION_RISE * dt);
        s.hv = 0;
        s.holder = "repetition";
      }
    } else if (s.h <= 0) {
      // The rest rail. Nothing catches the hammer here, so it bounces.
      const bounce = parts.check ? 0 : REST_BOUNCE;
      s.h = 0;
      s.hv = s.hv < -1 ? -bounce * s.hv : 0;
      s.holder = "rest";
    }
  }

  // The damper follows the key up, then falls back onto the string.
  if (parts.damper) {
    const lift = s.pedal ? 1 : damperLift(s.k);
    if (lift >= s.damper) s.damper = lift;
    else s.damper = Math.max(lift, s.damper - DAMPER_FALL * dt);
  } else {
    s.damper = 1;
  }

  if (wasFree && !stringFree(s, parts)) {
    events.push({ type: "silence", by: s.holder === "string" ? "hammer" : "damper", t: s.t });
  }
}

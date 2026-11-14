// The two keyboard instruments before the piano, as small models: the
// harpsichord jack, whose quill plucks the string on the way up and slips
// back past it on the way down, and the clavichord tangent, a brass blade
// that strikes the string and stays pressed against it. Pure; the demos draw
// and sound them. Lengths in millimetres, time in seconds.

/** Key travel from rest to the keybed, in millimetres. */
export const KEY_DIP_MM = 9;

const KEY_RETURN = 12; // key depths per second when the finger lets go

type Key = { k: number; kv: number; held: boolean; latched: boolean; speed: number };

/** Presses (true) or lets go (false); a press runs the key all the way to `limit`. */
function moveKey(key: Key, dt: number, limit: number) {
  const before = key.k;
  if (key.held || key.latched) {
    key.k = Math.min(limit, key.k + key.speed * dt);
    if (key.k >= limit - 1e-9) key.latched = false;
    // A finger that eases off lets a key past its target come back up.
    if (key.k > limit) key.k = Math.max(limit, key.k - KEY_RETURN * dt);
  } else {
    key.k = Math.max(0, key.k - KEY_RETURN * dt);
  }
  key.kv = (key.k - before) / dt;
}

const STEP = 1 / 4000;

function substeps(dt: number, each: (h: number) => void) {
  let left = dt;
  while (left > 1e-9) {
    const h = Math.min(STEP, left);
    left -= h;
    each(h);
  }
}

// ── Harpsichord ────────────────────────────────────────────────────────────

/** How far the jack rises from key at rest to key on the keybed. */
export const JACK_RISE_MM = 8;
/** The quill's top surface sits this far below the string at rest. */
export const QUILL_GAP_MM = 1.5;
/** The quill is this thick. */
export const QUILL_THICK_MM = 0.8;
/** The quill lifts the string this far before it bends enough to slip off. */
export const PLUCK_MM = 1;

export type QuillPhase = "below" | "lifting" | "above" | "passing";

export type JackState = Key & {
  t: number;
  phase: QuillPhase;
  /** How far the quill holds the string up, in millimetres. */
  lift: number;
  /** 0 upright … 1 tongue swung fully back. */
  tongue: number;
  plucks: number;
  presses: number;
};

export type JackEvent =
  | { type: "pluck"; height: number; speed: number; t: number }
  | { type: "silence"; t: number };

export function initialJack(): JackState {
  return {
    t: 0,
    k: 0,
    kv: 0,
    held: false,
    latched: false,
    speed: 8,
    phase: "below",
    lift: 0,
    tongue: 0,
    plucks: 0,
    presses: 0,
  };
}

export const jackLift = (k: number) => JACK_RISE_MM * k;

export function stepJack(s: JackState, dt: number): JackEvent[] {
  const events: JackEvent[] = [];
  substeps(dt, (h) => {
    s.t += h;
    const wasDamped = jackLift(s.k) < 0.05;
    moveKey(s, h, 1);
    const j = jackLift(s.k);
    const top = j - QUILL_GAP_MM; // quill top, relative to the string at rest
    const under = top - QUILL_THICK_MM; // quill underside
    if (s.phase === "below" || s.phase === "lifting") {
      if (top > 0) {
        s.phase = "lifting";
        s.lift = top;
        if (top >= PLUCK_MM) {
          // The quill bends, slips off, and the string swings free.
          s.phase = "above";
          s.lift = 0;
          s.plucks += 1;
          events.push({ type: "pluck", height: PLUCK_MM, speed: s.kv * JACK_RISE_MM, t: s.t });
        }
      } else {
        s.phase = "below";
        s.lift = 0;
      }
    } else {
      // On the way down the quill meets the string from above; the tongue swings back.
      const press = -under;
      if (press > 0) {
        s.phase = "passing";
        // Once the quill's whole thickness is past, its top is below the string again.
        s.tongue = Math.min(1, press / QUILL_THICK_MM);
        if (press >= QUILL_THICK_MM) {
          s.phase = "below";
          s.tongue = 0;
        }
      } else {
        s.phase = "above";
        s.tongue = 0;
      }
    }
    // The damper cloth on the jack's top lands back on the string.
    if (!wasDamped && j < 0.05 && s.phase === "below") events.push({ type: "silence", t: s.t });
  });
  return events;
}

export function pressJack(s: JackState, down: boolean) {
  if (down) {
    if (!s.held && !s.latched) s.presses += 1;
    s.held = true;
    s.latched = true;
  } else s.held = false;
}

// ── Clavichord ─────────────────────────────────────────────────────────────

/** The tangent rises this far with the key on the keybed (if the string were not there). */
export const TANGENT_RISE_MM = 7;
/** The string sits this far above the tangent at rest. */
export const TANGENT_GAP_MM = 5;
/** Key depth at which the tangent touches the string. */
export const TANGENT_CONTACT = TANGENT_GAP_MM / TANGENT_RISE_MM;
/** How much deeper a pressing finger can push the key once the tangent is on the string. */
export const PRESS_RANGE = 0.12;
/** Pitch rise at the hardest press, in cents: pressing stretches the string. */
export const BEBUNG_CENTS = 40;

export type TangentState = Key & {
  t: number;
  /** 0 just touching … 1 pressed as hard as the finger goes. */
  pressure: number;
  touching: boolean;
  strikes: number;
  presses: number;
};

export type TangentEvent =
  | { type: "strike"; speed: number; t: number }
  | { type: "silence"; t: number };

export function initialTangent(): TangentState {
  return {
    t: 0,
    k: 0,
    kv: 0,
    held: false,
    latched: false,
    speed: 8,
    pressure: 0.3,
    touching: false,
    strikes: 0,
    presses: 0,
  };
}

export const tangentLift = (k: number) => TANGENT_RISE_MM * k;

/** Pitch rise of the string, in cents, with the key at depth `k`. */
export const bebungCents = (k: number) =>
  Math.max(0, Math.min(1, (k - TANGENT_CONTACT) / PRESS_RANGE)) * BEBUNG_CENTS;

export function stepTangent(s: TangentState, dt: number): TangentEvent[] {
  const events: TangentEvent[] = [];
  substeps(dt, (h) => {
    s.t += h;
    const limit = TANGENT_CONTACT + s.pressure * PRESS_RANGE;
    const before = s.k;
    // Past the contact point the finger presses against the string: slower.
    const free = s.speed;
    if (s.k >= TANGENT_CONTACT) s.speed = Math.min(free, 1.5);
    moveKey(s, h, limit);
    s.speed = free;
    const touching = s.k >= TANGENT_CONTACT - 1e-9;
    if (touching && !s.touching && before < TANGENT_CONTACT) {
      s.strikes += 1;
      events.push({ type: "strike", speed: s.kv * TANGENT_RISE_MM, t: s.t });
    }
    // Off the string, the cloth woven through the strings stops them at once.
    if (!touching && s.touching) events.push({ type: "silence", t: s.t });
    s.touching = touching;
  });
  return events;
}

export function pressTangent(s: TangentState, down: boolean) {
  if (down) {
    if (!s.held && !s.latched) s.presses += 1;
    s.held = true;
    s.latched = true;
  } else s.held = false;
}

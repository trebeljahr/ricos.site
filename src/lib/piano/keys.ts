// Keyboard geometry for the on-screen piano: which keys a range holds and where
// each one sits, as fractions of the keyboard's width.

import { isBlack } from "./notes";

/** Moves a key to the nearest white key at or below (or above) it. */
export const whiteAtOrBelow = (midi: number) => (isBlack(midi) ? midi - 1 : midi);
export const whiteAtOrAbove = (midi: number) => (isBlack(midi) ? midi + 1 : midi);

/** The white key `count` white keys away (negative counts go down). */
export function stepWhite(midi: number, count: number) {
  let m = whiteAtOrBelow(midi);
  let left = Math.abs(count);
  const dir = Math.sign(count);
  while (left > 0) {
    m += dir;
    if (!isBlack(m)) left--;
  }
  return m;
}

export const whiteCount = (from: number, to: number) => {
  let n = 0;
  for (let m = from; m <= to; m++) if (!isBlack(m)) n++;
  return n;
};

// Real black keys are not centred between the white ones: C♯ and F♯ lean left,
// D♯ and A♯ lean right. Offsets are fractions of a white key.
const BLACK_OFFSET: Record<number, number> = { 1: -0.12, 3: 0.12, 6: -0.14, 8: 0, 10: 0.14 };
export const BLACK_WIDTH = 0.6;

export type KeyBox = {
  midi: number;
  black: boolean;
  /** Left edge and width, as fractions of the whole keyboard. */
  left: number;
  width: number;
};

/** Every key from `from` to `to` (both moved out to white keys). */
export function layoutKeys(fromMidi: number, toMidi: number): KeyBox[] {
  const from = whiteAtOrBelow(fromMidi);
  const to = whiteAtOrAbove(toMidi);
  const whites = whiteCount(from, to);
  const w = 1 / whites;
  const keys: KeyBox[] = [];
  let index = 0;
  for (let m = from; m <= to; m++) {
    if (isBlack(m)) {
      const offset = BLACK_OFFSET[((m % 12) + 12) % 12] ?? 0;
      keys.push({
        midi: m,
        black: true,
        left: (index + offset) * w - (BLACK_WIDTH * w) / 2,
        width: BLACK_WIDTH * w,
      });
    } else {
      keys.push({ midi: m, black: false, left: index * w, width: w });
      index++;
    }
  }
  return keys;
}

/** Centre of a key, as a fraction of the keyboard width. */
export function keyCentre(keys: KeyBox[], midi: number) {
  const key = keys.find((k) => k.midi === midi);
  return key ? key.left + key.width / 2 : null;
}

// ── Computer keyboard as piano ─────────────────────────────────────────────

/** Physical key codes (layout independent) → half steps above the base C. */
export const COMPUTER_KEYS: Record<string, number> = {
  KeyA: 0,
  KeyW: 1,
  KeyS: 2,
  KeyE: 3,
  KeyD: 4,
  KeyF: 5,
  KeyT: 6,
  KeyG: 7,
  KeyY: 8,
  KeyH: 9,
  KeyU: 10,
  KeyJ: 11,
  KeyK: 12,
  KeyO: 13,
  KeyL: 14,
  KeyP: 15,
  Semicolon: 16,
  Quote: 17,
};

export const OCTAVE_DOWN_KEY = "KeyZ";
export const OCTAVE_UP_KEY = "KeyX";

/** QWERTY labels, used until (or unless) the browser reports the real layout. */
export const QWERTY_LABELS: Record<string, string> = {
  KeyA: "A",
  KeyW: "W",
  KeyS: "S",
  KeyE: "E",
  KeyD: "D",
  KeyF: "F",
  KeyT: "T",
  KeyG: "G",
  KeyY: "Y",
  KeyH: "H",
  KeyU: "U",
  KeyJ: "J",
  KeyK: "K",
  KeyO: "O",
  KeyL: "L",
  KeyP: "P",
  Semicolon: ";",
  Quote: "'",
  KeyZ: "Z",
  KeyX: "X",
};

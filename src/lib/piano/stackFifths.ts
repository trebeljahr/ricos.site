import { defaultLetter, noteName, pitchClass, spell } from "./notes";

export type Direction = 1 | -1;

export const MAX_FIFTHS = 12;
/** Half steps from the start up to each letter of a fifth: the first five notes of a major scale. */
const LETTERS_UP = [0, 2, 4, 5, 7];
/** The same five letters counted downwards: C B♭ A G F. */
const LETTERS_DOWN = [0, -2, -3, -5, -7];

/** A note's name with a given letter, or its plain name when no accidental reaches it. */
const nameWith = (midi: number, letter: number) =>
  spell(midi, letter) ?? noteName(midi, { octave: false });

/**
 * The key the chain starts on: up from F3–E4, down from F4–E5, so the whole
 * chain and every unfolded fifth fit on two octaves of keys.
 */
export const startKey = (pc: number, dir: Direction) =>
  (dir === 1 ? 53 : 65) + ((((pc - 5) % 12) + 12) % 12);

/** Black keys start with flats going up (D♭ A♭ E♭ …) and sharps going down (C♯ F♯ B …). */
export const startLetter = (start: number, dir: Direction) => defaultLetter(start, dir === 1);

export type ChainNote = {
  index: number;
  /** The key, folded into the octave on the start's side. */
  midi: number;
  letter: number;
  name: string;
};

/** The start and twelve fifths above (or below) it, each folded into one octave. */
export function fifthsChain(start: number, dir: Direction): ChainNote[] {
  const first = startLetter(start, dir);
  return Array.from({ length: MAX_FIFTHS + 1 }, (_, i) => {
    const folded = (7 * i) % 12;
    const midi = i === MAX_FIFTHS ? start + 12 * dir : start + dir * folded;
    const letter = first + dir * 4 * i;
    return { index: i, midi, letter, name: nameWith(midi, letter) };
  });
}

export type FifthCount = {
  /** The five letter names from the lower note to the fifth: C D E F G. */
  letters: { midi: number; name: string }[];
  /** Every key on the way, the start included: eight keys, seven half steps. */
  halfSteps: number[];
  /** The fifth itself, unfolded. */
  target: number;
};

/** How a fifth is found from `from`: five letter names, which take seven half steps. */
export function countFifth(from: number, letter: number, dir: Direction): FifthCount {
  const offsets = dir === 1 ? LETTERS_UP : LETTERS_DOWN;
  return {
    letters: offsets.map((s, k) => ({
      midi: from + s,
      name: nameWith(from + s, letter + dir * k),
    })),
    halfSteps: Array.from({ length: 8 }, (_, j) => from + dir * j),
    target: from + 7 * dir,
  };
}

/** The keys of the first `count` fifths, low to high, each once, and the octave that closes them. */
export function pitchOrder(chain: ChainNote[], count: number, start: number, dir: Direction) {
  const keys = new Set(chain.slice(0, Math.min(count, MAX_FIFTHS - 1) + 1).map((n) => n.midi));
  keys.add(start + 12 * dir);
  return [...keys].sort((a, b) => a - b);
}

/** How many different keys (pitch classes) the first `count` fifths reach. */
export const distinctNotes = (chain: ChainNote[], count: number) =>
  new Set(chain.slice(0, count + 1).map((n) => pitchClass(n.midi))).size;

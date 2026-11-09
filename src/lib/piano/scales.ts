// Scales, keys, modes and the chords inside a key, for the /piano demos. Pure
// functions on top of notes.ts, so tests and server rendering can use them.

import {
  chordSymbol,
  fifthsIndex,
  INTERVALS,
  MINOR_THIRD,
  noteName,
  pitchClass,
  type StackedNote,
  spell,
  stackThirds,
} from "./notes";

const LETTERS = ["C", "D", "E", "F", "G", "A", "B"];
const mod = (n: number, m: number) => ((n % m) + m) % m;

// ── Modes ──────────────────────────────────────────────────────────────────

/** Whole and half steps of the major scale: W W H W W W H. */
export const MAJOR_STEPS = [2, 2, 1, 2, 2, 2, 1];
/** Half steps above the tonic of each degree of the major scale. */
export const MAJOR_SCALE = [0, 2, 4, 5, 7, 9, 11];

export type Mode = {
  name: string;
  /** The everyday name of the two modes that have one. */
  alias?: "major" | "minor";
  /** The degree of the major scale the mode starts on: 0 Ionian … 6 Locrian. */
  start: number;
};

/** The seven modes in the order they start on the degrees of the major scale. */
export const MODES: Mode[] = [
  { name: "Ionian", alias: "major", start: 0 },
  { name: "Dorian", start: 1 },
  { name: "Phrygian", start: 2 },
  { name: "Lydian", start: 3 },
  { name: "Mixolydian", start: 4 },
  { name: "Aeolian", alias: "minor", start: 5 },
  { name: "Locrian", start: 6 },
];
export const MAJOR = MODES[0];
export const MINOR = MODES[5];

/** The mode's whole and half steps: the major scale's, rotated. */
export const modeSteps = (mode: Mode) =>
  MAJOR_STEPS.map((_, i) => MAJOR_STEPS[(i + mode.start) % 7]);

/** Half steps above the tonic of each of the mode's seven degrees. */
export function modeScale(mode: Mode) {
  const steps = modeSteps(mode);
  return steps.map((_, i) => steps.slice(0, i).reduce((sum, step) => sum + step, 0));
}

/**
 * How far the mode's degrees are raised (+1) or lowered (−1) against the
 * major scale on the same tonic, added up: Lydian +1, Ionian 0 … Locrian −5.
 * Each lowered note is one more flat in the key signature.
 */
export const modeFifths = (mode: Mode) =>
  modeScale(mode).reduce((sum, semitones, i) => sum + semitones - MAJOR_SCALE[i], 0);

/** The modes from the brightest (most raised notes) to the darkest. */
export const MODES_BRIGHT_TO_DARK = [...MODES].sort((a, b) => modeFifths(b) - modeFifths(a));

const SIGN: Record<number, string> = { [-1]: "♭", 0: "", 1: "♯" };

/** "1", "2", "♭3" …: each degree against the major scale on the same tonic. */
export const degreeLabels = (mode: Mode) =>
  modeScale(mode).map((semitones, i) => `${SIGN[semitones - MAJOR_SCALE[i]] ?? "?"}${i + 1}`);

/** The degrees (0–6) where two modes on the same tonic differ. */
export function changedDegrees(a: Mode, b: Mode) {
  const x = modeScale(a);
  const y = modeScale(b);
  return x.flatMap((semitones, i) => (semitones === y[i] ? [] : [i]));
}

// ── Keys ───────────────────────────────────────────────────────────────────

export type Key = {
  mode: Mode;
  /** Sharps (+) or flats (−) in the key signature. */
  fifths: number;
  tonicPc: number;
  /** Letter of the tonic: 0 = C … 6 = B. */
  tonicLetter: number;
  /** The tonic spelled, "E♭". */
  tonic: string;
};

/** The key whose signature has `fifths` sharps (+) or flats (−), in a mode. */
export function keyFromFifths(fifths: number, mode: Mode = MAJOR): Key {
  const parentPc = mod(7 * fifths, 12);
  const parentLetter = mod(4 * fifths, 7);
  const tonicPc = mod(parentPc + MAJOR_SCALE[mode.start], 12);
  const tonicLetter = mod(parentLetter + mode.start, 7);
  return { mode, fifths, tonicPc, tonicLetter, tonic: spell(tonicPc, tonicLetter) ?? "?" };
}

/**
 * The key on a tonic, spelled with the fewest sharps or flats. Six of each is
 * a tie (F♯ major or G♭ major): sharps win unless `flats` is set.
 */
export function keyOn(tonicPc: number, mode: Mode = MAJOR, { flats = false } = {}): Key {
  const parentPc = mod(tonicPc - MAJOR_SCALE[mode.start], 12);
  const sharps = mod(7 * parentPc, 12);
  const flatSide = sharps - 12;
  const fifths =
    sharps < -flatSide ? sharps : -flatSide < sharps ? flatSide : flats ? flatSide : sharps;
  return keyFromFifths(fifths, mode);
}

/**
 * A mode on a tonic, spelled like the major key on that tonic (D♭ Dorian, not
 * C♯ Dorian) unless that needs more than seven flats or sharps (C♯ minor, not
 * D♭ minor). Keeps the tonic's name while the modes on it are compared.
 */
export function modeOn(tonicPc: number, mode: Mode, { flats = false } = {}): Key {
  let fifths = keyOn(tonicPc, MAJOR, { flats }).fifths + modeFifths(mode);
  if (fifths < -7) fifths += 12;
  if (fifths > 7) fifths -= 12;
  return keyFromFifths(fifths, mode);
}

/** "E♭ major", "C♯ minor", "D Dorian". */
export const keyName = (key: Key) => `${key.tonic} ${key.mode.alias ?? key.mode.name}`;

/** The relative major of a minor key, or the relative minor of any other key. */
export const relativeKey = (key: Key) =>
  keyFromFifths(key.fifths, key.mode === MINOR ? MAJOR : MINOR);

export type ScaleNote = {
  midi: number;
  pc: number;
  /** 0 = the tonic … 6. */
  degree: number;
  /** 0 = C … 6 = B. */
  letter: number;
  spelled: string;
  /** "1", "♭3", "♯4": against the major scale on the same tonic. */
  label: string;
  /** The added note of a blues scale. */
  blue?: boolean;
};

/** The lowest MIDI number at or above `low` with a pitch class. */
export const atOrAbove = (pc: number, low: number) => low + mod(pc - low, 12);

/** The seven notes of a key, upward from its tonic, the tonic at or above `low`. */
export function scaleNotes(key: Key, low = 60): ScaleNote[] {
  const tonic = atOrAbove(key.tonicPc, low);
  const labels = degreeLabels(key.mode);
  return modeScale(key.mode).map((semitones, degree) => {
    const midi = tonic + semitones;
    const letter = mod(key.tonicLetter + degree, 7);
    return {
      midi,
      pc: pitchClass(midi),
      degree,
      letter,
      spelled: spell(midi, letter) ?? noteName(midi, { octave: false }),
      label: labels[degree],
    };
  });
}

/** The pitch classes of a key. */
export const keyPitchClasses = (key: Key) =>
  new Set(modeScale(key.mode).map((semitones) => mod(key.tonicPc + semitones, 12)));

/** How many of their seven notes two keys share. */
export function sharedNotes(a: Key, b: Key) {
  const pcs = keyPitchClasses(a);
  return [...keyPitchClasses(b)].filter((pc) => pcs.has(pc)).length;
}

/**
 * Where a key's notes sit on the circle of fifths: seven neighbouring
 * positions (C 0, G 1 … F 11), from one fifth below the major tonic to five
 * above. C major is F C G D A E B.
 */
export const fifthsSpan = (fifths: number) =>
  Array.from({ length: 7 }, (_, i) => mod(fifths - 1 + i, 12));

/**
 * One step around the circle of fifths: +1 adds a sharp (or drops a flat).
 * Past six sharps the wheel goes on with the flat keys (F♯ → D♭), and past
 * six flats with the sharp ones (G♭ → B), as a printed circle does.
 */
export function turnFifths(fifths: number, step: 1 | -1) {
  const next = fifths + step;
  if (next >= 7) return next - 12;
  if (next <= -7) return next + 12;
  return next;
}

/** The other spelling of a key at the bottom of the circle: B ↔ C♭, F♯ ↔ G♭, D♭ ↔ C♯. */
export const enharmonicFifths = (fifths: number) =>
  Math.abs(fifths) >= 5 ? fifths - 12 * Math.sign(fifths) : null;

// ── Key signatures on a treble staff ──────────────────────────────────────

const SHARP_LETTERS = [3, 0, 4, 1, 5, 2, 6]; // F C G D A E B
const FLAT_LETTERS = [6, 2, 5, 1, 4, 0, 3]; // B E A D G C F
/** Staff steps above the bottom line (E4) where each sharp or flat is written. */
const SHARP_STEPS = [8, 5, 9, 6, 3, 7, 4];
const FLAT_STEPS = [4, 7, 3, 6, 2, 5, 1];

export type SignatureMark = {
  letter: number;
  accidental: "♯" | "♭";
  /** "F♯" */
  name: string;
  /** Lines and spaces above the bottom line of a treble staff: 0 is E4, 8 is F5. */
  step: number;
};

/** The sharps or flats of a key signature, in the order they are written. */
export function keySignature(fifths: number): SignatureMark[] {
  const sharp = fifths > 0;
  return Array.from({ length: Math.min(7, Math.abs(fifths)) }, (_, i) => {
    const letter = (sharp ? SHARP_LETTERS : FLAT_LETTERS)[i];
    const accidental = sharp ? "♯" : "♭";
    return {
      letter,
      accidental,
      name: `${LETTERS[letter]}${accidental}`,
      step: (sharp ? SHARP_STEPS : FLAT_STEPS)[i],
    };
  });
}

// ── Pentatonic and blues ──────────────────────────────────────────────────

/**
 * The five notes of a key that sit next to each other on the circle of fifths
 * without its two ends (in C major: F and B, the notes a half step from a
 * neighbour). For a major key this is the major pentatonic, for a minor key
 * the minor pentatonic; relative keys share the same five.
 */
export function pentatonic(key: Key, low = 60) {
  const ends = new Set([mod(key.fifths - 1, 12), mod(key.fifths + 5, 12)]);
  return scaleNotes(key, low).filter((note) => !ends.has(fifthsIndex(note.pc)));
}

/** The blue note added to a pentatonic: ♭5 in minor, ♭3 in major. */
export function blueNote(key: Key, low = 60): ScaleNote {
  const minor = key.mode === MINOR;
  const tonic = atOrAbove(key.tonicPc, low);
  const degree = minor ? 4 : 2;
  const midi = tonic + (minor ? 6 : 3);
  const letter = mod(key.tonicLetter + degree, 7);
  return {
    midi,
    pc: pitchClass(midi),
    degree,
    letter,
    spelled: spell(midi, letter) ?? noteName(midi, { octave: false }),
    label: minor ? "♭5" : "♭3",
    blue: true,
  };
}

/** The pentatonic of a major or minor key with its blue note: six notes. */
export const bluesScale = (key: Key, low = 60) =>
  [...pentatonic(key, low), blueNote(key, low)].sort((a, b) => a.midi - b.midi);

/** Half steps between neighbouring notes, and from the last back to the tonic. */
export function stepSizes(notes: { midi: number }[]) {
  return notes.map((note, i) =>
    i + 1 < notes.length ? notes[i + 1].midi - note.midi : notes[0].midi + 12 - note.midi,
  );
}

// ── Chords inside a key ───────────────────────────────────────────────────

export type ChordFunction = "tonic" | "predominant" | "dominant";

/** The usual grouping by root: 1, 3, 6 rest; 2, 4 lead away; 5, 7 pull home. */
export const FUNCTION_OF_DEGREE: ChordFunction[] = [
  "tonic",
  "predominant",
  "tonic",
  "predominant",
  "dominant",
  "tonic",
  "dominant",
];

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII"];

/** I, ii, vii°, V7, viiø7 …: upper case for a major third, lower case for minor. */
export function romanNumeral(degree: number, thirds: number[]) {
  const [a, b, c] = thirds;
  const numeral = a === MINOR_THIRD ? ROMAN[degree].toLowerCase() : ROMAN[degree];
  const fifth = a + (b ?? 0);
  const triad = fifth === 6 ? "°" : fifth === 8 ? "+" : "";
  if (c === undefined) return `${numeral}${triad}`;
  const seventh = fifth + c;
  if (fifth === 6) return `${numeral}${seventh === 9 ? "°7" : "ø7"}`;
  return `${numeral}${triad}${seventh === 11 ? "maj7" : "7"}`;
}

export type DiatonicChord = {
  degree: number;
  roman: string;
  symbol: string;
  /** Half steps between neighbouring chord tones. */
  thirds: number[];
  notes: StackedNote[];
  function: ChordFunction;
};

/** The chord built in thirds from the key's own notes on each of its degrees. */
export function diatonicChords(key: Key, size: 3 | 4 = 3, low = 48): DiatonicChord[] {
  const scale = scaleNotes(key, low);
  const semitones = modeScale(key.mode);
  const above = (j: number) => Math.floor(j / 7) * 12 + semitones[j % 7];
  return scale.map((root, degree) => {
    const tones = Array.from({ length: size }, (_, k) => above(degree + 2 * k) - above(degree));
    const thirds = tones.slice(1).map((tone, k) => tone - tones[k]);
    const notes = stackThirds(root.midi, thirds, true, root.letter);
    return {
      degree,
      roman: romanNumeral(degree, thirds),
      symbol: chordSymbol(notes[0].spelled, thirds),
      thirds,
      notes,
      function: FUNCTION_OF_DEGREE[degree],
    };
  });
}

export const TRIADS = [
  { name: "major", thirds: [4, 3] },
  { name: "minor", thirds: [3, 4] },
  { name: "diminished", thirds: [3, 3] },
] as const;

/**
 * A triad of any quality on a degree of a key, spelled with the scale's
 * letters, and which of its notes are outside the key.
 */
export function triadOnDegree(key: Key, degree: number, thirds: readonly number[], low = 48) {
  const root = scaleNotes(key, low)[degree];
  const pcs = keyPitchClasses(key);
  const notes = stackThirds(root.midi, [...thirds], true, root.letter);
  const outside = notes.map((note) => !pcs.has(pitchClass(note.midi)));
  return { notes, outside, fits: !outside.some(Boolean) };
}

// ── Voicings ───────────────────────────────────────────────────────────────

const ascending = (notes: number[]) => [...notes].sort((a, b) => a - b);

/** Moves the lowest note up past the highest, `times` times: the next inversion each time. */
export function invert(notes: number[], times = 1) {
  const out = ascending(notes);
  for (let i = 0; i < times && out.length > 1; i++) {
    let low = out.shift() as number;
    while (low <= out[out.length - 1]) low += 12;
    out.push(low);
  }
  return out;
}

/** Opens a close chord: the second-lowest note moves up past the highest. The bass stays. */
export function openVoicing(notes: number[]) {
  const out = ascending(notes);
  if (out.length < 3) return out;
  let lifted = out.splice(1, 1)[0];
  while (lifted <= out[out.length - 1]) lifted += 12;
  return [...out, lifted];
}

/** Which chord tone (0 root, 1 third, 2 fifth, 3 seventh) is in the bass. */
export function bassTone(voicing: number[], chordPcs: number[]) {
  const bass = pitchClass(Math.min(...voicing));
  return chordPcs.findIndex((pc) => pitchClass(pc) === bass);
}

export const INVERSION_NAMES = ["root position", "1st inversion", "2nd inversion", "3rd inversion"];

/** Figured bass of an inversion: "5/3", "6", "6/4" for triads; "7", "6/5", "4/3", "4/2" for sevenths. */
export const figuredBass = (size: number, inversion: number) =>
  (size >= 4 ? ["7", "6/5", "4/3", "4/2"] : ["5/3", "6", "6/4"])[inversion] ?? "";

const COMPOUND = [
  "P8",
  "m9",
  "M9",
  "m10",
  "M10",
  "P11",
  "A11",
  "P12",
  "m13",
  "M13",
  "m14",
  "M14",
  "P15",
];

/** Short interval name from half steps, up to two octaves: "m3", "P5", "M10". */
export function intervalShort(semitones: number) {
  const s = Math.abs(semitones);
  if (s <= 12) return INTERVALS[s].short;
  return COMPOUND[s - 12] ?? `${s}`;
}

/** Every placement of these pitch classes in a range, one note each, spanning at most `maxSpan`. */
export function voicingsInRange(pcs: number[], [low, high]: [number, number], maxSpan = 12) {
  const options = pcs.map((pc) => {
    const out: number[] = [];
    for (let m = atOrAbove(pc, low); m <= high; m += 12) out.push(m);
    return out;
  });
  const results: number[][] = [];
  const walk = (i: number, picked: number[]) => {
    if (i === options.length) {
      const sorted = ascending(picked);
      if (sorted[sorted.length - 1] - sorted[0] <= maxSpan) results.push(sorted);
      return;
    }
    for (const m of options[i]) walk(i + 1, [...picked, m]);
  };
  walk(0, []);
  return results;
}

/**
 * Half steps the voices move from one chord to the next. With the same
 * number of notes the voices pair up from the bottom; otherwise each new note
 * counts from the nearest old one.
 */
export function movement(from: number[], to: number[]) {
  if (from.length === 0) return 0;
  const a = ascending(from);
  const b = ascending(to);
  if (a.length === b.length) return a.reduce((sum, m, i) => sum + Math.abs(m - b[i]), 0);
  return b.reduce((sum, m) => sum + Math.min(...a.map((n) => Math.abs(n - m))), 0);
}

/**
 * The placement of a chord's pitch classes in a range that moves least from
 * the previous chord; ties go to the narrower, then the lower placement.
 */
export function leadVoices(
  previous: number[],
  pcs: number[],
  range: [number, number],
  maxSpan = 12,
) {
  const candidates = voicingsInRange(pcs, range, maxSpan);
  let best = candidates[0] ?? [];
  let bestScore = Number.POSITIVE_INFINITY;
  for (const voicing of candidates) {
    const span = voicing[voicing.length - 1] - voicing[0];
    const score = movement(previous, voicing) * 1000 + span * 10 + voicing[0] / 100;
    if (score < bestScore) {
      best = voicing;
      bestScore = score;
    }
  }
  return best;
}

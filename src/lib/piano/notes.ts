// Note maths for the /piano demos: MIDI numbers, frequencies, names, colours
// and intervals. Pure functions, no audio, so tests and server rendering can
// use them.

export const A4_MIDI = 69;
export const A4_HZ = 440;

/** Lowest and highest key of an 88-key piano. */
export const PIANO_LOW = 21;
export const PIANO_HIGH = 108;

export const midiToHz = (midi: number) => A4_HZ * 2 ** ((midi - A4_MIDI) / 12);
export const hzToMidi = (hz: number) => A4_MIDI + 12 * Math.log2(hz / A4_HZ);

/** 0 = C, 1 = C♯/D♭ … 11 = B. Works for negative and fractional input. */
export const pitchClass = (midi: number) => ((Math.round(midi) % 12) + 12) % 12;

/** Scientific pitch notation: MIDI 60 is C4. */
export const octaveOf = (midi: number) => Math.floor(Math.round(midi) / 12) - 1;

const BLACK = new Set([1, 3, 6, 8, 10]);
export const isBlack = (midi: number) => BLACK.has(pitchClass(midi));

export const SHARP_NAMES = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"];
export const FLAT_NAMES = ["C", "D♭", "D", "E♭", "E", "F", "G♭", "G", "A♭", "A", "B♭", "B"];

export function noteName(
  midi: number,
  { flats = false, octave = true }: { flats?: boolean; octave?: boolean } = {},
) {
  const name = (flats ? FLAT_NAMES : SHARP_NAMES)[pitchClass(midi)];
  return octave ? `${name}${octaveOf(midi)}` : name;
}

/** Both spellings of a black key, "C♯/D♭"; a white key's one name. */
export function bothNames(midi: number) {
  const pc = pitchClass(midi);
  return SHARP_NAMES[pc] === FLAT_NAMES[pc]
    ? SHARP_NAMES[pc]
    : `${SHARP_NAMES[pc]}/${FLAT_NAMES[pc]}`;
}

/** Cents between two frequencies, or of one ratio. 1200 cents = one octave. */
export const cents = (ratio: number) => 1200 * Math.log2(ratio);

/** Folds a ratio into one octave, [1, 2). */
export function foldOctave(ratio: number) {
  let r = ratio;
  while (r >= 2) r /= 2;
  while (r < 1) r *= 2;
  return r;
}

/** The nearest key to a frequency, and how far off it is in cents. */
export function nearestNote(hz: number) {
  const exact = hzToMidi(hz);
  const midi = Math.round(exact);
  return { midi, cents: (exact - midi) * 100 };
}

export function formatHz(hz: number) {
  if (hz >= 10000) return `${(hz / 1000).toFixed(1)} kHz`;
  if (hz >= 1000) return `${(hz / 1000).toFixed(2)} kHz`;
  if (hz >= 100) return `${hz.toFixed(0)} Hz`;
  if (hz >= 10) return `${hz.toFixed(1)} Hz`;
  return `${hz.toFixed(2)} Hz`;
}

export function formatCents(value: number) {
  const rounded = Math.round(value);
  if (rounded === 0) return "±0¢";
  return `${rounded > 0 ? "+" : "−"}${Math.abs(rounded)}¢`;
}

/** Position on the circle of fifths: C 0, G 1, D 2 … F 11. */
export const fifthsIndex = (pc: number) => (((pc % 12) + 12) * 7) % 12;

/**
 * One hue per pitch class, walking the circle of fifths: notes a fifth apart
 * get neighbouring hues, so a chord or scale built from close fifths looks
 * like a family, and a tritone sits on the opposite side of the wheel.
 */
export function pitchHue(pc: number) {
  return (fifthsIndex(pc) * 30 + 20) % 360;
}

export function pitchColor(pc: number, lightness = 0.68, chroma = 0.16) {
  return `oklch(${lightness} ${chroma} ${pitchHue(pc)})`;
}

/** The colour of the key nearest to a frequency. */
export function frequencyColor(hz: number, lightness = 0.68, chroma = 0.16) {
  return pitchColor(pitchClass(hzToMidi(hz)), lightness, chroma);
}

// ── Intervals ──────────────────────────────────────────────────────────────

export type Interval = {
  semitones: number;
  short: string;
  name: string;
  /** The small whole-number ratio the equal-tempered interval stands in for. */
  ratio: [number, number];
  /** Letter steps from the lower note to the upper one: a third is 2. */
  letterSteps: number;
};

export const INTERVALS: Interval[] = [
  { semitones: 0, short: "P1", name: "Unison", ratio: [1, 1], letterSteps: 0 },
  { semitones: 1, short: "m2", name: "Minor second", ratio: [16, 15], letterSteps: 1 },
  { semitones: 2, short: "M2", name: "Major second", ratio: [9, 8], letterSteps: 1 },
  { semitones: 3, short: "m3", name: "Minor third", ratio: [6, 5], letterSteps: 2 },
  { semitones: 4, short: "M3", name: "Major third", ratio: [5, 4], letterSteps: 2 },
  { semitones: 5, short: "P4", name: "Perfect fourth", ratio: [4, 3], letterSteps: 3 },
  { semitones: 6, short: "TT", name: "Tritone", ratio: [45, 32], letterSteps: 3 },
  { semitones: 7, short: "P5", name: "Perfect fifth", ratio: [3, 2], letterSteps: 4 },
  { semitones: 8, short: "m6", name: "Minor sixth", ratio: [8, 5], letterSteps: 5 },
  { semitones: 9, short: "M6", name: "Major sixth", ratio: [5, 3], letterSteps: 5 },
  { semitones: 10, short: "m7", name: "Minor seventh", ratio: [16, 9], letterSteps: 6 },
  { semitones: 11, short: "M7", name: "Major seventh", ratio: [15, 8], letterSteps: 6 },
  { semitones: 12, short: "P8", name: "Octave", ratio: [2, 1], letterSteps: 7 },
];

// ── Spelling ───────────────────────────────────────────────────────────────

const LETTERS = ["C", "D", "E", "F", "G", "A", "B"];
const LETTER_PC = [0, 2, 4, 5, 7, 9, 11];
const ACCIDENTALS: Record<number, string> = { [-2]: "𝄫", [-1]: "♭", 0: "", 1: "♯", 2: "𝄪" };

/** The letter (0 = C … 6 = B) a key is spelled with by default: flats for black keys. */
export function defaultLetter(midi: number, flats = true) {
  const name = (flats ? FLAT_NAMES : SHARP_NAMES)[pitchClass(midi)];
  return LETTERS.indexOf(name[0]);
}

/**
 * Spells a key with a given letter: E♭ and D♯ are the same key, spelled with
 * different letters. Returns null when the letter is more than two half steps
 * away, which no accidental covers.
 */
export function spell(midi: number, letter: number) {
  const l = ((letter % 7) + 7) % 7;
  let offset = pitchClass(midi) - LETTER_PC[l];
  if (offset > 6) offset -= 12;
  if (offset < -6) offset += 12;
  const accidental = ACCIDENTALS[offset];
  if (accidental === undefined) return null;
  return `${LETTERS[l]}${accidental}`;
}

/** The upper note of an interval, spelled from the lower note's letter. */
export function spellInterval(rootMidi: number, interval: Interval, flats = true) {
  const rootLetter = defaultLetter(rootMidi, flats);
  const upper = rootMidi + interval.semitones;
  return (
    spell(upper, rootLetter + interval.letterSteps) ?? noteName(upper, { flats, octave: false })
  );
}

// ── Chords built from stacked thirds ───────────────────────────────────────

export const MINOR_THIRD = 3;
export const MAJOR_THIRD = 4;

/** 1, 3, 5, 7, 9, 11, 13: the chord degree of each stacked note. */
export const DEGREES = [1, 3, 5, 7, 9, 11, 13];

/** Semitones above the root of each degree when nothing is raised or lowered. */
const NATURAL: Record<number, number> = { 3: 4, 5: 7, 7: 11, 9: 14, 11: 17, 13: 21 };

export type StackedNote = {
  midi: number;
  degree: number;
  /** Semitones above the root. */
  semitones: number;
  /** "1", "♭3", "5", "♯11" … relative to the major-scale degree, except the 7th (see below). */
  label: string;
  spelled: string;
};

/**
 * The notes of a chord built by stacking thirds (each 3 or 4 half steps) on a
 * root. `rootLetter` spells the root with a given letter (F♯ rather than G♭
 * in D major); by default black keys are spelled with flats.
 */
export function stackThirds(
  rootMidi: number,
  thirds: number[],
  flats = true,
  rootLetter = defaultLetter(rootMidi, flats),
): StackedNote[] {
  const notes: StackedNote[] = [];
  let semitones = 0;
  for (let i = 0; i <= thirds.length && i < DEGREES.length; i++) {
    if (i > 0) semitones += thirds[i - 1];
    const degree = DEGREES[i];
    const midi = rootMidi + semitones;
    notes.push({
      midi,
      degree,
      semitones,
      label: degreeLabel(degree, semitones),
      spelled: spell(midi, rootLetter + 2 * i) ?? noteName(midi, { flats, octave: false }),
    });
  }
  return notes;
}

function degreeLabel(degree: number, semitones: number) {
  if (degree === 1) return "1";
  // Sevenths are named from the dominant seventh, as chord symbols do: 10 half
  // steps is a plain "7", 11 is "maj7", 9 is the diminished "𝄫7".
  if (degree === 7)
    return semitones === 11 ? "maj7" : semitones === 10 ? "7" : semitones === 9 ? "𝄫7" : "7?";
  const offset = semitones - NATURAL[degree];
  const accidental = ACCIDENTALS[offset];
  return accidental === undefined ? `${degree}?` : `${accidental}${degree}`;
}

/**
 * A chord symbol for stacked thirds: "C", "Cm7", "Cmaj9", "C7(♭9)".
 * `root` is the root's spelled name. Returns the quality alone when `root` is "".
 */
export function chordSymbol(root: string, thirds: number[]) {
  if (thirds.length === 0) return root;
  const [a, b, c, ...rest] = thirds;
  const third = a;
  const fifth = b === undefined ? undefined : a + b;

  // Triad and seventh names come from the first two or three thirds.
  if (fifth === undefined) return `${root}${third === MINOR_THIRD ? "m" : ""}(no 5)`;
  const triad = fifth === 6 ? "dim" : fifth === 8 ? "aug" : third === MINOR_THIRD ? "m" : "";
  if (c === undefined) {
    if (triad === "dim") return `${root}°`;
    if (triad === "aug") return `${root}+`;
    return `${root}${triad}`;
  }
  const seventh = fifth + c;
  let base: { prefix: string; number: string; suffix: string };
  if (triad === "dim" && seventh === 9) base = { prefix: "°", number: "7", suffix: "" };
  else if (triad === "dim") base = { prefix: "m", number: "7", suffix: "♭5" };
  else if (triad === "m" && seventh === 10) base = { prefix: "m", number: "7", suffix: "" };
  else if (triad === "m") base = { prefix: "m(maj", number: "7", suffix: ")" };
  else if (triad === "" && seventh === 10) base = { prefix: "", number: "7", suffix: "" };
  else if (triad === "") base = { prefix: "maj", number: "7", suffix: "" };
  else if (seventh === 11) base = { prefix: "maj", number: "7", suffix: "♯5" };
  else return `${root}+ (octave)`;

  // Extensions: the highest unaltered 9, 11 or 13 replaces the 7 in the name
  // (C7 + 9 is C9, up to C13); altered ones go in brackets, as in Cmaj13(♯11).
  const alterations: string[] = [];
  let number = base.number;
  let semitones = seventh;
  rest.forEach((step, i) => {
    semitones += step;
    const degree = DEGREES[4 + i];
    const offset = semitones - NATURAL[degree];
    if (offset === 0) number = String(degree);
    else alterations.push(`${ACCIDENTALS[offset] ?? "?"}${degree}`);
  });
  const altered = alterations.length ? `(${alterations.join(" ")})` : "";
  return `${root}${base.prefix}${number}${base.suffix}${altered}`;
}

/** True when a stacked note lands on the root again, an octave or two up. */
export const landsOnRoot = (notes: StackedNote[]) =>
  notes.slice(1).some((note) => note.semitones % 12 === 0);

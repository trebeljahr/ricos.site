import { chordSymbol, pitchClass } from "./notes";
import { type DiatonicChord, leadVoices, movement, romanNumeral } from "./scales";

/** Which chord tones sound on top of the root, each on or off on its own. */
export type Tones = { third: boolean; fifth: boolean; seventh: boolean };

/** Positions in a four-note diatonic chord (0 root, 1 third, 2 fifth, 3 seventh) that sound. */
export const toneIndices = (tones: Tones) => [
  0,
  ...(tones.third ? [1] : []),
  ...(tones.fifth ? [2] : []),
  ...(tones.seventh ? [3] : []),
];

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII"];

/**
 * Roman numeral and chord symbol of a diatonic seventh chord (`chord` built
 * with four notes) with only some of its tones: "ii" / "Dm" for 1 3 5,
 * "ii7" / "Dm7(no 5)" for a shell, "II5" / "D5" for a power chord.
 */
export function chordName(chord: DiatonicChord, tones: Tones) {
  const root = chord.notes[0].spelled;
  const [third, fifthStep] = chord.thirds;
  const fifth = third + fifthStep;
  const seventhLabel = chord.notes[3]?.label ?? "7";
  const omitted = [!tones.third && "3", !tones.fifth && "5"].filter(Boolean).join(" ");
  const no = omitted ? `(no ${omitted})` : "";

  if (!tones.third) {
    const flatFive = fifth === 6 ? "(♭5)" : "5";
    if (tones.seventh)
      return {
        roman: `${ROMAN[chord.degree]}${seventhLabel}`,
        symbol: `${root}${seventhLabel}${no}`,
      };
    if (tones.fifth)
      return { roman: `${ROMAN[chord.degree]}${flatFive}`, symbol: `${root}${flatFive}` };
    return { roman: ROMAN[chord.degree], symbol: root };
  }
  if (tones.seventh) {
    return {
      roman: romanNumeral(chord.degree, chord.thirds),
      symbol: `${chordSymbol(root, chord.thirds)}${no}`,
    };
  }
  if (tones.fifth) {
    const triad = chord.thirds.slice(0, 2);
    return { roman: romanNumeral(chord.degree, triad), symbol: chordSymbol(root, triad) };
  }
  return { roman: romanNumeral(chord.degree, [third]), symbol: chordSymbol(root, [third]) };
}

/** The pitch classes and the half steps above the root of the tones that sound. */
export function chordTones(chord: DiatonicChord, tones: Tones) {
  const notes = toneIndices(tones)
    .map((i) => chord.notes[i])
    .filter(Boolean);
  return { pcs: notes.map((n) => pitchClass(n.midi)), semitones: notes.map((n) => n.semitones) };
}

/** Fingers that have to move: the keys of the new chord not already held down. */
export function fingersMoved(from: readonly number[], to: readonly number[]) {
  const held = new Set(from);
  return to.filter((m) => !held.has(m)).length;
}

export type NextChord = { degree: number; voicing: number[]; fingers: number; halfSteps: number };

/**
 * For every chord of the key, its placement nearest to the chord held now,
 * how many fingers move to get there and how many half steps they travel.
 */
export function nextChords(
  held: number[],
  chords: DiatonicChord[],
  tones: Tones,
  range: [number, number],
): NextChord[] {
  return chords.map((chord) => {
    const voicing = leadVoices(held, chordTones(chord, tones).pcs, range);
    return {
      degree: chord.degree,
      voicing,
      fingers: fingersMoved(held, voicing),
      halfSteps: movement(held, voicing),
    };
  });
}

/**
 * The chords to suggest after `current`: the other chords that move the
 * fewest fingers. Moving no finger at all (the same notes again) does not count.
 */
export function suggested(next: NextChord[], current: number) {
  const others = next.filter((n) => n.degree !== current && n.fingers > 0);
  if (others.length === 0) return new Set<number>();
  const fewest = Math.min(...others.map((n) => n.fingers));
  return new Set(others.filter((n) => n.fingers === fewest).map((n) => n.degree));
}

export type Progression = {
  name: string;
  /** Degrees of the key, 0 = I. */
  degrees: number[];
  /** The degrees to name it by, when the whole list is too long to show. */
  summary?: number[];
  /** The summary's tail, e.g. "12 bars". */
  note?: string;
};

export const PROGRESSIONS: Progression[] = [
  { name: "Two five one", degrees: [1, 4, 0] },
  { name: "Two five one six", degrees: [1, 4, 0, 5] },
  { name: "Four chords", degrees: [0, 4, 5, 3] },
  { name: "Four chords from six", degrees: [5, 3, 0, 4] },
  { name: "Doo-wop", degrees: [0, 5, 3, 4] },
  { name: "Turnaround", degrees: [0, 5, 1, 4] },
  {
    name: "Twelve-bar blues",
    degrees: [0, 0, 0, 0, 3, 3, 0, 0, 4, 3, 0, 4],
    summary: [0, 3, 4],
    note: "12 bars",
  },
];

/** "ii–V–I", or "I–IV–V, 12 bars", in the chords' current names. */
export function progressionLabel(progression: Progression, romans: readonly string[]) {
  const shown = (progression.summary ?? progression.degrees).map((d) => romans[d]).join("–");
  return progression.note ? `${shown}, ${progression.note}` : shown;
}

import { describe, expect, it } from "vitest";
import { stackThirds } from "./notes";
import {
  bassTone,
  blueNote,
  bluesScale,
  changedDegrees,
  degreeLabels,
  diatonicChords,
  enharmonicFifths,
  fifthsSpan,
  figuredBass,
  intervalShort,
  invert,
  keyFromFifths,
  keyName,
  keyOn,
  keySignature,
  leadVoices,
  MAJOR,
  MINOR,
  MODES,
  MODES_BRIGHT_TO_DARK,
  modeFifths,
  modeOn,
  modeScale,
  modeSteps,
  movement,
  openVoicing,
  pentatonic,
  relativeKey,
  romanNumeral,
  scaleNotes,
  sharedNotes,
  stepSizes,
  TRIADS,
  triadOnDegree,
  turnFifths,
  voicingsInRange,
} from "./scales";

const spelled = (notes: { spelled: string }[]) => notes.map((n) => n.spelled);
const mode = (name: string) => MODES.find((m) => m.name === name)!;

describe("modes", () => {
  it("rotates the major scale's whole and half steps", () => {
    expect(modeSteps(MAJOR)).toEqual([2, 2, 1, 2, 2, 2, 1]);
    expect(modeSteps(mode("Dorian"))).toEqual([2, 1, 2, 2, 2, 1, 2]);
    expect(modeScale(MINOR)).toEqual([0, 2, 3, 5, 7, 8, 10]);
  });

  it("labels degrees against the major scale", () => {
    expect(degreeLabels(mode("Lydian"))).toEqual(["1", "2", "3", "♯4", "5", "6", "7"]);
    expect(degreeLabels(mode("Locrian"))).toEqual(["1", "♭2", "♭3", "4", "♭5", "♭6", "♭7"]);
  });

  it("sorts the modes bright to dark, one flat more each time", () => {
    expect(MODES_BRIGHT_TO_DARK.map((m) => m.name)).toEqual([
      "Lydian",
      "Ionian",
      "Mixolydian",
      "Dorian",
      "Aeolian",
      "Phrygian",
      "Locrian",
    ]);
    expect(MODES_BRIGHT_TO_DARK.map(modeFifths)).toEqual([1, 0, -1, -2, -3, -4, -5]);
  });

  it("changes exactly one note between neighbours in brightness", () => {
    const changed = MODES_BRIGHT_TO_DARK.slice(1).map((m, i) =>
      changedDegrees(MODES_BRIGHT_TO_DARK[i], m),
    );
    // ♯4→4, 7→♭7, 3→♭3, 6→♭6, 2→♭2, 5→♭5
    expect(changed).toEqual([[3], [6], [2], [5], [1], [4]]);
    expect(changedDegrees(mode("Lydian"), mode("Locrian"))).toHaveLength(6);
  });
});

describe("keys", () => {
  it("spells keys from their signature", () => {
    expect(keyName(keyFromFifths(0))).toBe("C major");
    expect(keyName(keyFromFifths(-3))).toBe("E♭ major");
    expect(keyName(keyFromFifths(6))).toBe("F♯ major");
    expect(keyName(keyFromFifths(-6))).toBe("G♭ major");
    expect(keyName(keyFromFifths(7))).toBe("C♯ major");
    expect(keyName(keyFromFifths(-7))).toBe("C♭ major");
    expect(keyName(keyFromFifths(3, MINOR))).toBe("F♯ minor");
    expect(keyName(keyFromFifths(-2, mode("Dorian")))).toBe("C Dorian");
  });

  it("finds the key on a tonic with the fewest sharps or flats", () => {
    expect(keyOn(1).fifths).toBe(-5); // D♭, not C♯
    expect(keyOn(6).tonic).toBe("F♯");
    expect(keyOn(6, MAJOR, { flats: true }).tonic).toBe("G♭");
    expect(keyName(keyOn(3, MINOR))).toBe("D♯ minor");
    expect(keyName(keyOn(3, MINOR, { flats: true }))).toBe("E♭ minor");
    expect(keyName(keyOn(8, MINOR))).toBe("G♯ minor");
    expect(keyName(keyOn(3, mode("Dorian")))).toBe("E♭ Dorian");
    expect(keyOn(6, mode("Locrian")).fifths).toBe(1);
  });

  it("keeps the tonic's name across modes while the signature allows", () => {
    expect(modeOn(1, mode("Dorian")).tonic).toBe("D♭");
    expect(modeOn(1, mode("Dorian")).fifths).toBe(-7);
    expect(modeOn(1, MINOR).tonic).toBe("C♯");
    expect(modeOn(6, mode("Lydian")).fifths).toBe(7);
    expect(MODES.map((m) => modeOn(0, m).tonic)).toEqual(Array(7).fill("C"));
  });

  it("spells scales with one of each letter", () => {
    expect(spelled(scaleNotes(keyOn(2)))).toEqual(["D", "E", "F♯", "G", "A", "B", "C♯"]);
    expect(spelled(scaleNotes(keyOn(5)))).toEqual(["F", "G", "A", "B♭", "C", "D", "E"]);
    expect(spelled(scaleNotes(keyFromFifths(6)))).toEqual([
      "F♯",
      "G♯",
      "A♯",
      "B",
      "C♯",
      "D♯",
      "E♯",
    ]);
    expect(spelled(scaleNotes(keyOn(0, mode("Phrygian"))))).toEqual([
      "C",
      "D♭",
      "E♭",
      "F",
      "G",
      "A♭",
      "B♭",
    ]);
    expect(scaleNotes(keyOn(9), 60)[0].midi).toBe(69);
    expect(scaleNotes(keyOn(0), 61)[0].midi).toBe(72);
  });

  it("finds relative keys", () => {
    expect(keyName(relativeKey(keyOn(0)))).toBe("A minor");
    expect(keyName(relativeKey(keyOn(7, MINOR)))).toBe("B♭ major");
  });

  it("writes key signatures in order on the treble staff", () => {
    expect(keySignature(0)).toEqual([]);
    expect(keySignature(2).map((s) => s.name)).toEqual(["F♯", "C♯"]);
    expect(keySignature(-4).map((s) => s.name)).toEqual(["B♭", "E♭", "A♭", "D♭"]);
    expect(keySignature(7).map((s) => s.step)).toEqual([8, 5, 9, 6, 3, 7, 4]);
    expect(keySignature(-1)[0].step).toBe(4); // B♭ on the middle line
  });

  it("neighbours on the circle of fifths share six of seven notes", () => {
    for (let f = -6; f < 6; f++) {
      expect(sharedNotes(keyFromFifths(f), keyFromFifths(f + 1))).toBe(6);
      expect(sharedNotes(keyFromFifths(f), keyFromFifths(f + 2))).toBe(5);
    }
    expect(sharedNotes(keyFromFifths(6), keyFromFifths(-6))).toBe(7);
    expect(sharedNotes(keyOn(0), keyOn(6))).toBe(2);
  });

  it("turns the circle with the usual spellings", () => {
    const walk = (step: 1 | -1) => {
      let f = 0;
      return Array.from({ length: 12 }, () => {
        f = turnFifths(f, step);
        return keyFromFifths(f).tonic;
      });
    };
    expect(walk(1)).toEqual(["G", "D", "A", "E", "B", "F♯", "D♭", "A♭", "E♭", "B♭", "F", "C"]);
    expect(walk(-1)).toEqual(["F", "B♭", "E♭", "A♭", "D♭", "G♭", "B", "E", "A", "D", "G", "C"]);
    expect(turnFifths(7, 1)).toBe(-4); // C♯ → A♭
    expect(enharmonicFifths(6)).toBe(-6);
    expect(enharmonicFifths(-5)).toBe(7);
    expect(enharmonicFifths(4)).toBeNull();
  });

  it("places a key's notes on seven neighbouring fifths", () => {
    expect(fifthsSpan(0)).toEqual([11, 0, 1, 2, 3, 4, 5]); // F C G D A E B
    expect(fifthsSpan(-3)).toEqual([8, 9, 10, 11, 0, 1, 2]);
  });
});

describe("pentatonic and blues", () => {
  it("leaves out the two notes a half step from a neighbour", () => {
    expect(spelled(pentatonic(keyOn(0)))).toEqual(["C", "D", "E", "G", "A"]);
    expect(spelled(pentatonic(keyOn(9, MINOR)))).toEqual(["A", "C", "D", "E", "G"]);
    expect(spelled(pentatonic(keyOn(6)))).toEqual(["F♯", "G♯", "A♯", "C♯", "D♯"]);
    expect(stepSizes(pentatonic(keyOn(0)))).toEqual([2, 2, 3, 2, 3]);
  });

  it("adds the same blue note to relative keys", () => {
    expect(blueNote(keyOn(9, MINOR)).spelled).toBe("E♭");
    expect(blueNote(keyOn(0)).spelled).toBe("E♭");
    expect(blueNote(keyOn(4, MINOR)).spelled).toBe("B♭");
    expect(spelled(bluesScale(keyOn(9, MINOR)))).toEqual(["A", "C", "D", "E♭", "E", "G"]);
    expect(bluesScale(keyOn(9, MINOR)).map((n) => n.label)).toEqual([
      "1",
      "♭3",
      "4",
      "♭5",
      "5",
      "♭7",
    ]);
    expect(spelled(bluesScale(keyOn(0)))).toEqual(["C", "D", "E♭", "E", "G", "A"]);
  });
});

describe("chords in a key", () => {
  it("builds the seven triads of a major key", () => {
    const chords = diatonicChords(keyOn(0));
    expect(chords.map((c) => c.roman)).toEqual(["I", "ii", "iii", "IV", "V", "vi", "vii°"]);
    expect(chords.map((c) => c.symbol)).toEqual(["C", "Dm", "Em", "F", "G", "Am", "B°"]);
    expect(chords.map((c) => c.function)).toEqual([
      "tonic",
      "predominant",
      "tonic",
      "predominant",
      "dominant",
      "tonic",
      "dominant",
    ]);
  });

  it("spells chords with the key's letters", () => {
    const d = diatonicChords(keyOn(2));
    expect(spelled(d[2].notes)).toEqual(["F♯", "A", "C♯"]);
    expect(d[6].symbol).toBe("C♯°");
  });

  it("builds sevenths and minor keys", () => {
    expect(diatonicChords(keyOn(0), 4).map((c) => c.roman)).toEqual([
      "Imaj7",
      "ii7",
      "iii7",
      "IVmaj7",
      "V7",
      "vi7",
      "viiø7",
    ]);
    expect(diatonicChords(keyOn(9, MINOR)).map((c) => c.roman)).toEqual([
      "i",
      "ii°",
      "III",
      "iv",
      "v",
      "VI",
      "VII",
    ]);
    expect(diatonicChords(keyOn(0), 4)[6].symbol).toBe("Bm7♭5");
    expect(romanNumeral(6, [3, 3, 3])).toBe("vii°7");
  });

  it("finds the one triad on each degree that fits the scale", () => {
    const key = keyOn(0);
    const fitting = [0, 1, 2, 3, 4, 5, 6].map((degree) =>
      TRIADS.filter((t) => triadOnDegree(key, degree, t.thirds).fits).map((t) => t.name),
    );
    expect(fitting).toEqual([
      ["major"],
      ["minor"],
      ["minor"],
      ["major"],
      ["major"],
      ["minor"],
      ["diminished"],
    ]);
    const wrong = triadOnDegree(key, 1, TRIADS[0].thirds);
    expect(spelled(wrong.notes)).toEqual(["D", "F♯", "A"]);
    expect(wrong.outside).toEqual([false, true, false]);
  });
});

describe("voicings", () => {
  const cMajor = stackThirds(60, [4, 3]).map((n) => n.midi);
  const c7 = stackThirds(60, [4, 3, 3]).map((n) => n.midi);

  it("inverts by moving the lowest note up", () => {
    expect(invert(cMajor, 1)).toEqual([64, 67, 72]);
    expect(invert(cMajor, 2)).toEqual([67, 72, 76]);
    expect(invert(cMajor, 3)).toEqual([72, 76, 79]);
    expect(invert([48, 64, 67], 1)).toEqual([64, 67, 72]);
  });

  it("opens a close chord and keeps the bass", () => {
    expect(openVoicing(cMajor)).toEqual([60, 67, 76]);
    expect(openVoicing(c7)).toEqual([60, 67, 70, 76]);
    expect(openVoicing(invert(cMajor, 1))).toEqual([64, 72, 79]);
  });

  it("names the inversion from the bass", () => {
    const pcs = cMajor;
    expect(bassTone([64, 67, 72], pcs)).toBe(1);
    expect(bassTone([43, 64, 72], pcs)).toBe(2);
    expect(figuredBass(3, 1)).toBe("6");
    expect(figuredBass(4, 2)).toBe("4/3");
  });

  it("names intervals up to two octaves", () => {
    expect(intervalShort(3)).toBe("m3");
    expect(intervalShort(7)).toBe("P5");
    expect(intervalShort(16)).toBe("M10");
    expect(intervalShort(24)).toBe("P15");
  });

  it("lists placements of a chord in a range", () => {
    const placements = voicingsInRange([0, 4, 7], [60, 72], 12);
    expect(placements).toContainEqual([60, 64, 67]);
    expect(placements).toContainEqual([64, 67, 72]);
    expect(placements.every((v) => v[2] - v[0] <= 12)).toBe(true);
  });

  it("leads voices to the nearest notes of the next chord", () => {
    const range: [number, number] = [55, 76];
    // C → F: C stays, E up to F, G up to A.
    expect(leadVoices([60, 64, 67], [5, 9, 0], range)).toEqual([60, 65, 69]);
    // C → G: G stays, C down to B, E down to D.
    expect(leadVoices([60, 64, 67], [7, 11, 2], range)).toEqual([59, 62, 67]);
    expect(movement([60, 64, 67], [59, 62, 67])).toBe(3);
    // Different sizes: each new note from its nearest old one.
    expect(movement([60, 64, 67], [60, 64, 67, 70])).toBe(3);
  });
});

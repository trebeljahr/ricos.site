import { describe, expect, it } from "vitest";
import {
  chordName,
  chordTones,
  fingersMoved,
  nextChords,
  PROGRESSIONS,
  progressionLabel,
  suggested,
} from "./chordPadProgressions";
import { diatonicChords, keyOn } from "./scales";

const C = diatonicChords(keyOn(0), 4);
const triad = { third: true, fifth: true, seventh: false };
const all = { third: true, fifth: true, seventh: true };

describe("chordName", () => {
  it("names each mix of chord tones", () => {
    expect(chordName(C[0], triad)).toEqual({ roman: "I", symbol: "C" });
    expect(chordName(C[1], all)).toEqual({ roman: "ii7", symbol: "Dm7" });
    expect(chordName(C[4], { third: true, fifth: false, seventh: true })).toEqual({
      roman: "V7",
      symbol: "G7(no 5)",
    });
    expect(chordName(C[0], { third: false, fifth: true, seventh: false })).toEqual({
      roman: "I5",
      symbol: "C5",
    });
    expect(chordName(C[6], { third: false, fifth: true, seventh: false }).symbol).toBe("B(♭5)");
    expect(chordName(C[6], triad).roman).toBe("vii°");
  });
});

describe("chordTones", () => {
  it("keeps only the switched-on tones", () => {
    expect(chordTones(C[4], { third: true, fifth: false, seventh: true })).toEqual({
      pcs: [7, 11, 5],
      semitones: [0, 4, 10],
    });
  });
});

describe("suggested next chords", () => {
  it("counts the fingers that leave their key", () => {
    expect(fingersMoved([60, 64, 67], [60, 65, 69])).toBe(2);
    expect(fingersMoved([60, 64, 67], [60, 64, 69])).toBe(1);
  });

  it("suggests iii and vi after I: one finger each", () => {
    const next = nextChords([60, 64, 67], C, triad, [57, 79]);
    expect([...suggested(next, 0)].sort()).toEqual([2, 5]);
    expect(next[3].fingers).toBe(2);
  });
});

describe("progressions", () => {
  it("names a preset in the chords' current numerals", () => {
    const romans = C.map((chord) => chordName(chord, triad).roman);
    const twoFiveOne = PROGRESSIONS.find((p) => p.name === "Two five one");
    const blues = PROGRESSIONS.find((p) => p.name === "Twelve-bar blues");
    expect(twoFiveOne && progressionLabel(twoFiveOne, romans)).toBe("ii–V–I");
    expect(blues?.degrees).toHaveLength(12);
    expect(blues && progressionLabel(blues, romans)).toBe("I–IV–V, 12 bars");
  });
});

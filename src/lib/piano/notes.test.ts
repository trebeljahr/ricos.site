import { describe, expect, it } from "vitest";
import { layoutKeys, stepWhite, whiteCount } from "./keys";
import {
  chordSymbol,
  fifthsIndex,
  foldOctave,
  hzToMidi,
  INTERVALS,
  landsOnRoot,
  MAJOR_THIRD as M,
  MINOR_THIRD as m,
  midiToHz,
  nearestNote,
  noteName,
  spell,
  spellInterval,
  stackThirds,
} from "./notes";
import { curveDips, pluckModes, roughnessCurve, simpleRatio } from "./physics";
import { nearestSample, sampleUrl } from "./sampler";

describe("notes and frequencies", () => {
  it("puts A4 at 440 Hz and middle C at MIDI 60", () => {
    expect(midiToHz(69)).toBe(440);
    expect(midiToHz(81)).toBeCloseTo(880);
    expect(midiToHz(60)).toBeCloseTo(261.626, 3);
    expect(hzToMidi(440)).toBe(69);
    expect(noteName(60)).toBe("C4");
    expect(noteName(61)).toBe("C♯4");
    expect(noteName(61, { flats: true, octave: false })).toBe("D♭");
    expect(noteName(21)).toBe("A0");
  });

  it("finds the nearest key and how far off it is", () => {
    const seventh = nearestNote(65.406 * 7);
    expect(noteName(seventh.midi, { flats: true })).toBe("B♭4");
    expect(Math.round(seventh.cents)).toBe(-31);
  });

  it("folds ratios into one octave", () => {
    expect(foldOctave(3)).toBe(1.5);
    expect(foldOctave(0.75)).toBe(1.5);
  });

  it("walks the circle of fifths", () => {
    expect([0, 7, 2, 9, 4, 11, 6].map(fifthsIndex)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(fifthsIndex(5)).toBe(11);
  });
});

describe("spelling", () => {
  it("spells a key with any nearby letter", () => {
    expect(spell(63, 2)).toBe("E♭");
    expect(spell(63, 1)).toBe("D♯");
    expect(spell(65, 2)).toBe("E♯");
    expect(spell(60, 6)).toBe("B♯");
    expect(spell(60, 4)).toBeNull();
  });

  it("spells intervals from the lower note's letter", () => {
    const by = (short: string) => INTERVALS.find((i) => i.short === short)!;
    expect(spellInterval(60, by("m3"))).toBe("E♭");
    expect(spellInterval(60, by("P5"))).toBe("G");
    expect(spellInterval(64, by("M3"))).toBe("G♯");
    expect(spellInterval(62, by("m7"))).toBe("C");
  });
});

describe("chords from stacked thirds", () => {
  it("names triads and sevenths", () => {
    expect(chordSymbol("C", [M, m])).toBe("C");
    expect(chordSymbol("C", [m, M])).toBe("Cm");
    expect(chordSymbol("C", [m, m])).toBe("C°");
    expect(chordSymbol("C", [M, M])).toBe("C+");
    expect(chordSymbol("C", [M, m, M])).toBe("Cmaj7");
    expect(chordSymbol("C", [M, m, m])).toBe("C7");
    expect(chordSymbol("C", [m, M, m])).toBe("Cm7");
    expect(chordSymbol("C", [m, m, M])).toBe("Cm7♭5");
    expect(chordSymbol("C", [m, m, m])).toBe("C°7");
    expect(chordSymbol("C", [m, M, M])).toBe("Cm(maj7)");
  });

  it("names extensions and alterations", () => {
    expect(chordSymbol("C", [M, m, m, M])).toBe("C9");
    expect(chordSymbol("C", [M, m, M, m])).toBe("Cmaj9");
    expect(chordSymbol("C", [M, m, m, m])).toBe("C7(♭9)");
    expect(chordSymbol("C", [M, m, m, M, m, M])).toBe("C13");
    expect(chordSymbol("C", [M, m, M, m, M, m])).toBe("Cmaj13(♯11)");
  });

  it("spells chord tones in thirds and labels their degrees", () => {
    const notes = stackThirds(62, [m, M, m, M]);
    expect(notes.map((n) => n.spelled)).toEqual(["D", "F", "A", "C", "E"]);
    expect(notes.map((n) => n.label)).toEqual(["1", "♭3", "5", "7", "9"]);
    expect(stackThirds(58, [M, m]).map((n) => n.spelled)).toEqual(["B♭", "D", "F"]);
  });

  it("notices when a stack comes back to the root", () => {
    expect(landsOnRoot(stackThirds(60, [M, M, M]))).toBe(true);
    expect(landsOnRoot(stackThirds(60, [M, m, M]))).toBe(false);
  });
});

describe("keyboard layout", () => {
  it("counts and steps white keys", () => {
    expect(whiteCount(60, 72)).toBe(8);
    expect(stepWhite(60, 2)).toBe(64);
    expect(stepWhite(60, -1)).toBe(59);
    expect(stepWhite(61, 1)).toBe(62);
  });

  it("lays out an octave with seven white keys filling the width", () => {
    const keys = layoutKeys(60, 71);
    const whites = keys.filter((k) => !k.black);
    expect(whites).toHaveLength(7);
    expect(whites.at(-1)!.left + whites.at(-1)!.width).toBeCloseTo(1);
    expect(keys.filter((k) => k.black)).toHaveLength(5);
  });
});

describe("piano samples", () => {
  it("maps every key to a recording at most a key and a half away", () => {
    for (let midi = 21; midi <= 108; midi++)
      expect(Math.abs(nearestSample(midi) - midi)).toBeLessThanOrEqual(1);
    expect(sampleUrl(21)).toBe("/sounds/piano/A0.mp3");
    expect(sampleUrl(63)).toBe("/sounds/piano/Ds4.mp3");
    expect(sampleUrl(108)).toBe("/sounds/piano/C8.mp3");
  });
});

describe("physics", () => {
  it("plucking in the middle leaves out the even modes", () => {
    const modes = pluckModes(0.5, 1, 6);
    expect(Math.abs(modes[1])).toBeLessThan(1e-12);
    expect(Math.abs(modes[3])).toBeLessThan(1e-12);
    expect(modes[0]).toBeGreaterThan(Math.abs(modes[2]));
  });

  it("finds the classic consonances as dips for tones with harmonics", () => {
    const saw = Array.from({ length: 8 }, (_, i) => 1 / (i + 1));
    const dips = curveDips(roughnessCurve(261.6, saw)).slice(0, 4);
    const ratios = dips.map((d) => simpleRatio(2 ** (d.cents / 1200), 15, 9)?.join(":"));
    expect(ratios).toContain("3:2");
    expect(ratios).toContain("2:1");
  });

  it("has no dip at the fifth for pure tones", () => {
    const dips = curveDips(roughnessCurve(261.6, [1]));
    expect(dips.some((d) => Math.abs(d.cents - 702) < 20)).toBe(false);
  });

  it("finds simple ratios near a value", () => {
    expect(simpleRatio(1.5)).toEqual([3, 2]);
    expect(simpleRatio(2 ** (700 / 1200))).toEqual([3, 2]);
    expect(simpleRatio(2 ** (400 / 1200), 15)).toEqual([5, 4]);
  });
});

import { describe, expect, it } from "vitest";
import { countFifth, distinctNotes, fifthsChain, pitchOrder, startKey } from "./stackFifths";

describe("fifthsChain", () => {
  it("spells the chain up from F and down from C", () => {
    const up = fifthsChain(startKey(5, 1), 1);
    expect(up.map((n) => n.name).join(" ")).toBe("F C G D A E B F♯ C♯ G♯ D♯ A♯ E♯");
    const down = fifthsChain(startKey(0, -1), -1);
    expect(down.slice(0, 7).map((n) => n.name)).toEqual(["C", "F", "B♭", "E♭", "A♭", "D♭", "G♭"]);
  });

  it("starts black keys on flats going up", () => {
    expect(fifthsChain(startKey(1, 1), 1)[0].name).toBe("D♭");
    expect(fifthsChain(startKey(1, -1), -1)[0].name).toBe("C♯");
  });

  it("folds into one octave and closes on the start's octave", () => {
    const start = startKey(0, 1);
    const chain = fifthsChain(start, 1);
    for (const n of chain.slice(0, 12)) expect(n.midi - start).toBeGreaterThanOrEqual(0);
    expect(chain[12].midi).toBe(start + 12);
    expect(distinctNotes(chain, 12)).toBe(12);
  });
});

describe("countFifth", () => {
  it("counts five letters and seven half steps", () => {
    const up = countFifth(60, 0, 1);
    expect(up.letters.map((l) => l.name)).toEqual(["C", "D", "E", "F", "G"]);
    expect(up.halfSteps).toHaveLength(8);
    expect(up.target).toBe(67);
    const fromB = countFifth(59, 6, 1);
    expect(fromB.letters.map((l) => l.name)).toEqual(["B", "C♯", "D♯", "E", "F♯"]);
    const down = countFifth(72, 0, -1);
    expect(down.letters.map((l) => l.name)).toEqual(["C", "B♭", "A", "G", "F"]);
    expect(down.target).toBe(65);
  });
});

describe("pitchOrder", () => {
  it("plays each key once, then the octave", () => {
    const start = startKey(0, 1);
    const chain = fifthsChain(start, 1);
    expect(pitchOrder(chain, 2, start, 1)).toEqual([start, start + 2, start + 7, start + 12]);
    expect(pitchOrder(chain, 12, start, 1)).toHaveLength(13);
  });
});

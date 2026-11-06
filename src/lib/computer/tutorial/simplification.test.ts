import { describe, expect, it } from "vitest";
import type { Circuit, GateType, Node, Wire } from "../logic";
import { feedback, simplificationNote } from "./analysis";
import { gradeLevel, gradePassed } from "./grade";
import { levelStart } from "./kit";
import { CATALOG, LEVELS } from "./levels";

const node = (id: string, type: GateType, x: number, y: number): Node => ({ id, type, x, y });
const wire = (from: string, to: string, input: number): Wire => ({
  id: `${from}-${to}-${input}`,
  from,
  to,
  input,
});

describe.each(LEVELS.filter((level) => level.sizeGoal))("$id simplification", (level) => {
  const locked = levelStart(level).locked;
  const reference = level.reference!();
  const grade = (circuit: Circuit) => gradeLevel(circuit, level, locked, CATALOG.allowed(level));

  it("recognizes a minimum without counting terminals, rails or junctions", () => {
    expect(gradePassed(grade(reference))).toBe(true);
    expect(simplificationNote(reference, level, locked)).toMatchObject({
      tone: "good",
      text: expect.stringContaining("Simplest solution found"),
    });
  });

  it("accepts redundant working stages while encouraging fewer parts in feedback and hints", () => {
    let larger: Circuit;
    if (level.sizeGoal!.metric === "transistors") {
      // Repeating a control in a conducting series path leaves its Boolean rule unchanged.
      const transistor = reference.nodes.find((part) => part.type === "nmos")!;
      const source = reference.wires.find((link) => link.to === transistor.id && link.input === 1)!;
      const control = reference.wires.find(
        (link) => link.to === transistor.id && link.input === 0,
      )!;
      larger = {
        ...reference,
        nodes: [...reference.nodes, node("redundant", "nmos", 300, 300)],
        wires: [
          ...reference.wires.map((link) =>
            link === source ? { ...link, from: "redundant" } : link,
          ),
          wire(control.from, "redundant", 0),
          wire(source.from, "redundant", 1),
        ],
      };
    } else {
      // Two tied-input inversions preserve the output, and every added gate is used.
      const family = level.palette[0] === "nand" ? "nand" : "nor";
      const output = reference.wires.find((link) => link.to === "out")!;
      larger = {
        ...reference,
        nodes: [
          ...reference.nodes,
          node("extra1", family, 300, 300),
          node("extra2", family, 500, 300),
        ],
        wires: [
          ...reference.wires.map((link) => (link === output ? { ...link, from: "extra2" } : link)),
          wire(output.from, "extra1", 0),
          wire(output.from, "extra1", 1),
          wire("extra1", "extra2", 0),
          wire("extra1", "extra2", 1),
        ],
      };
    }
    const result = grade(larger);
    expect(gradePassed(result)).toBe(true);
    const note = simplificationNote(larger, level, locked)!;
    expect(note.tone).toBe("tip");
    expect(note.text).toContain("Can you find the simplest solution?");
    expect(note.text).toContain(`Aim for ${level.sizeGoal!.minimum} ${level.sizeGoal!.unit}`);
    const review = feedback(larger, level, locked, { reference });
    expect(review.notes).toContainEqual(note);
    expect(review.notes.some((item) => item.text.includes("NAND gate"))).toBe(
      level.palette[0] === "nand",
    );
  });
});

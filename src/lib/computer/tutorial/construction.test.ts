import { describe, expect, it } from "vitest";
import type { Circuit, Node } from "../logic";
import { verifiedCircuitIdentity } from "../recognition";
import { gradeLevel, gradePassed, shownGrade } from "./grade";
import { hintSteps, PARTS_HINT } from "./hints";
import { CircuitKit, levelStart } from "./kit";
import { CATALOG, LEARNING_LEVELS, LEVELS, levelById } from "./levels";
import { COUNTER_LEVELS } from "./levels/counters";
import { INPUT_LEVELS } from "./levels/inputs";
import { EMPTY_PROGRESS } from "./progress";
import { placedParts } from "./wiredSolution";

const grade = (id: string, circuit: Circuit) => {
  const level = levelById(id)!;
  return gradeLevel(circuit, level, levelStart(level).locked, CATALOG.allowed(level));
};

describe("independent circuit construction", () => {
  it("starts from designated ports without asking for a reference topology", () => {
    const level = levelById("and")!;
    expect(() =>
      levelStart({
        ...level,
        reference: () => {
          throw new Error("Reference must remain internal");
        },
      }),
    ).not.toThrow();
  });
  it("accepts a different AND topology without matching reference gates", () => {
    const level = levelById("and")!;
    if (level.spec.kind !== "truth") throw new Error("truth spec");
    const k = new CircuitKit("alternative AND", level.spec.inputs, level.spec.outputs);
    const inverted = k.gate("nand", ["b", "a"]);
    const out = k.gate("nand", [inverted, inverted]);
    expect(gradePassed(grade("and", k.out("out", out).build()))).toBe(true);
  });
  it.each([{ sources: [] }, { sources: ["a"] }])(
    "accepts unwired NAND inputs as 0 with $sources",
    ({ sources }) => {
      const level = levelById("not")!;
      if (level.spec.kind !== "truth") throw new Error("truth spec");
      const k = new CircuitKit(
        "NOT with an unwired constant",
        level.spec.inputs,
        level.spec.outputs,
      );
      const high = k.gate("nand", sources);
      const out = k.gate("nand", ["a", high]);
      const result = grade("not", k.out("out", out).build());
      expect(result.kind).toBe("truth");
      expect(gradePassed(result)).toBe(true);
    },
  );
  it("reports wrong truth-table outputs instead of rejecting an unwired NAND input", () => {
    const level = levelById("and")!;
    if (level.spec.kind !== "truth") throw new Error("truth spec");
    const k = new CircuitKit("Incomplete AND", level.spec.inputs, level.spec.outputs);
    const out = k.gate("nand", ["a"]);
    const result = grade("and", k.out("out", out).build());
    expect(result.kind).toBe("truth");
    if (result.kind !== "truth") throw new Error("truth grade");
    expect(result.pass).toBe(false);
    expect(result.rows.map((row) => row.actual)).toEqual([[true], [true], [true], [true]]);
  });
  it("rejects the target built-in even when behavior passes", () => {
    const level = levelById("and")!;
    const k = new CircuitKit("shortcut", level.spec.kind === "truth" ? level.spec.inputs : [], [
      { id: "out", label: "OUT" },
    ]);
    const out = k.gate("and", ["a", "b"]);
    expect(gradePassed(grade("and", k.out("out", out).build()))).toBe(false);
  });
  it("checks boxed parts' behavior instead of trusting a part label", () => {
    const circuit = levelById("and")!.reference!();
    const liar = levelById("or")!.reference!();
    const nodes = circuit.nodes.map(
      (n): Node => (n.type === "not" ? { ...n, type: "module", part: "not", module: liar } : n),
    );
    expect(gradePassed(grade("and", { ...circuit, nodes }))).toBe(false);
  });
  it("rejects floating CMOS even if Boolean 0 happens to match", () => {
    const level = levelById("cmos-not")!;
    const source = level.reference!();
    const down = source.nodes.find((n) => n.type === "nmos")!;
    const broken = { ...source, wires: source.wires.filter((w) => w.from !== down.id) };
    expect(gradePassed(grade("cmos-not", broken))).toBe(false);
    expect(JSON.stringify(grade("cmos-not", broken))).toMatch(/conducting path/);
  });
  it("requires every numeric source value and detects crossed weights", () => {
    for (const level of INPUT_LEVELS) {
      const circuit = level.reference!();
      expect(gradePassed(grade(level.id, circuit))).toBe(true);
      const wrong = {
        ...circuit,
        wires: circuit.wires.map((w) => ({
          ...w,
          output: w.output === 0 ? 1 : w.output === 1 ? 0 : w.output,
        })),
      };
      expect(gradePassed(grade(level.id, wrong))).toBe(false);
      expect(gradePassed(grade(level.id, levelStart(level).circuit))).toBe(false);
    }
  });
  it("keeps 2–8 bit/mode mastery ids with one core ladder lesson", () => {
    expect(COUNTER_LEVELS).toHaveLength(21);
    expect(LEARNING_LEVELS.filter((l) => l.practice?.family === "manual-counter")).toHaveLength(1);
    expect(COUNTER_LEVELS.every((l) => LEVELS.includes(l))).toBe(true);
    const counter = COUNTER_LEVELS.find((l) => l.practice?.core)!;
    expect(gradePassed(grade(counter.id, counter.reference!()))).toBe(true);
    expect(gradePassed(grade(counter.id, levelStart(counter).circuit))).toBe(false);
  });
  it("retains a nested learned implementation instead of replacing it with a built-in", () => {
    const inner = { ...levelById("not")!.reference!(), name: "My independently designed inverter" };
    const source = levelById("and")!.reference!();
    const circuit = {
      ...source,
      nodes: source.nodes.map(
        (node): Node =>
          node.type === "not" ? { ...node, type: "module", part: "not", module: inner } : node,
      ),
    };
    const own = CATALOG.ownModule("and", {
      ...EMPTY_PROGRESS,
      solved: { and: { at: 1, circuit } },
    })!;
    expect(own.nodes.find((node) => node.type === "module")?.module).toBe(inner);
    expect(verifiedCircuitIdentity(own)?.yours).toBe(true);
  });
  it("earned counter keeps its internals, standard symbol and honest sequence proof", () => {
    const level = COUNTER_LEVELS.find((l) => l.practice?.core)!;
    const circuit = level.reference!();
    const progress = { ...EMPTY_PROGRESS, solved: { [level.id]: { at: 1, circuit } } };
    const own = CATALOG.ownModule(level.makes!.part, progress)!;
    expect(own.nodes.length).toBe(circuit.nodes.length);
    const identity = verifiedCircuitIdentity(own);
    expect(identity?.yours).toBe(true);
    expect(identity?.component.symbol).toBe("counter");
    expect(identity?.component.verificationLabel).toBe("sequence checked");
  });
});

describe("hint steps", () => {
  it("puts the parts step second to last, only when asked for", () => {
    const level = levelById("universal-nand-and")!;
    const hints = level.hints!;
    expect(hintSteps(level, false)).toEqual(hints);
    const steps = hintSteps(level, true);
    expect(steps).toHaveLength(hints.length + 1);
    expect(steps.at(-2)).toBe(PARTS_HINT);
    expect(steps.at(-1)).toBe(hints.at(-1));
  });
});

describe("placed parts", () => {
  it.each(LEVELS.filter((level) => level.reference).map((level) => [level.id, level] as const))(
    "%s gets the solution's parts and only the locked wires",
    (_, level) => {
      const start = levelStart(level);
      const parts = placedParts(level, start);
      if (!parts) return;
      const reference = level.reference!();
      expect(parts.nodes.map((node) => node.id).sort()).toEqual(
        reference.nodes
          .filter((node) => !node.splice)
          .map((node) => node.id)
          .sort(),
      );
      expect(parts.wires).toEqual(start.enforce({ ...start.circuit, wires: [] }).wires);
      expect(parts.nodes.length).toBeGreaterThan(start.circuit.nodes.length);
    },
  );

  it("places the decoder's NOT gate and two switch parts without a single wire", () => {
    const parts = placedParts(levelById("decoder")!)!;
    expect(parts.nodes.filter((node) => node.type === "module")).toHaveLength(2);
    expect(parts.nodes.filter((node) => node.type === "not")).toHaveLength(1);
    expect(parts.wires).toEqual([]);
  });
});

describe("the truth table while outputs are unwired", () => {
  const level = levelById("decoder")!;
  const reference = level.reference!();

  it("shows nothing on a board without a wire to any output", () => {
    const start = levelStart(level).circuit;
    expect(shownGrade(grade("decoder", start), start, level)).toBeUndefined();
  });

  it("grades the wired outputs live and leaves the others open", () => {
    const circuit = {
      ...reference,
      wires: reference.wires.filter((wire) => !["y2", "y3"].includes(wire.to)),
    };
    const result = shownGrade(grade("decoder", circuit), circuit, level);
    if (result?.kind !== "truth") throw new Error("truth");
    expect(result.pass).toBe(false);
    expect(result.unwired).toEqual([false, false, true, true]);
    expect(result.rows.every((row) => row.pending && !row.pass)).toBe(true);
    expect(result.first).toBe(-1);
  });

  it("fails a row when a wired output is wrong", () => {
    const y1 = reference.wires.find((wire) => wire.to === "y1")!;
    const circuit = {
      ...reference,
      wires: reference.wires
        .filter((wire) => wire.to !== "y3")
        .map((wire) => (wire.to === "y0" ? { ...y1, id: wire.id, to: "y0" } : wire)),
    };
    const result = shownGrade(grade("decoder", circuit), circuit, level);
    if (result?.kind !== "truth") throw new Error("truth");
    expect(result.rows.some((row) => !row.pending && !row.pass)).toBe(true);
    expect(result.first).toBeGreaterThanOrEqual(0);
  });

  it("keeps hiding the table for other problems", () => {
    const circuit = {
      ...reference,
      nodes: [...reference.nodes, { id: "extra", type: "clock" as const, x: 0, y: 0 }],
    };
    expect(shownGrade(grade("decoder", circuit), circuit, level)).toBeUndefined();
  });
});

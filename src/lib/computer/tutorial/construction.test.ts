import { describe, expect, it } from "vitest";
import type { Circuit, Node } from "../logic";
import { verifiedCircuitIdentity } from "../recognition";
import { gradeLevel, gradePassed, gradeTruth } from "./grade";
import { contextualHint, requestedHints } from "./hints";
import { CircuitKit, levelStart } from "./kit";
import { CATALOG, LEARNING_LEVELS, LEVELS, levelById } from "./levels";
import { COUNTER_LEVELS } from "./levels/counters";
import { INPUT_LEVELS } from "./levels/inputs";
import { EMPTY_PROGRESS } from "./progress";

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
    expect(JSON.stringify(grade("cmos-not", broken))).toMatch(/conducting path|empty input/);
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

describe("explicit contextual hints", () => {
  it("reveals nothing at depth zero, even after failure", () => {
    const level = levelById("and")!;
    const start = levelStart(level).circuit;
    expect(requestedHints(level, start, grade("and", start), 0)).toEqual([]);
    expect(contextualHint(level, start, grade("and", start)).text).toMatch(/Nothing drives OUT/);
  });
  it("recognizes an inverted output without prescribing a wire", () => {
    const level = levelById("and")!;
    if (level.spec.kind !== "truth") throw new Error("truth");
    const k = new CircuitKit("opposite", level.spec.inputs, level.spec.outputs);
    const circuit = k.out("out", k.gate("nand", ["a", "b"])).build();
    expect(contextualHint(level, circuit, gradeTruth(circuit, level.spec)).text).toMatch(
      /opposite/,
    );
  });
  it("uses first failed sequence tick to distinguish edges, levels and memory", () => {
    const level = COUNTER_LEVELS[0];
    if (level.spec.kind !== "sequence") throw new Error("sequence");
    const result = {
      kind: "sequence" as const,
      pass: false,
      first: 0,
      ticks: [
        {
          index: 0,
          note: "Held button repeats.",
          inputs: {},
          clock: false,
          expected: { q0: false },
          actual: { q0: true },
          pass: false,
        },
      ],
    };
    expect(contextualHint(level, levelStart(level).circuit, result).text).toMatch(/rising edge/);
  });
});

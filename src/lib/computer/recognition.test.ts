import { describe, expect, it } from "vitest";
import { cloneCircuit, copyCircuit } from "./circuitClipboard";
import {
  type Circuit,
  type GateType,
  moduleOutputs,
  PRESETS,
  pruneCircuitPorts,
  validateCircuit,
  step,
  initialSnapshot,
} from "./logic";
import {
  RECOGNITION_LIMITS,
  builtinCircuit,
  circuitFingerprint,
  recognizeCircuit,
  recognizeCircuitSync,
  registerRecognitionComponent,
  remapModulePins,
  verifiedCircuitIdentity,
  verifyCircuitIdentity,
} from "./recognition";
import { EMPTY_PROGRESS } from "./tutorial/progress";
import { CATALOG, LEVELS } from "./tutorial/levels";
const n = (id: string, type: GateType) => ({ id, type, x: 0, y: 0 });
const w = (from: string, to: string, input = 0, output = 0) => ({
  id: `${from}-${to}-${input}`,
  from,
  to,
  input,
  output,
});
const and: Circuit = {
  name: "Anything",
  nodes: [
    n("a", "switch"),
    n("b", "switch"),
    n("g", "nand"),
    n("i", "not"),
    n("q", "lamp"),
    n("probe", "lamp"),
  ],
  wires: [w("a", "g"), w("b", "g", 1), w("g", "i"), w("i", "q"), w("g", "probe")],
};
const ports = { inputs: ["a", "b"], outputs: ["q"] };

describe("behavioral recognition", () => {
  it("recognizes an alternative AND independent of names, IDs, topology and probes", () => {
    const result = recognizeCircuitSync(and, ports, "and");
    expect(result.status).toBe("equivalent");
    expect(result.rows).toBe(4);
    expect(result.matches[0].inputs).toEqual([
      { nodeId: "a", role: "A" },
      { nodeId: "b", role: "B" },
    ]);
    const verified = verifyCircuitIdentity(and, ports, "and")!;
    expect(moduleOutputs(verified).map((n) => n.id)).toEqual(["q"]);
    const copy = cloneCircuit(verified, 80, 90).circuit;
    expect(verifiedCircuitIdentity(copy)?.component.id).toBe("and");
    expect(verifiedCircuitIdentity({ ...copy, name: "Renamed" })?.yours).toBe(true);
  });
  it("recognizes a flat decoder built with NAND and inverters", () => {
    const nodes = [n("a", "switch"), n("b", "switch"), n("na", "not"), n("nb", "not")];
    const wires = [w("a", "na"), w("b", "nb")];
    for (let row = 0; row < 4; row++) {
      nodes.push(n(`g${row}`, "nand"), n(`i${row}`, "not"), n(`q${row}`, "lamp"));
      wires.push(
        w(row & 1 ? "a" : "na", `g${row}`),
        w(row & 2 ? "b" : "nb", `g${row}`, 1),
        w(`g${row}`, `i${row}`),
        w(`i${row}`, `q${row}`),
      );
    }
    expect(
      recognizeCircuitSync(
        { name: "No decoder name", nodes, wires },
        { inputs: ["a", "b"], outputs: ["q0", "q1", "q2", "q3"] },
        "decoder",
      ).status,
    ).toBe("equivalent");
  });
  it("rejects a one-bit error with a concrete counterexample", () => {
    const wrong = {
      ...and,
      wires: and.wires.map((wire) => (wire.to === "q" ? { ...wire, from: "a" } : wire)),
    };
    expect(recognizeCircuitSync(wrong, ports, "and").counterexamples[0]).toMatchObject({
      inputs: [true, false],
      expected: [false],
      actual: [true],
    });
  });
  it("keeps output order honest and exposes multiple matches", () => {
    const half = PRESETS["Half adder"];
    const correct = { inputs: ["a", "b"], outputs: ["sum", "carry"] };
    expect(recognizeCircuitSync(half, correct, "half-adder").status).toBe("equivalent");
    expect(
      recognizeCircuitSync(half, { ...correct, outputs: ["carry", "sum"] }, "half-adder").status,
    ).toBe("mismatch");
    registerRecognitionComponent({
      id: "also-and",
      label: "Also AND",
      symbol: "and",
      inputs: ["L", "R"],
      outputs: ["Z"],
      evaluate: ([a, b]) => [a && b],
    });
    expect(recognizeCircuitSync(and, ports).matches.map((m) => m.componentId)).toEqual(
      expect.arrayContaining(["and", "also-and"]),
    );
  });
  it("invalidates changed internals and forged imported claims, while round trips preserve real proofs", () => {
    const verified = verifyCircuitIdentity(and, ports, "and")!;
    const imported = validateCircuit(JSON.parse(JSON.stringify(verified)))!;
    expect(verifiedCircuitIdentity(imported)?.yours).toBe(true);
    const wrong = structuredClone(imported);
    wrong.nodes.find((n) => n.id === "i")!.type = "not";
    wrong.wires = wrong.wires.map((wire) => (wire.to === "q" ? { ...wire, from: "g" } : wire));
    expect(verifiedCircuitIdentity(wrong)).toBeNull();
    wrong.identity!.fingerprint = circuitFingerprint(wrong);
    expect(verifiedCircuitIdentity(validateCircuit(wrong)!)).toBeNull();
    const nested: Circuit = {
      name: "Nested",
      nodes: [
        n("a", "switch"),
        n("b", "switch"),
        { ...n("box", "module"), module: imported },
        n("q", "lamp"),
      ],
      wires: [w("a", "box"), w("b", "box", 1), w("box", "q")],
    };
    expect(recognizeCircuitSync(validateCircuit(nested)!, ports, "and").status).toBe("equivalent");
    expect(verifiedCircuitIdentity(cloneCircuit(nested, 0, 0).circuit.nodes[2].module)?.yours).toBe(
      true,
    );
  });
  it("never proves undriven, conflicting, stateful, cyclic or bus signals", () => {
    expect(
      recognizeCircuitSync({ ...and, wires: and.wires.filter((w) => w.from !== "a") }, ports, "and")
        .message,
    ).toMatch(/Undriven/);
    expect(
      recognizeCircuitSync({ ...and, wires: [...and.wires, w("b", "g")] }, ports, "and").message,
    ).toMatch(/Multiple drivers/);
    for (const type of ["dff", "srlatch", "bus"] as const)
      expect(
        recognizeCircuitSync(
          { ...and, nodes: and.nodes.map((node) => (node.id === "g" ? { ...node, type } : node)) },
          ports,
          "and",
        ).status,
      ).toBe("unsupported");
    expect(
      recognizeCircuitSync(
        {
          ...and,
          wires: and.wires.map((wire) => (wire.to === "i" ? { ...wire, from: "i" } : wire)),
        },
        ports,
        "and",
      ).message,
    ).toMatch(/Feedback/);
    expect(recognizeCircuitSync(and, { ...ports, outputs: [] }).status).toBe("invalid");
    expect(recognizeCircuitSync(and, { ...ports, inputs: ["a"] }).message).toMatch(/every input/);
  });
  it("bounds work and supports cancellation", async () => {
    const huge = {
      ...and,
      nodes: [...and.nodes, ...Array.from({ length: 9 }, (_, i) => n(`x${i}`, "switch"))],
    };
    expect(
      (
        await recognizeCircuit(huge, {
          inputs: huge.nodes.filter((n) => n.type === "switch").map((n) => n.id),
          outputs: ["q"],
        })
      ).status,
    ).toBe("unsupported");
    const abort = new AbortController();
    abort.abort();
    const source = CATALOG.builtInModule("adder4")!;
    await expect(
      recognizeCircuit(
        source,
        {
          inputs: source.nodes.filter((n) => n.type === "switch").map((n) => n.id),
          outputs: source.nodes.filter((n) => n.type === "lamp").map((n) => n.id),
        },
        { signal: abort.signal },
      ),
    ).rejects.toMatchObject({ name: "AbortError" });
  });
  it("covers all eligible tutorial truth specs and validates built-in import claims", () => {
    for (const level of LEVELS) {
      if (
        !level.makes ||
        level.spec.kind !== "truth" ||
        level.spec.inputs.length > 8 ||
        !level.reference
      )
        continue;
      const source = level.reference();
      const result = recognizeCircuitSync(
        source,
        {
          inputs: level.spec.inputs.map((p) => p.id),
          outputs: level.spec.outputs.map((p) => p.id),
        },
        level.makes.part,
      );
      const size = (c: Circuit): number =>
        c.nodes.reduce((n, node) => n + 1 + (node.module ? size(node.module) : 0), 0);
      const bounded =
        size(source) <= RECOGNITION_LIMITS.nodes &&
        size(source) * 2 ** level.spec.inputs.length <= RECOGNITION_LIMITS.evaluations;
      expect(result.status, level.id).toBe(bounded ? "equivalent" : "unsupported");
    }
    const builtin = builtinCircuit("and", and);
    expect(verifiedCircuitIdentity(validateCircuit(builtin)!)?.yours).toBe(false);
    const fake = {
      ...builtin,
      nodes: builtin.nodes.map((node) =>
        node.id === "i" ? { ...node, type: "or" as const } : node,
      ),
    };
    fake.identity!.fingerprint = circuitFingerprint(fake);
    expect(verifiedCircuitIdentity(fake)).toBeNull();
  });
  it("remaps parent connections when public ports reorder and simulates the chosen output", () => {
    const inner = verifyCircuitIdentity(
      PRESETS["Half adder"],
      { inputs: ["a", "b"], outputs: ["sum", "carry"] },
      "half-adder",
    )!;
    const parent: Circuit = {
      name: "Parent",
      nodes: [
        n("a", "switch"),
        n("b", "switch"),
        { ...n("box", "module"), module: inner },
        n("q", "lamp"),
      ],
      wires: [w("a", "box"), w("b", "box", 1), w("box", "q", 0, 1)],
    };
    const reordered = { ...inner, ports: { inputs: ["b", "a"], outputs: ["carry", "sum"] } };
    const next = {
      ...parent,
      nodes: parent.nodes.map((node) =>
        node.id === "box" ? { ...node, module: reordered } : node,
      ),
      wires: remapModulePins(parent, "box", reordered),
    };
    expect(next.wires.map((wire) => [wire.input, wire.output])).toEqual([
      [1, 0],
      [0, 0],
      [0, 0],
    ]);
    expect(step(next, initialSnapshot(), false, {}, { a: true, b: true }).values.q).toBe(true);
    expect(step(next, initialSnapshot(), false, {}, { a: true, b: false }).values.q).toBe(false);
  });
  it("keeps earned tutorial provenance and prunes deleted terminal IDs", () => {
    const level = LEVELS.find((level) => level.id === "and")!;
    const solution = level.reference!();
    const own = CATALOG.ownModule("and", {
      ...EMPTY_PROGRESS,
      solved: { and: { at: 1, circuit: solution } },
    })!;
    expect(verifiedCircuitIdentity(own)?.yours).toBe(true);
    const verified = verifyCircuitIdentity(and, ports, "and")!;
    const deleted = pruneCircuitPorts({
      ...verified,
      nodes: verified.nodes.filter((node) => node.id !== "q"),
      wires: verified.wires.filter((wire) => wire.to !== "q"),
    });
    expect(deleted.ports?.outputs).toEqual([]);
    expect(validateCircuit(deleted)).not.toBeNull();
    expect(verifiedCircuitIdentity(deleted)).toBeNull();
  });
  it("copies only selected interface ports", () => {
    const verified = verifyCircuitIdentity(and, ports, "and")!;
    const partial = copyCircuit(verified, ["a", "b", "g"], []).circuit;
    expect(partial.ports?.outputs).toEqual([]);
    expect(validateCircuit(partial)).not.toBeNull();
  });
});

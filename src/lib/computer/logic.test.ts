import { describe, expect, it } from "vitest";
import {
  BLUEPRINT_FAMILIES,
  BLUEPRINTS,
  blueprintGate,
  type Circuit,
  GATE_NAMES,
  initialSnapshot,
  moduleInputs,
  type Node,
  PRESETS,
  step,
  validateCircuit,
} from "./logic";

describe("logic circuit engine", () => {
  it("preserves port sides and input bits in imported circuits", () => {
    const circuit: Circuit = {
      name: "Rotated input",
      nodes: [{ id: "bits", type: "input4", x: 0, y: 0, numberValue: 5, outputSide: "top" }],
      wires: [],
    };
    expect(validateCircuit(circuit)?.nodes[0]).toMatchObject({ numberValue: 5, outputSide: "top" });
    circuit.nodes[0].outputSide = "diagonal" as Node["outputSide"];
    expect(validateCircuit(circuit)).toBeNull();
  });
  it("propagates numbered input bits into decimal and binary displays", () => {
    const circuit: Circuit = {
      name: "Number display",
      nodes: [
        { id: "number", type: "input8", x: 0, y: 0, numberValue: 0xa5 },
        { id: "display", type: "display8", x: 200, y: 0 },
      ],
      wires: Array.from({ length: 8 }, (_, bit) => ({
        id: `bit-${bit}`, from: "number", output: bit, to: "display", input: bit,
      })),
    };
    expect(validateCircuit(circuit)).not.toBeNull();
    const state = step(circuit, initialSnapshot(), false);
    expect(state.outputs.number).toEqual([true, false, true, false, false, true, false, true]);
    expect(state.outputs.display).toEqual(state.outputs.number);
  });

  it("allows every bundled example to be placed as a black box", () => {
    for (const example of Object.values(PRESETS)) {
      const circuit: Circuit = {
        name: "Host", nodes: [{ id: "example", type: "module", x: 0, y: 0, module: example }], wires: [],
      };
      expect(validateCircuit(circuit), example.name).not.toBeNull();
    }
  });
  it("keeps storage blueprints valid and interactive as black boxes", () => {
    for (const name of ["SR latch", "Gated SR latch", "D latch", "JK latch", "T latch", "D flip-flop", "SR flip-flop", "JK flip-flop", "T flip-flop", "8-bit shift register", "8-bit binary counter"]) {
      const inner = PRESETS[name];
      expect(validateCircuit(inner), name).not.toBeNull();
      const box: Circuit = {
        name: `${name} box`,
        nodes: [{ id: "box", type: "module", x: 100, y: 100, module: inner }],
        wires: [],
      };
      expect(validateCircuit(box), name).not.toBeNull();
    }
  });
  it("holds latches and samples flip-flops at the right time", () => {
    let latch = initialSnapshot();
    const d = PRESETS["D latch"];
    latch = step(d, latch, false, {}, { d: true, control: false });
    expect(latch.values.q).toBe(false);
    latch = step(d, latch, false, {}, { d: true, control: true });
    expect(latch.values.q).toBe(true);
    latch = step(d, latch, false, {}, { d: false, control: false });
    expect(latch.values.q).toBe(true);
    let flip = initialSnapshot();
    const t = PRESETS["T flip-flop"];
    flip = step(t, flip, false, {}, { t: true });
    flip = step(t, flip, true, {}, { t: true });
    expect(flip.values.q).toBe(true);
    flip = step(t, flip, true, {}, { t: true });
    expect(flip.values.q).toBe(true);
    flip = step(t, flip, false, {}, { t: true });
    flip = step(t, flip, true, {}, { t: true });
    expect(flip.values.q).toBe(false);
  });
  it("compares two 8-bit values", () => {
    const circuit = PRESETS["8-bit magnitude comparator"];
    expect(validateCircuit(circuit)).not.toBeNull();
    for (const [a, b] of [[0, 0], [1, 2], [2, 1], [127, 128], [255, 255], [255, 0]]) {
      const overrides: Record<string, boolean> = {};
      for (let bit = 0; bit < 8; bit++) {
        overrides[`a${bit}`] = Boolean(a & (1 << bit));
        overrides[`b${bit}`] = Boolean(b & (1 << bit));
      }
      const state = step(circuit, initialSnapshot(), false, {}, overrides);
      expect(state.unstable).toBe(false);
      expect([state.values.less, state.values.equal, state.values.greater]).toEqual([
        a < b, a === b, a > b,
      ]);
    }
  });
  it("shifts serial input on rising edges", () => {
    const circuit = PRESETS["8-bit shift register"];
    expect(validateCircuit(circuit)).not.toBeNull();
    let state = initialSnapshot();
    for (const data of [true, false, true, true]) {
      state = step(circuit, state, false, {}, { data });
      state = step(circuit, state, true, {}, { data });
    }
    expect(Array.from({ length: 8 }, (_, bit) => Boolean(state.values[`out${bit}`]))).toEqual([
      true, true, false, true, false, false, false, false,
    ]);
  });
  it("counts once per rising edge and wraps after 255", () => {
    const circuit = PRESETS["8-bit binary counter"];
    expect(validateCircuit(circuit)).not.toBeNull();
    let state = initialSnapshot();
    for (let count = 1; count <= 256; count++) {
      state = step(circuit, state, false);
      state = step(circuit, state, true);
      const value = Array.from({ length: 8 }, (_, bit) => Number(state.values[`out${bit}`]))
        .reduce((number, bit, index) => number | (bit << index), 0);
      expect(value).toBe(count & 0xff);
    }
  });
  it("evaluates the 8-bit arithmetic, mux, and ALU examples", () => {
    for (const name of ["8-bit half adder", "8-bit full adder", "8-bit ALU"]) {
      expect(moduleInputs(PRESETS[name]).map((port) => port.label).slice(0, 16)).toEqual([
        ...Array.from({ length: 8 }, (_, bit) => `A${bit}`),
        ...Array.from({ length: 8 }, (_, bit) => `B${bit}`),
      ]);
    }
    const run = (name: string, a: number, b: number, control: Record<string, boolean> = {}) => {
      const circuit = PRESETS[name];
      expect(validateCircuit(circuit), name).not.toBeNull();
      const overrides: Record<string, boolean> = { ...control };
      for (let bit = 0; bit < 8; bit++) {
        overrides[`a${bit}`] = Boolean(a & (1 << bit));
        overrides[`b${bit}`] = Boolean(b & (1 << bit));
      }
      const state = step(circuit, initialSnapshot(), false, {}, overrides);
      expect(state.unstable, name).toBe(false);
      const output = Array.from({ length: 8 }, (_, bit) => Number(state.values[`out${bit}`]));
      return {
        value: output.reduce((value, bit, index) => value | (bit << index), 0),
        carry: Boolean(state.values.cout),
        carries: Array.from({ length: 8 }, (_, bit) => Boolean(state.values[`carry${bit}`])),
      };
    };
    for (const [a, b] of [[0, 0], [1, 1], [0x55, 0xaa], [0xff, 1], [0xff, 0xff]]) {
      expect(run("8-bit half adder", a, b)).toMatchObject({
        value: a ^ b,
        carries: Array.from({ length: 8 }, (_, bit) => Boolean((a & b) & (1 << bit))),
      });
      for (const cin of [false, true]) {
        const sum = a + b + Number(cin);
        expect(run("8-bit full adder", a, b, { cin })).toMatchObject({
          value: sum & 0xff,
          carry: sum > 0xff,
        });
      }
      expect(run("8-bit 2:1 multiplexer", a, b).value).toBe(a);
      expect(run("8-bit 2:1 multiplexer", a, b, { select: true }).value).toBe(b);
      for (let op = 0; op < 4; op++) {
        expect(run("8-bit ALU", a, b, { op0: Boolean(op & 1), op1: Boolean(op & 2) }).value)
          .toBe([a & b, a | b, a ^ b, (a + b) & 0xff][op]);
      }
    }
  });
  it("evaluates half adder sum and carry through wires", () => {
    const circuit = structuredClone(PRESETS["Half adder"]);
    const read = (a: boolean, b: boolean) => {
      circuit.nodes.find((node) => node.id === "a")!.value = a;
      circuit.nodes.find((node) => node.id === "b")!.value = b;
      return step(circuit, initialSnapshot(), false).values;
    };
    expect([read(false, false).sum, read(false, false).carry]).toEqual([false, false]);
    expect([read(true, false).sum, read(true, false).carry]).toEqual([true, false]);
    expect([read(true, true).sum, read(true, true).carry]).toEqual([false, true]);
  });
  it("captures data only on a rising clock edge", () => {
    const circuit = structuredClone(PRESETS["Clocked memory"]);
    const data = circuit.nodes.find((node) => node.id === "data")!;
    let state = step(circuit, initialSnapshot(), false);
    data.value = true;
    state = step(circuit, state, false);
    expect(state.values.out).toBe(false);
    state = step(circuit, state, true);
    expect(state.values.out).toBe(true);
    data.value = false;
    state = step(circuit, state, true);
    expect(state.values.out).toBe(true);
    state = step(circuit, state, false);
    state = step(circuit, state, true);
    expect(state.values.out).toBe(false);
  });
  it("rejects malformed imported circuits", () => {
    const bad = {
      name: "bad",
      nodes: [{ id: "a", type: "switch", x: 0, y: 0 }],
      wires: [{ id: "w", from: "missing", to: "a", input: 0 }],
    };
    expect(validateCircuit(bad)).toBeNull();
    expect(validateCircuit(PRESETS["Half adder"] as Circuit)?.nodes).toHaveLength(6);
  });
  it("preserves valid wire colors and discards invalid imported colors", () => {
    const circuit = structuredClone(PRESETS["Half adder"]);
    circuit.wires[0].color = "violet";
    expect(validateCircuit(circuit)?.wires[0].color).toBe("violet");
    (circuit.wires[0] as { color?: string }).color = "toString";
    expect(validateCircuit(circuit)?.wires[0].color).toBeUndefined();
  });
  it("builds every gate correctly through each construction family", () => {
    for (const family of Object.values(BLUEPRINT_FAMILIES).map((item) => item.suffix)) {
      for (const gate of GATE_NAMES) {
        const blueprint = BLUEPRINTS[`${gate.toUpperCase()} from ${family}`];
        if (!blueprint) continue;
        const circuit = structuredClone(blueprint);
        for (const a of [false, true])
          for (const b of [false, true]) {
            circuit.nodes.find((item) => item.id === "a")!.value = a;
            const inputB = circuit.nodes.find((item) => item.id === "b");
            if (inputB) inputB.value = b;
            const expected = {
              not: !a,
              and: a && b,
              or: a || b,
              nand: !(a && b),
              nor: !(a || b),
              xor: a !== b,
              xnor: a === b,
            }[gate];
            expect(
              step(circuit, initialSnapshot(), false).values.out,
              `${family} ${gate} ${Number(a)}${Number(b)}`,
            ).toBe(expected);
          }
      }
    }
  });
  it("keeps universal and transistor blueprints within their stated parts", () => {
    for (const circuit of Object.values(BLUEPRINTS)) {
      const parts = circuit.nodes.map((node) => node.type);
      if (circuit.name.endsWith("NAND gates"))
        expect(parts.every((type) => ["switch", "lamp", "nand"].includes(type))).toBe(true);
      if (circuit.name.endsWith("NOR gates"))
        expect(parts.every((type) => ["switch", "lamp", "nor"].includes(type))).toBe(true);
      if (circuit.name.endsWith("CMOS transistors")) {
        expect(
          parts.every((type) =>
            ["switch", "high", "ground", "lamp", "nmos", "pmos", "junction"].includes(type),
          ),
        ).toBe(true);
        expect(parts.filter((type) => type === "pmos").length).toBe(
          parts.filter((type) => type === "nmos").length,
        );
      }
      for (const part of circuit.nodes.filter((item) =>
        ["nand", "nor", "and", "or", "xor", "xnor"].includes(item.type),
      ))
        expect(part.label).toBe(part.type.toUpperCase());
    }
  });
  it("routes two outputs from a half-adder black box independently", () => {
    const circuit: Circuit = {
      name: "Black box half adder",
      nodes: [
        { id: "a", type: "switch", x: 0, y: 0 },
        { id: "b", type: "switch", x: 0, y: 100 },
        { id: "box", type: "module", module: PRESETS["Half adder"], x: 250, y: 50 },
        { id: "sum", type: "lamp", x: 500, y: 0 },
        { id: "carry", type: "lamp", x: 500, y: 100 },
      ],
      wires: [
        { id: "a-box", from: "a", to: "box", input: 0 },
        { id: "b-box", from: "b", to: "box", input: 1 },
        { id: "box-sum", from: "box", output: 0, to: "sum", input: 0 },
        { id: "box-carry", from: "box", output: 1, to: "carry", input: 0 },
      ],
    };
    for (const a of [false, true])
      for (const b of [false, true]) {
        circuit.nodes[0].value = a;
        circuit.nodes[1].value = b;
        const values = step(circuit, initialSnapshot(), false).values;
        expect([values.sum, values.carry]).toEqual([a !== b, a && b]);
      }
    expect(validateCircuit(circuit)?.nodes.find((node) => node.id === "box")?.module?.name).toBe(
      "Half adder",
    );
    circuit.wires[3].output = 2;
    expect(validateCircuit(circuit)).toBeNull();
  });
  it("preserves clocked memory inside a black box", () => {
    const circuit: Circuit = {
      name: "Memory box",
      nodes: [
        { id: "data", type: "switch", x: 0, y: 0, value: true },
        { id: "clock", type: "switch", x: 0, y: 100, value: false },
        { id: "box", type: "module", module: PRESETS["Clocked memory"], x: 250, y: 50 },
        { id: "out", type: "lamp", x: 500, y: 50 },
      ],
      wires: [
        { id: "data-box", from: "data", to: "box", input: 0 },
        { id: "clock-box", from: "clock", to: "box", input: 1 },
        { id: "box-out", from: "box", to: "out", input: 0 },
      ],
    };
    let state = step(circuit, initialSnapshot(), false);
    expect(state.values.out).toBe(false);
    circuit.nodes[1].value = true;
    state = step(circuit, state, false);
    expect(state.values.out).toBe(true);
    circuit.nodes[0].value = false;
    state = step(circuit, state, false);
    expect(state.values.out).toBe(true);
    circuit.nodes[1].value = false;
    state = step(circuit, state, false);
    circuit.nodes[1].value = true;
    state = step(circuit, state, false);
    expect(state.values.out).toBe(false);
  });
  it("exposes all three full-adder inputs and both outputs", () => {
    const circuit: Circuit = {
      name: "Full-adder box",
      nodes: [
        ...["a", "b", "cin"].map((id, index) => ({
          id,
          type: "switch" as const,
          x: 0,
          y: index * 100,
        })),
        { id: "box", type: "module", module: PRESETS["Full adder"], x: 250, y: 100 },
        { id: "sum", type: "lamp", x: 500, y: 0 },
        { id: "carry", type: "lamp", x: 500, y: 100 },
      ],
      wires: [
        ...["a", "b", "cin"].map((from, input) => ({ id: `${from}-box`, from, to: "box", input })),
        { id: "box-sum", from: "box", output: 0, to: "sum", input: 0 },
        { id: "box-carry", from: "box", output: 1, to: "carry", input: 0 },
      ],
    };
    expect(validateCircuit(JSON.parse(JSON.stringify(circuit)))).not.toBeNull();
    for (const a of [false, true])
      for (const b of [false, true])
        for (const cin of [false, true]) {
          circuit.nodes[0].value = a;
          circuit.nodes[1].value = b;
          circuit.nodes[2].value = cin;
          const values = step(circuit, initialSnapshot(), false).values;
          const total = Number(a) + Number(b) + Number(cin);
          expect([values.sum, values.carry]).toEqual([total % 2 === 1, total >= 2]);
        }
  });
  it("maps a pulse source to a black-box input", () => {
    const circuit: Circuit = {
      name: "Pulse box",
      nodes: [
        { id: "trigger", type: "switch", x: 0, y: 0, value: false },
        { id: "box", type: "module", module: PRESETS["Pulse path"], x: 200, y: 0 },
        { id: "out", type: "lamp", x: 400, y: 0 },
      ],
      wires: [
        { id: "in", from: "trigger", to: "box", input: 0 },
        { id: "out", from: "box", to: "out", input: 0 },
      ],
    };
    expect(step(circuit, initialSnapshot(), false).values.out).toBe(true);
    circuit.nodes[0].value = true;
    expect(step(circuit, initialSnapshot(), false).values.out).toBe(false);
  });
  it("uses the expected universal-gate counts and complementary CMOS paths", () => {
    const count = (gate: string, family: string, part: string) =>
      BLUEPRINTS[`${gate} from ${family}`].nodes.filter((item) => item.type === part).length;
    expect(
      ["NOT", "AND", "OR", "NAND", "NOR", "XOR", "XNOR"].map((gate) =>
        count(gate, "NAND gates", "nand"),
      ),
    ).toEqual([1, 2, 3, 1, 4, 4, 5]);
    expect(
      ["NOT", "AND", "OR", "NAND", "NOR", "XOR", "XNOR"].map((gate) =>
        count(gate, "NOR gates", "nor"),
      ),
    ).toEqual([1, 3, 2, 4, 1, 5, 4]);
    for (const gate of ["NOT", "NAND", "NOR", "AND", "OR", "XOR", "XNOR"]) {
      const circuit = BLUEPRINTS[`${gate} from CMOS transistors`];
      expect(circuit.nodes.some((item) => item.type === "high")).toBe(true);
      expect(circuit.nodes.some((item) => item.type === "ground")).toBe(true);
      expect(
        circuit.wires.some(
          (item) =>
            item.from === "vcc" &&
            circuit.nodes.find((node) => node.id === item.to)?.type === "pmos",
        ),
      ).toBe(true);
      expect(
        circuit.wires.some(
          (item) =>
            item.from === "gnd" &&
            circuit.nodes.find((node) => node.id === item.to)?.type === "nmos",
        ),
      ).toBe(true);
    }
    expect(count("NOT", "CMOS transistors", "pmos")).toBe(1);
    expect(count("NOT", "CMOS transistors", "nmos")).toBe(1);
    expect(count("NAND", "CMOS transistors", "pmos")).toBe(2);
    expect(count("NAND", "CMOS transistors", "nmos")).toBe(2);
    expect(count("NOR", "CMOS transistors", "pmos")).toBe(2);
    expect(count("NOR", "CMOS transistors", "nmos")).toBe(2);
  });
  it("keeps circuit boundaries separate from functional gate parts", () => {
    const circuit = BLUEPRINTS["NAND from NOR gates"];
    expect(blueprintGate(circuit)).toBe("nand");
    expect(circuit.groups).toHaveLength(1);
    expect(circuit.groups![0].label).toBe(circuit.name);
    expect(circuit.groups![0].nodeIds).toHaveLength(4);
    expect(
      circuit.groups![0].nodeIds.every(
        (id) => circuit.nodes.find((node) => node.id === id)?.type === "nor",
      ),
    ).toBe(true);
    expect(validateCircuit(circuit)?.groups).toEqual(circuit.groups);
    const invalid = structuredClone(circuit);
    invalid.groups![0].nodeIds.push("missing");
    expect(validateCircuit(invalid)).toBeNull();
  });
});

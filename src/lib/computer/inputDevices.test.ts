import { describe, expect, it } from "vitest";
import { decodeControlWord, SIGNALS, traceTicks } from "../computerStepper";
import { simulationCircuit, syncBlockStates } from "./blockFolding";
import {
  BUTTON_PROGRAM,
  buttonCounterDisplay,
  buttonCpuCircuit,
  buttonCpuScreen,
  buttonInputCircuit,
  checkButtonProgram,
  compileButtonProgram,
} from "./buttonInterrupt";
import { cpuNetlist, readCpu } from "./cpuNetlist";
import { CPU_PARTS } from "./cpuPreset";
import { expectedProbes } from "./cpuTestPrograms";
import {
  FIFO_LIMIT,
  initialScanner,
  MatrixMachine,
  matrixKeys,
  scanRow,
  senseMatrix,
} from "./keyboardMatrix";
import { type Circuit, initialSnapshot, step, validateCircuit } from "./logic";
import { NetlistSim } from "./netlist";
import { readProbes } from "./probes";
import { segmentBits } from "./sevenSegment";
import { gradeLevel, gradePassed } from "./tutorial/grade";
import { levelStart } from "./tutorial/kit";
import { CATALOG } from "./tutorial/levels";
import { gradeInterruptInterface, INPUT_DEVICE_LEVELS } from "./tutorial/levels/inputDevices";

const seq = (circuit: Circuit) => {
  let snapshot = step(circuit, initialSnapshot(), false);
  const inputs: Record<string, boolean> = {};
  return {
    get snapshot() {
      return snapshot;
    },
    set(values: Record<string, boolean>, high = false) {
      Object.assign(inputs, values);
      snapshot = step(circuit, snapshot, high, {}, inputs);
      return snapshot;
    },
  };
};

describe("button request and real CPU", () => {
  it("checks the handler by actual entry, IN, RETI and preserved return state", () => {
    expect(checkButtonProgram(BUTTON_PROGRAM)).toMatch(/^Pass/);
    expect(checkButtonProgram("loop {\n}")).toMatch(/No interrupt entry/);
    expect(checkButtonProgram(BUTTON_PROGRAM.replace("print(presses);", "print(9);"))).toMatch(
      /Goal:/,
    );
  });
  it("captures an entirely inter-clock pulse, synchronizes it, and never repeats a held press", () => {
    const run = seq(buttonInputCircuit());
    run.set({ raw: true });
    expect(run.snapshot.values.captured).toBe(true);
    run.set({ raw: false });
    expect(run.snapshot.values.request).toBe(false);
    run.set({}, true);
    run.set({}, false);
    run.set({}, true);
    expect(run.snapshot.values.request).toBe(true);
    expect(run.snapshot.values.sampled).toBe(false);
    run.set({ ack: true });
    run.set({ ack: false });
    expect(run.snapshot.values.request).toBe(false);
    run.set({ raw: true });
    run.set({}, false);
    run.set({}, true);
    run.set({}, false);
    run.set({}, true);
    expect(run.snapshot.values.sampled).toBe(true);
    run.set({ ack: true });
    run.set({ ack: false });
    for (let i = 0; i < 8; i++) {
      run.set({}, false);
      run.set({}, true);
      expect(run.snapshot.values.request).toBe(false);
    }
    run.set({ raw: false });
    run.set({ raw: true });
    expect(run.snapshot.values.captured).toBe(true);
    run.set({ reset: true });
    expect(run.snapshot.values.captured).toBe(false);
    run.set({ reset: false });
    expect(run.snapshot.values.captured).toBe(false);
  });
  for (const stack of ["hardware", "ram"] as const)
    it(`${stack}: button interface feeds the existing CPU in per-tick lockstep`, () => {
      const program = compileButtonProgram(BUTTON_PROGRAM, stack);
      const circuit = buttonCpuCircuit(BUTTON_PROGRAM, stack);
      expect(validateCircuit(JSON.parse(JSON.stringify(circuit)))).not.toBeNull();
      let actual = step(circuit, initialSnapshot(), false);
      const events: Record<number, number> = {};
      // Record exactly the sampled requests which the circuit sends into its unchanged key port.
      const states = [];
      for (let tick = 0; tick < 700; tick++) {
        if (tick === 40 || tick === 400) {
          actual = step(circuit, actual, false, { "button-raw": true });
          actual = step(circuit, actual, false, { "button-raw": false });
        }
        if (actual.outputs["button-interface"]?.[2]) events[tick] = 1;
        const word = (actual.outputs[CPU_PARTS.control] ?? [])
          .slice(0, SIGNALS.length)
          .reduce((word, on, i) => (on ? word | (2 ** i) : word), 0);
        const bus = actual.buses?.[CPU_PARTS.bus];
        actual = step(circuit, actual, true);
        actual = step(circuit, actual, false);
        states.push({ probes: readProbes(circuit, actual), word, bus });
      }
      const trace = traceTicks(program, 200, events);
      for (const [i, actual] of states.entries()) {
        const expected = trace[i];
        expect(decodeControlWord(actual.word).sort(), `control at ${i}`).toEqual(
          [...expected.control].sort(),
        );
        expect(actual.bus, `bus at ${i}`).toBe(expected.bus ?? "Z");
        const { BUS, ...probes } = actual.probes;
        expect(probes, `registers at ${i}`).toEqual(expectedProbes(expected));
      }
      expect(trace[699].output).toEqual([1, 2]);
      expect(trace.slice(0, 700).filter((t) => t.interrupt && t.t === 0)).toHaveLength(2);
    });
  it("held raw input yields one handler call and release/repress yields a second", () => {
    const run = seq(buttonCpuCircuit());
    run.set({ "button-raw": true });
    for (let i = 0; i < 400; i++) {
      run.set({}, true);
      run.set({}, false);
    }
    expect(readProbes(buttonCpuCircuit(), run.snapshot).OUT).toBe(1);
    run.set({ "button-raw": false });
    run.set({ "button-raw": true });
    for (let i = 0; i < 300; i++) {
      run.set({}, true);
      run.set({}, false);
    }
    expect(readProbes(buttonCpuCircuit(), run.snapshot).OUT).toBe(2);
  });
  it("coalesces pre-ack presses and keeps a new masked request pending until RETI", () => {
    const circuit = buttonCpuCircuit();
    let snapshot = step(circuit, initialSnapshot(), false);
    let sawAck = false,
      sentAfterAck = false,
      maskedPending = false,
      entries = 0,
      previousInt = false;
    const pulse = () => {
      snapshot = step(circuit, snapshot, false, { "button-raw": true });
      snapshot = step(circuit, snapshot, false);
    };
    for (let tick = 0; tick < 700; tick++) {
      const ack = Boolean(snapshot.outputs[CPU_PARTS.control]?.[SIGNALS.indexOf("KEY_OUT")]);
      const flags = readProbes(circuit, snapshot).IRQ ?? 0;
      if (tick === 0 || tick === 2) pulse();
      if (sawAck && !ack && !(flags & 2) && !sentAfterAck) {
        pulse();
        sentAfterAck = true;
      }
      if (ack) sawAck = true;
      if (sentAfterAck && flags & 1 && !(flags & 2)) maskedPending = true;
      const interrupt = Boolean(snapshot.values[CPU_PARTS.int]);
      if (interrupt && !previousInt) entries++;
      previousInt = interrupt;
      snapshot = step(circuit, snapshot, true);
      snapshot = step(circuit, snapshot, false);
    }
    expect(sentAfterAck).toBe(true);
    expect(maskedPending).toBe(true);
    expect(entries).toBe(2);
    expect(readProbes(circuit, snapshot).OUT).toBe(2);
  });

  it("grades the actual interface behavior and rejects the disconnected start", () => {
    expect(gradeInterruptInterface(buttonCpuCircuit()).pass).toBe(true);
    const level = INPUT_DEVICE_LEVELS.at(-1)!;
    expect(gradeInterruptInterface(levelStart(level).circuit).pass).toBe(false);
  });
});

it("the fully flattened CPU agrees with folded input capture and interrupt execution", () => {
  const circuit = buttonCpuCircuit(),
    cpu = cpuNetlist(circuit),
    sim = new NetlistSim(cpu.netlist);
  const raw = cpu.netlist.nodes.get("button-raw")![0];
  sim.step(false);
  let snapshot = step(circuit, initialSnapshot(), false);
  for (let tick = 0; tick < 250; tick++) {
    if (tick === 40) {
      sim.setConstant(raw, 1);
      sim.step(false);
      snapshot = step(circuit, snapshot, false, { "button-raw": true });
      sim.setConstant(raw, 0);
      sim.step(false);
      snapshot = step(circuit, snapshot, false, { "button-raw": false });
    }
    sim.tick();
    snapshot = step(circuit, snapshot, true);
    snapshot = step(circuit, snapshot, false);
    expect(readCpu(sim, cpu).probes, `flattened tick ${tick}`).toEqual(
      readProbes(circuit, snapshot),
    );
  }
  expect(readCpu(sim, cpu).probes.OUT).toBe(1);
});

it("keeps the visible CPU screen current while its memory gates are unfolded", () => {
  const circuit = buttonCpuCircuit();
  let s = step(circuit, initialSnapshot(), false);
  s = step(circuit, s, false, { "button-raw": true });
  s = step(circuit, s, false);
  for (let i = 0; i < 200; i++) {
    s = step(circuit, s, true);
    s = step(circuit, s, false);
  }
  const before = buttonCpuScreen(circuit, s);
  expect(before[3]).toBe(1);
  const open = new Set([CPU_PARTS.screen]);
  s = syncBlockStates(circuit, s, open);
  expect(s.blocks?.[CPU_PARTS.screen]).toBeUndefined();
  expect(buttonCpuScreen(circuit, s)).toEqual(before);
  s = step(simulationCircuit(circuit, open), s, true);
  expect(buttonCpuScreen(circuit, s)).toEqual(before);
});

describe("shared button/counter/display integration", () => {
  it("counts one event per rise through decimal converters and physical segment pins, including wrap", () => {
    const circuit = buttonCounterDisplay();
    expect(validateCircuit(JSON.parse(JSON.stringify(circuit)))).not.toBeNull();
    let snapshot = step(circuit, initialSnapshot(), false);
    for (let count = 1; count <= 256; count++) {
      snapshot = step(circuit, snapshot, false, { count: true });
      const held = step(circuit, snapshot, false, { count: true });
      expect(held.outputs.counter).toEqual(snapshot.outputs.counter);
      snapshot = step(circuit, held, false);
      const n = count & 255;
      const digits = snapshot.modules.digits;
      for (let place = 0; place < 3; place++)
        expect(digits.outputs[`raw${place}`], `${count}/${place}`).toEqual(
          segmentBits(Math.floor(n / 10 ** place) % 10),
        );
    }
  });
});

describe("matrix circuit and controller", () => {
  it("matches every 2 × 2 key combination with and without diodes", () => {
    const size = { rows: 2, columns: 2 },
      machine = new MatrixMachine(size);
    for (let bits = 0; bits < 16; bits++)
      for (let row = 0; row < 2; row++)
        for (const diodes of [false, true]) {
          const held = Array.from({ length: 4 }, (_, i) => Boolean(bits & (2 ** i)));
          expect(machine.sense(held, row, diodes), `${bits}/${row}/${diodes}`).toEqual(
            senseMatrix(size, held, row, diodes),
          );
        }
  });
  it("two diagonals stay independent; three corners ghost and diodes isolate", () => {
    const size = { rows: 2, columns: 2 };
    expect(senseMatrix(size, [true, false, false, true], 0, false)).toEqual([true, false]);
    expect(senseMatrix(size, [true, true, false, true], 1, false)).toEqual([true, true]);
    expect(senseMatrix(size, [true, true, false, true], 1, true)).toEqual([false, true]);
  });
  it("requires complete stable frames, resolves Shift before letters, and reports releases once", () => {
    const size = { rows: 2, columns: 2 },
      keys = matrixKeys(size),
      machine = new MatrixMachine(size);
    let state = initialScanner(size);
    const frame = (held: boolean[]) => {
      for (let r = 0; r < 2; r++)
        state = scanRow(state, size, machine.sense(held, state.row, true), keys);
    };
    frame([true, false, true, false]);
    expect(state.events).toHaveLength(0);
    frame([true, false, true, false]);
    expect(state.text).toBe("A");
    expect(state.stable.filter(Boolean)).toHaveLength(2);
    expect(state.events.filter((e) => e.down)).toHaveLength(2);
    frame([true, false, true, false]);
    expect(state.events).toHaveLength(2);
    frame([false, false, false, false]);
    frame([false, false, false, false]);
    expect(state.events.filter((e) => !e.down)).toHaveLength(2);
    frame([true, false, false, false]);
    frame([true, false, false, false]);
    expect(state.text).toBe("Aa");
  });
  it("rejects one-frame chatter and bounds its event log with explicit drop-newest policy", () => {
    const size = { rows: 2, columns: 2 },
      keys = matrixKeys(size);
    let s = initialScanner(size);
    const frame = (down: boolean, debounce = 2) => {
      s = scanRow(s, size, [down, false], keys, debounce);
      s = scanRow(s, size, [false, false], keys, debounce);
    };
    frame(true);
    frame(false);
    frame(true);
    frame(false);
    expect(s.events).toHaveLength(0);
    for (let i = 0; i < 40; i++) frame(i % 2 === 0, 1);
    expect(s.events).toHaveLength(FIFO_LIMIT);
    expect(s.dropped).toBe(8);
  });
  it("runs a keyboard-sized gate circuit and preserves US Shift punctuation", () => {
    const size = { rows: 6, columns: 15 },
      machine = new MatrixMachine(size),
      keys = matrixKeys(size, true);
    expect(validateCircuit(JSON.parse(JSON.stringify(machine.circuit)))).not.toBeNull();
    let state = initialScanner(size),
      held = Array<boolean>(90).fill(false);
    held[1] = true;
    held[45] = true;
    held[31] = true; // 1 + left Shift + A
    for (let i = 0; i < 12; i++)
      state = scanRow(state, size, machine.sense(held, state.row, true), keys);
    expect(state.text).toBe("!A");
    expect(state.stable.filter(Boolean)).toHaveLength(3);
    expect(keys[45].modifier).toBe(true);
  });
});

describe("hint-only construction levels", () => {
  it("accepts NAND followed by NOT as an equivalent isolated contact construction", () => {
    const level = INPUT_DEVICE_LEVELS.find((l) => l.id === "matrix-row-2")!;
    const ref = level.reference!();
    const ands = ref.nodes.filter((n) => n.type === "and");
    const circuit = {
      ...ref,
      nodes: [
        ...ref.nodes.map((n) => (n.type === "and" ? { ...n, type: "nand" as const } : n)),
        ...ands.map((n) => ({ id: `${n.id}-invert`, type: "not" as const, x: 400, y: n.y })),
      ],
      wires: [
        ...ref.wires.map((w) =>
          ands.some((n) => n.id === w.from) ? { ...w, from: `${w.from}-invert` } : w,
        ),
        ...ands.map((n) => ({ id: `${n.id}-invert`, from: n.id, to: `${n.id}-invert`, input: 0 })),
      ],
    };
    expect(
      gradePassed(gradeLevel(circuit, level, levelStart(level).locked, CATALOG.allowed(level))),
    ).toBe(true);
  });
  for (const level of INPUT_DEVICE_LEVELS.filter((l) => l.spec.kind !== "custom"))
    it(`${level.id} accepts its gates, not its empty board`, () => {
      const start = levelStart(level),
        allowed = CATALOG.allowed(level);
      const result = gradeLevel(level.reference!(), level, start.locked, allowed);
      expect(gradePassed(result), JSON.stringify(result).slice(0, 1200)).toBe(true);
      expect(gradePassed(gradeLevel(start.circuit, level, start.locked, allowed))).toBe(false);
      expect(level.steps).toBeUndefined();
      expect(level.hints?.every((h) => !h.when)).toBe(true);
    });
});

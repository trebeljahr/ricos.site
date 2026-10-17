import { describe, expect, it } from "vitest";
import {
  COUNTER_MODES,
  COUNTER_WIDTHS,
  counterCircuit,
  counterComponent,
  counterDemo,
} from "./counterCircuits";
import {
  type Circuit,
  initialSnapshot,
  moduleInputs,
  moduleOutputs,
  step,
  validateCircuit,
} from "./logic";
import { simulationCircuit, syncBlockStates } from "./blockFolding";
import { compileNetlist, NetlistSim } from "./netlist";
import {
  circuitImplementation,
  recognizeCircuitSync,
  verifiedCircuitIdentity,
} from "./recognition";
import { CATALOG } from "./tutorial/levels";
import { COUNTER_LEVELS } from "./tutorial/levels/counters";
import { gradeLevel, gradePassed } from "./tutorial/grade";
import { levelStart } from "./tutorial/kit";
import { applyAction, matchReference, nextAction } from "./tutorial/matcher";

const read = (snapshot: ReturnType<typeof initialSnapshot>, width: number) =>
  Array.from({ length: width }, (_, i) => (snapshot.values[`q${i}`] ? 2 ** i : 0)).reduce(
    (a, b) => a + b,
    0,
  );

describe.each(COUNTER_WIDTHS)("%i-bit counters", (width) => {
  it.each(
    COUNTER_MODES,
  )("%s: full range, holds, falling edges, reset and construction grade", (mode) => {
    const level = COUNTER_LEVELS.find((l) => l.id === `manual-counter-${width}-${mode}`)!;
    const circuit = level.reference!();
    expect(circuit.nodes.filter((n) => n.type === "dff")).toHaveLength(width);
    expect(moduleOutputs(circuit).map((n) => n.label)).toEqual(
      Array.from({ length: width }, (_, i) => `Q${i}`),
    );
    const result = gradeLevel(circuit, level, levelStart(level).locked, CATALOG.allowed(level));
    if (!gradePassed(result)) throw new Error(JSON.stringify(result).slice(0, 2000));
    expect(
      gradePassed(
        gradeLevel(
          levelStart(level).circuit,
          level,
          levelStart(level).locked,
          CATALOG.allowed(level),
        ),
      ),
    ).toBe(false);
    expect(validateCircuit(JSON.parse(JSON.stringify(circuit)))).not.toBeNull();
    expect(verifiedCircuitIdentity(counterComponent(width, mode))?.component.symbol).toBe(
      "counter",
    );
    expect(recognizeCircuitSync(circuit, circuit.ports!, level.id).status).toBe("unsupported");
  });
});

it("8-bit up reaches 255, wraps and resets from 255", () => {
  const circuit = counterCircuit(8, "up");
  let snapshot = step(circuit, initialSnapshot(), false);
  for (let q = 1; q <= 255; q++) {
    snapshot = step(circuit, snapshot, false, {}, { inc: true });
    expect(read(snapshot, 8)).toBe(q);
    snapshot = step(circuit, snapshot, false);
  }
  snapshot = step(circuit, snapshot, false, {}, { reset: true, inc: true });
  expect(read(snapshot, 8)).toBe(0);
});

it("netlist and interactive engine agree for every width/mode, including asynchronous reset", () => {
  for (const width of COUNTER_WIDTHS)
    for (const mode of COUNTER_MODES) {
      const circuit = counterCircuit(width, mode),
        list = compileNetlist(circuit),
        sim = new NetlistSim(list);
      const inputIds = moduleInputs(circuit).map((n) => n.id);
      let snapshot = initialSnapshot();
      const levels: Record<string, boolean>[] = [
        {},
        { inc: true },
        { inc: true },
        {},
        { dec: true },
        { inc: true, dec: true },
        { reset: true, inc: true, dec: true },
        { inc: true, dec: true },
        {},
        { dec: true },
        {},
        { inc: true },
      ];
      for (const inputs of levels) {
        for (const id of inputIds)
          sim.setConstant(list.nodes.get(id)![0], inputs[id as keyof typeof inputs] ? -1 : 0);
        sim.step(false);
        snapshot = step(circuit, snapshot, false, {}, inputs);
        const actual = Array.from({ length: width }, (_, bit) =>
          sim.values[list.nodes.get(`q${bit}`)![0]] & 1 ? 2 ** bit : 0,
        ).reduce((a, b) => a + b, 0);
        expect(actual).toBe(read(snapshot, width));
        expect(snapshot.unstable).toBe(false);
      }
    }
});

it("two copies keep independent state through fold/unfold, cloning and save/load", () => {
  const demo = counterDemo(4, "up-down");
  const second = { ...demo.nodes.find((n) => n.id === "counter")!, id: "second" };
  const circuit: Circuit = { ...demo, nodes: [...demo.nodes, second] };
  let snapshot = step(circuit, initialSnapshot(), false);
  const count = () => {
    snapshot = step(circuit, snapshot, false, { inc: true });
    snapshot = step(circuit, snapshot, false);
  };
  count();
  count();
  expect(snapshot.outputs.counter).toEqual([false, true, false, false]);
  expect(snapshot.outputs.second).toEqual([false, false, false, false]);
  const open = new Set(["counter"]);
  snapshot = step(
    simulationCircuit(circuit, open),
    syncBlockStates(circuit, snapshot, open),
    false,
  );
  expect(snapshot.outputs.counter).toEqual([false, true, false, false]);
  snapshot = step(circuit, syncBlockStates(circuit, snapshot, new Set()), false);
  count();
  expect(snapshot.outputs.counter).toEqual([true, true, false, false]);
  const loaded = validateCircuit(JSON.parse(JSON.stringify(circuit)))!;
  expect(
    loaded.nodes.find((n) => n.id === "counter")!.module!.nodes.filter((n) => n.resettable),
  ).toHaveLength(4);
  expect(step(loaded, initialSnapshot(), false).outputs.counter).toEqual([
    false,
    false,
    false,
    false,
  ]);
});

it("reset pin changes identity; legacy DFFs still have two inputs and edge-only behavior", () => {
  const circuit = counterCircuit(2, "up");
  const changed = {
    ...circuit,
    nodes: circuit.nodes.map((n) => (n.type === "dff" ? { ...n, resettable: false } : n)),
  };
  expect(circuitImplementation(changed)).not.toBe(circuitImplementation(circuit));
  expect(
    validateCircuit({
      ...circuit,
      nodes: circuit.nodes.map((n) => (n.type === "and" ? { ...n, resettable: true } : n)),
    }),
  ).toBeNull();
});

it.each([
  2, 4, 8,
] as const)("%i-bit construction references are reachable through Show me", (width) => {
  for (const mode of COUNTER_MODES) {
    const level = COUNTER_LEVELS.find((l) => l.id === `manual-counter-${width}-${mode}`)!;
    const start = levelStart(level),
      reference = level.reference!();
    let circuit = start.circuit;
    for (let i = 0; i < 600; i++) {
      const match = matchReference(circuit, reference, start.locked, CATALOG.gateParts);
      const action = nextAction(circuit, reference, match);
      if (!action) break;
      circuit = applyAction(circuit, action, (ref) => ({ ...ref, id: `mine${i}` }));
    }
    expect(gradePassed(gradeLevel(circuit, level, start.locked, CATALOG.allowed(level)))).toBe(
      true,
    );
  }
});

it("held-mode configuration round-trips while source levels start low", () => {
  const circuit = counterDemo(2, "up");
  circuit.nodes[0] = { ...circuit.nodes[0], manualMode: "held", value: true };
  const loaded = validateCircuit(JSON.parse(JSON.stringify(circuit)))!;
  expect(loaded.nodes[0].manualMode).toBe("held");
  const snapshot = step(loaded, initialSnapshot(), false);
  expect(snapshot.values.inc).toBe(false);
  expect(snapshot.outputs.counter).toEqual([false, false]);
});

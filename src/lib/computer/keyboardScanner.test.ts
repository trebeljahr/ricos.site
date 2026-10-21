import { describe, expect, it } from "vitest";
import { toNumber } from "./blockBuilder";
import { keyboardScannerCircuit } from "./keyboardScanner";
import { initialSnapshot, step, validateCircuit } from "./logic";

function scanner(rows = 2, columns = 2, ansi = false) {
  const circuit = keyboardScannerCircuit({ rows, columns }, ansi);
  let state = step(circuit, initialSnapshot(), false);
  let held: Record<string, boolean> = {};
  return {
    circuit,
    get state() {
      return state;
    },
    hold(next: Record<string, boolean>) {
      held = next;
      state = step(circuit, state, false, {}, held);
    },
    cycle() {
      state = step(circuit, state, true, {}, held);
      state = step(circuit, state, false, {}, held);
      expect(state.unstable).toBe(false);
      return state;
    },
  };
}

describe("keyboard scanner in the shared circuit", () => {
  it("scans a simultaneous Shift+A, emits one press and one release, and maps lowercase after release", () => {
    const run = scanner();
    run.hold({ "key-0-0": true, "key-1-0": true });
    const characters: number[] = [];
    let presses = 0,
      releases = 0,
      priorPress = false,
      priorRelease = false;
    const cycles = (count: number) => {
      for (let i = 0; i < count; i++) {
        const state = run.cycle();
        const press = Boolean(state.values["key-0-0-pressed"]);
        const release = Boolean(state.values["key-0-0-released"]);
        if (press && !priorPress) {
          presses++;
          characters.push(toNumber(state.outputs.character));
        }
        if (release && !priorRelease) releases++;
        priorPress = press;
        priorRelease = release;
      }
    };
    cycles(12);
    expect(characters).toEqual([65]);
    expect(run.state.values["shift-state"]).toBe(true);
    run.hold({});
    cycles(12);
    expect(releases).toBe(1);
    expect(run.state.values["key-0-0-stable"]).toBe(false);
    run.hold({ "key-0-0": true });
    cycles(12);
    expect(presses).toBe(2);
    expect(characters).toEqual([65, 97]);
  });
  it.each([
    2, 3, 4, 5, 6,
  ])("selects exactly one of %i rows and persists a valid editable circuit", (rows) => {
    const run = scanner(rows, 3);
    expect(validateCircuit(JSON.parse(JSON.stringify(run.circuit)))).not.toBeNull();
    const selected = new Set<number>();
    for (let i = 0; i < rows * 2; i++) {
      const active = run.cycle().outputs.rows;
      expect(active.filter(Boolean)).toHaveLength(1);
      selected.add(active.findIndex(Boolean));
    }
    expect(selected.size).toBe(rows);
  });
  it("requires column sensing wires and does not read key values outside the gates", () => {
    const run = scanner();
    run.circuit.wires = run.circuit.wires.filter(
      (wire) => wire.to !== "key-0-0-events" || wire.input !== 1,
    );
    run.hold({ "key-0-0": true });
    for (let i = 0; i < 12; i++) run.cycle();
    expect(run.state.values["key-0-0-stable"]).toBe(false);
    expect(run.state.values["character-ready"]).toBe(false);
  });
  it("scans QWERTY punctuation with Shift through the same gates and survives reload validation", () => {
    const run = scanner(6, 15, true);
    expect(validateCircuit(JSON.parse(JSON.stringify(run.circuit)))).not.toBeNull();
    run.hold({ "key-0-1": true, "key-3-0": true });
    const characters = new Set<number>();
    for (let i = 0; i < 30; i++) {
      const state = run.cycle();
      if (state.values["character-ready"]) characters.add(toNumber(state.outputs.character));
    }
    expect([...characters]).toEqual([33]);
    expect(run.state.values["key-0-1-stable"]).toBe(true);
    expect(run.state.values["key-3-0-stable"]).toBe(true);
  });
});

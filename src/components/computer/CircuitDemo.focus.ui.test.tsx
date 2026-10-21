// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import type { Circuit } from "../../lib/computer/logic";
import { CircuitDemo } from "./CircuitDemo";

type BuilderProps = {
  initialCircuit: Circuit;
  initialFocus?: readonly string[];
  storageKey: string | null;
};
const record = vi.hoisted(() => ({ props: [] as BuilderProps[] }));
vi.mock("./LogicBuilder", () => ({
  LogicBuilder: (props: BuilderProps) => {
    record.props.push(props);
    return null;
  },
}));

afterEach(() => {
  cleanup();
  record.props.length = 0;
});

it("fits every prewired part by default without changing focus on unrelated renders", () => {
  const circuit: Circuit = {
    name: "Address decoder",
    nodes: [
      { id: "a", type: "switch", x: 40, y: 40 },
      { id: "gate", type: "not", x: 500, y: 40 },
      { id: "out", type: "lamp", x: 900, y: 40 },
    ],
    wires: [],
  };
  const makeCircuit = vi.fn(() => circuit);
  const { rerender } = render(<CircuitDemo makeCircuit={makeCircuit} label="Decoder" />);
  const first = record.props.at(-1)!;
  expect(first.initialFocus).toEqual(["a", "gate", "out"]);
  expect(first.initialCircuit).toBe(circuit);
  expect(first.storageKey).toBeNull();
  rerender(
    <CircuitDemo makeCircuit={makeCircuit} label="Decoder">
      Follow the wires.
    </CircuitDemo>,
  );
  expect(makeCircuit).toHaveBeenCalledTimes(1);
  expect(record.props.at(-1)!.initialFocus).toBe(first.initialFocus);

  const replacement = {
    ...circuit,
    nodes: [...circuit.nodes, { id: "extra", type: "lamp" as const, x: 1200, y: 40 }],
  };
  rerender(<CircuitDemo makeCircuit={() => replacement} label="Wider decoder" />);
  expect(record.props.at(-1)!.initialFocus).toEqual(["a", "gate", "out", "extra"]);
  expect(record.props.at(-1)!.initialFocus).not.toBe(first.initialFocus);
});

it("preserves an explicitly requested focus, including an empty selection", () => {
  const makeCircuit = () => ({ name: "Circuit", nodes: [], wires: [] });
  const focus = ["selected-part"];
  const { rerender } = render(
    <CircuitDemo makeCircuit={makeCircuit} label="Focused" initialFocus={focus} />,
  );
  expect(record.props.at(-1)!.initialFocus).toBe(focus);
  const empty: readonly string[] = [];
  rerender(<CircuitDemo makeCircuit={makeCircuit} label="Focused" initialFocus={empty} />);
  expect(record.props.at(-1)!.initialFocus).toBe(empty);
  expect(record.props.at(-1)!.storageKey).toBeNull();
});

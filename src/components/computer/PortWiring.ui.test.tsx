// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Circuit } from "../../lib/computer/logic";
import { LogicBuilder } from "./LogicBuilder";

const STORAGE = "ricos-computer-circuits-v1";
const fixture = (): Circuit => ({
  name: "Port selection",
  nodes: [
    { id: "data", type: "input8", label: "DATA", x: 40, y: 40 },
    { id: "display", type: "display8", label: "DISPLAY", x: 450, y: 40 },
    { id: "clock", type: "clock", label: "CLOCK", x: 40, y: 420 },
  ],
  wires: [],
});
const stored = (): Circuit => JSON.parse(localStorage.getItem(STORAGE)!).current;
const output = (bit: number) => screen.getByRole("button", { name: `Wire from DATA Bit ${bit}` });
const input = (bit: number) =>
  screen.getByRole("button", { name: `Connect to DISPLAY Bit ${bit}` });
const selected = () =>
  screen
    .getByRole("application", { name: "Circuit canvas" })
    .querySelectorAll('[data-port-selected="true"]');

function mount(circuit = fixture()) {
  localStorage.setItem(STORAGE, JSON.stringify({ current: circuit, saved: {} }));
  render(<LogicBuilder />);
  const board = screen.getByRole("application", { name: "Circuit canvas" }) as HTMLDivElement;
  const width = parseFloat(board.style.width),
    height = parseFloat(board.style.height);
  vi.spyOn(board, "getBoundingClientRect").mockReturnValue({
    left: 0,
    top: 0,
    right: width,
    bottom: height,
    width,
    height,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  });
  return board;
}
function location(port: HTMLElement) {
  const part = port.closest('[role="group"]') as HTMLElement;
  const row = port.parentElement!;
  const board = screen.getByRole("application", { name: "Circuit canvas" }) as HTMLElement;
  const width = parseFloat(board.style.width),
    height = parseFloat(board.style.height);
  return {
    clientX:
      width *
      (parseFloat(part.style.left) / 100 +
        ((parseFloat(part.style.width) / 100) * parseFloat(row.style.left)) / 100),
    clientY:
      height *
      (parseFloat(part.style.top) / 100 +
        ((parseFloat(part.style.height) / 100) * parseFloat(row.style.top)) / 100),
  };
}
const pointer = { button: 0, pointerId: 1, pointerType: "mouse" };
function drag(board: HTMLElement, source: HTMLElement, target: HTMLElement, shiftKey = false) {
  fireEvent.pointerDown(source, { ...pointer, ...location(source), shiftKey });
  fireEvent.pointerMove(board, { ...pointer, ...location(target), shiftKey });
  fireEvent.pointerUp(board, { ...pointer, ...location(target), shiftKey });
  fireEvent.click(board, { detail: 1 });
}
beforeEach(() => {
  localStorage.clear();
  Element.prototype.setPointerCapture = () => {};
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("port gestures in the editor", () => {
  it("Shift-sweeps ports without moving parts, previews the batch, and undoes it atomically", () => {
    const board = mount();
    const nodes = stored().nodes;
    drag(board, output(0), output(3), true);
    expect(selected()).toHaveLength(4);
    expect(stored().nodes).toEqual(nodes);
    expect(stored().wires).toEqual([]);
    fireEvent.pointerDown(output(2), { ...pointer, ...location(output(2)) });
    fireEvent.pointerMove(board, { ...pointer, ...location(input(2)) });
    expect(board.querySelector('[data-port-preview="4"]')).toBeTruthy();
    expect(board.querySelectorAll('[data-wire-target="true"][data-input]')).toHaveLength(4);
    fireEvent.pointerUp(board, { ...pointer, ...location(input(2)) });
    expect(stored().wires.map((wire) => [wire.output, wire.input])).toEqual([
      [0, 2],
      [1, 3],
      [2, 4],
      [3, 5],
    ]);
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(stored().wires).toEqual([]);
    fireEvent.click(screen.getByRole("button", { name: "Redo" }));
    expect(stored().wires).toHaveLength(4);
  });
  it("Shift-click toggles sparse ports, while a normal unselected port still wires singly", () => {
    const board = mount();
    for (const bit of [3, 0, 1, 1]) fireEvent.click(output(bit), { shiftKey: true });
    expect(selected()).toHaveLength(2);
    drag(board, output(3), input(6));
    expect(stored().wires.map((wire) => [wire.output, wire.input])).toEqual([
      [0, 6],
      [3, 7],
    ]);
    drag(board, output(4), input(4));
    expect(stored().wires).toHaveLength(3);
  });
  it("does not overwrite any input or commit a partial batch", () => {
    const circuit = fixture();
    circuit.wires = [{ id: "existing", from: "clock", to: "display", input: 1 }];
    const board = mount(circuit);
    drag(board, output(0), output(2), true);
    drag(board, output(0), input(0));
    expect(stored().wires).toEqual(circuit.wires);
    expect(selected()).toHaveLength(3);
    expect(screen.getByText(/An input is already wired/)).toBeTruthy();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(selected()).toHaveLength(0);
  });
  it("selects inputs and fans a clock signal out in one batch", () => {
    const board = mount();
    drag(board, input(1), input(3), true);
    const clock = screen.getByRole("button", { name: "Wire from CLOCK Output" });
    drag(board, input(2), clock);
    expect(stored().wires.map((wire) => [wire.from, wire.output, wire.input])).toEqual([
      ["clock", 0, 1],
      ["clock", 0, 2],
      ["clock", 0, 3],
    ]);
  });
  it("keeps bit mapping stable for rotated horizontal banks", () => {
    const circuit = fixture();
    circuit.nodes[0].outputSide = "bottom";
    circuit.nodes[1].inputSide = "top";
    const board = mount(circuit);
    drag(board, output(3), output(0), true);
    drag(board, output(3), input(1));
    expect(stored().wires.map((wire) => [wire.output, wire.input])).toEqual([
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
    ]);
  });
  it("wires selected boundary ports inside an unfolded circuit and preserves history", () => {
    const inner: Circuit = {
      name: "Pair",
      nodes: [
        { id: "a", type: "switch", label: "A0", x: 0, y: 0 },
        { id: "b", type: "switch", label: "A1", x: 0, y: 100 },
        { id: "x", type: "lamp", label: "OUT0", x: 300, y: 0 },
        { id: "y", type: "lamp", label: "OUT1", x: 300, y: 100 },
      ],
      wires: [],
    };
    mount({
      name: "Inline",
      nodes: [{ id: "box", type: "module", label: "BOX", module: inner, x: 20, y: 20 }],
      wires: [],
    });
    fireEvent.click(screen.getByRole("button", { name: "Unfold BOX in place" }));
    const expanded = screen.getByLabelText("Pair expanded circuit");
    fireEvent.click(within(expanded).getByRole("button", { name: "Wire from input A1" }), {
      shiftKey: true,
    });
    fireEvent.click(within(expanded).getByRole("button", { name: "Wire from input A0" }), {
      shiftKey: true,
    });
    fireEvent.click(within(expanded).getByRole("button", { name: "Wire to output OUT0" }));
    expect(stored().nodes[0].module!.wires.map((wire) => [wire.from, wire.to])).toEqual([
      ["a", "x"],
      ["b", "y"],
    ]);
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(stored().nodes[0].module!.wires).toEqual([]);
  });
});

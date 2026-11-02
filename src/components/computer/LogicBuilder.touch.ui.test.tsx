// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Circuit } from "../../lib/computer/logic";
import { LogicBuilder } from "./LogicBuilder";

const STORAGE = "ricos-computer-circuits-v1";
const fixture = (): Circuit => ({
  name: "Touch wiring",
  nodes: [
    { id: "a", type: "switch", label: "A", x: 40, y: 40 },
    { id: "gate", type: "nand", label: "GATE", x: 300, y: 40 },
    { id: "out", type: "lamp", label: "OUT", x: 600, y: 40 },
  ],
  wires: [],
});
const stored = (): Circuit => JSON.parse(localStorage.getItem(STORAGE)!).current;
const output = (id: string, index = 0) =>
  document.querySelector(`button[data-node-id="${id}"][data-output="${index}"]`) as HTMLElement;
const input = (id: string, index = 0) =>
  document.querySelector(`button[data-node-id="${id}"][data-input="${index}"]`) as HTMLElement;
const part = (id: string) =>
  document.querySelector(`[role="group"][data-node-id="${id}"]`) as HTMLElement;

function mount() {
  localStorage.setItem(STORAGE, JSON.stringify({ current: fixture(), saved: {} }));
  render(<LogicBuilder />);
  const board = screen.getByRole("application", { name: "Circuit canvas" }) as HTMLDivElement;
  const width = parseFloat(board.style.width);
  const height = parseFloat(board.style.height);
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
  const owner = port.closest('[role="group"]') as HTMLElement;
  const row = port.parentElement!;
  const board = screen.getByRole("application", { name: "Circuit canvas" }) as HTMLElement;
  const width = parseFloat(board.style.width);
  const height = parseFloat(board.style.height);
  return {
    clientX:
      width *
      (parseFloat(owner.style.left) / 100 +
        ((parseFloat(owner.style.width) / 100) * parseFloat(row.style.left)) / 100),
    clientY:
      height *
      (parseFloat(owner.style.top) / 100 +
        ((parseFloat(owner.style.height) / 100) * parseFloat(row.style.top)) / 100),
  };
}
const finger = { button: 0, pointerId: 1, pointerType: "touch" };
const off = (at: { clientX: number; clientY: number }, x: number, y: number) => ({
  clientX: at.clientX + x,
  clientY: at.clientY + y,
});
function tap(board: HTMLElement, target: HTMLElement, at = location(target)) {
  fireEvent.pointerDown(target, { ...finger, ...at });
  fireEvent.pointerUp(board, { ...finger, ...at });
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

describe("touch on the canvas", () => {
  it("wires an output to an input with two taps", () => {
    const board = mount();
    tap(board, output("a"));
    expect(screen.getByText("Now tap an input to connect.")).toBeTruthy();
    tap(board, input("gate", 1));
    expect(stored().wires.map(({ from, to, input }) => [from, to, input])).toEqual([
      ["a", "gate", 1],
    ]);
  });

  it("keeps the waiting output through a pan, and a tap on empty canvas lets go of it", async () => {
    const board = mount();
    tap(board, output("a"));
    const empty = { clientX: 450, clientY: 400 };
    fireEvent.pointerDown(board, { ...finger, ...empty });
    fireEvent.pointerMove(board, { ...finger, clientX: 480, clientY: 420 });
    fireEvent.pointerUp(board, { ...finger, clientX: 480, clientY: 420 });
    fireEvent.click(board, { detail: 1 });
    expect(document.querySelector('[class*="pending"]')).toBeTruthy();
    // The click a pan ends with is held back for a moment; a later tap acts.
    await new Promise((resolve) => setTimeout(resolve, 400));
    fireEvent.pointerDown(board, { ...finger, ...empty });
    fireEvent.pointerUp(board, { ...finger, ...empty });
    fireEvent.click(board, { detail: 1 });
    expect(document.querySelector('[class*="pending"]')).toBeNull();
  });

  it("takes the nearest port when a tap lands beside it, and prefers an input while an output waits", () => {
    const board = mount();
    tap(board, board, off(location(output("a")), 9, -6));
    expect(screen.getByText("Now tap an input to connect.")).toBeTruthy();
    const beside = off(location(input("gate", 0)), -10, -4);
    tap(board, part("gate"), beside);
    expect(stored().wires.map(({ to, input }) => [to, input])).toEqual([["gate", 0]]);
  });

  it("does not turn a wobbling tap into a cancelled drag", () => {
    const board = mount();
    const at = location(output("a"));
    fireEvent.pointerDown(output("a"), { ...finger, ...at });
    fireEvent.pointerMove(board, { ...finger, ...off(at, 6, 5) });
    fireEvent.pointerUp(board, { ...finger, ...off(at, 6, 5) });
    expect(screen.getByText("Now tap an input to connect.")).toBeTruthy();
  });

  it("drags a wire from an output to an input", () => {
    const board = mount();
    const from = location(output("gate"));
    const to = location(input("out"));
    fireEvent.pointerDown(output("gate"), { ...finger, ...from });
    fireEvent.pointerMove(board, { ...finger, ...to });
    fireEvent.pointerUp(board, { ...finger, ...to });
    expect(stored().wires.map(({ from, to }) => [from, to])).toEqual([["gate", "out"]]);
  });

  it("drops a wire when a second finger joins, and goes on to pinch", () => {
    const board = mount();
    const from = location(output("a"));
    fireEvent.pointerDown(output("a"), { ...finger, ...from });
    fireEvent.pointerDown(board, { ...finger, pointerId: 2, clientX: 450, clientY: 300 });
    fireEvent.pointerUp(board, { ...finger, ...from });
    fireEvent.pointerUp(board, { ...finger, pointerId: 2, clientX: 450, clientY: 300 });
    expect(stored().wires).toEqual([]);
    expect(screen.queryByText("Now tap an input to connect.")).toBeNull();
  });

  it("moves a part by its body, and a small wobble leaves it in place", () => {
    const board = mount();
    const body = { clientX: 366, clientY: 98 };
    const gate = () => stored().nodes.find((node) => node.id === "gate")!;
    fireEvent.pointerDown(part("gate"), { ...finger, ...body });
    fireEvent.pointerMove(board, { ...finger, clientX: 370, clientY: 101 });
    fireEvent.pointerUp(board, { ...finger, clientX: 370, clientY: 101 });
    expect([gate().x, gate().y]).toEqual([300, 40]);
    fireEvent.pointerDown(part("gate"), { ...finger, ...body });
    fireEvent.pointerMove(board, { ...finger, clientX: 416, clientY: 138 });
    fireEvent.pointerUp(board, { ...finger, clientX: 416, clientY: 138 });
    expect([gate().x, gate().y]).toEqual([350, 80]);
  });

  it("selects a short wire when a tap lands on it, even within reach of its ports", () => {
    const board = mount();
    const from = location(output("a"));
    const to = location(input("gate", 0));
    fireEvent.pointerDown(output("a"), { ...finger, ...from });
    fireEvent.pointerUp(board, { ...finger, ...to });
    expect(stored().wires).toHaveLength(1);
    const wire = screen.getByRole("button", { name: /^Select wire from A/ });
    tap(board, wire, { clientX: from.clientX + 15, clientY: from.clientY });
    expect(screen.getByText(/^Wire selected\./)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(stored().wires).toEqual([]);
  });

  it("deletes a tapped part with the Delete button, which only exists with a selection", () => {
    const board = mount();
    expect(screen.queryByRole("button", { name: "Delete" })).toBeNull();
    const body = { clientX: 366, clientY: 98 };
    fireEvent.pointerDown(part("gate"), { ...finger, ...body });
    fireEvent.pointerUp(board, { ...finger, ...body });
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(stored().nodes.map((node) => node.id)).toEqual(["a", "out"]);
    expect(screen.queryByRole("button", { name: "Delete" })).toBeNull();
  });
});

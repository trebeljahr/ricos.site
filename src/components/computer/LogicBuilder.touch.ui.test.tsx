// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
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
  vi.spyOn(board, "getBoundingClientRect").mockImplementation(() => {
    const width = parseFloat(board.style.width);
    const height = parseFloat(board.style.height);
    return {
      left: 0,
      top: 0,
      right: width,
      bottom: height,
      width,
      height,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    };
  });
  return board;
}
/** A phone's canvas: jsdom lays nothing out, so it reports no size of its own. */
function narrowCanvas() {
  vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(351);
  vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(374);
  Element.prototype.scrollIntoView = () => {};
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
const hold = () => act(() => new Promise((resolve) => setTimeout(resolve, 550)));
const rotate = () => screen.queryByRole("menuitem", { name: /Rotate left/ });
const body = { clientX: 366, clientY: 98 };
const gate = () => stored().nodes.find((node) => node.id === "gate")!;

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
    expect(screen.getByText("A Output: now tap an input.")).toBeTruthy();
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
    expect(screen.getByText("A Output: now tap an input.")).toBeTruthy();
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
    expect(screen.getByText("A Output: now tap an input.")).toBeTruthy();
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
    expect(screen.queryByText("A Output: now tap an input.")).toBeNull();
  });

  it("moves a part by its body, and a small wobble leaves it in place", () => {
    const board = mount();
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

  it("zooms in when a tap lands on dots too close to tell apart, and keeps the waiting output", () => {
    const board = mount();
    tap(board, output("a"));
    fireEvent.click(screen.getByRole("button", { name: "Zoom out" }));
    fireEvent.click(screen.getByRole("button", { name: "Zoom out" }));
    fireEvent.click(screen.getByRole("button", { name: "Zoom out" }));
    fireEvent.click(screen.getByRole("button", { name: "Zoom out" }));
    expect(screen.getByText("41%")).toBeTruthy();
    const between = off(location(input("gate", 0)), 0, 6);
    fireEvent.pointerDown(part("gate"), { ...finger, ...between });
    fireEvent.pointerUp(board, { ...finger, ...between });
    expect(screen.getByText("50%")).toBeTruthy();
    expect(stored().wires).toEqual([]);
    expect(document.querySelector('[class*="pending"]')).toBeTruthy();
  });

  it("adds one part for an accidental double tap on a narrow canvas, and says so", () => {
    narrowCanvas();
    mount();
    const add = screen.getByTitle("Drag NAND onto canvas or click to add");
    fireEvent.click(add);
    fireEvent.click(add);
    expect(stored().nodes).toHaveLength(4);
    expect(screen.getByText("NAND added. Tap one of its dots to wire it.")).toBeTruthy();
  });

  it("opens a board too big for a phone at a tappable zoom, while Fit still shows all of it", () => {
    narrowCanvas();
    const nodes = Array.from({ length: 8 }, (_, row) => ({
      id: `a${row}`,
      type: "switch" as const,
      label: `A${row}`,
      x: 40,
      y: 40 + row * 150,
    }));
    localStorage.setItem(
      STORAGE,
      JSON.stringify({ current: { name: "Tall", nodes, wires: [] }, saved: {} }),
    );
    render(<LogicBuilder />);
    const zoom = () =>
      parseInt(
        screen.getByRole("toolbar", { name: "Canvas view controls" }).querySelector("span")!
          .textContent!,
        10,
      );
    fireEvent.click(screen.getByRole("button", { name: "Arrange by signal flow" }));
    expect(zoom()).toBeGreaterThanOrEqual(50);
    expect(screen.getByText(/Drag empty canvas to see the rest\./)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Fit" }));
    expect(zoom()).toBeLessThan(50);
  });

  it("deletes a tapped part with the Delete button, which only exists with a selection", () => {
    const board = mount();
    expect(screen.queryByRole("button", { name: "Delete" })).toBeNull();
    fireEvent.pointerDown(part("gate"), { ...finger, ...body });
    fireEvent.pointerUp(board, { ...finger, ...body });
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(stored().nodes.map((node) => node.id)).toEqual(["a", "out"]);
    expect(screen.queryByRole("button", { name: "Delete" })).toBeNull();
  });

  it("opens a part's menu for a finger held still, and lifting it changes nothing else", async () => {
    const board = mount();
    fireEvent.pointerDown(part("gate"), { ...finger, ...body });
    await hold();
    expect(rotate()).toBeTruthy();
    fireEvent.pointerUp(board, { ...finger, ...body });
    // The click some browsers send at the lift lands on the menu, which now lies under the finger.
    fireEvent.click(rotate()!);
    expect(rotate()).toBeTruthy();
    expect(gate().inputSide).toBeUndefined();
    expect([gate().x, gate().y]).toEqual([300, 40]);
    await hold();
    fireEvent.click(rotate()!);
    expect(rotate()).toBeNull();
    expect(gate().inputSide).toBeDefined();
  });

  it("offers to carry a wire on along its series, as one undoable step", () => {
    localStorage.setItem(
      STORAGE,
      JSON.stringify({
        current: {
          name: "Series",
          nodes: [
            ...[0, 1, 2].map((bit) => ({
              id: `a${bit}`,
              type: "switch",
              label: `A${bit}`,
              x: 40,
              y: 40 + bit * 150,
            })),
            ...[0, 1, 2].map((bit) => ({
              id: `q${bit}`,
              type: "lamp",
              label: `Q${bit}`,
              x: 500,
              y: 40 + bit * 150,
            })),
          ],
          wires: [],
        },
        saved: {},
      }),
    );
    render(<LogicBuilder />);
    const board = screen.getByRole("application", { name: "Circuit canvas" }) as HTMLDivElement;
    tap(board, output("a0"));
    tap(board, input("q0"));
    const wires = () => stored().wires.map(({ from, to }) => [from, to]);
    expect(wires()).toEqual([["a0", "q0"]]);
    fireEvent.click(screen.getByRole("button", { name: "Also wire 2 more (Q1–Q2)" }));
    expect(wires()).toEqual([
      ["a0", "q0"],
      ["a1", "q1"],
      ["a2", "q2"],
    ]);
    expect(screen.getByText("Connected 2 more wires. Undo removes them.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /^Also wire/ })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(wires()).toEqual([["a0", "q0"]]);
  });

  it("takes the offer away when the reader moves on, or there is nothing to offer", () => {
    const board = mount();
    tap(board, output("a"));
    tap(board, input("gate", 0));
    expect(screen.getByText("Wire connected.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /^Also wire/ })).toBeNull();
    cleanup();
    localStorage.setItem(
      STORAGE,
      JSON.stringify({
        current: {
          name: "Series",
          nodes: [
            ...[0, 1].map((bit) => ({
              id: `a${bit}`,
              type: "switch",
              label: `A${bit}`,
              x: 40,
              y: 40 + bit * 150,
            })),
            ...[0, 1].map((bit) => ({
              id: `q${bit}`,
              type: "lamp",
              label: `Q${bit}`,
              x: 500,
              y: 40 + bit * 150,
            })),
          ],
          wires: [],
        },
        saved: {},
      }),
    );
    render(<LogicBuilder />);
    const next = screen.getByRole("application", { name: "Circuit canvas" }) as HTMLDivElement;
    tap(next, output("a0"));
    tap(next, input("q0"));
    expect(screen.getByRole("button", { name: "Also wire 1 more (Q1)" })).toBeTruthy();
    tap(next, output("a1"));
    expect(screen.queryByRole("button", { name: /^Also wire/ })).toBeNull();
  });

  it("still lets go when the lift lands on the menu, as it does in WebKit", async () => {
    const board = mount();
    await hold();
    fireEvent.pointerDown(part("gate"), { ...finger, ...body });
    await hold();
    fireEvent.pointerUp(rotate()!, { ...finger, ...body });
    await hold();
    tap(board, output("a"));
    expect(rotate()).toBeNull();
    expect(screen.getByText("A Output: now tap an input.")).toBeTruthy();
  });

  it("recolours a wire from its long-press menu", async () => {
    const board = mount();
    const from = location(output("a"));
    fireEvent.pointerDown(output("a"), { ...finger, ...from });
    fireEvent.pointerUp(board, { ...finger, ...location(input("out")) });
    const wire = screen.getByRole("button", { name: /^Select wire from A/ });
    const middle = { clientX: from.clientX + 120, clientY: from.clientY };
    fireEvent.pointerDown(wire, { ...finger, ...middle });
    await hold();
    fireEvent.pointerUp(board, { ...finger, ...middle });
    expect(document.querySelector('[class*="pending"]')).toBeNull();
    await hold();
    fireEvent.click(screen.getByRole("button", { name: "Color wire coral" }));
    expect(stored().wires.map((item) => item.color)).toEqual(["coral"]);
  });

  it("opens the board's menu for a long press on empty canvas", async () => {
    const board = mount();
    const empty = { clientX: 450, clientY: 400 };
    fireEvent.pointerDown(board, { ...finger, ...empty });
    await hold();
    fireEvent.pointerUp(board, { ...finger, ...empty });
    expect(screen.getByRole("menuitem", { name: /Select all parts/ })).toBeTruthy();
  });

  it("opens no menu once the finger has moved away, or a second finger has joined", async () => {
    const board = mount();
    fireEvent.pointerDown(part("gate"), { ...finger, ...body });
    fireEvent.pointerMove(board, { ...finger, clientX: body.clientX + 30, clientY: body.clientY });
    await hold();
    expect(rotate()).toBeNull();
    fireEvent.pointerUp(board, { ...finger, clientX: body.clientX + 30, clientY: body.clientY });
    fireEvent.pointerDown(part("gate"), { ...finger, ...body });
    fireEvent.pointerDown(board, { ...finger, pointerId: 2, clientX: 450, clientY: 300 });
    await hold();
    expect(rotate()).toBeNull();
  });

  it("keeps a dot held long as a slow tap, not a menu", async () => {
    const board = mount();
    // The first fit resizes the canvas on the next frame, which would move the dot.
    await hold();
    const at = location(output("a"));
    fireEvent.pointerDown(output("a"), { ...finger, ...at });
    await hold();
    expect(rotate()).toBeNull();
    fireEvent.pointerUp(board, { ...finger, ...at });
    expect(screen.getByText("A Output: now tap an input.")).toBeTruthy();
  });

  it("closes the menu and goes on dragging when the held finger moves", async () => {
    const board = mount();
    fireEvent.pointerDown(part("gate"), { ...finger, ...body });
    await hold();
    expect(rotate()).toBeTruthy();
    fireEvent.pointerMove(board, { ...finger, clientX: 416, clientY: 138 });
    expect(rotate()).toBeNull();
    fireEvent.pointerUp(board, { ...finger, clientX: 416, clientY: 138 });
    expect([gate().x, gate().y]).toEqual([350, 80]);
  });

  it("opens the same menu from More, for a reader who has not found the long press", () => {
    const board = mount();
    fireEvent.pointerDown(part("gate"), { ...finger, ...body });
    fireEvent.pointerUp(board, { ...finger, ...body });
    expect(rotate()).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "More" }));
    fireEvent.click(rotate()!);
    expect(gate().inputSide).toBeDefined();
  });
});

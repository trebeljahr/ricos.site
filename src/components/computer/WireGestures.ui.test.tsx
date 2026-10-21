// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { type Circuit, initialSnapshot, step } from "../../lib/computer/logic";
import { pathPoints } from "../../lib/computer/wireGeometry";
import { LogicBuilder } from "./LogicBuilder";

const STORAGE = "ricos-computer-circuits-v1";
const fixture = (): Circuit => ({
  name: "Fan out",
  nodes: [
    { id: "a", type: "switch", label: "A", x: 40, y: 40, value: true },
    { id: "x", type: "lamp", label: "X", x: 450, y: 40 },
    { id: "y", type: "lamp", label: "Y", x: 450, y: 260 },
  ],
  wires: [
    {
      id: "ax",
      from: "a",
      to: "x",
      input: 0,
      points: [
        { x: 172, y: 103 },
        { x: 450, y: 103 },
      ],
    },
    {
      id: "ay",
      from: "a",
      to: "y",
      input: 0,
      points: [
        { x: 172, y: 103 },
        { x: 220, y: 103 },
        { x: 220, y: 323 },
        { x: 450, y: 323 },
      ],
    },
  ],
});
const stored = (): Circuit => JSON.parse(localStorage.getItem(STORAGE)!).current;
const pointer = { button: 0, pointerId: 1, pointerType: "mouse" };
function mount(circuit = fixture()) {
  localStorage.setItem(STORAGE, JSON.stringify({ current: circuit, saved: {} }));
  render(<LogicBuilder />);
  const board = screen.getByRole("application", { name: "Circuit canvas" });
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
function point(board: HTMLElement, x: number, y: number) {
  const [left, top, width, height] = board
    .querySelector('svg[aria-label="Circuit wires"]')!
    .getAttribute("viewBox")!
    .split(" ")
    .map(Number);
  return {
    clientX: ((x - left) * parseFloat(board.style.width)) / width,
    clientY: ((y - top) * parseFloat(board.style.height)) / height,
  };
}
beforeEach(() => {
  localStorage.clear();
  Element.prototype.setPointerCapture = () => {};
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

it.each([
  "Delete",
  "Backspace",
])("disconnects a pointer-selected wire with %s and restores it with Undo", (key) => {
  const board = mount();
  const before = stored();
  const wire = within(board).getByRole("button", {
    name: "Select wire from A Output to X Input 1",
  });
  // Pointer capture sends pointerup/click to the board rather than the path.
  fireEvent.pointerDown(wire, { ...pointer, ...point(board, 360, 103) });
  fireEvent.pointerUp(board, { ...pointer, ...point(board, 360, 103) });
  expect(wire.getAttribute("aria-pressed")).toBe("true");
  expect(document.activeElement).toBe(wire);
  fireEvent.keyDown(wire, { key });
  expect(stored().wires.map((item) => item.id)).toEqual(["ay"]);
  expect(stored().nodes).toEqual(before.nodes);
  fireEvent.click(screen.getByRole("button", { name: "Undo" }));
  expect(stored().wires).toEqual(fixture().wires);
});

it("leaves a selected wire alone while editing text, including contenteditable", () => {
  const board = mount();
  const wire = within(board).getByRole("button", {
    name: "Select wire from A Output to X Input 1",
  });
  fireEvent.click(wire);
  fireEvent.keyDown(screen.getByRole("textbox", { name: "Circuit name" }), { key: "Delete" });
  const editable = document.createElement("div");
  editable.setAttribute("contenteditable", "");
  board.append(editable);
  fireEvent.keyDown(editable, { key: "Backspace" });
  expect(stored().wires).toEqual(fixture().wires);
});

it("previews a valid wire join, commits small knobs only on release, and undoes the whole join", () => {
  const board = mount();
  const before = stored();
  const wire = within(board).getByRole("button", {
    name: "Select wire from A Output to X Input 1",
  });
  fireEvent.pointerDown(wire, { ...pointer, ...point(board, 360, 103) });
  fireEvent.pointerMove(board, { ...pointer, ...point(board, 360, 323) });
  expect(board.querySelector('[data-wire-join-target="valid"]')).toBeTruthy();
  expect(screen.getByText("Release to connect")).toBeTruthy();
  expect(stored()).toEqual(before);
  fireEvent.pointerUp(board, { ...pointer, ...point(board, 360, 323) });
  const joined = stored();
  expect(joined.nodes.filter((node) => node.splice)).toHaveLength(2);
  const state = step(joined, initialSnapshot(), false);
  expect(state.values.x).toBe(true);
  expect(state.values.y).toBe(true);
  expect(board.querySelector("[data-wire-join-target]")).toBeNull();
  for (const knob of board.querySelectorAll<HTMLElement>('[role="group"][data-node-id]')) {
    if (joined.nodes.find((node) => node.id === knob.dataset.nodeId)?.splice)
      expect(knob.className).toContain("wireJoin");
  }
  fireEvent.click(screen.getByRole("button", { name: "Undo" }));
  expect(stored()).toEqual(before);
  fireEvent.click(screen.getByRole("button", { name: "Redo" }));
  expect(stored()).toEqual(joined);
});

it("shows an invalid drop instead of joining independent one-bit drivers", () => {
  const circuit = fixture();
  circuit.nodes.push({ id: "b", type: "switch", x: 40, y: 260 });
  circuit.wires[1] = {
    ...circuit.wires[1],
    from: "b",
    points: [
      { x: 172, y: 323 },
      { x: 450, y: 323 },
    ],
  };
  const board = mount(circuit);
  const before = stored();
  const wire = within(board).getByRole("button", {
    name: "Select wire from A Output to X Input 1",
  });
  fireEvent.pointerDown(wire, { ...pointer, ...point(board, 360, 103) });
  fireEvent.pointerMove(board, { ...pointer, ...point(board, 360, 323) });
  expect(board.querySelector('[data-wire-join-target="invalid"]')).toBeTruthy();
  const feedback = screen.getByRole("status");
  expect(feedback.textContent).toMatch(/Cannot join separate one-bit drivers/);
  expect(feedback.closest("svg")).toBeNull();
  expect(board.contains(feedback)).toBe(false);
  fireEvent.pointerUp(board, { ...pointer, ...point(board, 360, 323) });
  expect(screen.queryByRole("status")).toBeNull();
  expect(stored()).toEqual(before);
});

it("leaves topology unchanged when a wire drag is released on empty space", () => {
  const board = mount();
  const before = stored();
  const wire = within(board).getByRole("button", {
    name: "Select wire from A Output to X Input 1",
  });
  fireEvent.pointerDown(wire, { ...pointer, ...point(board, 360, 103) });
  fireEvent.pointerMove(board, { ...pointer, ...point(board, 800, 400) });
  expect(board.querySelector("[data-wire-join-target]")).toBeNull();
  fireEvent.pointerUp(board, { ...pointer, ...point(board, 800, 400) });
  expect(stored()).toEqual(before);
});

it("previews a reverse input-to-wire branch consistently with its committed connection", () => {
  const circuit = fixture();
  circuit.nodes.push({ id: "z", type: "lamp", label: "Z", x: 650, y: 260 });
  const board = mount(circuit);
  fireEvent.pointerDown(screen.getByRole("button", { name: "Connect to Z Input 1" }), {
    ...pointer,
    ...point(board, 650, 323),
  });
  fireEvent.pointerMove(board, { ...pointer, ...point(board, 360, 103) });
  expect(board.querySelector('[data-wire-join-target="valid"]')).toBeTruthy();
  fireEvent.pointerUp(board, { ...pointer, ...point(board, 360, 103) });
  expect(stored().nodes.filter((node) => node.splice)).toHaveLength(1);
  expect(step(stored(), initialSnapshot(), false).values.z).toBe(true);
});

function mountInline() {
  mount({
    name: "Inline",
    nodes: [{ id: "box", type: "module", label: "BOX", module: fixture(), x: 20, y: 20 }],
    wires: [],
  });
  fireEvent.click(screen.getByRole("button", { name: "Unfold BOX in place" }));
  const expanded = screen.getByLabelText("Fan out expanded circuit");
  const diagram = expanded.querySelector<HTMLElement>("[data-inline-diagram]")!;
  const width = parseFloat(diagram.style.width),
    height = parseFloat(diagram.style.height);
  vi.spyOn(diagram, "getBoundingClientRect").mockReturnValue({
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
  return {
    expanded,
    diagram,
    wires: within(expanded).getAllByRole("button", { name: /^Select internal wire/ }),
  };
}
// Pick the last long route segment, away from boundary ports and the shared feed.
function wirePoint(wire: HTMLElement) {
  const points = pathPoints(wire.getAttribute("d")!)[0];
  for (let index = points.length - 1; index > 0; index--) {
    const a = points[index - 1],
      b = points[index];
    if (Math.hypot(a.x - b.x, a.y - b.y) > 60)
      return { clientX: (a.x + b.x) / 2, clientY: (a.y + b.y) / 2 };
  }
  throw new Error("Expected a long wire segment");
}

it.each([
  "Delete",
  "Backspace",
])("disconnects an internal selected wire with %s without deleting its module", (key) => {
  const { diagram, wires } = mountInline();
  fireEvent.pointerDown(wires[0], { ...pointer, ...wirePoint(wires[0]) });
  fireEvent.pointerUp(diagram, { ...pointer, ...wirePoint(wires[0]) });
  fireEvent.keyDown(document.activeElement!, { key });
  expect(stored().nodes).toHaveLength(1);
  expect(stored().nodes[0].module!.wires.map((wire) => wire.id)).toEqual(["ay"]);
  fireEvent.click(screen.getByRole("button", { name: "Undo" }));
  expect(stored().nodes[0].module!.wires).toEqual(fixture().wires);
});

it("previews and joins internal wires using the same small splice topology and history", () => {
  let update: FrameRequestCallback | undefined;
  vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
    update = callback;
    return 1;
  });
  const { diagram, wires } = mountInline();
  const start = wirePoint(wires[0]),
    target = wirePoint(wires[1]);
  fireEvent.pointerDown(wires[0], { ...pointer, ...start });
  fireEvent.pointerMove(diagram, { ...pointer, ...target });
  act(() => update?.(0));
  expect(diagram.querySelector('[data-wire-join-target="valid"]')).toBeTruthy();
  const feedback = screen.getByRole("status");
  expect(feedback.textContent).toBe("Release to connect");
  expect(diagram.contains(feedback)).toBe(false);
  expect(stored().nodes[0].module!.nodes.filter((node) => node.splice)).toHaveLength(0);
  fireEvent.pointerUp(diagram, { ...pointer, ...target });
  expect(screen.queryByText("Release to connect")).toBeNull();
  expect(stored().nodes[0].module!.nodes.filter((node) => node.splice)).toHaveLength(2);
  fireEvent.click(screen.getByRole("button", { name: "Undo" }));
  expect(stored().nodes[0].module!.wires).toEqual(fixture().wires);
});

it("hides the standalone junction palette entry while preserving saved junction semantics as a knob", () => {
  const circuit = fixture();
  circuit.nodes.push({ id: "legacy", type: "junction", x: 300, y: 200 });
  mount(circuit);
  expect(
    within(screen.getByLabelText("Gate palette")).queryByRole("button", { name: "JUNCTION" }),
  ).toBeNull();
  const knob = screen.getByRole("group", { name: "JUNCTION — JUNCTION part" });
  expect(knob.className).toContain("wireJoin");
  expect(stored().nodes.find((node) => node.id === "legacy")).toMatchObject(circuit.nodes.at(-1)!);
  expect(stored().nodes.find((node) => node.id === "legacy")?.splice).toBeUndefined();
});

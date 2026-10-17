// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type Circuit, initialSnapshot, step } from "../../lib/computer/logic";
import { enforceStart } from "../../lib/computer/tutorial/kit";
import { pathPoints } from "../../lib/computer/wireGeometry";
import { LogicBuilder } from "./LogicBuilder";

const key = "ricos-computer-circuits-v1";
const base: Circuit = {
  name: "Branches",
  nodes: [
    { id: "source", type: "switch", x: 0, y: 0, value: true },
    { id: "lamp", type: "lamp", x: 400, y: 0 },
    { id: "branch", type: "lamp", x: 400, y: 200 },
  ],
  wires: [{ id: "original", from: "source", to: "lamp", input: 0 }],
};
const current = (): Circuit => JSON.parse(localStorage.getItem(key)!).current;
const transfer = () => {
  let text = "";
  return {
    getData: () => text,
    setData: (_: string, value: string) => {
      text = value;
    },
  };
};
const board = () => screen.getByRole("application", { name: "Circuit canvas" });
beforeEach(() => {
  localStorage.clear();
  localStorage.setItem(key, JSON.stringify({ current: base, saved: {} }));
  vi.stubGlobal(
    "PointerEvent",
    class extends MouseEvent {
      pointerId: number;
      constructor(type: string, options: PointerEventInit = {}) {
        super(type, options);
        this.pointerId = options.pointerId ?? 1;
      }
    },
  );
  Element.prototype.setPointerCapture = vi.fn();
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("circuit clipboard and pointer editing", () => {
  it("pastes independent copies with offsets and atomic undo/redo, preserving text editing", () => {
    render(<LogicBuilder />);
    const data = transfer();
    fireEvent.copy(board(), { clipboardData: data });
    fireEvent.paste(board(), { clipboardData: data });
    const once = current();
    expect(once.nodes).toHaveLength(6);
    expect(once.wires).toHaveLength(2);
    const copied = once.nodes.slice(3);
    expect(new Set(once.nodes.map((node) => node.id)).size).toBe(6);
    expect(board().querySelectorAll('[class*="selected"]')).toHaveLength(3);
    fireEvent.paste(board(), { clipboardData: data });
    const twice = current();
    expect(twice.nodes).toHaveLength(9);
    expect(twice.nodes[6].x).toBe(copied[0].x + 24);
    expect(twice.nodes[6].y).toBe(copied[0].y + 24);
    fireEvent.keyDown(board(), { key: "z", ctrlKey: true });
    expect(current().nodes).toHaveLength(6);
    fireEvent.keyDown(board(), { key: "z", ctrlKey: true, shiftKey: true });
    expect(current().nodes).toHaveLength(9);
    const name = screen.getByRole("textbox", { name: "Circuit name" });
    fireEvent.paste(name, { clipboardData: data });
    expect(current().nodes).toHaveLength(9);
    fireEvent.keyDown(board(), { key: "z", metaKey: true });
    fireEvent.keyDown(board(), { key: "z", metaKey: true });
    expect(current().nodes).toHaveLength(3);
  });
  it("copies selected wires with endpoints, omits boundary wires and supports another builder", () => {
    render(
      <>
        <LogicBuilder storageKey={key} />
        <LogicBuilder storageKey="second-builder" />
      </>,
    );
    const boards = screen.getAllByRole("application", { name: "Circuit canvas" });
    const wire = within(boards[0]).getByRole("button", { name: /^Select wire from/ });
    fireEvent.pointerDown(boards[0]);
    fireEvent.click(wire);
    const data = transfer();
    fireEvent.copy(boards[0], { clipboardData: data });
    expect(JSON.parse(data.getData()).circuit.nodes).toHaveLength(2);
    fireEvent.pointerDown(boards[1]);
    fireEvent.paste(boards[1], { clipboardData: data });
    const second = JSON.parse(localStorage.getItem("second-builder")!).current;
    expect(second.nodes.length).toBeGreaterThan(2);
    expect(current().nodes).toHaveLength(3);
  });
  it("rejects malformed paste and reports clipboard permission errors", async () => {
    render(<LogicBuilder />);
    fireEvent.paste(board(), { clipboardData: { getData: () => "bad JSON" } });
    expect(current().nodes).toHaveLength(3);
    expect(screen.getByText(/Clipboard does not contain/)).toBeTruthy();
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn().mockRejectedValue(new Error("Denied")) },
    });
    fireEvent.contextMenu(board(), { clientX: 10, clientY: 10 });
    await act(async () => fireEvent.click(screen.getByRole("menuitem", { name: "Copy circuit" })));
    expect(screen.getByText(/Could not copy the circuit/)).toBeTruthy();
  });
  it("branches under zoom and pan, preserves signals, and rolls back in one undo", () => {
    render(<LogicBuilder />);
    const canvas = board();
    vi.spyOn(canvas, "getBoundingClientRect").mockReturnValue({
      x: 100,
      y: 200,
      left: 100,
      top: 200,
      width: 2500,
      height: 2250,
      right: 2600,
      bottom: 2450,
      toJSON: () => ({}),
    });
    const wire = within(canvas).getByRole("button", { name: /^Select wire from/ });
    const pointer = (x: number, y: number) => ({
      pointerId: 1,
      button: 0,
      clientX: 100 + (x + 2000) / 2,
      clientY: 200 + (y + 2000) / 2,
    });
    fireEvent.pointerDown(wire, pointer(250, 63));
    fireEvent.pointerMove(canvas, pointer(400, 263));
    fireEvent.pointerUp(canvas, pointer(400, 263));
    const next = current();
    expect(next.nodes.filter((node) => node.splice)).toHaveLength(1);
    expect(next.wires).toHaveLength(3);
    expect(step(next, initialSnapshot(), false).values.branch).toBe(true);
    const hit = within(canvas).getAllByRole("button", { name: /^Select wire from/ });
    for (const path of hit)
      expect(path.getAttribute("d")).toBe(path.nextElementSibling?.getAttribute("d"));
    fireEvent.keyDown(canvas, { key: "z", ctrlKey: true });
    expect(current().wires).toHaveLength(1);
    fireEvent.keyDown(canvas, { key: "z", ctrlKey: true, shiftKey: true });
    expect(current().wires).toHaveLength(3);
    cleanup();
    render(<LogicBuilder />);
    expect(current().nodes.filter((node) => node.splice)).toHaveLength(1);
  });
  it("draws from an input onto a wire, then moves and deletes the join atomically", () => {
    render(<LogicBuilder />);
    const canvas = board();
    vi.spyOn(canvas, "getBoundingClientRect").mockReturnValue({
      left: 0,
      top: 0,
      width: 5000,
      height: 4500,
    } as DOMRect);
    const input = within(
      canvas.querySelector('[role="group"][data-node-id="branch"]') as HTMLElement,
    ).getByRole("button", { name: /^Connect to/ });
    fireEvent.pointerDown(input, { pointerId: 1, button: 0, clientX: 2400, clientY: 2263 });
    fireEvent.pointerMove(canvas, { pointerId: 1, button: 0, clientX: 2250, clientY: 2063 });
    fireEvent.pointerUp(canvas, { pointerId: 1, button: 0, clientX: 2250, clientY: 2063 });
    const join = current().nodes.find((node) => node.splice)!;
    expect(join).toBeTruthy();
    const dot = canvas.querySelector(`[role="group"][data-node-id="${join.id}"]`)!;
    fireEvent.pointerDown(dot, { pointerId: 2, button: 0, clientX: 2250, clientY: 2063 });
    fireEvent.pointerMove(canvas, { pointerId: 2, button: 0, clientX: 2290, clientY: 2083 });
    fireEvent.pointerUp(canvas, { pointerId: 2, button: 0, clientX: 2290, clientY: 2083 });
    expect(current().nodes.find((node) => node.id === join.id)).toMatchObject({
      x: join.x + 40,
      y: join.y + 20,
    });
    expect(step(current(), initialSnapshot(), false).values.branch).toBe(true);
    fireEvent.keyDown(canvas, { key: "Delete" });
    expect(current().wires).toHaveLength(0);
    fireEvent.keyDown(canvas, { key: "z", ctrlKey: true });
    expect(current().wires).toHaveLength(3);
  });
  it.each([
    "source",
    "vertical",
  ])("branches from generated fan-out %s sections at the actual pointer", (section) => {
    const fan: Circuit = {
      ...base,
      nodes: [...base.nodes, { id: "other", type: "lamp", x: 400, y: 400 }],
      wires: [...base.wires, { id: "fan", from: "source", to: "other", input: 0 }],
    };
    localStorage.setItem(key, JSON.stringify({ current: fan, saved: {} }));
    render(<LogicBuilder />);
    const canvas = board();
    vi.spyOn(canvas, "getBoundingClientRect").mockReturnValue({
      left: 0,
      top: 0,
      width: 5000,
      height: 4500,
    } as DOMRect);
    const trunk = within(canvas).getByRole("button", { name: /^Add branch from/ });
    expect(trunk.getAttribute("d")).toBe(trunk.nextElementSibling?.getAttribute("d"));
    const points = pathPoints(trunk.getAttribute("d")!).flat();
    const [a, b] = section === "source" ? points.slice(0, 2) : points.slice(-2);
    fireEvent.pointerDown(trunk, {
      pointerId: 1,
      button: 0,
      clientX: 2000 + (a.x + b.x) / 2,
      clientY: 2000 + (a.y + b.y) / 2,
    });
    fireEvent.pointerMove(canvas, { pointerId: 1, button: 0, clientX: 2400, clientY: 2263 });
    fireEvent.pointerUp(canvas, { pointerId: 1, button: 0, clientX: 2400, clientY: 2263 });
    const next = current();
    expect(next.nodes.filter((node) => node.splice)).toHaveLength(1);
    expect(next.nodes.find((node) => node.splice)).toMatchObject({
      x: (a.x + b.x) / 2 - 5,
      y: (a.y + b.y) / 2 - 5,
    });
    const state = step(next, initialSnapshot(), false);
    expect([state.values.lamp, state.values.other, state.values.branch]).toEqual([
      true,
      true,
      true,
    ]);
  });
  it("keeps canceled wire gestures out of undo history", () => {
    render(<LogicBuilder />);
    const canvas = board();
    vi.spyOn(canvas, "getBoundingClientRect").mockReturnValue({
      left: 0,
      top: 0,
      width: 5000,
      height: 4500,
    } as DOMRect);
    const wire = within(canvas).getByRole("button", { name: /^Select wire from/ });
    fireEvent.pointerDown(wire, { pointerId: 1, button: 0, clientX: 2250, clientY: 2063 });
    fireEvent.pointerUp(canvas, { pointerId: 1, button: 0, clientX: 2700, clientY: 2500 });
    expect(current().nodes).toHaveLength(3);
    expect((screen.getByRole("button", { name: "Undo" }) as HTMLButtonElement).disabled).toBe(true);
  });
  it("rejects splicing a pre-placed locked tutorial wire without creating undo history", () => {
    const onChange = vi.fn();
    render(
      <LogicBuilder
        challenge={{
          circuit: base,
          palette: ["not"],
          enforce: (circuit) =>
            enforceStart(
              circuit,
              base,
              base.nodes.map((node) => node.id),
            ),
          onChange,
        }}
      />,
    );
    const canvas = board();
    vi.spyOn(canvas, "getBoundingClientRect").mockReturnValue({
      left: 0,
      top: 0,
      width: 5000,
      height: 4500,
    } as DOMRect);
    const wire = within(canvas).getByRole("button", { name: /^Select wire from/ });
    fireEvent.pointerDown(wire, { pointerId: 1, button: 0, clientX: 2250, clientY: 2063 });
    fireEvent.pointerMove(canvas, { pointerId: 1, button: 0, clientX: 2400, clientY: 2263 });
    fireEvent.pointerUp(canvas, { pointerId: 1, button: 0, clientX: 2400, clientY: 2263 });
    expect(onChange.mock.lastCall?.[0].nodes).toHaveLength(3);
    expect((screen.getByRole("button", { name: "Undo" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText(/Pre-placed parts and wires are locked/)).toBeTruthy();
  });
  it("pastes in the active unfolded scope and blocks locked tutorial editing", () => {
    const inner: Circuit = {
      name: "Inner",
      nodes: [
        { id: "gate", type: "not", x: 200, y: 0 },
        { id: "out", type: "lamp", x: 400, y: 0 },
      ],
      wires: [{ id: "w", from: "gate", to: "out", input: 0 }],
    };
    localStorage.setItem(
      key,
      JSON.stringify({
        current: {
          name: "Host",
          nodes: [{ id: "box", type: "module", label: "Inner", x: 0, y: 0, module: inner }],
          wires: [],
        },
        saved: {},
      }),
    );
    render(<LogicBuilder />);
    fireEvent.click(screen.getByRole("button", { name: "Unfold Inner in place" }));
    const scope = screen.getByLabelText("Inner expanded circuit");
    fireEvent.focus(scope);
    fireEvent.keyDown(scope, { key: "a", ctrlKey: true });
    const data = transfer();
    fireEvent.copy(scope, { clipboardData: data });
    fireEvent.paste(scope, { clipboardData: data });
    expect(current().nodes).toHaveLength(1);
    expect(current().nodes[0].module?.nodes).toHaveLength(4);
    fireEvent.keyDown(scope, { key: "z", ctrlKey: true });
    expect(current().nodes[0].module?.nodes).toHaveLength(2);
    // Returning to the outer canvas must not keep copying the nested selection.
    fireEvent.pointerDown(board(), { button: 0 });
    const outer = transfer();
    fireEvent.copy(board(), { clipboardData: outer });
    expect(JSON.parse(outer.getData()).circuit.nodes[0].type).toBe("module");
    cleanup();
    render(<LogicBuilder locked={{ circuit: base, clockRef: { current: null } }} />);
    const denied = transfer();
    fireEvent.copy(board(), { clipboardData: denied });
    expect(denied.getData()).toBe("");
    fireEvent.paste(board(), { clipboardData: data });
    expect(board().querySelectorAll("[data-node-id][role=group]")).toHaveLength(3);
  });
});

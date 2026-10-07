// @vitest-environment jsdom
import {
  act,
  cleanup,
  createEvent,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  initialSnapshot,
  moduleInputs,
  moduleOutputs,
  PRESETS,
  step,
  validateCircuit,
} from "../../lib/computer/logic";
import { LogicBuilder } from "./LogicBuilder";

beforeEach(() => {
  localStorage.clear();
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
  HTMLElement.prototype.setPointerCapture = vi.fn();
});
afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("inline circuit unfolding", () => {
  const setupViewport = () => {
    const frames: FrameRequestCallback[] = [];
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      frames.push(callback);
      return frames.length;
    });
    render(<LogicBuilder />);
    act(() => {
      frames.splice(0).forEach((frame) => frame(0));
    });
    const board = screen.getByRole("application", { name: "Circuit canvas" });
    const viewport = board.parentElement!.parentElement!;
    Object.defineProperties(viewport, {
      clientWidth: { configurable: true, value: 900 },
      clientHeight: { configurable: true, value: 520 },
    });
    vi.spyOn(viewport, "getBoundingClientRect").mockReturnValue({
      left: 0,
      top: 0,
      width: 900,
      height: 520,
    } as DOMRect);
    const camera = () => {
      const [left, top, width] = board
        .querySelector("svg[viewBox]")!
        .getAttribute("viewBox")!
        .split(" ")
        .map(Number);
      const scale = Number(board.style.transform.slice(6, -1));
      const zoom = (parseFloat(board.style.width) / width) * scale;
      return {
        zoom,
        left: viewport.scrollLeft + left * zoom,
        top: viewport.scrollTop + top * zoom,
      };
    };
    const expectCamera = (expected: ReturnType<typeof camera>) => {
      const actual = camera();
      expect(actual.zoom).toBeCloseTo(expected.zoom, 8);
      expect(actual.left).toBeCloseTo(expected.left, 6);
      expect(actual.top).toBeCloseTo(expected.top, 6);
    };
    return { board, viewport, camera, expectCamera };
  };

  // Role queries with a name compute the accessible name of every button in
  // the builder, each through jsdom's slow getComputedStyle. Querying the
  // aria-labelled controls by label, and the refold button inside its box,
  // keeps this long walk well under the time limit on a busy machine.
  it("remembers both explored views and restores wire paths through fold, undo, and redo", () => {
    const { board, viewport, camera, expectCamera } = setupViewport();
    fireEvent.click(screen.getByLabelText("Zoom in"));
    viewport.scrollLeft += 210;
    viewport.scrollTop += 85;
    const folded = camera();
    const wirePaths = () =>
      [...board.querySelectorAll(":scope > svg path[d]")].map((wire) => wire.getAttribute("d"));
    const foldedWires = wirePaths();
    const stored = localStorage.getItem("ricos-computer-circuits-v1");
    fireEvent.click(screen.getByLabelText("Unfold SUM in place"));
    expect(camera().zoom).toBeLessThan(folded.zoom);
    const expanded = screen.getByLabelText(/XOR.*expanded circuit/).parentElement!;
    const width = parseFloat(
      board.querySelector("svg[viewBox]")!.getAttribute("viewBox")!.split(" ")[2],
    );
    const height = parseFloat(
      board.querySelector("svg[viewBox]")!.getAttribute("viewBox")!.split(" ")[3],
    );
    const left =
      (parseFloat(expanded.style.left) / 100) * width * camera().zoom - viewport.scrollLeft;
    const top =
      (parseFloat(expanded.style.top) / 100) * height * camera().zoom - viewport.scrollTop;
    expect(left).toBeGreaterThanOrEqual(39.99);
    expect(top).toBeGreaterThanOrEqual(39.99);
    expect(
      left + (parseFloat(expanded.style.width) / 100) * width * camera().zoom,
    ).toBeLessThanOrEqual(860.01);
    expect(
      top + (parseFloat(expanded.style.height) / 100) * height * camera().zoom,
    ).toBeLessThanOrEqual(480.01);
    expect(wirePaths()).not.toEqual(foldedWires);
    fireEvent.click(screen.getByLabelText("Zoom in"));
    viewport.scrollLeft += 125;
    viewport.scrollTop -= 35;
    const explored = camera();
    const expandedWires = wirePaths();
    fireEvent.click(within(expanded).getByRole("button", { name: "Refold box" }));
    expectCamera(folded);
    expect(wirePaths()).toEqual(foldedWires);
    fireEvent.click(screen.getByLabelText("Undo"));
    expectCamera(explored);
    expect(wirePaths()).toEqual(expandedWires);
    fireEvent.click(screen.getByLabelText("Redo"));
    expectCamera(folded);
    fireEvent.click(screen.getByLabelText("Unfold SUM in place"));
    expectCamera(explored);
    expect(localStorage.getItem("ricos-computer-circuits-v1")).toBe(stored);
  });

  it("restores nested exploration level by level, including camera changes after editing", () => {
    const { viewport, camera, expectCamera } = setupViewport();
    fireEvent.click(
      within(screen.getByLabelText("Gate palette")).getByRole("button", { name: "Half adder" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Unfold CIRCUIT in place" }));
    const outer = screen.getByLabelText("Half adder expanded circuit");
    viewport.scrollLeft += 75;
    const overview = camera();
    fireEvent.click(within(outer).getByRole("button", { name: "Unfold SUM in place" }));
    viewport.scrollTop += 90;
    fireEvent.click(screen.getByRole("button", { name: "Zoom in" }));
    const detail = camera();
    // Runtime input changes create a new circuit object without losing view history.
    fireEvent.click(
      within(screen.getByRole("group", { name: "A — SWITCH part" })).getByRole("button", {
        name: "OFF",
      }),
    );
    fireEvent.click(within(outer).getByRole("button", { name: "Refold one level" }));
    expectCamera(overview);
    fireEvent.click(within(outer).getByRole("button", { name: "Unfold SUM in place" }));
    expectCamera(detail);
  });

  it("restores the prior camera after toolbar unfold and refold", () => {
    const { viewport, camera, expectCamera } = setupViewport();
    viewport.scrollLeft += 320;
    viewport.scrollTop += 110;
    const before = camera();
    fireEvent.click(screen.getByText("View", { selector: "summary" }));
    fireEvent.click(screen.getByRole("button", { name: "Unfold one level" }));
    const expanded = camera();
    expect(expanded.zoom).toBeLessThan(before.zoom);
    const viewMenu = screen.getByText("View", { selector: "summary" }).parentElement!;
    fireEvent.click(within(viewMenu).getByRole("button", { name: "Refold one level" }));
    expectCamera(before);
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expectCamera(expanded);
  });

  it("keeps a distant box visible when folding also changes the canvas origin", () => {
    localStorage.setItem(
      "ricos-computer-circuits-v1",
      JSON.stringify({
        current: {
          ...PRESETS["Half adder"],
          nodes: PRESETS["Half adder"].nodes.map((node) =>
            node.type === "xor" ? { ...node, x: 20000, y: 15000 } : node,
          ),
        },
      }),
    );
    const { board, viewport, camera, expectCamera } = setupViewport();
    viewport.scrollLeft += 19800;
    viewport.scrollTop += 14800;
    const before = camera();
    fireEvent.click(screen.getByRole("button", { name: "Unfold SUM in place" }));
    const expanded = screen.getByLabelText(/XOR.*expanded circuit/).parentElement!;
    const [, , width, height] = board
      .querySelector("svg[viewBox]")!
      .getAttribute("viewBox")!
      .split(" ")
      .map(Number);
    const left =
      (parseFloat(expanded.style.left) / 100) * width * camera().zoom - viewport.scrollLeft;
    const top =
      (parseFloat(expanded.style.top) / 100) * height * camera().zoom - viewport.scrollTop;
    expect(left).toBeGreaterThanOrEqual(39.99);
    expect(left).toBeLessThan(900);
    expect(top).toBeGreaterThanOrEqual(39.99);
    expect(top).toBeLessThan(520);
    fireEvent.click(screen.getByRole("button", { name: "Refold box" }));
    expectCamera(before);
  });

  it("keeps the board and records fold and unfold in history", () => {
    render(<LogicBuilder />);
    const board = screen.getByRole("application", { name: "Circuit canvas" });
    fireEvent.click(screen.getByRole("button", { name: "Unfold SUM in place" }));
    expect(screen.getByRole("application", { name: "Circuit canvas" })).toBe(board);
    expect(screen.getByRole("button", { name: "Refold box" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(screen.getByRole("button", { name: "Unfold SUM in place" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Redo" }));
    expect(screen.getByRole("button", { name: "Refold box" })).toBeTruthy();
  });

  it("expands a whole adder box one level at a time", () => {
    render(<LogicBuilder />);
    const parts = screen.getByLabelText("Gate palette");
    fireEvent.click(within(parts).getByRole("button", { name: "8-bit full adder" }));
    const adder = screen.getByRole("group", { name: /8-bit full adder.*part/i });
    fireEvent.click(within(adder).getByRole("button", { name: /Unfold .* in place/i }));
    expect(screen.getByRole("application", { name: "Circuit canvas" })).toBeTruthy();
    const expanded = screen.getByLabelText("8-bit full adder expanded circuit");
    expect(
      within(expanded).getByRole("button", { name: "Unfold FULL ADDER 0 in place" }),
    ).toBeTruthy();
    expect(within(expanded).queryByRole("group", { name: /SWITCH part/i })).toBeNull();
    expect(within(expanded).queryByRole("group", { name: /LAMP part/i })).toBeNull();
    expect(
      within(expanded)
        .getByLabelText("8-bit full adder internal wires")
        .querySelectorAll("[data-inline-wire]").length,
    ).toBeGreaterThan(0);
    fireEvent.click(within(adder).getAllByRole("button", { name: "Unfold one level deeper" })[0]);
    expect(
      within(expanded).getAllByRole("button", { name: "Unfold HALF ADDER 1 in place" }).length,
    ).toBeGreaterThan(0);
    fireEvent.click(within(adder).getAllByRole("button", { name: "Unfold one level deeper" })[0]);
    expect(
      within(expanded).getAllByRole("button", { name: "Unfold SUM XOR in place" }).length,
    ).toBeGreaterThan(0);
    fireEvent.click(within(adder).getAllByRole("button", { name: "Refold one level" })[0]);
    expect(
      within(expanded).queryAllByRole("button", { name: "Unfold SUM XOR in place" }),
    ).toHaveLength(0);
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(
      within(expanded).getAllByRole("button", { name: "Unfold SUM XOR in place" }).length,
    ).toBeGreaterThan(0);
    fireEvent.click(screen.getAllByRole("button", { name: "Refold one level" })[0]);
    expect(
      within(expanded).queryAllByRole("button", { name: "Unfold SUM XOR in place" }),
    ).toHaveLength(0);
  }, 20000);

  it("edits boundary outputs and wires in place with undo and redo", () => {
    render(<LogicBuilder />);
    fireEvent.click(
      within(screen.getByLabelText("Gate palette")).getByRole("button", {
        name: "8-bit full adder",
      }),
    );
    const adder = screen.getByRole("group", { name: /8-bit full adder.*part/i });
    fireEvent.click(within(adder).getByRole("button", { name: /Unfold .* in place/i }));
    let expanded = screen.getByLabelText("8-bit full adder expanded circuit");
    fireEvent.click(expanded);
    fireEvent.click(screen.getByTitle("Drag LAMP onto canvas or click to add"));
    expanded = screen.getByLabelText("Modified 8-bit full adder expanded circuit");
    expect(
      screen.getByRole("button", { name: "Wire from Modified 8-bit full adder OUT 10" }),
    ).toBeTruthy();
    const wiresBefore = within(expanded)
      .getByLabelText("Modified 8-bit full adder internal wires")
      .querySelectorAll("[data-inline-wire]").length;
    fireEvent.click(within(expanded).getByRole("button", { name: "Wire from input A0" }));
    fireEvent.click(within(expanded).getByRole("button", { name: "Wire to output OUT 10" }));
    expect(
      within(expanded)
        .getByLabelText("Modified 8-bit full adder internal wires")
        .querySelectorAll("[data-inline-wire]").length,
    ).toBe(wiresBefore + 1);
    const stored = JSON.parse(localStorage.getItem("ricos-computer-circuits-v1") || "{}");
    const saved = validateCircuit(stored.current);
    const edited = saved?.nodes.find(
      (node) => node.module?.name === "Modified 8-bit full adder",
    )?.module;
    expect(edited).toBeTruthy();
    const input = moduleInputs(edited!)[0].id;
    const output = moduleOutputs(edited!).at(-1)!.id;
    expect(step(edited!, initialSnapshot(), false, {}, { [input]: true }).values[output]).toBe(
      true,
    );
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(
      within(screen.getByLabelText("Modified 8-bit full adder expanded circuit")).getByRole(
        "button",
        { name: "Wire to output OUT 10" },
      ),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(
      screen.queryByRole("button", { name: "Wire from Modified 8-bit full adder OUT 10" }),
    ).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Redo" }));
    expect(
      screen.getByRole("button", { name: "Wire from Modified 8-bit full adder OUT 10" }),
    ).toBeTruthy();
  }, 15000);

  it("adds, renames, and removes a part inside an expanded gate", () => {
    render(<LogicBuilder />);
    fireEvent.click(screen.getByRole("button", { name: "Unfold SUM in place" }));
    let expanded = screen.getByLabelText(/XOR.*expanded circuit/);
    fireEvent.click(expanded);
    fireEvent.click(screen.getByTitle("Drag NAND onto canvas or click to add"));
    expanded = screen.getByLabelText(/Modified XOR.*expanded circuit/);
    let part = within(expanded).getByRole("group", { name: "NAND — NAND part" });
    fireEvent.contextMenu(part);
    fireEvent.click(screen.getByRole("menuitem", { name: "Rename part" }));
    const label = within(part).getByRole("textbox", { name: "Label for NAND" });
    fireEvent.change(label, { target: { value: "CUSTOM NAND" } });
    fireEvent.blur(label);
    part = within(expanded).getByRole("group", { name: "CUSTOM NAND — NAND part" });
    fireEvent.doubleClick(within(part).getByText("CUSTOM NAND"));
    expect(screen.queryByRole("button", { name: /Back/ })).toBeNull();
    fireEvent.keyDown(within(part).getByRole("textbox", { name: "Label for CUSTOM NAND" }), {
      key: "Escape",
    });
    fireEvent.contextMenu(part);
    fireEvent.click(screen.getByRole("menuitem", { name: "Delete part" }));
    expect(within(expanded).queryByRole("group", { name: "CUSTOM NAND — NAND part" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(
      within(screen.getByLabelText(/Modified XOR.*expanded circuit/)).getByRole("group", {
        name: "CUSTOM NAND — NAND part",
      }),
    ).toBeTruthy();
  });

  it("drags from a boundary output back to an input and deletes the new wire with undo", () => {
    render(<LogicBuilder />);
    fireEvent.click(
      within(screen.getByLabelText("Gate palette")).getByRole("button", { name: "D latch" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Unfold CIRCUIT in place" }));
    const expanded = screen.getByLabelText("D latch expanded circuit");
    const diagram = expanded.querySelector<HTMLElement>("[data-inline-diagram]")!;
    vi.spyOn(diagram, "getBoundingClientRect").mockReturnValue({
      left: 100,
      top: 50,
      width: parseFloat(diagram.style.width) / 2,
    } as DOMRect);
    const from = within(expanded).getByRole("button", { name: "Wire to output Q" });
    const to = within(expanded).getByRole("button", { name: "Wire from input ENABLE" });
    const point = (button: HTMLElement) => ({
      clientX: 100 + parseFloat(button.parentElement!.style.left) / 2,
      clientY: 50 + parseFloat(button.parentElement!.style.top) / 2,
    });
    fireEvent.pointerDown(from, { pointerId: 1, ...point(from) });
    fireEvent.pointerMove(diagram, { pointerId: 1, ...point(to) });
    fireEvent.pointerUp(diagram, { pointerId: 1, ...point(to) });
    const edited = screen.getByLabelText("Modified D latch expanded circuit");
    const wire = within(edited).getByRole("button", {
      name: "Select internal wire from ENABLE to Q",
    });
    fireEvent.click(wire);
    fireEvent.keyDown(edited, { key: "Delete" });
    expect(
      within(edited).queryByRole("button", { name: "Select internal wire from ENABLE to Q" }),
    ).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(
      within(edited).getByRole("button", { name: "Select internal wire from ENABLE to Q" }),
    ).toBeTruthy();
  });

  it("keeps only fold controls in the header and unfolds adjacent SVG buttons", () => {
    render(<LogicBuilder />);
    fireEvent.click(
      within(screen.getByLabelText("Gate palette")).getByRole("button", {
        name: "8-bit full adder",
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Unfold CIRCUIT in place" }));
    const expanded = screen.getByLabelText("8-bit full adder expanded circuit");
    expect(within(expanded.firstElementChild as HTMLElement).getAllByRole("button")).toHaveLength(
      2,
    );
    for (const index of [0, 1]) {
      const button = screen.getByRole("button", { name: `Unfold FULL ADDER ${index} in place` });
      fireEvent.pointerDown(button.querySelector("svg")!, { clientX: 10, clientY: 10 });
      fireEvent.click(button.querySelector("svg")!);
    }
    expect(HTMLElement.prototype.setPointerCapture).not.toHaveBeenCalled();
    expect(screen.getAllByLabelText("1-bit full adder expanded circuit")).toHaveLength(2);
    const boxes = [
      ...expanded.querySelectorAll<HTMLElement>(
        ":scope > [data-inline-diagram] > [data-inline-part]",
      ),
    ];
    for (const [index, box] of boxes.entries()) {
      const x = parseFloat(box.style.left),
        y = parseFloat(box.style.top);
      for (const other of boxes.slice(index + 1)) {
        const ox = parseFloat(other.style.left),
          oy = parseFloat(other.style.top);
        expect(
          x >= ox + parseFloat(other.style.width) ||
            ox >= x + parseFloat(box.style.width) ||
            y >= oy + parseFloat(other.style.height) ||
            oy >= y + parseFloat(box.style.height),
        ).toBe(true);
      }
    }
  }, 15000);

  it("previews an inner drag at canvas scale and commits once without renaming the logic", () => {
    render(<LogicBuilder />);
    fireEvent.click(screen.getByRole("button", { name: "Unfold SUM in place" }));
    const expanded = screen.getByLabelText(/XOR.*expanded circuit/);
    const diagram = expanded.querySelector<HTMLElement>("[data-inline-diagram]")!;
    vi.spyOn(diagram, "getBoundingClientRect").mockReturnValue({
      left: 100,
      top: 50,
      width: parseFloat(diagram.style.width) / 2,
    } as DOMRect);
    const part = diagram.querySelector<HTMLElement>("[data-inline-part]")!;
    const x = parseFloat(part.style.left) - Number(diagram.dataset.originX);
    const y = parseFloat(part.style.top) - Number(diagram.dataset.originY);
    const id = part.dataset.inlinePart!.split("/").at(-1);
    const before = localStorage.getItem("ricos-computer-circuits-v1");
    let frame: FrameRequestCallback | undefined;
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      frame = callback;
      return 1;
    });
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    fireEvent.pointerDown(part, { pointerId: 1, clientX: 200, clientY: 200 });
    fireEvent.pointerMove(part, { pointerId: 1, clientX: 250, clientY: 240 });
    act(() => frame!(0));
    expect(part.style.transform).toBe("translate(100px, 80px)");
    expect(localStorage.getItem("ricos-computer-circuits-v1")).toBe(before);
    fireEvent.pointerUp(part, { pointerId: 1, clientX: 250, clientY: 240 });
    const saved = validateCircuit(
      JSON.parse(localStorage.getItem("ricos-computer-circuits-v1")!).current,
    )!;
    const sum = saved.nodes.find((node) => node.label === "SUM")!;
    expect(sum.module?.name).not.toMatch(/Modified/);
    expect(sum.module?.nodes.find((node) => node.id === id)).toMatchObject({
      x: x + 100,
      y: y + 80,
    });
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(screen.getByLabelText(/XOR.*expanded circuit/)).toBeTruthy();
    expect(
      validateCircuit(
        JSON.parse(localStorage.getItem("ricos-computer-circuits-v1")!).current,
      )!.nodes.find((node) => node.label === "SUM")!.type,
    ).toBe("xor");
  });

  it("drops a palette part into the targeted nested box at its scaled local position", () => {
    render(<LogicBuilder />);
    fireEvent.click(
      within(screen.getByLabelText("Gate palette")).getByRole("button", {
        name: "8-bit full adder",
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Unfold CIRCUIT in place" }));
    fireEvent.click(screen.getByRole("button", { name: "Unfold FULL ADDER 0 in place" }));
    const expanded = screen.getByLabelText("1-bit full adder expanded circuit");
    const diagram = expanded.querySelector<HTMLElement>("[data-inline-diagram]")!;
    vi.spyOn(diagram, "getBoundingClientRect").mockReturnValue({
      left: 100,
      top: 50,
      width: parseFloat(diagram.style.width) / 2,
    } as DOMRect);
    const event = createEvent.drop(diagram, {
      dataTransfer: {
        getData: (type: string) => (type === "application/x-logic-gate" ? "nand" : ""),
      },
    });
    Object.defineProperties(event, { clientX: { value: 450 }, clientY: { value: 250 } });
    fireEvent(diagram, event);
    const saved = validateCircuit(
      JSON.parse(localStorage.getItem("ricos-computer-circuits-v1")!).current,
    )!;
    const outer = saved.nodes.find((node) => node.module?.name === "Modified 8-bit full adder")!
      .module!;
    const inner = outer.nodes.find((node) => node.module?.name === "Modified 1-bit full adder")!
      .module!;
    const added = inner.nodes.find((node) => node.type === "nand")!;
    expect(added.x).toBe(700 - Number(diagram.dataset.originX) - 66);
    expect(added.y).toBe(400 - Number(diagram.dataset.originY) - 74);
    expect(outer.nodes.some((node) => node.type === "nand")).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(screen.getByLabelText("1-bit full adder expanded circuit")).toBeTruthy();
  }, 15000);

  it("keeps edits to a deeper box in the component tree", () => {
    render(<LogicBuilder />);
    fireEvent.click(
      within(screen.getByLabelText("Gate palette")).getByRole("button", {
        name: "8-bit full adder",
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Unfold CIRCUIT in place" }));
    fireEvent.click(screen.getByRole("button", { name: "Unfold FULL ADDER 0 in place" }));
    const fullAdder = screen.getByLabelText("1-bit full adder expanded circuit");
    fireEvent.click(fullAdder);
    fireEvent.click(screen.getByTitle("Drag LAMP onto canvas or click to add"));
    expect(screen.getByLabelText("Modified 1-bit full adder expanded circuit")).toBeTruthy();
    expect(screen.getByLabelText("Modified 8-bit full adder expanded circuit")).toBeTruthy();
    const stored = JSON.parse(localStorage.getItem("ricos-computer-circuits-v1") || "{}");
    const saved = validateCircuit(stored.current);
    const outer = saved?.nodes.find(
      (node) => node.module?.name === "Modified 8-bit full adder",
    )?.module;
    const edited = outer?.nodes.find(
      (node) => node.module?.name === "Modified 1-bit full adder",
    )?.module;
    expect(moduleOutputs(edited!)).toHaveLength(3);
  }, 15000);
});

describe("circuit toolbar", () => {
  it("shows clock controls only while the sketch contains a clock", () => {
    render(<LogicBuilder />);
    expect(screen.queryByRole("group", { name: "Simulation" })).toBeNull();
    expect(screen.queryByText("CLK 0")).toBeNull();
    fireEvent.click(screen.getByTitle("Drag CLOCK onto canvas or click to add"));
    expect(screen.getByRole("group", { name: "Simulation" })).toBeTruthy();
    const status = screen.getByLabelText("Clock status");
    expect(within(status).getByText("Cycle 0")).toBeTruthy();
    expect(within(status).getByText("CLK 0")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(screen.queryByRole("group", { name: "Simulation" })).toBeNull();
    expect(screen.queryByLabelText("Clock status")).toBeNull();
  });

  it("renames the sketch from the toolbar", () => {
    render(<LogicBuilder />);
    const name = screen.getByRole("textbox", { name: "Circuit name" }) as HTMLInputElement;
    fireEvent.change(name, { target: { value: "My test circuit" } });
    fireEvent.blur(name);
    expect(name.value).toBe("My test circuit");
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(name.value).toBe("Half adder");
  });
});

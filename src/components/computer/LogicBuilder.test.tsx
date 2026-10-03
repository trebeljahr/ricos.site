// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LogicBuilder } from "./LogicBuilder";

beforeEach(() => {
  localStorage.clear();
  Element.prototype.setPointerCapture = () => {};
});
afterEach(cleanup);

describe("circuit depth", () => {
  it("clears internal wire selection on empty expanded-circuit space", () => {
    render(<LogicBuilder />);
    fireEvent.click(within(screen.getByLabelText("Gate palette")).getByRole("button", { name: "8-bit full adder" }));
    const adder = screen.getByRole("group", { name: /8-bit full adder.*part/i });
    fireEvent.click(within(adder).getByRole("button", { name: /Unfold .* in place/ }));
    const wire = within(adder).getAllByRole("button", { name: /^Select internal wire/ })[0];
    const visibleWire = wire.nextElementSibling!;
    fireEvent.click(wire);
    expect(visibleWire.getAttribute("class")).toContain("wireSelected");
    fireEvent.click(wire.closest("svg")!);
    expect(visibleWire.getAttribute("class")).not.toContain("wireSelected");
  });
  it("clears part and wire selection when clicking empty canvas or viewport space", () => {
    render(<LogicBuilder />);
    const board = screen.getByRole("application", { name: "Circuit canvas" });
    const part = within(board).getAllByRole("group", { name: / part$/ })[0];
    fireEvent.keyDown(part, { key: "Enter" });
    expect(part.className).toContain("selected");
    fireEvent.click(board);
    expect(part.className).not.toContain("selected");
    const wire = within(board).getAllByRole("button", { name: /^Select wire from/ })[0];
    fireEvent.click(wire);
    expect(wire.getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(board);
    expect(wire.getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(wire);
    fireEvent.click(board.parentElement!.parentElement!);
    expect(wire.getAttribute("aria-pressed")).toBe("false");
  });
  it("fits a complex example when its Parts detail icon opens it", () => {
    render(<LogicBuilder />);
    const board = screen.getByRole("application", { name: "Circuit canvas" });
    const viewport = board.parentElement!.parentElement!;
    Object.defineProperties(viewport, {
      clientWidth: { configurable: true, value: 1200 },
      clientHeight: { configurable: true, value: 700 },
    });
    fireEvent.click(screen.getByRole("button", { name: "View 8-bit ALU diagram" }));
    expect((screen.getByRole("textbox", { name: "Circuit name" }) as HTMLInputElement).value).toBe("8-bit ALU");
    const slices = Array.from({ length: 8 }, (_, bit) =>
      screen.getByRole("group", { name: `ALU SLICE ${bit} — 1-bit ALU slice part` }));
    expect(new Set(slices.map((node) => node.style.top)).size).toBe(1);
    for (let bit = 1; bit < slices.length; bit++)
      expect(Number.parseFloat(slices[bit].style.left)).toBeGreaterThan(
        Number.parseFloat(slices[bit - 1].style.left));
    expect(viewport.scrollLeft).toBeGreaterThan(0);
    expect(screen.getByText(/^\d+%$/, { selector: "span" }).textContent).not.toBe("100%");
  });
  it("closes toolbar menus with Escape and outside clicks", () => {
    render(<LogicBuilder />);
    const view = screen.getByText("View", { selector: "summary" });
    fireEvent.click(view);
    expect(view.parentElement?.hasAttribute("open")).toBe(true);
    fireEvent.keyDown(view, { key: "Escape" });
    expect(view.parentElement?.hasAttribute("open")).toBe(false);
    expect(document.activeElement).toBe(view);
    fireEvent.click(view);
    fireEvent.pointerDown(screen.getByRole("textbox", { name: "Circuit name" }));
    expect(view.parentElement?.hasAttribute("open")).toBe(false);
  });
  it("keeps unfold controls together in View", () => {
    render(<LogicBuilder />);
    fireEvent.click(screen.getByText("View", { selector: "summary" }));
    const view = screen.getByRole("group", { name: "Circuit view" });
    for (const name of ["Unfold one level", "Refold one level", "Unfold all"]) {
      expect(within(view).getByRole("button", { name })).toBeTruthy();
    }
    expect(within(screen.getByRole("group", { name: "Learning tools" })).getByText("Learning")).toBeTruthy();
  });
  it("recenters the canvas when panning toward its edge", () => {
    render(<LogicBuilder />);
    const board = screen.getByRole("application", { name: "Circuit canvas" }) as HTMLDivElement;
    const viewport = board.parentElement!.parentElement!;
    Object.defineProperties(viewport, {
      clientWidth: { configurable: true, value: 800 },
      clientHeight: { configurable: true, value: 600 },
      scrollWidth: { configurable: true, value: 5000 },
      scrollHeight: { configurable: true, value: 4500 },
    });
    expect(board.style.width).toBe("5000px");
    viewport.scrollLeft = 0;
    viewport.scrollTop = 2000;
    fireEvent.scroll(viewport);
    expect(board.style.width).toBe("5000px");
    expect(viewport.scrollLeft).toBe(1600);
    const dotPosition = viewport.style.backgroundPosition;
    viewport.scrollLeft += 5;
    fireEvent.scroll(viewport);
    expect(viewport.style.backgroundPosition).not.toBe(dotPosition);
  });
  it("wires an 8-bit source to each full-adder operand in one action", () => {
    render(<LogicBuilder />);
    const parts = screen.getByLabelText("Gate palette");
    fireEvent.click(within(parts).getByRole("button", { name: "8-BIT INPUT" }));
    fireEvent.click(within(parts).getByRole("button", { name: "8-bit full adder" }));
    const adder = screen.getByRole("group", { name: /8-bit full adder.*part/i });
    fireEvent.contextMenu(adder, { clientX: 100, clientY: 100 });
    const source = screen.getByLabelText("8-bit source") as HTMLSelectElement;
    fireEvent.change(screen.getByLabelText("8-bit source"), {
      target: { value: source.options[1].value },
    });
    fireEvent.click(screen.getByRole("button", { name: "Wire bits 0–7 to A0–A7" }));
    expect(screen.getByText("Connected bits 0–7 to 8-bit full adder.")).toBeTruthy();
  });
  it("saves a circuit from the toolbar and offers it as a black box in Parts", () => {
    render(<LogicBuilder />);
    fireEvent.click(screen.getByText("File", { selector: "summary" }));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    const dialog = screen.getByRole("dialog", { name: "Save circuit" });
    fireEvent.change(within(dialog).getByRole("textbox", { name: "Name" }), {
      target: { value: "My logic" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Save circuit" }));
    const parts = screen.getByLabelText("Gate palette");
    fireEvent.click(within(parts).getByRole("button", { name: "My logic" }));
    expect(screen.getByRole("group", { name: "My logic — My logic part" })).toBeTruthy();
    expect(JSON.parse(localStorage.getItem("ricos-computer-circuits-v1") || "{}").saved["My logic"]).toBeTruthy();
  });

  it("places a clicked saved black box in the current viewport", () => {
    const saved = { name: "Visible box", nodes: [{ id: "out", type: "lamp", x: 0, y: 0 }], wires: [] };
    localStorage.setItem("ricos-computer-circuits-v1", JSON.stringify({ saved: { "Visible box": saved } }));
    render(<LogicBuilder />);
    const board = screen.getByRole("application", { name: "Circuit canvas" });
    const viewport = board.parentElement!.parentElement!;
    Object.defineProperties(viewport, {
      clientWidth: { configurable: true, value: 900 },
      clientHeight: { configurable: true, value: 520 },
    });
    viewport.scrollLeft = 5000;
    viewport.scrollTop = 4000;
    fireEvent.click(within(screen.getByLabelText("Gate palette")).getByRole("button", { name: "Visible box" }));
    const added = JSON.parse(localStorage.getItem("ricos-computer-circuits-v1")!).current.nodes.at(-1);
    expect(added.x).toBe(3300);
    expect(added.y).toBe(2201.5);
  });

  it.each(["click", "drop"])("inserts saved circuits without lamp outputs by %s", (method) => {
    const saved = { name: "Loose gates", nodes: [
      { id: "a", type: "switch", x: 10, y: 20 },
      { id: "b", type: "not", x: 200, y: 20 },
    ], wires: [{ id: "wire", from: "a", to: "b", input: 0 }],
    groups: [{ id: "group", label: "Pair", nodeIds: ["a", "b"] }] };
    localStorage.setItem("ricos-computer-circuits-v1", JSON.stringify({ saved: { "Loose gates": saved } }));
    render(<LogicBuilder />);
    const before = JSON.parse(localStorage.getItem("ricos-computer-circuits-v1")!).current;
    const part = within(screen.getByLabelText("Gate palette")).getByRole("button", { name: "Loose gates" });
    if (method === "click") fireEvent.click(part);
    else {
      const board = screen.getByRole("application", { name: "Circuit canvas" });
      vi.spyOn(board, "getBoundingClientRect").mockReturnValue({
        x: 0, y: 0, left: 0, top: 0, right: 5000, bottom: 4500,
        width: 5000, height: 4500, toJSON: () => ({}),
      });
      fireEvent.drop(board, { clientX: 2400, clientY: 2300,
        dataTransfer: { getData: (type: string) => type === "application/x-logic-module" ? "saved:Loose gates" : "" } });
    }
    const current = JSON.parse(localStorage.getItem("ricos-computer-circuits-v1")!).current;
    expect(current.nodes.slice(0, before.nodes.length)).toEqual(before.nodes);
    const added = current.nodes.slice(before.nodes.length);
    expect(added).toHaveLength(2);
    expect(added.map((node: { id: string }) => node.id)).not.toEqual(["a", "b"]);
    expect(current.wires.at(-1)).toMatchObject({ from: added[0].id, to: added[1].id });
    expect(current.groups.at(-1).nodeIds).toEqual(added.map((node: { id: string }) => node.id));
    expect(screen.getByText("Loose gates added. Drag the selected circuit to move it.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(JSON.parse(localStorage.getItem("ricos-computer-circuits-v1")!).current.nodes).toEqual(before.nodes);
  });

  it.each(["board", "viewport"])("drops saved circuits onto the %s", (target) => {
    render(<LogicBuilder />);
    fireEvent.click(screen.getByText("File", { selector: "summary" }));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    const dialog = screen.getByRole("dialog", { name: "Save circuit" });
    fireEvent.change(within(dialog).getByRole("textbox", { name: "Name" }), {
      target: { value: "Dropped logic" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Save circuit" }));
    const data = new Map<string, string>();
    const dataTransfer = {
      setData: (type: string, value: string) => data.set(type, value),
      getData: (type: string) => data.get(type) ?? "",
      effectAllowed: "none",
      dropEffect: "none",
    };
    fireEvent.dragStart(within(screen.getByLabelText("Gate palette")).getByRole("button", { name: "Dropped logic" }), { dataTransfer });
    const board = screen.getByRole("application", { name: "Circuit canvas" });
    vi.spyOn(board, "getBoundingClientRect").mockReturnValue({
      x: 0, y: 0, left: 0, top: 0, right: 5000, bottom: 4500,
      width: 5000, height: 4500, toJSON: () => ({}),
    });
    const destination = target === "board" ? board : board.parentElement!.parentElement!;
    fireEvent.dragOver(destination, { dataTransfer });
    expect(dataTransfer.dropEffect).toBe("copy");
    fireEvent.drop(destination, { dataTransfer, clientX: 2400, clientY: 2300 });
    expect(screen.getAllByRole("group", { name: "Dropped logic — Dropped logic part" })).toHaveLength(1);
    expect(screen.getByText("Dropped logic added as a black box.")).toBeTruthy();
  });

  it("asks before clearing the canvas and keeps it when cancelled", () => {
    render(<LogicBuilder />);
    const before = screen.getByRole("application", { name: "Circuit canvas" }).querySelectorAll('[role="group"]').length;
    fireEvent.click(screen.getByText("File", { selector: "summary" }));
    fireEvent.click(screen.getByRole("button", { name: "Clear canvas" }));
    const dialog = screen.getByRole("dialog", { name: "Clear canvas?" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
    expect(screen.getByRole("application", { name: "Circuit canvas" }).querySelectorAll('[role="group"]').length).toBe(before);
    fireEvent.click(screen.getByText("File", { selector: "summary" }));
    fireEvent.click(screen.getByRole("button", { name: "Clear canvas" }));
    fireEvent.click(within(screen.getByRole("dialog", { name: "Clear canvas?" })).getByRole("button", { name: "Clear canvas" }));
    expect(screen.getByText("0 parts · 0 wires")).toBeTruthy();
  });
  it("counts visible nested parts and internal wires when clearing an unfolded canvas", () => {
    render(<LogicBuilder />);
    fireEvent.click(within(screen.getByLabelText("Gate palette")).getByRole("button", { name: "8-bit full adder" }));
    const adder = screen.getByRole("group", { name: /8-bit full adder.*part/i });
    const checkCounts = () => {
      const canvas = screen.getByRole("application", { name: "Circuit canvas" });
      const parts = within(canvas).getAllByRole("group", { name: / part$/ }).length;
      const wires = canvas.querySelectorAll('[data-inline-wire]').length
        + within(canvas).getAllByRole("button", { name: /^Select wire from / }).length;
      expect(screen.getByText(`${parts} parts · ${wires} wires`, { exact: false })).toBeTruthy();
      fireEvent.click(screen.getByText("File", { selector: "summary" }));
    fireEvent.click(screen.getByRole("button", { name: "Clear canvas" }));
      const dialog = screen.getByRole("dialog", { name: "Clear canvas?" });
      expect(within(dialog).getByText(`Remove ${parts} parts and ${wires} wires from this canvas?`)).toBeTruthy();
      fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
      return parts;
    };
    const folded = checkCounts();
    fireEvent.click(within(adder).getByRole("button", { name: /Unfold .* in place/ }));
    const expanded = checkCounts();
    expect(expanded).toBeGreaterThan(folded);
    fireEvent.click(within(adder).getByRole("button", { name: "Unfold one level deeper" }));
    expect(checkCounts()).toBeGreaterThan(expanded);
    fireEvent.click(within(adder).getAllByRole("button", { name: "Refold one level" })[0]);
    expect(checkCounts()).toBe(expanded);
    fireEvent.click(within(adder).getByRole("button", { name: "Refold box" }));
    expect(checkCounts()).toBe(folded);
  }, 20000);
  it("defaults part ports to left and right and lets parts rotate", () => {
    render(<LogicBuilder />);
    const parts = screen.getByLabelText("Gate palette");
    fireEvent.click(within(parts).getByRole("button", { name: "8-BIT INPUT" }));
    const input = screen.getByRole("group", { name: "8-BIT INPUT — 8-BIT INPUT part" });
    const bits = within(input).getAllByRole("button", { name: /Toggle bit/ });
    expect(bits.map((bit) => bit.getAttribute("aria-label"))).toEqual(
      Array.from({ length: 8 }, (_, index) => `Toggle bit ${7 - index} of 8-BIT INPUT`),
    );
    expect(within(input).getByRole("button", { name: "Wire from 8-BIT INPUT Bit 0" })
      .parentElement?.style.left).toBe("100%");
    fireEvent.contextMenu(input, { clientX: 100, clientY: 100 });
    expect(screen.queryByLabelText("Output side")).toBeNull();
    fireEvent.click(screen.getByRole("menuitem", { name: "Rotate right" }));
    expect(within(input).getByRole("button", { name: "Wire from 8-BIT INPUT Bit 0" })
      .parentElement?.style.top).toBe("100%");

    fireEvent.click(within(parts).getByRole("button", { name: "8-BIT DISPLAY" }));
    const display = screen.getByRole("group", { name: "8-BIT DISPLAY — 8-BIT DISPLAY part" });
    expect(within(display).getByRole("button", { name: "Connect to 8-BIT DISPLAY Bit 0" })
      .parentElement?.style.left).toBe("0%");
    fireEvent.contextMenu(display, { clientX: 100, clientY: 100 });
    expect(screen.queryByLabelText("Input side")).toBeNull();
    fireEvent.click(screen.getByRole("menuitem", { name: "Rotate right" }));
    expect(within(display).getByRole("button", { name: "Connect to 8-BIT DISPLAY Bit 0" })
      .parentElement?.style.top).toBe("0%");

    fireEvent.click(within(parts).getByRole("button", { name: "SWITCH" }));
    const switches = screen.getAllByRole("group", { name: "SWITCH — SWITCH part" });
    const switchPart = switches[switches.length - 1];
    expect(within(switchPart).getByRole("button", { name: "Wire from SWITCH Output" })
      .parentElement?.style.left).toBe("100%");
  });
  it("edits a part from its context menu and closes on an outside pointer down", () => {
    render(<LogicBuilder />);
    const part = screen.getByRole("group", { name: "SUM — XOR part" });
    fireEvent.contextMenu(part, { clientX: 100, clientY: 100 });
    expect(screen.queryByLabelText("Selection controls")).toBeNull();
    expect(within(screen.getByRole("menu")).getByText("XOR")).toBeTruthy();
    expect(within(screen.getByRole("menu")).queryByText("Represents")).toBeNull();
    expect(within(screen.getByRole("menu")).queryByText("Output side")).toBeNull();
    fireEvent.change(screen.getByLabelText("Label"), { target: { value: "Timer" } });
    expect(screen.getByRole("group", { name: "Timer — XOR part" })).toBeTruthy();
    fireEvent.pointerDown(screen.getByRole("application", { name: "Circuit canvas" }));
    expect(screen.queryByRole("menu")).toBeNull();
  });
  it("starts new parts unnamed and edits or clears a name inline", () => {
    render(<LogicBuilder />);
    const parts = screen.getByLabelText("Gate palette");
    fireEvent.click(within(parts).getByRole("button", { name: "SWITCH" }));
    const switches = screen.getAllByRole("group", { name: "SWITCH — SWITCH part" });
    const part = switches[switches.length - 1];
    expect(within(part).getByText("SWITCH")).toBeTruthy();
    fireEvent.click(within(part).getByRole("button", { name: "Edit SWITCH label" }));
    const field = within(part).getByRole("textbox", { name: "Part label" });
    fireEvent.change(field, { target: { value: "Main power" } });
    fireEvent.keyDown(field, { key: "Enter" });
    expect(within(part).getByText("Main power")).toBeTruthy();
    expect(within(part).getByText("SWITCH")).toBeTruthy();
    fireEvent.doubleClick(within(part).getByText("Main power"));
    const renamed = within(part).getByRole("textbox", { name: "Part label" });
    fireEvent.change(renamed, { target: { value: "" } });
    fireEvent.keyDown(renamed, { key: "Enter" });
    expect(within(part).queryByText("Main power")).toBeNull();
    expect(within(part).getByText("SWITCH")).toBeTruthy();
  });
  it("shows a lamp symbol and binary state", () => {
    render(<LogicBuilder />);
    fireEvent.click(within(screen.getByLabelText("Gate palette")).getByRole("button", { name: "LAMP" }));
    const lamps = screen.getAllByRole("group", { name: "LAMP — LAMP part" });
    const lamp = lamps[lamps.length - 1];
    expect(lamp.querySelector("svg path[d='M21 10 L43 32 M43 10 L21 32']")).toBeTruthy();
    expect(within(lamp).getByRole("img", { name: "LED off" })).toBeTruthy();
    expect(within(lamp).getByText("0")).toBeTruthy();
  });
  it("undoes and redoes part and input edits", () => {
    render(<LogicBuilder />);
    const parts = screen.getByLabelText("Gate palette");
    fireEvent.click(within(parts).getByRole("button", { name: "4-BIT INPUT" }));
    let input = screen.getByRole("group", { name: "4-BIT INPUT — 4-BIT INPUT part" });
    fireEvent.click(within(input).getByRole("button", { name: "Toggle bit 2 of 4-BIT INPUT" }));
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    input = screen.getByRole("group", { name: "4-BIT INPUT — 4-BIT INPUT part" });
    expect(
      within(input)
        .getByRole("button", { name: "Toggle bit 2 of 4-BIT INPUT" })
        .getAttribute("aria-pressed"),
    ).toBe("false");
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(screen.queryByRole("group", { name: "4-BIT INPUT — 4-BIT INPUT part" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Redo" }));
    expect(screen.getByRole("group", { name: "4-BIT INPUT — 4-BIT INPUT part" })).toBeTruthy();
  });
  it("tracks saved-circuit changes and keyboard shortcuts", () => {
    render(<LogicBuilder />);
    fireEvent.click(screen.getByText("File", { selector: "summary" }));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    const dialog = screen.getByRole("dialog", { name: "Save circuit" });
    fireEvent.change(within(dialog).getByRole("textbox", { name: "Name" }), { target: { value: "History example" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Save circuit" }));
    expect(screen.getByRole("button", { name: "History example" })).toBeTruthy();
    fireEvent.keyDown(window, { key: "z", ctrlKey: true });
    expect(screen.queryByRole("button", { name: "History example" })).toBeNull();
    fireEvent.keyDown(window, { key: "z", ctrlKey: true, shiftKey: true });
    expect(screen.getByRole("button", { name: "History example" })).toBeTruthy();
  });
  it.each(["metaKey", "ctrlKey"])("selects all parts with %s+A without taking over text inputs", (modifier) => {
    render(<LogicBuilder />);
    const partCount = screen.getByRole("application", { name: "Circuit canvas" }).querySelectorAll('[role="group"][aria-label$=" part"]').length;
    const shortcut = { key: "a", [modifier]: true };
    const input = screen.getByRole("textbox", { name: "Circuit name" });
    fireEvent.keyDown(input, shortcut);
    expect(screen.queryByText(`${partCount} selected`, { exact: false })).toBeNull();
    const event = new KeyboardEvent("keydown", { ...shortcut, bubbles: true, cancelable: true });
    act(() => window.dispatchEvent(event));
    expect(event.defaultPrevented).toBe(true);
    expect(screen.getByText(`${partCount} selected`, { exact: false })).toBeTruthy();
  });
  it("restores a cleared canvas", () => {
    render(<LogicBuilder />);
    const initialParts = screen.getAllByRole("group", { name: /part$/ }).length;
    fireEvent.click(screen.getByText("File", { selector: "summary" }));
    fireEvent.click(screen.getByRole("button", { name: "Clear canvas" }));
    fireEvent.click(within(screen.getByRole("dialog", { name: "Clear canvas?" })).getByRole("button", { name: "Clear canvas" }));
    expect(screen.queryAllByRole("group", { name: /part$/ })).toHaveLength(0);
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(screen.getAllByRole("group", { name: /part$/ })).toHaveLength(initialParts);
  });
  it("shows current routing and bus settings and keeps their states consistent", () => {
    render(<LogicBuilder />);
    fireEvent.click(screen.getByText("View", { selector: "summary" }));
    const paths = screen.getByRole("switch", { name: "Wire paths" }) as HTMLInputElement;
    const buses = screen.getByRole("switch", { name: "Fan-out buses" }) as HTMLInputElement;
    expect(paths.checked).toBe(true);
    expect(buses.checked).toBe(true);
    fireEvent.click(paths);
    expect(paths.checked).toBe(false);
    expect(buses.checked).toBe(false);
    expect(screen.queryByRole("button", { name: "Add branch from A bus" })).toBeNull();
    fireEvent.click(buses);
    expect(paths.checked).toBe(true);
    expect(buses.checked).toBe(true);
    expect(screen.getByRole("button", { name: "Add branch from A bus" })).toBeTruthy();
    fireEvent.click(buses);
    expect(paths.checked).toBe(true);
    expect(buses.checked).toBe(false);
    // Choosing routed paths must not silently enable bus grouping again.
    fireEvent.click(paths);
    fireEvent.click(paths);
    expect(paths.checked).toBe(true);
    expect(buses.checked).toBe(false);
  });
  it("shows named sockets and a distinct ALU symbol", () => {
    render(<LogicBuilder />);
    const parts = screen.getByLabelText("Gate palette");
    const aluPart = within(parts).getByRole("button", { name: "8-bit ALU" });
    expect(aluPart.querySelector("svg")?.textContent).toBe("ALU");
    expect(
      within(parts).getByRole("button", { name: "8-bit binary counter" }).querySelector("svg")
        ?.textContent,
    ).toBe("CTR");
    fireEvent.click(aluPart);
    const alu = screen.getByRole("group", { name: "8-bit ALU — 8-bit ALU part" });
    expect(within(alu).getByText("OP0")).toBeTruthy();
    expect(within(alu).getByText("CARRY IN")).toBeTruthy();
    expect(within(alu).getByText("OUT0")).toBeTruthy();
    expect(within(alu).getByText("CARRY OUT")).toBeTruthy();
    fireEvent.contextMenu(alu, { clientX: 100, clientY: 100 });
    expect(screen.getByText(/00 AND, 01 OR, 10 XOR, 11 ADD/)).toBeTruthy();
  });
  it("adds example black boxes from Parts and toggles number input bits", () => {
    render(<LogicBuilder />);
    const parts = screen.getByLabelText("Gate palette");
    fireEvent.click(within(parts).getByRole("button", { name: "Half adder" }));
    expect(screen.getByRole("group", { name: "Half adder — Half adder part" })).toBeTruthy();

    fireEvent.click(within(parts).getByRole("button", { name: "4-BIT INPUT" }));
    const input = screen.getByRole("group", { name: "4-BIT INPUT — 4-BIT INPUT part" });
    const bit = within(input).getByRole("button", { name: "Toggle bit 2 of 4-BIT INPUT" });
    fireEvent.click(bit);
    expect(bit.getAttribute("aria-pressed")).toBe("true");
    expect(bit.textContent).toBe("1");

    fireEvent.click(within(parts).getByRole("button", { name: "8-BIT DISPLAY" }));
    const display = screen.getByRole("group", { name: "8-BIT DISPLAY — 8-BIT DISPLAY part" });
    expect(within(display).getByLabelText("8-BIT DISPLAY value").textContent).toContain("00000000");
  });
  it("shows construction labels as boundaries and drills through gate implementations", () => {
    render(<LogicBuilder />);
    expect(within(screen.getByLabelText("Gate palette")).queryByRole("button", { name: "NOR only" })).toBeNull();
    fireEvent.click(screen.getByText("Learning"));
    fireEvent.click(screen.getByRole("button", { name: "NOR only" }));
    fireEvent.click(screen.getByTitle("Open NAND from NOR gates blueprint"));
    expect(screen.getByText("Learning").closest("details")?.open).toBe(false);
    expect(screen.getByLabelText("NAND from NOR gates circuit boundary")).toBeTruthy();
    expect(screen.getAllByRole("group", { name: "NOR — NOR part" })).toHaveLength(4);

    fireEvent.contextMenu(screen.getAllByRole("group", { name: "NOR — NOR part" })[0], { clientX: 100, clientY: 100 });
    fireEvent.click(screen.getByRole("button", { name: "NAND only ↘" }));
    expect(screen.getByText("Level 2")).toBeTruthy();
    expect(screen.getByLabelText("NOR from NAND gates circuit boundary")).toBeTruthy();
    fireEvent.contextMenu(screen.getAllByRole("group", { name: "NAND — NAND part" })[0], { clientX: 100, clientY: 100 });
    fireEvent.click(screen.getByRole("button", { name: "CMOS transistors ↘" }));
    expect(screen.getByText("Level 3")).toBeTruthy();
    expect(screen.getByLabelText("NAND from CMOS transistors circuit boundary")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "← Back" }));
    fireEvent.click(screen.getByRole("button", { name: "← Back" }));
    expect(screen.getByLabelText("NAND from NOR gates circuit boundary")).toBeTruthy();
  });

  it("opens a black box and returns to the parent circuit", () => {
    render(<LogicBuilder />);
    fireEvent.click(within(screen.getByLabelText("Gate palette")).getByRole("button", { name: "Half adder" }));
    fireEvent.contextMenu(screen.getByRole("group", { name: "Half adder — Half adder part" }), { clientX: 100, clientY: 100 });
    expect(within(screen.getByRole("menu")).queryByText("Inputs")).toBeNull();
    expect(within(screen.getByRole("menu")).queryByText("Outputs")).toBeNull();
    expect(screen.queryByRole("button", { name: "Open internal wiring ↘" })).toBeNull();
    fireEvent.doubleClick(screen.getByRole("group", { name: "Half adder — Half adder part" }));
    expect(screen.getByText("Level 2")).toBeTruthy();
    expect(screen.getAllByRole("group", { name: "SUM — LAMP part" }).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: "← Back" }));
    expect(screen.getByRole("group", { name: "Half adder — Half adder part" })).toBeTruthy();
  });

  it("shows a counter bit's role and physical part", () => {
    render(<LogicBuilder />);
    fireEvent.click(within(screen.getByLabelText("Gate palette")).getByRole("button", { name: "View 8-bit binary counter diagram" }));
    const bit = screen.getByRole("group", { name: "BIT0 — D FLIP-FLOP part" });
    expect(within(bit).getByText("BIT0")).toBeTruthy();
    expect(within(bit).getByText("D FLIP-FLOP")).toBeTruthy();
  });

  it("zooms with controls and pinch without starting multi-select", () => {
    const { container } = render(<LogicBuilder />);
    const board = screen.getByRole("application", { name: "Circuit canvas" });
    const viewport = board.parentElement!.parentElement!;
    vi.spyOn(board, "getBoundingClientRect").mockReturnValue({
      left: 0,
      top: 0,
      right: 900,
      bottom: 520,
      width: 900,
      height: 520,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });
    vi.spyOn(viewport, "getBoundingClientRect").mockReturnValue({
      left: 0,
      top: 0,
      right: 900,
      bottom: 520,
      width: 900,
      height: 520,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });
    fireEvent.click(screen.getByRole("button", { name: "Zoom in" }));
    expect(screen.getByText("125%")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "100%" }));
    expect(screen.getByText("100%", { selector: "span" })).toBeTruthy();
    fireEvent.wheel(viewport, {
      ctrlKey: true,
      deltaY: -Math.log(2) * 100,
      clientX: 100,
      clientY: 100,
    });
    expect(screen.getByText("200%")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "100%" }));

    fireEvent.pointerDown(board, {
      pointerId: 1,
      pointerType: "touch",
      clientX: 100,
      clientY: 100,
    });
    fireEvent.pointerDown(board, {
      pointerId: 2,
      pointerType: "touch",
      clientX: 200,
      clientY: 100,
    });
    fireEvent.pointerMove(board, {
      pointerId: 2,
      pointerType: "touch",
      clientX: 300,
      clientY: 100,
    });
    expect(screen.getByText("200%")).toBeTruthy();
    expect(container.querySelector('[class*="marquee"]')).toBeNull();
    fireEvent.pointerUp(viewport, { pointerId: 1, pointerType: "touch" });
    fireEvent.pointerUp(viewport, { pointerId: 2, pointerType: "touch" });

    fireEvent.pointerDown(board, {
      pointerId: 3,
      pointerType: "mouse",
      button: 0,
      clientX: 50,
      clientY: 50,
    });
    expect(container.querySelector('[class*="marquee"]')).toBeNull();
    const beforePanLeft = viewport.scrollLeft;
    const beforePanTop = viewport.scrollTop;
    fireEvent.pointerMove(viewport, { pointerId: 3, pointerType: "mouse", clientX: 30, clientY: 40 });
    expect(viewport.scrollLeft).toBe(beforePanLeft + 20);
    expect(viewport.scrollTop).toBe(beforePanTop + 10);
    fireEvent.pointerUp(viewport, { pointerId: 3, pointerType: "mouse", button: 0 });
    fireEvent.pointerDown(board, {
      pointerId: 4,
      pointerType: "mouse",
      button: 0,
      shiftKey: true,
      clientX: 50,
      clientY: 50,
    });
    expect(container.querySelector('[class*="marquee"]')).toBeTruthy();
    expect(viewport.scrollLeft).toBe(beforePanLeft + 20);
    fireEvent.pointerUp(board, { pointerId: 4, pointerType: "mouse", button: 0, clientX: 50, clientY: 50 });

    fireEvent.click(screen.getByRole("button", { name: "Select" }));
    fireEvent.pointerDown(board, {
      pointerId: 5,
      pointerType: "mouse",
      button: 0,
      clientX: 50,
      clientY: 50,
    });
    expect(container.querySelector('[class*="marquee"]')).toBeTruthy();
    fireEvent.pointerUp(board, { pointerId: 5, pointerType: "mouse", button: 0, clientX: 50, clientY: 50 });
  });

  it.each(["before", "after"])("keeps the cursor anchor when animation frames run %s the zoom commit", (timing) => {
    render(<LogicBuilder />);
    const board = screen.getByRole("application", { name: "Circuit canvas" });
    const viewport = board.parentElement!.parentElement!;
    Object.defineProperties(viewport, {
      clientWidth: { configurable: true, value: 900 },
      clientHeight: { configurable: true, value: 520 },
    });
    vi.spyOn(viewport, "getBoundingClientRect").mockReturnValue({
      left: 0, top: 0, right: 900, bottom: 520, width: 900, height: 520,
      x: 0, y: 0, toJSON: () => ({}),
    });
    const frames: FrameRequestCallback[] = [];
    const animationFrame = vi.spyOn(window, "requestAnimationFrame")
      .mockImplementation((callback) => { frames.push(callback); return frames.length; });
    const pointAt = (x: number, y: number, scale: number) => {
      const [left, top] = (board.querySelector("svg[viewBox]") as SVGSVGElement)
        .getAttribute("viewBox")!.split(" ").map(Number);
      return { x: left + (viewport.scrollLeft + x) / scale,
        y: top + (viewport.scrollTop + y) / scale };
    };
    const anchor = { x: 120, y: 80 };
    const before = pointAt(anchor.x, anchor.y, 1);
    act(() => {
      for (let index = 0; index < 2; index++) {
        viewport.dispatchEvent(new WheelEvent("wheel", {
          bubbles: true, cancelable: true, clientX: anchor.x, clientY: anchor.y,
          deltaY: -Math.log(2) * 100, ctrlKey: true,
        }));
      }
      if (timing === "before") frames.forEach((frame) => frame(0));
    });
    if (timing === "after") act(() => { frames.forEach((frame) => frame(0)); });
    expect(screen.getByText("400%")).toBeTruthy();
    expect(pointAt(anchor.x, anchor.y, 4).x).toBeCloseTo(before.x);
    expect(pointAt(anchor.x, anchor.y, 4).y).toBeCloseTo(before.y);
    animationFrame.mockRestore();
  });

  it("contains scaled board overflow and consumes native browser zoom gestures", () => {
    const { container } = render(<LogicBuilder />);
    const board = screen.getByRole("application", { name: "Circuit canvas" });
    const spacer = board.parentElement as HTMLElement;
    const viewport = spacer.parentElement as HTMLElement;
    expect(spacer.style.overflow).toBe("hidden");
    expect(board.style.position).toBe("absolute");

    const wheel = new WheelEvent("wheel", {
      bubbles: true,
      cancelable: true,
      deltaY: -120,
    });
    act(() => viewport.dispatchEvent(wheel));
    expect(wheel.defaultPrevented).toBe(true);
    expect(screen.getByText("120%")).toBeTruthy();

    const start = new Event("gesturestart", { bubbles: true, cancelable: true });
    act(() => viewport.dispatchEvent(start));
    expect(start.defaultPrevented).toBe(true);
    const change = new Event("gesturechange", { bubbles: true, cancelable: true });
    Object.defineProperty(change, "scale", { value: 1.4 });
    act(() => viewport.dispatchEvent(change));
    expect(change.defaultPrevented).toBe(true);
    expect(screen.getByText("168%")).toBeTruthy();

    const nextChange = new Event("gesturechange", { bubbles: true, cancelable: true });
    Object.defineProperty(nextChange, "scale", { value: 1.6 });
    act(() => viewport.dispatchEvent(nextChange));
    expect(screen.getByText("192%")).toBeTruthy();

    const outside = new WheelEvent("wheel", { bubbles: true, cancelable: true, ctrlKey: true });
    container.parentElement!.dispatchEvent(outside);
    expect(outside.defaultPrevented).toBe(false);
    const toolbarWheel = new WheelEvent("wheel", { bubbles: true, cancelable: true,
      deltaY: -120 });
    screen.getByRole("toolbar", { name: "Canvas view controls" }).dispatchEvent(toolbarWheel);
    expect(toolbarWheel.defaultPrevented).toBe(false);
    expect(screen.getByText("192%")).toBeTruthy();
  });

  it("keeps dots readable while zooming beyond the old limits", () => {
    render(<LogicBuilder />);
    const board = screen.getByRole("application", { name: "Circuit canvas" });
    const viewport = board.parentElement!.parentElement!;
    Object.defineProperties(viewport, {
      clientWidth: { configurable: true, value: 800 },
      clientHeight: { configurable: true, value: 500 },
    });
    vi.spyOn(viewport, "getBoundingClientRect").mockReturnValue({
      left: 0, top: 0, right: 800, bottom: 500, width: 800, height: 500,
      x: 0, y: 0, toJSON: () => ({}),
    });
    const zoomLabel = screen.getByText("100%", { selector: "span" });
    fireEvent.wheel(viewport, { deltaY: 3000, clientX: 400, clientY: 250 });
    expect(Number.parseFloat(zoomLabel.textContent!)).toBeLessThan(5);
    expect(Number.parseFloat(viewport.style.backgroundSize)).toBeGreaterThanOrEqual(14);
    expect(Number.parseFloat(viewport.style.backgroundSize)).toBeLessThanOrEqual(29);
    fireEvent.wheel(viewport, { deltaY: -6000, clientX: 400, clientY: 250 });
    expect(Number.parseFloat(zoomLabel.textContent!.replaceAll(",", ""))).toBeGreaterThan(400);
    expect(Number.parseFloat(viewport.style.backgroundSize)).toBeGreaterThanOrEqual(14);
    expect(Number.parseFloat(viewport.style.backgroundSize)).toBeLessThanOrEqual(29);
    fireEvent.wheel(viewport, { deltaY: 15000, clientX: 400, clientY: 250 });
    expect(Number.isFinite(Number.parseFloat(board.style.width))).toBe(true);
    expect(Number.parseFloat(viewport.style.backgroundSize)).toBeGreaterThanOrEqual(14);
    fireEvent.wheel(viewport, { deltaY: -30000, clientX: 400, clientY: 250 });
    expect(Number.isFinite(Number.parseFloat(board.style.width))).toBe(true);
    expect(Number.parseFloat(viewport.style.backgroundSize)).toBeLessThanOrEqual(29);
  });

  it("pans repeatedly while leaving part dragging intact", () => {
    render(<LogicBuilder />);
    const board = screen.getByRole("application", { name: "Circuit canvas" });
    const viewport = board.parentElement!.parentElement!;
    const initialWidth = Number.parseFloat(board.style.width);
    Object.defineProperty(viewport, "clientWidth", { configurable: true, value: 400 });
    Object.defineProperty(viewport, "clientHeight", { configurable: true, value: 300 });
    vi.spyOn(board, "getBoundingClientRect").mockImplementation(() => ({
      left: 0, top: 0, right: Number.parseFloat(board.style.width),
      bottom: Number.parseFloat(board.style.height),
      width: Number.parseFloat(board.style.width),
      height: Number.parseFloat(board.style.height),
      x: 0, y: 0, toJSON: () => ({}),
    }));
    const part = screen.getAllByRole("group", { name: / part$/ })[0];
    const firstLeft = part.style.left;

    fireEvent.pointerDown(part, { pointerId: 10, pointerType: "mouse", button: 0,
      clientX: 100, clientY: 100 });
    fireEvent.pointerMove(part, { pointerId: 10, pointerType: "mouse",
      clientX: 140, clientY: 100 });
    expect(part.style.left).not.toBe(firstLeft);
    expect(viewport.scrollLeft).toBe(0);
    fireEvent.pointerUp(board, { pointerId: 10, pointerType: "mouse", button: 0 });

    fireEvent.pointerDown(board, { pointerId: 11, pointerType: "mouse", button: 0,
      clientX: 300, clientY: 150 });
    for (let x = 0; x >= -900; x -= 300)
      fireEvent.pointerMove(viewport, { pointerId: 11, pointerType: "mouse",
        clientX: x, clientY: 150 });
    expect(viewport.scrollLeft).toBeGreaterThan(900);
    fireEvent.pointerMove(viewport, { pointerId: 11, pointerType: "mouse",
      clientX: 1700, clientY: 900 });
    fireEvent.scroll(viewport);
    expect(Number.parseFloat(board.style.width)).toBe(initialWidth);
    fireEvent.pointerUp(viewport, { pointerId: 11, pointerType: "mouse", button: 0 });

    fireEvent.pointerDown(board, { pointerId: 12, pointerType: "mouse", button: 0,
      shiftKey: true, clientX: 50, clientY: 60 });
    const marquee = board.querySelector('[class*="marquee"]') as HTMLElement;
    expect(marquee.style.left).toBe("50px");
    expect(marquee.style.top).toBe("60px");
    fireEvent.pointerUp(board, { pointerId: 12, pointerType: "mouse", button: 0,
      clientX: 50, clientY: 60 });

    const count = screen.getAllByRole("group", { name: /SWITCH part$/ }).length;
    fireEvent.drop(board, { clientX: 200, clientY: 200,
      dataTransfer: { getData: (type: string) => type === "application/x-logic-gate" ? "switch" : "" } });
    expect(screen.getAllByRole("group", { name: /SWITCH part$/ })).toHaveLength(count + 1);
  });
});

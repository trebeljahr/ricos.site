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
    fireEvent.click(screen.getByRole("button", { name: "NOR only" }));
    fireEvent.click(screen.getByRole("button", { name: /NAND from NOR gates/ }));
    expect(screen.getByLabelText("NAND from NOR gates circuit boundary")).toBeTruthy();
    expect(screen.getAllByRole("group", { name: "NOR — NOR part" })).toHaveLength(4);

    fireEvent.pointerDown(screen.getAllByRole("group", { name: "NOR — NOR part" })[0], {
      button: 0,
      pointerId: 1,
    });
    fireEvent.click(screen.getByRole("button", { name: "NAND only ↘" }));
    expect(screen.getByText("Level 2")).toBeTruthy();
    expect(screen.getByLabelText("NOR from NAND gates circuit boundary")).toBeTruthy();
    fireEvent.pointerDown(screen.getAllByRole("group", { name: "NAND — NAND part" })[0], {
      button: 0,
      pointerId: 2,
    });
    fireEvent.click(screen.getByRole("button", { name: "CMOS transistors ↘" }));
    expect(screen.getByText("Level 3")).toBeTruthy();
    expect(screen.getByLabelText("NAND from CMOS transistors circuit boundary")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "← Back" }));
    fireEvent.click(screen.getByRole("button", { name: "← Back" }));
    expect(screen.getByLabelText("NAND from NOR gates circuit boundary")).toBeTruthy();
  });

  it("opens a black box and returns to the parent circuit", () => {
    render(<LogicBuilder />);
    fireEvent.click(screen.getByRole("button", { name: "Examples" }));
    const row = screen.getByText("Half adder", { selector: "button" }).parentElement;
    expect(row).toBeTruthy();
    fireEvent.click(within(row as HTMLElement).getByRole("button", { name: /Black box/ }));
    fireEvent.click(screen.getByRole("button", { name: "Open internal wiring ↘" }));
    expect(screen.getByText("Level 2")).toBeTruthy();
    expect(screen.getAllByRole("group", { name: "SUM — LAMP part" }).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: "← Back" }));
    expect(screen.getByRole("group", { name: "Half adder — Half adder part" })).toBeTruthy();
  });

  it("shows a counter bit's role and physical part", () => {
    render(<LogicBuilder />);
    fireEvent.click(screen.getByRole("button", { name: "Examples" }));
    fireEvent.click(screen.getByTitle("Open 8-bit binary counter blueprint"));
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

    fireEvent.click(screen.getByRole("button", { name: "Pan" }));
    fireEvent.pointerDown(board, {
      pointerId: 3,
      pointerType: "mouse",
      button: 0,
      clientX: 50,
      clientY: 50,
    });
    expect(container.querySelector('[class*="marquee"]')).toBeNull();
    fireEvent.pointerUp(viewport, { pointerId: 3, pointerType: "mouse", button: 0 });
    fireEvent.click(screen.getByRole("button", { name: "Pan" }));
    fireEvent.pointerDown(board, {
      pointerId: 4,
      pointerType: "mouse",
      button: 0,
      clientX: 50,
      clientY: 50,
    });
    expect(container.querySelector('[class*="marquee"]')).toBeTruthy();
    fireEvent.pointerUp(board, {
      pointerId: 4,
      pointerType: "mouse",
      button: 0,
      clientX: 50,
      clientY: 50,
    });
  });

  it("contains scaled board overflow and consumes native browser zoom gestures", () => {
    const { container } = render(<LogicBuilder />);
    const board = screen.getByRole("application", { name: "Circuit canvas" });
    const spacer = board.parentElement as HTMLElement;
    const viewport = spacer.parentElement as HTMLElement;
    expect(spacer.style.overflow).toBe("hidden");
    expect(board.style.position).toBe("absolute");

    const wheel = new WheelEvent("wheel", { bubbles: true, cancelable: true, ctrlKey: true, deltaY: 20 });
    act(() => viewport.dispatchEvent(wheel));
    expect(wheel.defaultPrevented).toBe(true);

    const start = new Event("gesturestart", { bubbles: true, cancelable: true });
    act(() => viewport.dispatchEvent(start));
    expect(start.defaultPrevented).toBe(true);
    const change = new Event("gesturechange", { bubbles: true, cancelable: true });
    Object.defineProperty(change, "scale", { value: 1.4 });
    act(() => viewport.dispatchEvent(change));
    expect(change.defaultPrevented).toBe(true);
    expect(screen.getByText("115%")).toBeTruthy();

    const outside = new WheelEvent("wheel", { bubbles: true, cancelable: true, ctrlKey: true });
    container.parentElement!.dispatchEvent(outside);
    expect(outside.defaultPrevented).toBe(false);
  });
});

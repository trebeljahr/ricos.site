// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BlitterDemo } from "./BlitterDemo";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const grid = () => screen.getByRole("img", { name: /^Screen rows/ });
const rows = () => grid().getAttribute("aria-label");
const text = (label: string) => screen.getByLabelText(label).textContent;
const press = (name: string | RegExp) => fireEvent.click(screen.getByRole("button", { name }));
const set = (register: string, value: number) =>
  fireEvent.change(screen.getByLabelText(`${register} register`), {
    target: { value: String(value) },
  });
const step = (count = 1) => {
  for (let i = 0; i < count; i++) press("Step 1 tick");
};

// These tests are slow on a loaded machine: jsdom renders every LED as an element.
describe("blitter demo", { timeout: 30000 }, () => {
  it("opens idle with a blank screen and SPRITE picked", () => {
    render(<BlitterDemo />);
    expect(rows()).toBe("Screen rows 00 00 00 00 00 00 00 00");
    expect(text("Blitter")).toBe("IDLE");
    expect(text("BUSY")).toBe("0");
    expect(text("CPU counter")).toBe("0");
    expect(text("COLOUR")).toBe("COLOUR (E2) = FF = 11111111");
    expect(text("Command")).toBe("SPRITE: ROM bytes 00 to 07 into rows 0 to 7. 8 ticks.");
    expect(screen.getByRole("button", { name: "SPRITE" }).getAttribute("aria-pressed")).toBe(
      "true",
    );
  });

  it("draws a sprite one row per tick while the CPU counter counts on", () => {
    render(<BlitterDemo />);
    // An idle blitter leaves the screen alone; the clock still ticks.
    step();
    expect(text("CPU counter")).toBe("1");
    expect(rows()).toBe("Screen rows 00 00 00 00 00 00 00 00");
    press("Start SPRITE");
    expect(text("Last store")).toBe("STM E4 ← 6: SPRITE starts on the next tick");
    expect(text("Blitter")).toBe("BUSY · SPRITE · STEP 1 OF 8");
    expect(text("BUSY")).toBe("1");
    step();
    expect(rows()).toBe("Screen rows 66 00 00 00 00 00 00 00");
    expect(text("Blitter")).toBe("BUSY · SPRITE · STEP 2 OF 8");
    expect(grid().querySelectorAll('[data-written][data-y="0"]')).toHaveLength(8);
    step(2);
    expect(rows()).toBe("Screen rows 66 FF FF 00 00 00 00 00");
    expect(text("CPU counter")).toBe("4");
    step(5);
    expect(rows()).toBe("Screen rows 66 FF FF FF 7E 3C 18 00");
    expect(text("Blitter")).toBe("IDLE");
    expect(text("BUSY")).toBe("0");
    expect(text("CPU counter")).toBe("9");
  });

  it("ignores stores to its registers while it is BUSY", () => {
    render(<BlitterDemo />);
    press("Start SPRITE");
    set("Y", 4);
    expect(text("Y")).toBe("Y (E1) = 0");
    expect(text("Last store")).toBe("STM E1 ← 4: ignored, the blitter is BUSY");
    press("Start SPRITE");
    expect(text("Last store")).toBe("STM E4 ← 6: ignored, the blitter is BUSY");
    expect(text("Blitter")).toBe("BUSY · SPRITE · STEP 1 OF 8");
    step(8);
    set("Y", 4);
    expect(text("Y")).toBe("Y (E1) = 4");
    expect(text("Last store")).toBe("STM E1 ← 4");
  });

  it("draws lines one pixel per tick, and fills a row in one", () => {
    render(<BlitterDemo />);
    set("X", 2);
    set("Y", 5);
    set("ARG", 4);
    press("HLINE");
    expect(text("Command")).toBe(
      "HLINE: 4 pixels to the right from x 2, y 5, in colour 1. 4 ticks.",
    );
    press("Start HLINE");
    step();
    expect(rows()).toBe("Screen rows 00 00 00 00 00 04 00 00");
    expect(grid().querySelectorAll("[data-written]")).toHaveLength(1);
    step(3);
    expect(rows()).toBe("Screen rows 00 00 00 00 00 3C 00 00");
    expect(text("Blitter")).toBe("IDLE");
    press("VLINE");
    press("Start VLINE");
    step(4);
    // Row 5 keeps its line; rows 6, 7 and 0 get the pixel at x 2: the line wraps.
    expect(rows()).toBe("Screen rows 04 00 00 00 00 3C 04 04");
    set("COLOUR", 170);
    press("FILL");
    expect(text("Command")).toBe("FILL: COLOUR AA into row 5. 1 tick.");
    press("Start FILL");
    step();
    expect(rows()).toBe("Screen rows 04 00 00 00 00 AA 04 04");
    expect(text("Blitter")).toBe("IDLE");
    set("COLOUR", 0);
    press("CLEAR");
    press("Start CLEAR");
    step(8);
    expect(rows()).toBe("Screen rows 00 00 00 00 00 00 00 00");
  });

  it("runs the clock by itself, and a reset puts everything back", () => {
    vi.useFakeTimers();
    render(<BlitterDemo />);
    set("ARG", 8);
    press("Start SPRITE");
    press("Run the clock");
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(rows()).toBe("Screen rows 3C 42 A5 81 A5 99 42 3C");
    expect(text("CPU counter")).toBe("8");
    expect(text("Blitter")).toBe("IDLE");
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(text("CPU counter")).toBe("10");
    press("Pause the clock");
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(text("CPU counter")).toBe("10");
    press("Reset");
    expect(rows()).toBe("Screen rows 00 00 00 00 00 00 00 00");
    expect(text("CPU counter")).toBe("0");
    expect(text("ARG")).toBe("ARG (E3) = 0");
  });
});

// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BigBlitterDemo } from "./BigBlitterDemo";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

// The screen is 1024 LEDs under 128 buttons: role queries walk all of them, so
// these helpers go by selector instead.
const find = (selector: string) => document.querySelector<HTMLElement>(selector)!;
const big = () => find('[role="img"][aria-label^="Big screen"]');
const lit = () => Number(/, (\d+) of 1024/.exec(big().getAttribute("aria-label") ?? "")?.[1]);
const pixel = (x: number, y: number) =>
  big().querySelector(`[data-x="${x}"][data-y="${y}"]`)?.getAttribute("data-lit");
const text = (label: string) => find(`output[aria-label="${label}"]`).textContent;
const press = (name: string) => fireEvent.click(screen.getByText(name, { selector: "button" }));
const set = (label: string, value: number) =>
  fireEvent.change(find(`input[aria-label="${label}"]`), { target: { value: String(value) } });
const byte = (index: number) => find(`button[aria-label="Byte ${index}"]`);
const rect = (kind: string) =>
  Array.from(document.querySelectorAll(`[data-rect="${kind}"]`)).map((cell) =>
    Number(cell.getAttribute("aria-label")?.slice(5)),
  );
const step = (count = 1) => {
  for (let i = 0; i < count; i++) press("Step 1 tick");
};

// These tests are slow on a loaded machine: jsdom renders every LED as an element.
describe("big blitter demo", { timeout: 30000 }, () => {
  it("opens ready to copy the smiley: two rectangles of 1 byte × 8 rows", () => {
    render(<BigBlitterDemo />);
    expect(lit()).toBe(26);
    expect(text("DST")).toBe("DST (DC) = 46: row 11, pixels 16 to 23");
    expect(text("SRC")).toBe("SRC (DD) = 0: copy from byte 0, row 0, pixels 0 to 7");
    expect(text("SIZE")).toBe("SIZE (DE) = 1C: 8 × 8 pixels, 8 bytes");
    expect(text("Big blitter")).toBe("IDLE");
    expect(rect("src")).toEqual([0, 4, 8, 12, 16, 20, 24, 28]);
    expect(rect("dst")).toEqual([46, 50, 54, 58, 62, 66, 70, 74]);
  });

  it("copies one byte per tick while the CPU counter counts on", () => {
    render(<BigBlitterDemo />);
    press("Start COPY");
    expect(text("Last store")).toBe("STM DF ← 2: COPY starts, 8 bytes, one per tick");
    expect(text("Big blitter")).toBe("BUSY · COPY · ROW 1 OF 8");
    expect(text("BUSY")).toBe("1");
    step();
    // The smiley's top row, 3C, lands in byte 46: 4 pixels of row 11.
    expect(lit()).toBe(30);
    expect(pixel(18, 11)).toBe("true");
    expect(byte(46).getAttribute("data-written")).toBe("true");
    expect(text("Big blitter")).toBe("BUSY · COPY · ROW 2 OF 8");
    step(7);
    expect(lit()).toBe(52);
    expect(text("Big blitter")).toBe("IDLE");
    expect(text("CPU counter")).toBe("8");
    step(2);
    expect(lit()).toBe(52);
    expect(text("CPU counter")).toBe("10");
  });

  it("ignores stores while it is BUSY", () => {
    render(<BigBlitterDemo />);
    press("Start COPY");
    fireEvent.click(byte(3));
    expect(text("DST")).toMatch(/^DST \(DC\) = 46/);
    expect(text("Last store")).toBe("STM DC ← 3: ignored, the big blitter is BUSY");
    step(8);
    fireEvent.click(byte(3));
    expect(text("DST")).toBe("DST (DC) = 3: row 0, pixels 24 to 31");
    expect(text("Last store")).toBe("STM DC ← 3");
  });

  it("picks both rectangles with clicks on the screen", () => {
    render(<BigBlitterDemo />);
    press("SRC");
    fireEvent.click(byte(1));
    expect(text("SRC")).toBe("SRC (DD) = 1: copy from byte 1, row 0, pixels 8 to 15");
    expect(text("Last store")).toBe("STM DD ← 1");
    expect(rect("src")[0]).toBe(1);
    press("DST");
    fireEvent.click(byte(100));
    expect(text("DST")).toBe("DST (DC) = 100: row 25, pixels 0 to 7");
    // FILL has no source rectangle: clicks set DST, and SRC is a byte value.
    press("SRC");
    press("FILL");
    expect(rect("src")).toEqual([]);
    expect((screen.getByText("SRC", { selector: "button" }) as HTMLButtonElement).disabled).toBe(
      true,
    );
    fireEvent.click(byte(64));
    expect(text("DST")).toBe("DST (DC) = 64: row 16, pixels 0 to 7");
  });

  it("fills a rectangle of several byte columns, row by row", () => {
    render(<BigBlitterDemo />);
    press("FILL");
    fireEvent.click(byte(65));
    set("SRC register", 255);
    expect(text("SRC")).toBe("SRC (DD) = FF = 11111111: the byte FILL writes");
    expect(text("Last store")).toBe("STM DD ← FF");
    set("SIZE columns", 2);
    set("SIZE rows", 3);
    expect(text("SIZE")).toBe("SIZE (DE) = 09: 16 × 3 pixels, 6 bytes");
    expect(text("Last store")).toBe("STM DE ← 09");
    expect(rect("dst")).toEqual([65, 66, 69, 70, 73, 74]);
    press("Start FILL");
    expect(text("Last store")).toBe("STM DF ← 1: FILL starts, 6 bytes, one per tick");
    step(3);
    // Two bytes of row 16, then the first byte of row 17.
    expect(lit()).toBe(26 + 24);
    expect(pixel(23, 16)).toBe("true");
    expect(pixel(8, 17)).toBe("true");
    expect(pixel(16, 17)).toBe("false");
    expect(text("Big blitter")).toBe("BUSY · FILL · ROW 2 OF 3");
    step(3);
    expect(lit()).toBe(26 + 48);
    expect(text("Big blitter")).toBe("IDLE");
  });

  it("runs the clock by itself, and a reset puts everything back", () => {
    vi.useFakeTimers();
    render(<BigBlitterDemo />);
    press("Start COPY");
    press("Run the clock");
    act(() => {
      vi.advanceTimersByTime(1200);
    });
    expect(lit()).toBe(52);
    expect(text("CPU counter")).toBe("10");
    press("Pause the clock");
    press("Reset");
    expect(lit()).toBe(26);
    expect(text("CPU counter")).toBe("0");
    expect(text("Big blitter")).toBe("IDLE");
  });
});

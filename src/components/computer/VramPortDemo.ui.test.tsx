// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { VramPortDemo } from "./VramPortDemo";

afterEach(cleanup);

// The screen is 1024 LEDs under 128 buttons: role queries walk all of them, so
// these helpers go by selector instead.
const find = (selector: string) => document.querySelector<HTMLElement>(selector)!;
const big = () => find('[role="img"][aria-label^="Big screen"]');
const lit = () => Number(/, (\d+) of 1024/.exec(big().getAttribute("aria-label") ?? "")?.[1]);
const pixel = (x: number, y: number) =>
  big().querySelector(`[data-x="${x}"][data-y="${y}"]`)?.getAttribute("data-lit");
const text = (label: string) => find(`output[aria-label="${label}"]`).textContent;
const press = (name: string) => fireEvent.click(screen.getByText(name, { selector: "button" }));
const byte = (index: number) => find(`button[aria-label="Byte ${index}"]`);

// These tests are slow on a loaded machine: jsdom renders every LED as an element.
describe("big-screen port demo", { timeout: 30000 }, () => {
  it("opens on a blank screen with ADDR at byte 0 and a step of 1", () => {
    render(<VramPortDemo />);
    expect(lit()).toBe(0);
    expect(text("ADDR")).toBe("ADDR (D9) = 0: row 0, pixels 0 to 7");
    expect(text("STEP")).toBe("STEP (DB) = 0: ADDR moves on by 1");
    expect(byte(0).getAttribute("aria-pressed")).toBe("true");
  });

  it("writes the byte at ADDR on each store to DATA and moves ADDR on by 1", () => {
    render(<VramPortDemo />);
    press("Store FF in DATA");
    expect(lit()).toBe(8);
    expect(text("Last store")).toBe("STM DA ← FF: byte 0 written, ADDR moves on by 1 to 1");
    expect(text("ADDR")).toBe("ADDR (D9) = 1: row 0, pixels 8 to 15");
    expect(byte(1).getAttribute("aria-pressed")).toBe("true");
    expect(byte(0).getAttribute("data-written")).toBe("true");
    for (let i = 0; i < 4; i++) press("Store FF in DATA");
    // 4 bytes fill row 0; the fifth is the first byte of row 1.
    expect(lit()).toBe(40);
    expect(pixel(31, 0)).toBe("true");
    expect(pixel(7, 1)).toBe("true");
    expect(pixel(8, 1)).toBe("false");
    expect(text("ADDR")).toBe("ADDR (D9) = 5: row 1, pixels 8 to 15");
  });

  it("moves ADDR one row down per store when STEP is set", () => {
    render(<VramPortDemo />);
    fireEvent.click(byte(14));
    expect(text("Last store")).toBe("STM D9 ← 14");
    expect(text("ADDR")).toBe("ADDR (D9) = 14: row 3, pixels 16 to 23");
    press("Down");
    expect(text("STEP")).toBe("STEP (DB) = 1: ADDR moves on by 4");
    expect(text("Last store")).toBe("STM DB ← 1: ADDR moves on by 4, one row down");
    fireEvent.change(find('input[aria-label="Byte to store"]'), { target: { value: "1" } });
    press("Store 01 in DATA");
    press("Store 01 in DATA");
    press("Store 01 in DATA");
    expect(text("Last store")).toBe("STM DA ← 01: byte 22 written, ADDR moves on by 4 to 26");
    expect(lit()).toBe(3);
    expect([3, 4, 5, 6].map((y) => pixel(16, y))).toEqual(["true", "true", "true", "false"]);
    press("Across");
    expect(text("Last store")).toBe("STM DB ← 0: ADDR moves on by 1, one byte across");
  });

  it("wraps ADDR past the last byte, and clears the screen", () => {
    render(<VramPortDemo />);
    fireEvent.change(find('input[aria-label="ADDR register"]'), { target: { value: "127" } });
    expect(text("ADDR")).toBe("ADDR (D9) = 127: row 31, pixels 24 to 31");
    press("Store FF in DATA");
    expect(text("Last store")).toBe("STM DA ← FF: byte 127 written, ADDR moves on by 1 to 0");
    expect(pixel(31, 31)).toBe("true");
    press("Clear the screen");
    expect(lit()).toBe(0);
    expect(text("ADDR")).toBe("ADDR (D9) = 0: row 0, pixels 0 to 7");
  });
});

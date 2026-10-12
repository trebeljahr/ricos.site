// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { MemoryMappedScreenDemo } from "./MemoryMappedScreenDemo";

afterEach(cleanup);

const grid = () => screen.getByRole("img", { name: /^Screen rows/ });
const rows = () => grid().getAttribute("aria-label");
const lastStore = () => screen.getByLabelText("Last store").textContent;
const press = (name: string | RegExp) => fireEvent.click(screen.getByRole("button", { name }));
const addresses = () =>
  Array.from(screen.getByLabelText("Screen addresses").children).map((row) => row.textContent);
const lit = (x: number, y: number) =>
  grid().querySelector(`[data-x="${x}"][data-y="${y}"]`)?.getAttribute("data-lit");

// These tests are slow on a loaded machine: jsdom renders every LED as an element.
describe("memory-mapped screen demo", { timeout: 30000 }, () => {
  it("opens on a smiley: 8 addresses, one byte per row, in hex and binary", () => {
    render(<MemoryMappedScreenDemo />);
    expect(rows()).toBe("Screen rows 3C 42 A5 81 A5 99 42 3C");
    expect(addresses()).toEqual([
      "F0 = 3C = 00111100",
      "F1 = 42 = 01000010",
      "F2 = A5 = 10100101",
      "F3 = 81 = 10000001",
      "F4 = A5 = 10100101",
      "F5 = 99 = 10011001",
      "F6 = 42 = 01000010",
      "F7 = 3C = 00111100",
    ]);
    expect(lastStore()).toBe("8 stores, F0 to F7: a smiley");
  });

  it("flips one bit of a row's byte per click, with bit 0 at the left", () => {
    render(<MemoryMappedScreenDemo />);
    press("Clear the screen");
    expect(rows()).toBe("Screen rows 00 00 00 00 00 00 00 00");
    press("F2 bit 0");
    expect(addresses()[2]).toBe("F2 = 01 = 00000001");
    expect(lit(0, 2)).toBe("true");
    expect(lastStore()).toBe("STM F2 ← 01: row 2 is now 00000001");
    press("F2 bit 7");
    expect(addresses()[2]).toBe("F2 = 81 = 10000001");
    expect(lit(7, 2)).toBe("true");
    // The store rings the whole row: all 8 pixels took the new byte.
    expect(grid().querySelectorAll("[data-written]")).toHaveLength(8);
    press("F2 bit 0");
    expect(addresses()[2]).toBe("F2 = 80 = 10000000");
    expect(lit(0, 2)).toBe("false");
  });

  it("stores any byte in the picked row, and the byte is the row of pixels", () => {
    render(<MemoryMappedScreenDemo />);
    press(/^F5 =/);
    expect(screen.getByLabelText("Byte").textContent).toBe("F5 = 99 = 10011001 = 153 in decimal");
    fireEvent.change(screen.getByLabelText("Row byte"), { target: { value: "15" } });
    expect(lastStore()).toBe("STM F5 ← 0F: row 5 is now 00001111");
    expect(rows()).toBe("Screen rows 3C 42 A5 81 A5 0F 42 3C");
    expect([0, 1, 2, 3, 4, 5, 6, 7].map((x) => lit(x, 5))).toEqual([
      "true",
      "true",
      "true",
      "true",
      "false",
      "false",
      "false",
      "false",
    ]);
    // A click on a pixel picks its row for the slider as well.
    press("F0 bit 0");
    expect(screen.getByLabelText("Byte").textContent).toBe("F0 = 3D = 00111101 = 61 in decimal");
    press("Store a smiley");
    expect(rows()).toBe("Screen rows 3C 42 A5 81 A5 99 42 3C");
  });
});

// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { PixelPortDemo } from "./PixelPortDemo";

afterEach(cleanup);

const grid = () => screen.getByRole("img", { name: /^Screen rows/ });
const rows = () => grid().getAttribute("aria-label");
const lastStore = () => screen.getByLabelText("Last store").textContent;
const press = (name: string | RegExp) => fireEvent.click(screen.getByRole("button", { name }));
const pressed = (name: string) => screen.getByRole("button", { name }).getAttribute("aria-pressed");
const addresses = () =>
  Array.from(screen.getByLabelText("Screen addresses").children).map((row) => row.textContent);

// These tests are slow on a loaded machine: jsdom renders every LED as an element.
describe("pixel port demo", { timeout: 30000 }, () => {
  it("opens on a smiley with the cursor at 3, 3", () => {
    render(<PixelPortDemo />);
    expect(rows()).toBe("Screen rows 3C 42 A5 81 A5 99 42 3C");
    expect(screen.getByLabelText("X").textContent).toBe("X (F8) = 3");
    expect(screen.getByLabelText("Y").textContent).toBe("Y (F9) = 3");
    expect(pressed("Pixel 3, 3")).toBe("true");
    expect(lastStore()).toBe("STM F8 ← 3, STM F9 ← 3");
  });

  it("changes the one pixel under the cursor and keeps the rest of its row", () => {
    render(<PixelPortDemo />);
    press("Store 1 in FA");
    expect(addresses()[3]).toBe("F3 = 89 = 10001001");
    expect(lastStore()).toBe("STM FA ← 1: pixel 3, 3 is lit, row 3 goes from 81 to 89");
    expect(grid().querySelectorAll("[data-written]")).toHaveLength(1);
    expect(grid().querySelector('[data-x="3"][data-y="3"]')?.getAttribute("data-written")).toBe(
      "true",
    );
    // The cursor stays where it is: a second store hits the same pixel.
    press("Store 1 in FA");
    expect(lastStore()).toBe("STM FA ← 1: pixel 3, 3 is lit, row 3 stays 89");
    press("Store 0 in FA");
    expect(addresses()[3]).toBe("F3 = 81 = 10000001");
    expect(rows()).toBe("Screen rows 3C 42 A5 81 A5 99 42 3C");
  });

  it("moves the cursor with a click or with the X and Y registers", () => {
    render(<PixelPortDemo />);
    press("Pixel 0, 7");
    expect(pressed("Pixel 0, 7")).toBe("true");
    expect(pressed("Pixel 3, 3")).toBe("false");
    expect(lastStore()).toBe("STM F8 ← 0, STM F9 ← 7: the cursor is at x 0, y 7");
    // Moving the cursor writes nothing to the screen.
    expect(rows()).toBe("Screen rows 3C 42 A5 81 A5 99 42 3C");
    fireEvent.change(screen.getByLabelText("X register"), { target: { value: "7" } });
    expect(lastStore()).toBe("STM F8 ← 7");
    expect(pressed("Pixel 7, 7")).toBe("true");
    fireEvent.change(screen.getByLabelText("Y register"), { target: { value: "0" } });
    expect(screen.getByLabelText("Y").textContent).toBe("Y (F9) = 0");
    press("Store 1 in FA");
    expect(addresses()[0]).toBe("F0 = BC = 10111100");
  });

  it("replaces all 8 pixels of the row with a row store", () => {
    render(<PixelPortDemo />);
    press("Store 08 in F3");
    expect(addresses()[3]).toBe("F3 = 08 = 00001000");
    expect(lastStore()).toBe(
      "STM F3 ← 08: all 8 pixels of row 3 replaced, row 3 goes from 81 to 08",
    );
    expect(grid().querySelectorAll("[data-written]")).toHaveLength(8);
    // The button follows the cursor: the row byte for x 5 in row 1.
    press("Pixel 5, 1");
    press("Store 20 in F1");
    expect(rows()).toBe("Screen rows 3C 20 A5 08 A5 99 42 3C");
  });
});

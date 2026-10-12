// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { BankWindowDemo } from "./BankWindowDemo";

afterEach(cleanup);

const big = () => screen.getByRole("img", { name: /^Big screen/ });
const lit = () => Number(/, (\d+) of 1024/.exec(big().getAttribute("aria-label") ?? "")?.[1]);
const windowRows = () =>
  screen.getByRole("img", { name: /^Window rows/ }).getAttribute("aria-label");
const bank = () => screen.getByLabelText("Bank").textContent;
const lastStore = () => screen.getByLabelText("Last store").textContent;
const press = (name: string) => fireEvent.click(screen.getByRole("button", { name }));
const addresses = () =>
  Array.from(screen.getByLabelText("Window addresses").children).map((row) => row.textContent);

describe("bank window demo", () => {
  it("opens on tile 5 with a smiley, and the window shows that tile's 8 bytes", () => {
    render(<BankWindowDemo />);
    expect(lit()).toBe(26);
    expect(bank()).toBe("BANK (D8) = 5 = 0101: tile row 1, tile column 1");
    expect(windowRows()).toBe("Window rows 3C 42 A5 81 A5 99 42 3C");
    expect(screen.getByRole("button", { name: "Tile 5" }).getAttribute("aria-pressed")).toBe(
      "true",
    );
    // Tile 5 is the second tile across and down: its rows are bytes 33, 37, … of the frame.
    expect(addresses()[0]).toBe("D0 = 3C → byte 33");
    expect(addresses()[7]).toBe("D7 = 3C → byte 61");
    expect(big().querySelector('[data-x="10"][data-y="8"]')?.getAttribute("data-lit")).toBe("true");
  });

  it("moves the window with BANK: the same 8 addresses reach another tile", () => {
    render(<BankWindowDemo />);
    press("Tile 0");
    expect(bank()).toMatch(/^BANK \(D8\) = 0 = 0000/);
    expect(lastStore()).toBe("STM D8 ← 0");
    expect(windowRows()).toBe("Window rows 00 00 00 00 00 00 00 00");
    expect(lit()).toBe(26);
    press("D3 bit 0");
    expect(lit()).toBe(27);
    expect(addresses()[3]).toBe("D3 = 01 → byte 12");
    expect(lastStore()).toBe("STM D3 ← 01, which lands in big-screen byte 12");
    expect(big().querySelector('[data-x="0"][data-y="3"]')?.getAttribute("data-lit")).toBe("true");
    // The store went to tile 0: tile 5 still holds its smiley.
    fireEvent.change(screen.getByLabelText("BANK register"), { target: { value: "5" } });
    expect(windowRows()).toBe("Window rows 3C 42 A5 81 A5 99 42 3C");
    press("D3 bit 0");
    expect(addresses()[3]).toBe("D3 = 80 → byte 45");
    expect(lit()).toBe(26);
  });

  it("draws the same 8 rows on any tile, and clears a tile or the screen", () => {
    render(<BankWindowDemo />);
    press("Tile 15");
    press("Store a smiley");
    expect(lit()).toBe(52);
    expect(lastStore()).toBe("8 stores, D0 to D7: a smiley in tile 15");
    expect(big().querySelector('[data-x="26"][data-y="24"]')?.getAttribute("data-lit")).toBe(
      "true",
    );
    press("Clear the window");
    expect(lit()).toBe(26);
    press("Clear the screen");
    expect(lit()).toBe(0);
    expect(windowRows()).toBe("Window rows 00 00 00 00 00 00 00 00");
  });
});

// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { AsciiTyper } from "./AsciiTyper";

afterEach(cleanup);

function setup() {
  render(<AsciiTyper />);
  const input = screen.getByLabelText("TYPE HERE") as HTMLTextAreaElement;
  const tiles = () =>
    within(screen.getByRole("list"))
      .getAllByRole("listitem")
      .map((tile) => tile.firstElementChild?.textContent);
  const slot = (code: number) =>
    screen.getByRole("group").querySelector(`[data-code="${code}"]`) as HTMLButtonElement;
  return { input, tiles, slot };
}

describe("AsciiTyper", () => {
  it("shows one tile per character and lights the last one typed strongest", () => {
    const { input, tiles, slot } = setup();
    fireEvent.change(input, { target: { value: "Hi" } });
    expect(tiles()).toEqual(["H", "i"]);
    expect(slot(72).dataset.lit).toBe("typed");
    expect(slot(105).dataset.lit).toBe("latest");
    expect(slot(65).dataset.lit).toBeUndefined();
  });

  it("turns Enter into a line feed tile", () => {
    const { input, tiles, slot } = setup();
    fireEvent.change(input, { target: { value: "Hi\n" } });
    expect(tiles()).toEqual(["H", "i", "LF"]);
    expect(slot(10).dataset.lit).toBe("latest");
  });

  it("refuses characters outside ASCII and says why", () => {
    const { input, tiles } = setup();
    fireEvent.change(input, { target: { value: "né 😀" } });
    expect(input.value).toBe("n ");
    expect(tiles()).toEqual(["n", "SP"]);
    expect(screen.getByRole("status").textContent).toBe(
      "é 😀 are not in ASCII. ASCII has only 128 slots. The aside on UTF-8 covers the rest.",
    );
    fireEvent.change(input, { target: { value: "n !" } });
    expect(screen.getByRole("status").textContent).toBe("");
  });

  it("types a printable slot when it is pressed and only reads a control slot", () => {
    const { input, slot } = setup();
    fireEvent.change(input, { target: { value: "" } });
    fireEvent.click(slot(65));
    fireEvent.click(slot(27));
    expect(input.value).toBe("A");
    expect(slot(65).getAttribute("aria-label")).toBe(
      "65: Capital letter A. Bits 1000001, hex 41. In your text. Press to type it.",
    );
    expect(slot(27).getAttribute("aria-label")).toBe(
      "27: Escape, control character. Bits 0011011, hex 1B.",
    );
  });

  it("keeps the 128 slots to a single tab stop", () => {
    const { slot } = setup();
    const group = screen.getByRole("group");
    expect(group.querySelectorAll("[data-code]")).toHaveLength(128);
    expect(group.querySelectorAll('[tabindex="0"]')).toHaveLength(1);
    fireEvent.focus(slot(65));
    fireEvent.keyDown(slot(65), { key: "ArrowRight" });
    expect(document.activeElement).toBe(slot(66));
  });
});

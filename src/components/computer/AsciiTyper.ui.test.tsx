// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AsciiTyper } from "./AsciiTyper";

afterEach(cleanup);
beforeEach(() => localStorage.clear());

function setup() {
  render(<AsciiTyper />);
  const input = screen.getByLabelText("TYPE HERE") as HTMLTextAreaElement;
  const tiles = () =>
    within(screen.getByRole("list"))
      .getAllByRole("listitem")
      .map((tile) => tile.firstElementChild?.textContent);
  return { input, tiles };
}

describe("AsciiTyper", () => {
  it("shows one tile per character and marks the last one typed", () => {
    const { input, tiles } = setup();
    fireEvent.change(input, { target: { value: "Hi" } });
    expect(tiles()).toEqual(["H", "i"]);
    const tilesInOrder = screen.getAllByRole("listitem");
    expect(tilesInOrder[0].dataset.latest).toBeUndefined();
    expect(tilesInOrder[1].dataset.latest).toBe("true");
    expect(screen.queryByRole("group")).toBeNull();
  });

  it("turns Enter into a line feed tile", () => {
    const { input, tiles } = setup();
    fireEvent.change(input, { target: { value: "Hi\n" } });
    expect(tiles()).toEqual(["H", "i", "LF"]);
    expect(screen.getAllByRole("listitem").at(-1)?.dataset.latest).toBe("true");
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
});

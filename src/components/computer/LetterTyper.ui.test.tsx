// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { LetterTyper } from "./LetterTyper";

afterEach(cleanup);
beforeEach(() => localStorage.clear());

function setup() {
  const { container } = render(<LetterTyper />);
  const input = screen.getByLabelText("TYPE HERE") as HTMLTextAreaElement;
  const book = screen.getByRole("group", { name: /^Codebook/ });
  const tiles = () =>
    within(screen.getByRole("list"))
      .getAllByRole("listitem")
      .map(
        (tile) => `${tile.firstElementChild?.textContent} ${tile.lastElementChild?.textContent}`,
      );
  const field = (bits: string) =>
    book.querySelector(`[data-state="${Number.parseInt(bits, 2)}"]`) as HTMLInputElement;
  const lit = (bits: string) => field(bits).parentElement?.dataset.lit;
  const statuses = () => screen.getAllByRole("status").map((status) => status.textContent);
  const click = (name: string | RegExp) => fireEvent.click(screen.getByRole("button", { name }));
  return { container, input, book, tiles, field, lit, statuses, click };
}

describe("LetterTyper", () => {
  it("writes each character as the five bits of its state", () => {
    const { container, input, tiles, lit } = setup();
    expect(tiles()).toEqual(["H 01000", "E 00101", "L 01100", "L 01100", "O 01111"]);
    expect(container.textContent).toContain("5 × 5 = 25 BITS");

    fireEvent.change(input, { target: { value: "HI YOU" } });
    expect(tiles()).toEqual(["H 01000", "I 01001", "SP 00000", "Y 11001", "O 01111", "U 10101"]);
    expect(container.textContent).toContain("6 × 5 = 30 BITS");
    expect(lit("10101")).toBe("active");
    expect(lit("01000")).toBe("typed");
    expect(lit("00001")).toBeUndefined();
  });

  it("types small letters as capitals and says so", () => {
    const { input, tiles, statuses } = setup();
    fireEvent.change(input, { target: { value: "HEy" } });
    expect(input.value).toBe("HEY");
    expect(tiles()).toEqual(["H 01000", "E 00101", "Y 11001"]);
    expect(statuses()).toContain("y is not in this codebook, so it was typed as Y.");
  });

  it("refuses a character that has no state", () => {
    const { input, statuses } = setup();
    fireEvent.change(input, { target: { value: "A1" } });
    expect(input.value).toBe("A");
    expect(statuses()).toContain(
      "1 is not in this codebook. All 32 states are taken. To type it, put it in the codebook in place of another character.",
    );
    fireEvent.change(input, { target: { value: "AB" } });
    expect(statuses()).toEqual(["", ""]);
  });

  it("drops the refusal once the character has a state", () => {
    const { input, field, statuses } = setup();
    fireEvent.change(input, { target: { value: "A1" } });
    fireEvent.change(field("11010"), { target: { value: "1" } });
    expect(statuses()).toEqual(["1 took the state of Z. Z has no state now.", ""]);
    fireEvent.change(input, { target: { value: "A1" } });
    expect(input.value).toBe("A1");
  });

  it("trades two characters and keeps the text, with new bits", () => {
    const { input, tiles, field, statuses } = setup();
    fireEvent.focus(field("00001"));
    fireEvent.change(field("00001"), { target: { value: "E" } });
    expect(field("00001").value).toBe("E");
    expect(field("00101").value).toBe("A");
    expect(statuses()).toContain("E and A traded states.");
    expect(input.value).toBe("HELLO");
    expect(tiles()[1]).toBe("E 00001");
  });

  it("gives a state to a new character and leaves the old one without", () => {
    const { input, tiles, field, statuses, click } = setup();
    fireEvent.change(field("01000"), { target: { value: "H1" } });
    expect(field("01000").value).toBe("1");
    expect(statuses()).toContain("1 took the state of H. H has no state now.");
    expect(tiles()[0]).toBe("H NO STATE");

    fireEvent.change(input, { target: { value: "HELLO1" } });
    expect(input.value).toBe("ELLO1");
    expect(tiles().at(-1)).toBe("1 01000");

    click(/^Reset the codebook/);
    expect(field("01000").value).toBe("H");
    expect(tiles().at(-1)).toBe("1 NO STATE");
  });

  it("shuffles the same characters onto other states", () => {
    const { book, input, click } = setup();
    const characters = () => Array.from(book.querySelectorAll("input"), (element) => element.value);
    const before = characters();
    click(/^Shuffle the codebook/);
    expect(characters()).not.toEqual(before);
    expect(characters().sort()).toEqual([...before].sort());
    expect(input.value).toBe("HELLO");
  });

  it("keeps the 32 states to a single tab stop that follows the typed character", () => {
    const { book, field } = setup();
    expect(book.querySelectorAll("[data-state]")).toHaveLength(32);
    expect(book.querySelectorAll('[tabindex="0"]')).toHaveLength(1);
    expect(field("01111").tabIndex).toBe(0);
    fireEvent.focus(field("00001"));
    expect(field("00001").tabIndex).toBe(0);
    fireEvent.keyDown(field("00001"), { key: "ArrowRight" });
    expect(document.activeElement).toBe(field("00010"));
  });
});

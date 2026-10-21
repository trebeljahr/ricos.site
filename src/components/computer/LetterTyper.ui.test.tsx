// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { demoStorageKey } from "src/lib/computer/demoStorage";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { LetterTyper } from "./LetterTyper";

afterEach(cleanup);
beforeEach(() => localStorage.clear());

function setup() {
  const { container } = render(<LetterTyper />);
  const input = screen.getByLabelText("TYPE HERE") as HTMLTextAreaElement;
  const tiles = () =>
    within(screen.getByRole("list"))
      .getAllByRole("listitem")
      .map(
        (tile) => `${tile.firstElementChild?.textContent} ${tile.lastElementChild?.textContent}`,
      );
  return { container, input, tiles };
}

describe("LetterTyper", () => {
  it("contains only the text input and bit output, with no codebook or switches", () => {
    setup();
    expect(screen.getAllByRole("textbox")).toHaveLength(1);
    expect(screen.queryByRole("group")).toBeNull();
    expect(screen.queryByRole("button", { name: /shuffle|reset/i })).toBeNull();
    expect(screen.queryByText(/CODEBOOK ·/)).toBeNull();
  });

  it("writes each character as five bits and marks the latest typed character", () => {
    const { container, input, tiles } = setup();
    expect(tiles()).toEqual(["H 01000", "E 00101", "L 01100", "L 01100", "O 01111"]);
    expect(container.textContent).toContain("5 × 5 = 25 BITS");
    fireEvent.change(input, { target: { value: "HI YOU" } });
    expect(tiles()).toEqual(["H 01000", "I 01001", "SP 00000", "Y 11001", "O 01111", "U 10101"]);
    expect(container.textContent).toContain("6 × 5 = 30 BITS");
    expect(screen.getAllByRole("listitem").at(-1)?.dataset.latest).toBe("true");
  });

  it("types small letters as capitals and says so", () => {
    const { input, tiles } = setup();
    fireEvent.change(input, { target: { value: "HEy" } });
    expect(input.value).toBe("HEY");
    expect(tiles()).toEqual(["H 01000", "E 00101", "Y 11001"]);
    expect(screen.getByRole("status").textContent).toBe(
      "y is not in this codebook, so it was typed as Y.",
    );
  });

  it("refuses unsupported characters without directing the reader to a removed editor", () => {
    const { input } = setup();
    fireEvent.change(input, { target: { value: "A1" } });
    expect(input.value).toBe("A");
    expect(screen.getByRole("status").textContent).toBe(
      "1 is not in this codebook. It holds 32 characters: A–Z, space, and . , ? ! '.",
    );
    fireEvent.change(input, { target: { value: "AB" } });
    expect(screen.getByRole("status").textContent).toBe("");
  });

  it("preserves supported saved text while ignoring stale custom characters and codebooks", () => {
    localStorage.setItem(demoStorageKey("letter-codebook:text"), JSON.stringify("H1e"));
    localStorage.setItem(
      demoStorageKey("letter-codebook:letters"),
      JSON.stringify(Array(32).fill("1")),
    );
    const { input, tiles } = setup();
    expect(input.value).toBe("HE");
    expect(tiles()).toEqual(["H 01000", "E 00101"]);
  });

  it("keeps input method drafts until composition finishes", () => {
    const { input, tiles } = setup();
    fireEvent.compositionStart(input);
    fireEvent.change(input, { target: { value: "he1" } });
    expect(input.value).toBe("he1");
    fireEvent.compositionEnd(input);
    expect(input.value).toBe("HE");
    expect(tiles()).toEqual(["H 01000", "E 00101"]);
  });

  it("clears and replaces text through the existing preset controls", () => {
    const { input } = setup();
    fireEvent.click(screen.getByRole("button", { name: "CLEAR" }));
    expect(input.value).toBe("");
    expect(screen.getByText("NO CHARACTERS YET")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "SOS" }));
    expect(input.value).toBe("SOS");
  });
});

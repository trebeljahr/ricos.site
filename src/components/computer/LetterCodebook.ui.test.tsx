// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { demoStorageKey } from "src/lib/computer/demoStorage";
import { SEED_LETTER_CODEBOOK } from "src/lib/letterCodebook";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { LetterCodebook } from "./LetterCodebook";
import { LetterTyper } from "./LetterTyper";

afterEach(cleanup);
beforeEach(() => localStorage.clear());

describe("LetterCodebook", () => {
  it("reads the switches through a fixed alphabet with no typer or codebook editing", () => {
    render(<LetterCodebook />);
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(
      screen.queryByRole("button", { name: /shuffle|reset|type .* into the text/i }),
    ).toBeNull();
    expect(screen.getByText("SPACE")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /^Switch 5 of 5: off/ }));
    expect(
      screen.getByRole("button", { name: "State 00001: A" }).getAttribute("aria-pressed"),
    ).toBe("true");
    expect(screen.getByText("MEANS").nextElementSibling?.textContent).toBe("00001");
  });

  it("selects states by click and keyboard while keeping one tab stop", () => {
    render(<LetterCodebook />);
    const book = screen.getByRole("group", { name: /^Codebook/ });
    const cells = within(book).getAllByRole("button");
    expect(cells).toHaveLength(32);
    fireEvent.click(cells[8]);
    expect(screen.getByText("MEANS").nextElementSibling?.textContent).toBe("01000");
    expect(book.querySelectorAll('[tabindex="0"]')).toHaveLength(1);
    fireEvent.keyDown(cells[8], { key: "ArrowRight" });
    expect(document.activeElement).toBe(cells[9]);
    expect(screen.getByText("MEANS").nextElementSibling?.textContent).toBe("01001");
  });

  it("keeps its alphabet fixed when the typer loads or changes a saved codebook", () => {
    const saved = [...SEED_LETTER_CODEBOOK];
    [saved[1], saved[5]] = [saved[5], saved[1]];
    localStorage.setItem(demoStorageKey("letter-codebook:letters"), JSON.stringify(saved));
    render(
      <>
        <LetterCodebook />
        <LetterTyper />
      </>,
    );
    const fixed = screen.getByRole("region", {
      name: "Five switches and a fixed codebook of characters",
    });
    const typer = screen.getByRole("region", { name: "Letter typer with an editable codebook" });
    const field = typer.querySelector('[data-state="1"]') as HTMLInputElement;
    expect(field.value).toBe("E");
    fireEvent.change(field, { target: { value: "1" } });
    expect(within(fixed).getByRole("button", { name: "State 00001: A" })).toBeTruthy();
    expect(within(typer).queryByRole("group", { name: "Switches" })).toBeNull();
  });
});

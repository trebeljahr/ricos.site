// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Codebook } from "./Codebook";
import { CodebookMismatch } from "./CodebookMismatch";
import { SwitchStates } from "./SwitchStates";

afterEach(cleanup);

const click = (name: string | RegExp) => fireEvent.click(screen.getByRole("button", { name }));
const current = (list: HTMLElement) => list.querySelector('[aria-current="true"]');

describe("switch states demo", () => {
  it("doubles the states with each switch and marks the current one", () => {
    const { container } = render(<SwitchStates />);
    expect(container.textContent).toContain("1 SWITCH → 21 = 2 STATES");
    expect(
      within(screen.getByRole("list", { name: "All 2 states" })).getAllByRole("listitem"),
    ).toHaveLength(2);

    click("Add a switch");
    click("Add a switch");
    expect(container.textContent).toContain("3 SWITCHES → 23 = 8 STATES");
    const list = screen.getByRole("list", { name: "All 8 states" });
    expect(within(list).getAllByRole("listitem")).toHaveLength(8);
    expect(current(list)?.textContent).toBe("000");

    click(/^Switch 1 of 3: off/);
    click(/^Switch 3 of 3: off/);
    expect(current(list)?.textContent).toBe("101");
    expect(screen.getByRole("button", { name: /^Switch 1 of 3: on/ })).toBeTruthy();

    click("Remove a switch");
    expect(current(screen.getByRole("list", { name: "All 4 states" }))?.textContent).toBe("10");
  });

  it("shows more than 16 states as a grid and stops at eight switches", () => {
    render(<SwitchStates />);
    for (let added = 0; added < 4; added++) click("Add a switch");
    const grid = screen.getByRole("img", { name: /^All 32 states/ });
    expect(grid.children).toHaveLength(32);
    expect(grid.querySelectorAll('[data-current="true"]')).toHaveLength(1);

    for (let added = 0; added < 6; added++) click("Add a switch");
    expect(screen.getByRole("img", { name: /^All 256 states/ }).children).toHaveLength(256);
    expect(screen.getByRole("button", { name: "Add a switch" }).getAttribute("aria-disabled")).toBe(
      "true",
    );
  });
});

describe("codebook demo", () => {
  it("reads the phrase of the current state and takes a new one", () => {
    const { container } = render(<Codebook />);
    const book = screen.getByRole("list", { name: "Codebook" });
    expect(current(book)?.textContent).toBe("00");
    expect(container.textContent).toContain("“Hello”");

    click(/^Switch 2 of 2: off/);
    expect(current(book)?.textContent).toBe("01");
    expect(container.textContent).toContain("“How are you?”");

    const field = screen.getByRole("textbox", { name: "Codebook: meaning of 01" });
    fireEvent.change(field, { target: { value: "Lunch?" } });
    expect(container.textContent).toContain("“Lunch?”");
    fireEvent.change(field, { target: { value: " " } });
    expect(container.textContent).toContain("NO MEANING");

    click(/^Reset the codebook/);
    expect(container.textContent).toContain("“How are you?”");
  });
});

describe("two codebooks demo", () => {
  it("reads the same switches as two messages until both use one book", () => {
    const { container } = render(<CodebookMismatch />);
    expect(container.textContent).toContain("DIFFERENT MESSAGE");
    expect(container.textContent).toContain("“Hello”");
    expect(container.textContent).toContain("“Goodbye”");

    click(/^Person B uses book 1/);
    expect(container.textContent).toContain("SAME MESSAGE");
    expect(container.textContent).not.toContain("“Goodbye”");
  });

  it("steps through the conversation and lets the switches be flipped by hand", () => {
    const { container } = render(<CodebookMismatch />);
    const summary = () => container.querySelector("p[aria-live]")?.textContent;
    expect(summary()).toBe(
      "Switches 00. Person A sends “Hello”. Person B reads “Goodbye”. Different message.",
    );

    click("Next step of the conversation");
    expect(container.textContent).toContain("STEP 2/4");
    expect(summary()).toBe(
      "Switches 01. Person A reads “How are you?”. Person B sends “I am hungry”. Different message.",
    );

    click(/^Switch 1 of 2: off/);
    expect(container.textContent).toContain("BY HAND");
    expect(summary()).toContain("Switches 11.");

    click("Previous step of the conversation");
    expect(container.textContent).toContain("STEP 1/4");
    expect(summary()).toContain("Switches 00.");
  });
});

// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { TransistorGates } from "./TransistorGates";

afterEach(cleanup);

const click = (name: string | RegExp) => fireEvent.click(screen.getByRole("button", { name }));
const schematic = () => screen.getByRole("img", { name: /gate from \d transistors/ });
const output = () => screen.getByLabelText(/^Output Y:/).textContent;
const explanation = (container: HTMLElement) =>
  container.querySelector("ul[aria-live]")?.textContent ?? "";

describe("transistor gates demo", () => {
  it("starts with the inverter and lights the path that drives Y", () => {
    const { container } = render(<TransistorGates />);
    expect(
      screen.getByRole("button", { name: /^Show the NOT gate/ }).getAttribute("aria-pressed"),
    ).toBe("true");
    expect(schematic().getAttribute("aria-label")).toContain("A is 0. On: pMOS A. Off: nMOS A.");
    expect(output()).toBe("1");
    expect(explanation(container)).toContain("pMOS A is on, so Y connects to 1.");
    expect(screen.queryByRole("button", { name: /^Input B/ })).toBeNull();

    click(/^Input A: 0/);
    expect(output()).toBe("0");
    expect(schematic().getAttribute("aria-label")).toContain("On: nMOS A. Off: pMOS A.");
    expect(explanation(container)).toContain("pMOS A is off, so Y has no path to 1.");
  });

  it("follows the truth table of NAND, and a row click sets the inputs", () => {
    render(<TransistorGates />);
    click(/^Show the NAND gate/);
    const table = screen.getByRole("group", { name: "NAND truth table" });
    const rows = within(table).getAllByRole("button");
    expect(rows.map((row) => row.textContent)).toEqual(["001", "011", "101", "110"]);
    expect(table.querySelector('[aria-current="true"]')?.textContent).toBe("001");

    click(/^A 1, B 1: Y is 0/);
    expect(output()).toBe("0");
    expect(table.querySelector('[aria-current="true"]')?.textContent).toBe("110");
    expect(screen.getByRole("button", { name: /^Input B: 1/ }).getAttribute("aria-pressed")).toBe(
      "true",
    );
    expect(schematic().getAttribute("aria-label")).toContain(
      "Both nMOS are on, so Y connects to 0.",
    );

    click(/^Input A: 1/);
    expect(output()).toBe("1");
    expect(table.querySelector('[aria-current="true"]')?.textContent).toBe("011");
  });

  it("draws AND as a NAND stage and a NOT stage", () => {
    const { container } = render(<TransistorGates gate="and" />);
    expect(schematic().getAttribute("aria-label")).toMatch(/^AND gate from 6 transistors/);
    expect(container.querySelectorAll("ul[aria-live] li")).toHaveLength(2);
    expect(explanation(container)).toContain("NAND Both pMOS are on, so X connects to 1.");
    expect(explanation(container)).toContain("NOT nMOS X is on, so Y connects to 0.");
    click(/^A 1, B 1/);
    expect(output()).toBe("1");
  });

  it("hides the picker and the key when embedded for one gate", () => {
    const { container } = render(<TransistorGates gate="nor" fixed legend={false} />);
    expect(screen.queryByRole("button", { name: /^Show the/ })).toBeNull();
    expect(container.textContent).toContain("SERIES PMOS, PARALLEL NMOS");
    expect(container.textContent).not.toContain("HOW TO READ IT");
    expect(output()).toBe("1");
  });
});

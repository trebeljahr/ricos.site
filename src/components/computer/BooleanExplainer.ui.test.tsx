// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { BooleanExplanation, BooleanNotation, TruthTableScale } from "./BooleanExplainer";

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

const operation = (value: string) =>
  fireEvent.change(screen.getByRole("combobox", { name: "Operation" }), { target: { value } });

describe("Boolean notation", () => {
  it("changes spellings without changing the table, and drives the shared gate circuit from each selected row", () => {
    render(<BooleanNotation />);
    const inputSwitch = (name: "A" | "B", state: "ON" | "OFF") =>
      within(screen.getByLabelText(`${name} — SWITCH part`)).getByRole("button", { name: state });
    expect(inputSwitch("A", "OFF").getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(screen.getByRole("button", { name: "A 1, B 1 gives C 1. Select inputs." }));
    expect(inputSwitch("A", "ON").getAttribute("aria-pressed")).toBe("true");
    expect(inputSwitch("B", "ON").getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByLabelText("Boolean output").textContent).toBe("C = 1");
    expect(
      within(screen.getByLabelText("OUTPUT — LAMP part")).getByLabelText("LED on"),
    ).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Use A · B, read as A and B" }));
    expect(screen.getByRole("math").textContent).toBe("C = A · B");
    expect(screen.getByLabelText("Boolean output").textContent).toBe("C = 1");
    expect(
      screen
        .getByRole("button", { name: "A 1, B 1 gives C 1. Select inputs." })
        .getAttribute("aria-current"),
    ).toBe("true");

    operation("xor");
    expect(
      within(screen.getByLabelText("OUTPUT — LAMP part")).getByLabelText("LED off"),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "A 0, B 1 gives C 1. Select inputs." }));
    expect(inputSwitch("A", "OFF").getAttribute("aria-pressed")).toBe("false");
    expect(inputSwitch("B", "ON").getAttribute("aria-pressed")).toBe("true");
    expect(
      within(screen.getByLabelText("OUTPUT — LAMP part")).getByLabelText("LED on"),
    ).toBeTruthy();

    operation("not");
    expect(screen.queryByRole("button", { name: /^Input B:/ })).toBeNull();
    expect(within(screen.getByRole("table")).getAllByRole("row")).toHaveLength(3);
    fireEvent.click(screen.getByRole("button", { name: "A 1 gives C 0. Select inputs." }));
    expect(
      within(screen.getByLabelText("OUTPUT — LAMP part")).getByLabelText("LED off"),
    ).toBeTruthy();
  });

  it("handles implication direction and false premises explicitly", () => {
    render(<BooleanNotation />);
    operation("implies");
    expect(screen.getByLabelText("Boolean output").textContent).toBe("C = 1");
    expect(screen.queryByLabelText("Boolean gate circuit")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "A 1, B 0 gives C 0. Select inputs." }));
    expect(screen.getByLabelText("Boolean output").textContent).toBe("C = 0");
    operation("converse");
    expect(screen.getByLabelText("Boolean output").textContent).toBe("C = 1");
    expect(screen.getByRole("math").getAttribute("aria-label")).toBe("C equals A is implied by B");
  });
});

describe("truth table scale", () => {
  it("separates row count from functions and lets each output column define a new function", () => {
    const { container } = render(<TruthTableScale />);
    fireEvent.click(screen.getByRole("button", { name: "Row 11 output: 0. Flip output." }));
    expect(container.textContent).toContain("Complete output column0001");
    const counts = container.querySelector("dl");
    expect(counts?.textContent).toContain("Rows in one truth table4");
    expect(counts?.textContent).toContain("Different functions with one output bit16");

    fireEvent.change(screen.getByRole("slider"), { target: { value: "0" } });
    expect(screen.getAllByRole("button", { name: /Flip output/ })).toHaveLength(1);
    expect(container.textContent).toContain("One empty input case, two constant functions");
    fireEvent.click(screen.getByRole("button", { name: "Row no inputs output: 0. Flip output." }));
    expect(container.textContent).toContain("Complete output column1");
  });

  it("keeps large cases bounded and resets the example column when input width changes", () => {
    const { container } = render(<TruthTableScale />);
    fireEvent.click(screen.getByRole("button", { name: "Row 00 output: 0. Flip output." }));
    fireEvent.change(screen.getByRole("slider"), { target: { value: "8" } });
    expect(screen.getAllByRole("button", { name: /Flip output/ })).toHaveLength(8);
    expect(container.textContent).toContain("Showing the first 8 of 256 rows");
    expect(container.textContent).toContain("Visible output column00000000");
    expect(container.querySelector("dl")?.textContent).toContain(
      "115,792,089,237,316,195,423,570,985,008,687,907,853,269,984,665,640,564,039,457,584,007,913,129,639,936",
    );
  });
});

describe("shared explanations", () => {
  it("reuses canonical content with independent native disclosures and unique anchors, including nested instances", () => {
    const { container } = render(
      <>
        <BooleanExplanation topic="rows-and-functions">
          <BooleanExplanation topic="constants" />
        </BooleanExplanation>
        <BooleanExplanation topic="rows-and-functions" />
        <BooleanExplanation topic="computer-state" />
      </>,
    );
    const details = [...container.querySelectorAll("details")];
    expect(details).toHaveLength(4);
    expect(new Set(details.map((detail) => detail.id)).size).toBe(4);
    expect(details.every((detail) => !detail.open)).toBe(true);
    fireEvent.click(details[0].querySelector("summary")!);
    expect(details[0].open).toBe(true);
    expect(details[1].open).toBe(false);
    expect(details[2].open).toBe(false);
    fireEvent.click(details[1].querySelector("summary")!);
    expect(details[1].open).toBe(true);
    expect(details[0].open).toBe(true);
    expect(details[2].open).toBe(false);
    expect(details[0].textContent).toContain("2 raised to the number of rows");
    expect(details[2].textContent).toContain("2 raised to the number of rows");
    expect(details[3].textContent).toContain("every stored bit as well as the external inputs");
    expect(details[3].textContent).toContain("outputs and the next stored state");
  });
});

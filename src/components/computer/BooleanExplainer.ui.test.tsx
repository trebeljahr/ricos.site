// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { BooleanExplanation, TruthTableScale } from "./BooleanExplainer";

afterEach(() => {
  cleanup();
  window.localStorage.clear();
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

// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { LogicBuilder } from "./LogicBuilder";

beforeEach(() => {
  localStorage.clear();
  Element.prototype.setPointerCapture = () => {};
});
afterEach(cleanup);

// A role query with a name computes the accessible name of every candidate,
// and in jsdom each of those calls getComputedStyle. Over the whole builder
// (~160 buttons) that is tens of milliseconds per query, enough to push this
// test past the 5 s limit when the machine is busy. So query aria-labelled
// controls by label, narrow the palette with its search box, and scope the
// remaining role queries to the small group that holds the button.
const searchParts = (query: string) => {
  const palette = screen.getByLabelText("Gate palette");
  fireEvent.change(within(palette).getByLabelText("Search parts"), { target: { value: query } });
  return within(palette);
};
const switchOn = (part: string) =>
  fireEvent.click(within(screen.getByLabelText(part)).getByRole("button", { name: "OFF" }));

describe("expandable memory", () => {
  it("keeps register state when opening and closing its black box", () => {
    render(<LogicBuilder />);
    const memories = searchParts("4 × 4");
    expect(memories.getByRole("button", { name: "4 × 4 SRAM" })).toBeTruthy();
    expect(memories.getByRole("button", { name: "4 × 4 DRAM" })).toBeTruthy();
    expect(memories.getByRole("button", { name: "4 × 4 flash memory" })).toBeTruthy();
    fireEvent.click(
      searchParts("parallel register").getByRole("button", { name: "8-bit parallel register" }),
    );
    fireEvent.click(screen.getByLabelText("Enter 8-bit parallel register"));

    switchOn("D0 — SWITCH part");
    switchOn("LOAD — SWITCH part");
    fireEvent.click(
      within(screen.getByLabelText("Simulation")).getByRole("button", { name: "Step ½ cycle" }),
    );
    expect(within(screen.getByLabelText("Q0 — LAMP part")).getByLabelText("LED on")).toBeTruthy();

    fireEvent.click(
      within(screen.getByLabelText("Circuit depth")).getByRole("button", { name: "← Back" }),
    );
    fireEvent.click(screen.getByLabelText("Enter 8-bit parallel register"));
    expect(within(screen.getByLabelText("Q0 — LAMP part")).getByLabelText("LED on")).toBeTruthy();
  });
});

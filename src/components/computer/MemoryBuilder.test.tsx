// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { LogicBuilder } from "./LogicBuilder";
import { testButton } from "./testButton";

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
const switchOn = (part: string) => fireEvent.click(testButton("OFF", screen.getByLabelText(part)));

describe("expandable memory", () => {
  it("keeps register state when opening and closing its black box", () => {
    render(<LogicBuilder />);
    fireEvent.click(
      searchParts("parallel register").getByRole("button", { name: "8-bit parallel register" }),
    );
    fireEvent.click(screen.getByLabelText("Enter 8-bit parallel register"));

    switchOn("D0 — SWITCH part");
    switchOn("LOAD — SWITCH part");
    fireEvent.click(testButton("Step ½ cycle", screen.getByLabelText("Simulation")));
    expect(within(screen.getByLabelText("Q0 — LAMP part")).getByLabelText("LED on")).toBeTruthy();

    fireEvent.click(testButton("← Back", screen.getByLabelText("Circuit depth")));
    fireEvent.click(screen.getByLabelText("Enter 8-bit parallel register"));
    expect(within(screen.getByLabelText("Q0 — LAMP part")).getByLabelText("LED on")).toBeTruthy();
  }, 15000);
});

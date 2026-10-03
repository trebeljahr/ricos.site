// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { LogicBuilder } from "./LogicBuilder";

afterEach(cleanup);

describe("inline circuit unfolding", () => {
  it("keeps the board and records fold and unfold in history", () => {
    render(<LogicBuilder />);
    const board = screen.getByRole("application", { name: "Circuit canvas" });
    fireEvent.click(screen.getByRole("button", { name: "Unfold SUM in place" }));
    expect(screen.getByRole("application", { name: "Circuit canvas" })).toBe(board);
    expect(screen.getByRole("button", { name: "Fold SUM in place" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(screen.getByRole("button", { name: "Unfold SUM in place" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Redo" }));
    expect(screen.getByRole("button", { name: "Fold SUM in place" })).toBeTruthy();
  });

  it("expands a whole adder box one level at a time", () => {
    render(<LogicBuilder />);
    const parts = screen.getByLabelText("Gate palette");
    fireEvent.click(within(parts).getByRole("button", { name: "8-bit full adder" }));
    const adder = screen.getByRole("group", { name: /8-bit full adder.*part/i });
    fireEvent.click(within(adder).getByRole("button", { name: /Unfold .* in place/i }));
    expect(screen.getByRole("application", { name: "Circuit canvas" })).toBeTruthy();
    const expanded = screen.getByLabelText("8-bit full adder expanded circuit");
    expect(within(expanded).getByRole("button", { name: "Unfold FULL ADDER 0" })).toBeTruthy();
    fireEvent.click(within(adder).getByRole("button", { name: "Unfold one level deeper" }));
    expect(within(expanded).getAllByRole("button", { name: "Unfold HALF ADDER 1" }).length).toBeGreaterThan(0);
    fireEvent.click(within(adder).getByRole("button", { name: "Unfold one level deeper" }));
    expect(within(expanded).getAllByRole("button", { name: "Unfold SUM XOR" }).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(within(expanded).getAllByRole("button", { name: "Unfold HALF ADDER 1" }).length).toBeGreaterThan(0);
  });
});

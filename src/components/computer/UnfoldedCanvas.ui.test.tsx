// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { LogicBuilder } from "./LogicBuilder";

afterEach(cleanup);

describe("inline circuit unfolding", () => {
  it("unfolds and folds a gate without leaving the builder", () => {
    render(<LogicBuilder />);
    expect(screen.getByRole("button", { name: "Run clock" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Unfold SUM in place" }));
    expect(screen.getByRole("button", { name: "Run clock" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Fold SUM" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Fold SUM" }));
    expect(screen.getByRole("button", { name: "Unfold SUM in place" })).toBeTruthy();
  });
  it("lets a black box enter its own detail view or unfold recursively", () => {
    render(<LogicBuilder />);
    fireEvent.click(screen.getByRole("button", { name: "Examples" }));
    fireEvent.click(screen.getByTitle("Open 8-bit ALU blueprint"));
    fireEvent.click(screen.getByRole("button", { name: "Unfold ALU SLICE 0 in place" }));
    expect(screen.getByRole("button", { name: "Unfold FULL ADDER" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Unfold FULL ADDER" }));
    expect(screen.getByRole("button", { name: "Unfold HALF ADDER 1" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Enter FULL ADDER" }));
    expect(screen.getByText("1-bit full adder")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Back/ }));
    expect(screen.getByRole("button", { name: "Fold FULL ADDER" })).toBeTruthy();
  });
});

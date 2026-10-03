// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { LogicBuilder } from "./LogicBuilder";

beforeEach(() => {
  localStorage.clear();
  Element.prototype.setPointerCapture = () => {};
});
afterEach(cleanup);

describe("circuit depth", () => {
  it("shows construction labels as boundaries and drills through gate implementations", () => {
    render(<LogicBuilder />);
    fireEvent.click(screen.getByRole("button", { name: "NOR only" }));
    fireEvent.click(screen.getByRole("button", { name: /NAND from NOR gates/ }));
    expect(screen.getByLabelText("NAND from NOR gates circuit boundary")).toBeTruthy();
    expect(screen.getAllByRole("group", { name: "NOR part" })).toHaveLength(4);

    fireEvent.pointerDown(screen.getAllByRole("group", { name: "NOR part" })[0], {
      button: 0,
      pointerId: 1,
    });
    fireEvent.click(screen.getByRole("button", { name: "NAND only ↘" }));
    expect(screen.getByText("Level 2")).toBeTruthy();
    expect(screen.getByLabelText("NOR from NAND gates circuit boundary")).toBeTruthy();
    fireEvent.pointerDown(screen.getAllByRole("group", { name: "NAND part" })[0], {
      button: 0,
      pointerId: 2,
    });
    fireEvent.click(screen.getByRole("button", { name: "CMOS transistors ↘" }));
    expect(screen.getByText("Level 3")).toBeTruthy();
    expect(screen.getByLabelText("NAND from CMOS transistors circuit boundary")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "← Back" }));
    fireEvent.click(screen.getByRole("button", { name: "← Back" }));
    expect(screen.getByLabelText("NAND from NOR gates circuit boundary")).toBeTruthy();
  });

  it("opens a black box and returns to the parent circuit", () => {
    render(<LogicBuilder />);
    fireEvent.click(screen.getByRole("button", { name: "Examples" }));
    const row = screen.getByText("Half adder", { selector: "button" }).parentElement;
    expect(row).toBeTruthy();
    fireEvent.click(within(row as HTMLElement).getByRole("button", { name: /Black box/ }));
    fireEvent.click(screen.getByRole("button", { name: "Open internal wiring ↘" }));
    expect(screen.getByText("Level 2")).toBeTruthy();
    expect(screen.getAllByRole("group", { name: "SUM part" }).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: "← Back" }));
    expect(screen.getByRole("group", { name: "Half adder part" })).toBeTruthy();
  });
});

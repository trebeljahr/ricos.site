// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SwitchLogic, TransistorSwitches } from "./SwitchLogic";
import { AdditionTable, FullAdderTable, GateTruthTable } from "./TruthTables";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const click = (name: string | RegExp) => fireEvent.click(screen.getByRole("button", { name }));
const currentRow = (name: string) =>
  within(screen.getByRole("list", { name }))
    .getAllByRole("button")
    .find((row) => row.getAttribute("aria-current") === "true");

describe("truth tables", () => {
  it("marks the row of the current inputs and sets inputs from a row", () => {
    render(<GateTruthTable />);
    expect(currentRow("Truth table of AND")?.textContent).toBe("000");
    expect(
      within(screen.getByLabelText("OUTPUT — LAMP part")).getByLabelText("LED off"),
    ).toBeTruthy();
    click(/^Input A: 0/);
    click(/^Input B: 0/);
    expect(currentRow("Truth table of AND")?.textContent).toBe("111");
    expect(
      within(screen.getByLabelText("OUTPUT — LAMP part")).getByLabelText("LED on"),
    ).toBeTruthy();
    expect(screen.getByRole("img", { name: "Output OUT: 1" })).toBeTruthy();
    fireEvent.click(screen.getByLabelText("AND — AND part"));
    expect(
      within(screen.getByLabelText("OUTPUT — LAMP part")).getByLabelText("LED on"),
    ).toBeTruthy();

    click("XOR");
    expect(currentRow("Truth table of XOR")?.textContent).toBe("110");
    expect(
      within(screen.getByLabelText("OUTPUT — LAMP part")).getByLabelText("LED off"),
    ).toBeTruthy();
    click(/^A 0, B 1 gives OUT 1/);
    expect(screen.getByRole("button", { name: /^Input A: 0/ })).toBeTruthy();
  });

  it("shows two-input gates as a 2 × 2 grid and NOT as two rows", () => {
    render(<GateTruthTable gate="nand" view="grid" />);
    const grid = screen.getByRole("group", { name: "NAND as a grid" });
    expect(
      within(grid)
        .getAllByRole("button")
        .map((cell) => cell.textContent),
    ).toEqual(["1", "1", "1", "0"]);
    click("NOT");
    expect(
      within(screen.getByRole("list", { name: "Truth table of NOT" })).getAllByRole("button"),
    ).toHaveLength(2);
    expect(screen.queryByRole("group", { name: "Table layout" })).toBeNull();
  });

  it("finds the gates for SUM and CARRY", () => {
    const { container } = render(<AdditionTable />);
    expect(container.textContent).toContain("1 + 1 = 10");
    click("XOR");
    expect(container.textContent).toContain("XOR matches SUM in 4 of 4 rows and CARRY in 1 of 4.");
    click("AND");
    expect(container.textContent).toContain("AND matches SUM in 1 of 4 rows and CARRY in 4 of 4.");
  });

  it("counts the inputs that are on in the full adder table", () => {
    const { container } = render(<FullAdderTable />);
    expect(container.textContent).toContain("1 + 0 + 1 = 10");
    click(/^Input B: 0/);
    expect(container.textContent).toContain("1 + 1 + 1 = 11");
    expect(container.textContent).toContain("THREE INPUTS ARE ON");
  });
});

describe("switch logic", () => {
  it("clicks the physical contacts and sparks only when a path completes", () => {
    vi.useFakeTimers();
    const { container } = render(<SwitchLogic />);
    const board = screen.getByRole("group", { name: "Physical switches and a lamp" });
    expect(within(board).getAllByRole("button")).toHaveLength(2);
    expect(container.textContent).not.toContain("CASES TRIED");
    click(/^Switch A: open/);
    expect(screen.getByRole("img", { name: "Output LAMP: 0" })).toBeTruthy();
    expect(screen.queryByTestId("switch-spark")).toBeNull();
    expect(
      screen.getByRole("button", { name: /^Switch A: closed/ }).getAttribute("aria-pressed"),
    ).toBe("true");
    click(/^Switch B: open/);
    expect(screen.getByRole("img", { name: "Output LAMP: 1" })).toBeTruthy();
    expect(screen.getByTestId("switch-spark")).toBeTruthy();
    act(() => vi.advanceTimersByTime(600));
    expect(screen.queryByTestId("switch-spark")).toBeNull();
    click(/^Switch A: closed/);
    expect(screen.getByRole("img", { name: "Output LAMP: 0" })).toBeTruthy();
    expect(screen.queryByTestId("switch-spark")).toBeNull();
    expect(screen.queryByRole("button", { name: /REVEAL|HIDE THE GATE/ })).toBeNull();

    click("SIDE BY SIDE");
    expect(screen.getByRole("img", { name: "Output LAMP: 0" })).toBeTruthy();
    click(/^Switch A: open/);
    expect(screen.getByRole("img", { name: "Output LAMP: 1" })).toBeTruthy();
    expect(screen.getByTestId("switch-spark")).toBeTruthy();
  });

  it("uses separate battery selectors to control shared transistor gates", () => {
    const { container } = render(<TransistorSwitches />);
    expect(container.textContent).not.toContain("CASES TRIED");
    expect(screen.queryByRole("button", { name: /^Control B:/ })).toBeNull();
    click(/^Control A: low/);
    expect(screen.getByRole("img", { name: /NMOS A transistor conducting/ })).toBeTruthy();
    expect(screen.getByRole("img", { name: "Output LAMP: 1" })).toBeTruthy();
    expect(screen.getByTestId("switch-spark")).toBeTruthy();
    click("IN A ROW · AND");
    expect(screen.getByRole("img", { name: "Output LAMP: 0" })).toBeTruthy();
    click(/^Control A: low/);
    click(/^Control B: low/);
    expect(screen.getByRole("img", { name: "Output LAMP: 1" })).toBeTruthy();
    click("NOT");
    expect(screen.getByRole("img", { name: "Output LAMP: 1" })).toBeTruthy();
    click(/^Control A: low/);
    expect(screen.getByRole("img", { name: "Output LAMP: 0" })).toBeTruthy();
    click("XOR");
    expect(screen.getAllByRole("button", { name: /^Control A: low/ })).toHaveLength(1);
    expect(screen.getAllByRole("img", { name: /A transistor .*gate low/ })).toHaveLength(2);
    fireEvent.click(screen.getAllByRole("button", { name: /^Control A: low/ })[0]);
    expect(screen.getByRole("img", { name: "Output LAMP: 1" })).toBeTruthy();
    expect(screen.getByTestId("switch-spark")).toBeTruthy();
    fireEvent.click(screen.getAllByRole("button", { name: /^Control B: low/ })[0]);
    expect(screen.getByRole("img", { name: "Output LAMP: 0" })).toBeTruthy();
    expect(screen.queryByTestId("switch-spark")).toBeNull();
  });
});

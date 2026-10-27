// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { transistorLampDemo } from "../../lib/computer/demoCircuits";
import { SwitchLogic, TransistorSwitches } from "./SwitchLogic";
import { AdditionTable, FullAdderTable, GateTruthTable } from "./TruthTables";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const click = (name: string | RegExp) => fireEvent.click(screen.getByRole("button", { name }));
const currentRow = (name: string) =>
  within(
    within(screen.getByRole("complementary", { name: "Truth table" })).getByRole("table", { name }),
  )
    .getAllByRole("row")
    .find((row) => row.getAttribute("data-current") === "true");

describe("truth tables", () => {
  it("marks the row of the current inputs and sets inputs from a row", () => {
    render(<GateTruthTable />);
    expect(currentRow("Truth table of AND")?.textContent).toBe("000");
    expect(
      within(screen.getByLabelText("OUTPUT — LAMP part")).getByLabelText("LED off"),
    ).toBeTruthy();
    fireEvent.click(
      within(screen.getByLabelText("A — SWITCH part")).getByRole("button", { name: "OFF" }),
    );
    fireEvent.click(
      within(screen.getByLabelText("B — SWITCH part")).getByRole("button", { name: "OFF" }),
    );
    expect(currentRow("Truth table of AND")?.textContent).toBe("111");
    expect(
      within(screen.getByLabelText("OUTPUT — LAMP part")).getByLabelText("LED on"),
    ).toBeTruthy();
    expect(screen.queryByRole("button", { name: /^Input A:/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /SOUND/ })).toBeNull();
    fireEvent.click(screen.getByLabelText("AND — AND part"));
    expect(
      within(screen.getByLabelText("OUTPUT — LAMP part")).getByLabelText("LED on"),
    ).toBeTruthy();

    fireEvent.click(screen.getByText("Gate: AND", { selector: "summary" }));
    click("XOR");
    expect(currentRow("Truth table of XOR")?.textContent).toBe("110");
    expect(
      within(screen.getByLabelText("OUTPUT — LAMP part")).getByLabelText("LED off"),
    ).toBeTruthy();
    click(/^A 0, B 1 gives OUT 1/);
    expect(
      within(screen.getByLabelText("A — SWITCH part")).getByRole("button", { name: "OFF" }),
    ).toBeTruthy();
    expect(
      within(screen.getByLabelText("B — SWITCH part")).getByRole("button", { name: "ON" }),
    ).toBeTruthy();
    fireEvent.click(
      within(screen.getByLabelText("A — SWITCH part")).getByRole("button", { name: "OFF" }),
    );
    expect(currentRow("Truth table of XOR")?.textContent).toBe("110");
  });

  it("always uses the sidebar table, including legacy grid embeds and NOT", () => {
    render(<GateTruthTable gate="nand" view="grid" />);
    expect(screen.getByRole("table", { name: "Truth table of NAND" })).toBeTruthy();
    expect(screen.queryByRole("group", { name: "Table layout" })).toBeNull();
    expect(screen.queryByRole("button", { name: /^(Table|Grid)$/ })).toBeNull();
    expect(screen.queryByRole("combobox")).toBeNull();
    fireEvent.click(screen.getByText("Gate: NAND", { selector: "summary" }));
    const menu = screen.getByText("Gate: NAND").closest("details")!;
    click("NOT");
    expect(menu.open).toBe(false);
    expect(
      within(screen.getByRole("table", { name: "Truth table of NOT" })).getAllByRole("row"),
    ).toHaveLength(3);
    click(/^A 1 gives OUT 0/);
    expect(currentRow("Truth table of NOT")?.textContent).toBe("10");
  });

  it("finds the gates for SUM and CARRY", () => {
    const { container } = render(<AdditionTable />);
    expect(
      within(screen.getByRole("complementary", { name: "Truth table" })).getByRole("table", {
        name: "Truth table of one-bit addition",
      }),
    ).toBeTruthy();
    expect(container.textContent).toContain("1 + 1 = 10");
    fireEvent.click(screen.getByText("Compare: None", { selector: "summary" }));
    click("XOR");
    expect(container.textContent).toContain("XOR matches SUM in 4 of 4 rows and CARRY in 1 of 4.");
    fireEvent.click(screen.getByText("Compare: XOR", { selector: "summary" }));
    click("AND");
    expect(container.textContent).toContain("AND matches SUM in 1 of 4 rows and CARRY in 4 of 4.");
  });

  it("counts the inputs that are on in the full adder table", () => {
    const { container } = render(<FullAdderTable />);
    expect(container.textContent).toContain("1 + 0 + 1 = 10");
    fireEvent.click(
      within(screen.getByLabelText("B — SWITCH part")).getByRole("button", { name: "OFF" }),
    );
    expect(container.textContent).toContain("1 + 1 + 1 = 11");
    expect(currentRow("Truth table of a full adder")?.textContent).toBe("11111");
    click(/^A 0, B 0, CIN 0 gives COUT 0, SUM 0/);
    expect(currentRow("Truth table of a full adder")?.textContent).toBe("00000");
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
    click("AND");
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
    expect(screen.getAllByRole("img", { name: /^(N|P)MOS .*transistor/ })).toHaveLength(4);
    fireEvent.click(screen.getAllByRole("button", { name: /^Control A: low/ })[0]);
    expect(screen.getByRole("img", { name: "Output LAMP: 1" })).toBeTruthy();
    expect(screen.getByTestId("switch-spark")).toBeTruthy();
    fireEvent.click(screen.getAllByRole("button", { name: /^Control B: low/ })[0]);
    expect(screen.getByRole("img", { name: "Output LAMP: 0" })).toBeTruthy();
    expect(screen.queryByTestId("switch-spark")).toBeNull();
  });
  it.each([
    ["single", [false, false, true, true]],
    ["series", [false, false, false, true]],
    ["parallel", [false, true, true, true]],
    ["not", [true, true, false, false]],
    ["nand", [true, true, true, false]],
    ["nor", [true, false, false, false]],
    ["xor", [false, true, true, false]],
    ["xnor", [true, false, false, true]],
  ] as const)("traces the complete %s load path for every input pair", (wiring, cases) => {
    const { container } = render(<TransistorSwitches wiring={wiring} fixed />);
    for (const [index, [a, b]] of [
      [false, false],
      [false, true],
      [true, false],
      [true, true],
    ].entries()) {
      for (const [name, high] of [
        ["A", a],
        ["B", b],
      ] as const) {
        const control = screen.queryByRole("button", { name: new RegExp(`^Control ${name}:`) });
        if (control && (control.getAttribute("aria-pressed") === "true") !== high)
          fireEvent.click(control);
      }
      const lit = cases[index];
      expect(screen.getByRole("img", { name: `Output LAMP: ${lit ? 1 : 0}` })).toBeTruthy();
      expect(Boolean(container.querySelector("[data-current]"))).toBe(lit);
      expect(container.querySelector("[data-signal][data-current]")).toBeNull();
      expect(screen.getByRole("status").textContent).toBe(
        wiring === "single"
          ? lit
            ? "Complete path · lamp on"
            : "Broken path · lamp off"
          : `OUT · ${lit ? 1 : 0} · lamp ${lit ? "on" : "off"}`,
      );
    }
  });

  it.each(["series", "parallel", "not", "nand", "nor", "xor", "xnor"] as const)(
    "draws every native %s connection, including the input gates",
    (gate) => {
      const { container } = render(<TransistorSwitches wiring={gate} fixed />);
      for (const wire of transistorLampDemo(gate).wires) {
        expect(
          container.querySelector(`[data-wire-id="${wire.id}"] path`),
          `Missing visible wire ${wire.id}`,
        ).toBeTruthy();
      }
      for (const node of transistorLampDemo(gate).nodes.filter((node) => node.type === "switch")) {
        expect(container.querySelector(`[data-wire-id="${node.id}-supply"] path`)).toBeTruthy();
        expect(
          container.querySelector(`[data-wire-id="${node.id}-bias-ground"] path`),
        ).toBeTruthy();
      }
    },
  );

  it("stops the physical current trace when a series contact opens", () => {
    const { container } = render(<SwitchLogic fixed />);
    click(/^Switch A: open/);
    expect(container.querySelector("[data-current]")).toBeNull();
    click(/^Switch B: open/);
    expect(container.querySelector("[data-current]")).toBeTruthy();
    click(/^Switch A: closed/);
    expect(container.querySelector("[data-current]")).toBeNull();
  });
});

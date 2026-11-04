// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GateWirings } from "./GateWirings";
import { TransistorAnatomy } from "./TransistorAnatomy";

vi.mock("./TransistorAnatomyScene", () => ({ default: () => null }));

afterEach(cleanup);
const click = (name: string | RegExp) => fireEvent.click(screen.getByRole("button", { name }));

describe("transistor anatomy", () => {
  it("shows steady control current on the BJT and none on a gate", () => {
    render(<TransistorAnatomy />);
    fireEvent.change(screen.getByRole("slider", { name: "GATE VOLTAGE" }), {
      target: { value: "1" },
    });
    expect(screen.getByTestId("control-current").textContent).toBe("0");
    expect(screen.getByText("GATE WIRE")).toBeTruthy();
    click("BJT");
    expect(screen.getByText("BASE WIRE")).toBeTruthy();
    expect(screen.getByTestId("control-current").textContent).not.toBe("0");
    expect(screen.getByText("ON")).toBeTruthy();
  });
});

describe("transistor anatomy controls", () => {
  it("has no slice control, no legend and no acronyms", () => {
    const { container } = render(<TransistorAnatomy />);
    expect(screen.queryByText("SLICE")).toBeNull();
    expect(container.querySelector("ul")).toBeNull();
    expect(container.querySelector("svg")).toBeNull();
    expect(container.textContent).not.toMatch(/V[GB][SE]/);
    click("BJT");
    expect(screen.getByRole("slider", { name: "BASE VOLTAGE" })).toBeTruthy();
  });

  it("calls the current at zero gate voltage a leak", () => {
    render(<TransistorAnatomy />);
    expect(screen.getByTestId("main-current").textContent).toContain("LEAK");
    fireEvent.change(screen.getByRole("slider", { name: "GATE VOLTAGE" }), {
      target: { value: "1" },
    });
    expect(screen.getByTestId("main-current").textContent).not.toContain("LEAK");
  });
});

describe("gate wirings", () => {
  it("wires A and B to the gates that read them, with no shape to choose", () => {
    const { container } = render(<GateWirings />);
    expect(screen.queryByText("SHAPE")).toBeNull();
    click("CMOS");
    expect(container.querySelector('[data-bus="a"]')).toBeTruthy();
    expect(container.querySelector('[data-bus="b"]')).toBeTruthy();
    expect(container.querySelectorAll('[data-input-run="a"]').length).toBe(2);
    click("TRANSMISSION GATE");
    expect(container.querySelector('[data-bus="nb"]')).toBeTruthy();
  });

  it("keeps steady base current on while a BJT input is high", () => {
    const { container } = render(<GateWirings />);
    expect(container.querySelector("[data-base-current]")).toBeNull();
    click("A = 0");
    expect(container.querySelector("[data-base-current]")).toBeTruthy();
    click("CMOS");
    expect(container.querySelector("[data-base-current]")).toBeNull();
  });

  it("builds every gate in every wiring", () => {
    const { container } = render(<GateWirings />);
    for (const style of [
      "BJT + RESISTORS",
      "NMOS + RESISTOR",
      "CMOS",
      "PASS TRANSISTOR",
      "TRANSMISSION GATE",
    ])
      for (const gate of ["NOT", "NAND", "AND", "XOR"]) {
        click(style);
        click(gate);
        expect(container.querySelector("[data-device]"), `${style} ${gate}`).toBeTruthy();
        expect(screen.getByTestId("transistor-count").textContent).not.toBe("0");
      }
  });

  it("shows fewer transistors for a pass gate", () => {
    render(<GateWirings />);
    click("CMOS");
    click("XOR");
    expect(screen.getByTestId("transistor-count").textContent).toBe("12");
    click("TRANSMISSION GATE");
    expect(screen.getByTestId("transistor-count").textContent).toBe("8");
    click("PASS TRANSISTOR");
    expect(screen.getByTestId("transistor-count").textContent).toBe("6");
    click("B = 0");
    expect(screen.getByTestId("output-level").textContent).toContain("0.70 V");
  });
});

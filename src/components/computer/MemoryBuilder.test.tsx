// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { LogicBuilder } from "./LogicBuilder";

beforeEach(() => {
  localStorage.clear();
  Element.prototype.setPointerCapture = () => {};
});
afterEach(cleanup);

describe("expandable memory", () => {
  it("keeps register state when opening and closing its black box", () => {
    render(<LogicBuilder />);
    fireEvent.click(screen.getByRole("button", { name: "Storage" }));
    expect(screen.getByText("4 × 4 SRAM", { selector: "button" })).toBeTruthy();
    expect(screen.getByText("4 × 4 DRAM", { selector: "button" })).toBeTruthy();
    expect(screen.getByText("4 × 4 flash memory", { selector: "button" })).toBeTruthy();
    const entry = screen.getByText("8-bit parallel register", { selector: "button" }).parentElement!;
    fireEvent.click(within(entry).getByRole("button", { name: /Black box/ }));
    fireEvent.click(screen.getByRole("button", { name: "Open internal wiring ↘" }));

    fireEvent.click(within(screen.getByRole("group", { name: /D0 — SWITCH part/ })).getByRole("button", { name: "OFF" }));
    fireEvent.click(within(screen.getByRole("group", { name: /LOAD — SWITCH part/ })).getByRole("button", { name: "OFF" }));
    fireEvent.click(screen.getByRole("button", { name: "Step ½ cycle" }));
    expect(within(screen.getByRole("group", { name: /Q0 — LAMP part/ })).getByLabelText("LED on")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "← Back" }));
    fireEvent.click(screen.getByRole("button", { name: "Open internal wiring ↘" }));
    expect(within(screen.getByRole("group", { name: /Q0 — LAMP part/ })).getByLabelText("LED on")).toBeTruthy();
  });
});

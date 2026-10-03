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
    const palette = within(screen.getByLabelText("Gate palette"));
    expect(palette.getByRole("button", { name: "4 × 4 SRAM" })).toBeTruthy();
    expect(palette.getByRole("button", { name: "4 × 4 DRAM" })).toBeTruthy();
    expect(palette.getByRole("button", { name: "4 × 4 flash memory" })).toBeTruthy();
    fireEvent.click(palette.getByRole("button", { name: "8-bit parallel register" }));
    fireEvent.click(screen.getByRole("button", { name: "Enter 8-bit parallel register" }));

    fireEvent.click(
      within(screen.getByRole("group", { name: /D0 — SWITCH part/ })).getByRole("button", {
        name: "OFF",
      }),
    );
    fireEvent.click(
      within(screen.getByRole("group", { name: /LOAD — SWITCH part/ })).getByRole("button", {
        name: "OFF",
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Step ½ cycle" }));
    expect(
      within(screen.getByRole("group", { name: /Q0 — LAMP part/ })).getByLabelText("LED on"),
    ).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "← Back" }));
    fireEvent.click(screen.getByRole("button", { name: "Enter 8-bit parallel register" }));
    expect(
      within(screen.getByRole("group", { name: /Q0 — LAMP part/ })).getByLabelText("LED on"),
    ).toBeTruthy();
  });
});

// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ScreenScaleDemo } from "./ScreenScaleDemo";

afterEach(cleanup);

describe("screen scale demo", () => {
  it("compares the ways to fill each screen size", () => {
    render(<ScreenScaleDemo />);
    const list = () => screen.getByRole("list", { name: /^Ways to fill the/ });
    expect(list().getAttribute("aria-label")).toBe("Ways to fill the 32×32 screen");
    expect(within(list()).getAllByRole("listitem")).toHaveLength(5);
    const blitter = within(list()).getByText("Big blitter").closest("li")!;
    expect(blitter.textContent).toContain("188 ticks");
    expect(blitter.textContent).toContain("CPU busy for 60 ticks (32%)");
    expect(
      screen.getByRole("img", { name: /^32×32 screen 32×32, 1024 of 1024 pixels lit/ }),
    ).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "512×512" }));
    expect(list().getAttribute("aria-label")).toBe("Ways to fill the 512×512 screen");
    const cpu = within(list()).getByText("CPU through the bank window").closest("li")!;
    expect(cpu.textContent).toContain("worked out");
    expect(cpu.textContent).toContain("Worked out from the 32×32 run");
    expect(within(list()).getByText("Big blitter").closest("li")!.textContent).toContain(
      "(under 1%)",
    );
    expect(cpu.textContent).toMatch(/frames at 60 Hz/);
    expect(screen.getByRole("img", { name: /^512×512 screen/ }).tagName).toBe("CANVAS");

    fireEvent.click(screen.getByRole("button", { name: "8×8" }));
    expect(within(list()).getAllByRole("listitem")).toHaveLength(3);
  });
});

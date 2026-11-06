// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ClockScope } from "./ClockScope";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const machine = (name: RegExp) => screen.getByRole("button", { name });
const row = (name: RegExp) => machine(name).closest("li") as HTMLElement;
const factor = (name: RegExp) => row(name).querySelector("[class*=factor]")?.textContent;
const counter = (name: RegExp) =>
  Number(row(name).querySelector('[role="timer"]')?.textContent?.replace(/,/g, ""));
const fillWidth = (name: RegExp) =>
  (row(name).querySelector("[data-preset]") as HTMLElement).style.width;

describe("clock comparison demo", () => {
  it("shows every machine at once, compared with the Intel 4004", () => {
    const { container } = render(<ClockScope />);
    expect(screen.getAllByRole("listitem")).toHaveLength(6);
    expect(screen.getAllByRole("timer")).toHaveLength(6);
    expect(screen.queryByRole("slider")).toBeNull();
    expect(container.textContent).not.toContain("TOO FAST TO SEE");
    expect(
      machine(/^Compare with INTEL 4004, 1971: 740 kilohertz/).getAttribute("aria-pressed"),
    ).toBe("true");
    expect(factor(/INTEL 4004/)).toBe("BASE");
    expect(factor(/DESKTOP CPU/)).toBe("× 6,081");
    expect(factor(/APPLE II/)).toBe("× 1.382");
    expect(factor(/1 PER SECOND/)).toBe("÷ 740,000");
  });

  it("compares against whichever machine is pressed", () => {
    render(<ClockScope />);
    fireEvent.click(machine(/DESKTOP CPU, TODAY: 4.5 gigahertz/));
    expect(machine(/DESKTOP CPU/).getAttribute("aria-pressed")).toBe("true");
    expect(machine(/INTEL 4004/).getAttribute("aria-pressed")).toBe("false");
    expect(factor(/DESKTOP CPU/)).toBe("BASE");
    expect(factor(/INTEL 4004/)).toBe("÷ 6,081");
    expect(factor(/PENTIUM/)).toBe("÷ 75");
  });

  it("draws the bars on a log scale and switches to linear", () => {
    const { container } = render(<ClockScope />);
    expect(screen.getByRole("button", { name: "LOG" }).getAttribute("aria-pressed")).toBe("true");
    expect(fillWidth(/1 PER SECOND/)).toBe("0%");
    expect(fillWidth(/IBM PC/)).toBe("66.79%");
    expect(fillWidth(/DESKTOP CPU/)).toBe("96.53%");
    expect(container.textContent).toContain("1 MHz");

    fireEvent.click(screen.getByRole("button", { name: "LINEAR" }));
    expect(screen.getByRole("button", { name: "LINEAR" }).getAttribute("aria-pressed")).toBe(
      "true",
    );
    expect(fillWidth(/DESKTOP CPU/)).toBe("90%");
    expect(fillWidth(/INTEL 4004/)).toBe("0.0148%");
    expect(container.textContent).toContain("5 GHz");
  });

  it("counts every clock at its true rate since the page opened", () => {
    vi.useFakeTimers({
      toFake: [
        "setTimeout",
        "clearTimeout",
        "setInterval",
        "clearInterval",
        "performance",
        "requestAnimationFrame",
        "cancelAnimationFrame",
      ],
    });
    const { container } = render(<ClockScope />);
    expect(counter(/DESKTOP CPU/)).toBe(0);
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(counter(/1 PER SECOND/)).toBe(2);
    expect(counter(/IBM PC/)).toBeGreaterThan(9_000_000);
    expect(counter(/IBM PC/)).toBeLessThanOrEqual(4_770_000 * 2.1);
    expect(counter(/DESKTOP CPU/)).toBeGreaterThan(8_900_000_000);
    expect(container.textContent).toContain("IN 2 s");
  });
});

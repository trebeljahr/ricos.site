// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ClockScope } from "./ClockScope";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const preset = (name: RegExp) => screen.getByRole("button", { name });
const slider = () => screen.getByRole("slider", { name: "CLOCK SPEED" });
const meter = (name: string) =>
  screen.getByText(name, { selector: "dt" }).parentElement?.querySelector("dd")?.textContent;

describe("clock scope demo", () => {
  it("starts at one tick a second, in real time", () => {
    const { container } = render(<ClockScope />);
    expect(preset(/^1 PER SECOND: 1 hertz/).getAttribute("aria-pressed")).toBe("true");
    expect(slider().getAttribute("aria-valuetext")).toBe("1 hertz");
    expect(container.textContent).toContain("TICK LAMP");
    expect(container.textContent).toContain("500 ms/DIV");
    expect(container.textContent).toContain("REAL TIME");
    expect(container.textContent).toContain("SLOW ENOUGH TO COUNT ALONG");
    expect(meter("ONE TICK LASTS")).toBe("1 s");
    expect(screen.getByRole("timer").textContent).toBe("0");
  });

  it("writes out the size of a 4.5 GHz clock", () => {
    const { container } = render(<ClockScope />);
    fireEvent.click(preset(/^DESKTOP CPU, TODAY: 4.5 gigahertz/));
    expect(preset(/^DESKTOP CPU/).getAttribute("aria-pressed")).toBe("true");
    expect(preset(/^1 PER SECOND/).getAttribute("aria-pressed")).toBe("false");
    expect(container.textContent).toContain("4,500,000,000");
    expect(container.textContent).toContain("4.5 BILLION");
    expect(container.textContent).toContain("TOO FAST TO SEE");
    expect(container.textContent).toContain("0.1 ns/DIV");
    expect(meter("ONE TICK LASTS")).toBe("0.222 ns");
    expect(meter("LIGHT IN ONE TICK")).toBe("6.66 cm");
    expect(meter("ONE JET ENGINE TURN")).toBe("18,000,000");
    expect(meter("IF EACH TICK TOOK 1 s")).toBe("143 years");
  });

  it("holds the checked speeds of old machines", () => {
    const { container } = render(<ClockScope />);
    fireEvent.click(preset(/^INTEL 4004, 1971: 740 kilohertz/));
    expect(container.textContent).toContain("740,000");
    fireEvent.click(preset(/^APPLE II, 1977: 1.023 megahertz/));
    expect(container.textContent).toContain("1,023,000");
    fireEvent.click(preset(/^IBM PC, 1981: 4.77 megahertz/));
    expect(container.textContent).toContain("4,770,000");
    expect(meter("ONE TICK LASTS")).toBe("210 ns");
  });

  it("sweeps from 1 Hz to 5 GHz on a log slider", () => {
    const { container } = render(<ClockScope />);
    fireEvent.change(slider(), { target: { value: "1000" } });
    expect(slider().getAttribute("aria-valuetext")).toBe("5 gigahertz");
    expect(container.textContent).toContain("5,000,000,000");
    expect(screen.queryAllByRole("button", { pressed: true })).toHaveLength(1); // SOUND
    fireEvent.change(slider(), { target: { value: "0" } });
    expect(container.textContent).toContain("REAL TIME");
  });

  it("counts ticks since the page opened and announces a speed once it settles", () => {
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
    const live = () => container.querySelector("p[aria-live]")?.textContent;
    fireEvent.click(preset(/^IBM PC/));
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    const ticks = Number(screen.getByRole("timer").textContent?.replace(/,/g, ""));
    expect(ticks).toBeGreaterThan(9_000_000);
    expect(ticks).toBeLessThanOrEqual(4_770_000 * 2.1);
    expect(container.textContent).toMatch(/MILLION · IN 2 s/);
    expect(live()).toBe(
      "4.77 megahertz: 4,770,000 ticks every second. One tick lasts 210 nanoseconds.",
    );
  });
});

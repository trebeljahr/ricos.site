// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SignalEdges } from "./SignalEdges";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const readings = () =>
  within(screen.getByRole("list", { name: "What a gate reads at each sample" }))
    .getAllByRole("listitem")
    .map((item) => item.textContent)
    .join("");
const meter = (name: string) =>
  screen.getByText(name, { selector: "dt" }).parentElement?.querySelector("dd")?.textContent;

describe("signal edges demo", () => {
  it("reads every sample of the wanted signal as a clean 1 or 0, even with noise", () => {
    render(<SignalEdges />);
    expect(screen.getByRole("button", { name: /^WANTED/ }).getAttribute("aria-pressed")).toBe(
      "true",
    );
    expect(readings()).toBe("0011110000111100");
    expect(meter("READ RIGHT")).toBe("16/16");
    expect(meter("IN BETWEEN")).toBe("0% OF THE TIME");

    fireEvent.change(screen.getByRole("slider", { name: /NOISE/ }), { target: { value: "100" } });
    expect(readings()).toBe("0011110000111100");
    expect(meter("UNDEFINED")).toBe("0");
  });

  it("shows where the unwanted signal leaves the gate unsure or wrong", () => {
    render(<SignalEdges />);
    fireEvent.click(screen.getByRole("button", { name: /^UNWANTED/ }));
    expect(screen.getByRole("button", { name: /^UNWANTED/ }).getAttribute("aria-pressed")).toBe(
      "true",
    );
    expect(readings()).toBe("001111?0001101?0");
    expect(meter("READ RIGHT")).toBe("13/16");
    expect(meter("UNDEFINED")).toBe("2");
    expect(meter("WRONG")).toBe("1");
    expect(screen.getByRole("listitem", { name: "Sample 13: 0, should be 1" })).toBeTruthy();
    expect(screen.getByRole("listitem", { name: "Sample 7: undefined" })).toBeTruthy();
    expect(screen.getByRole("img").getAttribute("aria-label")).toMatch(/edges crawl and ring/);

    fireEvent.change(screen.getByRole("slider", { name: /NOISE/ }), { target: { value: "100" } });
    expect(Number(meter("UNDEFINED"))).toBeGreaterThan(2);
  });

  it("announces the result once the noise slider settles", () => {
    vi.useFakeTimers();
    const { container } = render(<SignalEdges />);
    const live = () => container.querySelector("p[aria-live]")?.textContent;
    fireEvent.click(screen.getByRole("button", { name: /^UNWANTED/ }));
    fireEvent.change(screen.getByRole("slider", { name: /NOISE/ }), { target: { value: "40" } });
    expect(live()).toContain("Wanted signal, noise 20%");
    act(() => {
      vi.advanceTimersByTime(700);
    });
    expect(live()).toContain("Unwanted signal, noise 40%.");
    expect(live()).toContain("of 16 samples read right");
  });
});

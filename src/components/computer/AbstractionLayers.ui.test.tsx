// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AbstractionLayers } from "./AbstractionLayers";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const click = (name: string | RegExp) => fireEvent.click(screen.getByRole("button", { name }));
const key = (name: RegExp) => screen.getByRole("button", { name });
const summary = (container: HTMLElement) => container.querySelector("p[aria-live]")?.textContent;
const current = () =>
  screen
    .getByRole("list", { name: "All layers, from the outside in" })
    .querySelector('[aria-current="true"]')
    ?.getAttribute("aria-label");
const doll = (container: HTMLElement, id: string) =>
  container.querySelector<SVGGElement>(`[data-layer="${id}"]`);

describe("abstraction layers demo", () => {
  it("opens the doll one layer at a time and closes it again", () => {
    const { container } = render(<AbstractionLayers />);
    expect(summary(container)).toContain("Layer 1 of 10: The app you are using.");
    expect(screen.getByRole("img").getAttribute("aria-label")).toBe(
      "A closed nesting doll: the app you are using.",
    );
    expect(key(/^Close the doll/).getAttribute("aria-disabled")).toBe("true");

    click(/^Open the doll/);
    expect(summary(container)).toContain("Layer 2 of 10: Operating system.");
    expect(summary(container)).toContain("Built from: Programming languages.");
    expect(current()).toMatch(/^Layer 2 of 10: Operating system, part 4/);
    expect(container.textContent).toContain("LAYER 02/10");
    expect(screen.getByRole("img").getAttribute("aria-label")).toContain("opened 1 time.");

    click(/^Open the doll/);
    expect(current()).toMatch(/^Layer 3 of 10: Programming languages, part 2/);

    click(/^Close the doll/);
    click(/^Close the doll/);
    expect(summary(container)).toContain("Layer 1 of 10");
    // Closing the outermost doll does nothing.
    click(/^Close the doll/);
    expect(summary(container)).toContain("Layer 1 of 10");
  });

  it("raises the opened dolls out of their parents and keeps the rest inside", () => {
    const { container } = render(<AbstractionLayers />);
    click(/^Layer 3 of 10/);
    expect(doll(container, "operating-system")?.style.transform).toContain("translate(0px, -29px)");
    expect(doll(container, "programming-languages")?.style.transform).toContain(
      "translate(0px, -29px)",
    );
    expect(doll(container, "machine-code")?.style.transform).toContain("translate(0px, 0px)");
  });

  it("jumps to any layer and closes every doll from the innermost", () => {
    const { container } = render(<AbstractionLayers />);
    click(/^Layer 10 of 10: Voltages on wires/);
    expect(current()).toMatch(/^Layer 10 of 10/);
    expect(summary(container)).toContain("voltages on tiny wires");
    expect(container.textContent).toContain("THE REST IS PHYSICS");
    expect(key(/^Open the doll/).getAttribute("aria-disabled")).toBe("true");
    // The innermost doll does not open.
    click(/^Open the doll/);
    expect(summary(container)).toContain("Layer 10 of 10");

    click("Close every doll and go back to the app");
    expect(summary(container)).toContain("Layer 1 of 10");
    expect(document.activeElement).toBe(key(/^Open the doll/));
    expect(screen.queryByRole("button", { name: "Close every doll and go back to the app" })).toBe(
      null,
    );

    click(/^Layer 5 of 10: CPU/);
    expect(current()).toMatch(/^Layer 5 of 10: CPU, part 2 of the series\. In view\.$/);
    expect(container.textContent).toContain("Built from: ALU, registers, RAM and buses.");
  });

  it("opens a long jump one doll after another when motion is allowed", () => {
    vi.useFakeTimers();
    vi.stubGlobal("matchMedia", (query: string) => ({ matches: false, media: query }));
    const { container } = render(<AbstractionLayers />);
    const lit = () => container.querySelectorAll('[data-on="true"]').length;
    const risen = (id: string) => doll(container, id)?.style.transform.includes("-29px");
    // Each act lets the stage take one step and schedule the next.
    const wait = (steps: number) => {
      for (let step = 0; step < steps; step++) act(() => vi.advanceTimersByTime(150));
    };

    click(/^Layer 4 of 10/);
    // The panel names the target at once; the stage has taken its first step.
    expect(current()).toMatch(/^Layer 4 of 10/);
    expect(lit()).toBe(2);
    expect(risen("operating-system")).toBe(true);
    expect(risen("programming-languages")).toBe(false);

    wait(1);
    expect(lit()).toBe(3);
    wait(5);
    expect(lit()).toBe(4);
    expect(risen("machine-code")).toBe(true);
    expect(risen("cpu")).toBe(false);

    click("Layer 1 of 10: The app you are using, part 4 of the series.");
    expect(lit()).toBe(3);
    wait(5);
    expect(lit()).toBe(1);
    expect(risen("operating-system")).toBe(false);
  });
});

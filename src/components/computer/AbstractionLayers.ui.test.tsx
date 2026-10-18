// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ABSTRACTION_LAYERS, INNERMOST, INNERMOST_NOTE } from "src/lib/computer/abstractionLayers";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AbstractionLayers } from "./AbstractionLayers";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const total = ABSTRACTION_LAYERS.length;
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
const select = (index: number) => click(new RegExp(`^Layer ${index + 1} of ${total}:`));

describe("abstraction layers demo", () => {
  it("walks through every explanation and returns to the outermost doll", () => {
    const { container } = render(<AbstractionLayers />);
    expect(summary(container)).toContain(`Layer 1 of ${total}: The app you are using.`);
    expect(screen.getByRole("img").getAttribute("aria-label")).toBe(
      "A closed nesting doll: the app you are using.",
    );
    expect(key(/^Close the doll/).getAttribute("aria-disabled")).toBe("true");
    click(/^Close the doll/);
    expect(current()).toContain(`Layer 1 of ${total}`);

    for (let index = 1; index < total; index++) {
      click(/^Open the doll/);
      const layer = ABSTRACTION_LAYERS[index];
      expect(current()).toContain(`Layer ${index + 1} of ${total}: ${layer.name}`);
      expect(screen.getByRole("heading", { name: layer.name })).toBeTruthy();
      expect(screen.getByText(layer.example)).toBeTruthy();
      expect(summary(container)).toContain(layer.does);
    }
    expect(key(/^Open the doll/).getAttribute("aria-disabled")).toBe("true");
    click(/^Open the doll/);
    expect(summary(container)).toContain(INNERMOST_NOTE);

    for (let index = INNERMOST; index > 0; index--) click(/^Close the doll/);
    expect(summary(container)).toContain(`Layer 1 of ${total}`);
  });

  it("raises opened dolls out of their parents and keeps later dolls inside", () => {
    const { container } = render(<AbstractionLayers />);
    select(2);
    for (const layer of ABSTRACTION_LAYERS.slice(1, 3)) {
      expect(doll(container, layer.id)?.style.transform).toContain("translate(0px, -29px)");
    }
    expect(doll(container, ABSTRACTION_LAYERS[3].id)?.style.transform).toContain(
      "translate(0px, 0px)",
    );
  });

  it("jumps directly with reduced motion and resets focus to the open control", () => {
    vi.useFakeTimers();
    vi.stubGlobal("matchMedia", (query: string) => ({ matches: true, media: query }));
    const { container } = render(<AbstractionLayers />);
    select(INNERMOST);
    expect(document.activeElement).toBe(key(/^Open the doll/));
    expect(screen.getByRole("img").getAttribute("data-depth")).toBe(String(INNERMOST));
    expect(summary(container)).toContain(INNERMOST_NOTE);
    act(() => vi.runAllTimers());
    expect(screen.getByRole("img").getAttribute("data-depth")).toBe(String(INNERMOST));

    click("Close every doll and go back to the app");
    expect(summary(container)).toContain(`Layer 1 of ${total}`);
    expect(document.activeElement).toBe(key(/^Open the doll/));
    expect(
      screen.queryByRole("button", { name: "Close every doll and go back to the app" }),
    ).toBeNull();
  });

  it("follows the next-connection link and keeps keyboard focus in the explorer", () => {
    render(<AbstractionLayers />);
    click("Explore operating system");
    expect(current()).toContain("Operating system");
    expect(document.activeElement).toBe(key(/^Open the doll/));
    expect(screen.getByRole("button", { name: "Explore input and output" })).toBeTruthy();
  });

  it("animates a long jump in steps and can reverse before it finishes", () => {
    vi.useFakeTimers();
    vi.stubGlobal("matchMedia", (query: string) => ({ matches: false, media: query }));
    render(<AbstractionLayers />);
    const shown = () => Number(screen.getByRole("img").getAttribute("data-depth"));
    const wait = (steps: number) => {
      for (let step = 0; step < steps; step++) act(() => vi.advanceTimersByTime(210));
    };

    select(INNERMOST);
    expect(current()).toContain(`Layer ${total} of ${total}`);
    expect(shown()).toBe(1);
    // The accessible image describes the visible doll, even while moving to another stop.
    expect(screen.getByRole("img").getAttribute("aria-label")).toContain("Operating system");
    wait(2);
    expect(shown()).toBe(3);

    select(0);
    expect(shown()).toBe(2);
    wait(total);
    expect(shown()).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });
});

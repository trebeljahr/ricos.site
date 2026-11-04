// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ABSTRACTION_LAYERS, OUTERMOST, REACHES } from "src/lib/computer/abstractionLayers";
import { afterEach, describe, expect, it } from "vitest";
import { AbstractionLayers } from "./AbstractionLayers";

afterEach(cleanup);

const doll = (container: HTMLElement, id: string) =>
  container.querySelector<SVGGElement>(`[data-layer="${id}"]`);
const out = (container: HTMLElement) =>
  [...container.querySelectorAll('[data-layer][data-out="true"]')]
    .map((element) => element.getAttribute("data-layer"))
    .sort();
const reach = (container: HTMLElement, key: string) =>
  container.querySelector(`[data-reach="${key}"]`)?.getAttribute("data-on");
const open = (name: string) => fireEvent.click(screen.getByRole("button", { name }));

describe("abstraction layers demo", () => {
  it("opens with two programs side by side, joined by a thread", () => {
    const { container } = render(<AbstractionLayers />);
    expect(out(container)).toEqual([...OUTERMOST].sort());
    expect(reach(container, "app>operating-system")).toBe("true");
    expect(reach(container, "compiler-assembler>app")).toBe("false");
    expect(screen.queryByRole("button", { name: "Open: Programming languages" })).toBeNull();
  });

  it("brings several dolls out of one, and threads appear when both ends are out", () => {
    const { container } = render(<AbstractionLayers />);
    open("Open: The app you are using");
    expect(out(container)).toContain("programming-languages");
    open("Open: Programming languages");
    expect(out(container)).toContain("compiler-assembler");
    expect(reach(container, "compiler-assembler>app")).toBe("true");
    open("Open: Compiler and assembler");
    open("Open: Machine code");
    for (const id of ["cpu", "ram", "input-output"]) expect(out(container)).toContain(id);
    expect(reach(container, "input-output>operating-system")).toBe("true");
    expect(reach(container, "app>cpu")).toBe("true");
  });

  it("closes a doll and everything only it held", () => {
    const { container } = render(<AbstractionLayers />);
    open("Open: The app you are using");
    open("Open: Programming languages");
    open("Close: The app you are using");
    expect(out(container)).toEqual([...OUTERMOST].sort());
    expect(doll(container, "programming-languages")?.getAttribute("aria-hidden")).toBe("true");
  });

  it("opens and closes everything, and voltages does not open", () => {
    const { container } = render(<AbstractionLayers />);
    fireEvent.click(screen.getByRole("button", { name: "Open all" }));
    expect(out(container)).toHaveLength(ABSTRACTION_LAYERS.length);
    for (const { from, to } of REACHES) expect(reach(container, `${from}>${to}`)).toBe("true");
    expect(screen.queryByRole("button", { name: /Voltages/ })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Close all" }));
    expect(out(container)).toEqual([...OUTERMOST].sort());
  });

  it("works from the keyboard and says what came out", () => {
    const { container } = render(<AbstractionLayers />);
    const app = screen.getByRole("button", { name: "Open: The app you are using" });
    fireEvent.keyDown(app, { key: "Enter" });
    expect(screen.getByRole("button", { name: "Close: The app you are using" })).toBeTruthy();
    expect(container.querySelector("[aria-live]")?.textContent).toContain(
      "Inside: Programming languages.",
    );
    fireEvent.keyDown(screen.getByRole("button", { name: "Close: The app you are using" }), {
      key: " ",
    });
    expect(out(container)).toEqual([...OUTERMOST].sort());
    fireEvent.keyDown(screen.getByRole("button", { name: "Open: The app you are using" }), {
      key: "Tab",
    });
    expect(out(container)).toEqual([...OUTERMOST].sort());
  });
});

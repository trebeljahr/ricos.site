// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ChordFamily } from "./ChordFamily";
import { ChordInversions } from "./ChordInversions";

afterEach(cleanup);

/** Presses an on-screen key by MIDI number (jsdom has no elementFromPoint). */
function press(midi: number) {
  const key = document.querySelector<HTMLElement>(`[data-midi="${midi}"]`);
  if (!key) throw new Error(`no key ${midi}`);
  document.elementFromPoint = () => key;
  const group = key.closest<HTMLElement>("[role=group]") as HTMLElement;
  fireEvent.pointerDown(group, { button: 0, pointerId: 1, clientX: 1, clientY: 1 });
  fireEvent.pointerUp(group, { pointerId: 1 });
}

describe("chord family", () => {
  it("builds triads by counting half steps on the keys", () => {
    vi.useFakeTimers();
    render(<ChordFamily />);
    press(52); // E3: 4 half steps above C3
    const text = (m: number) => document.querySelector(`[data-midi="${m}"]`)?.textContent;
    act(() => vi.advanceTimersByTime(340));
    expect([text(49), text(50), text(51), text(52)]).toEqual(["1", "2", "", ""]);
    act(() => vi.advanceTimersByTime(400));
    expect([text(49), text(50), text(51), text(52)]).toEqual(["1", "2", "3", "4"]);
    act(() => vi.advanceTimersByTime(400));
    expect([text(49), text(50), text(51), text(52)]).toEqual(["1", "2", "3", "E"]);
    press(55); // G3: 3 more
    act(() => vi.advanceTimersByTime(3000));
    expect(screen.getByText("3 of 3 in C major")).toBeTruthy();
    expect(screen.getByText("4 + 3 = 7")).toBeTruthy();
    expect(screen.getByText("Perfect fifth")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Next degree" }));
    press(54); // F♯3: 4 above D3, outside C major
    press(57); // A3
    act(() => vi.advanceTimersByTime(3000));
    expect(screen.getByText("F♯ not in C major")).toBeTruthy();
    press(53); // F3 restarts: 3 above D
    press(57);
    act(() => vi.advanceTimersByTime(3000));
    expect(screen.getByText("3 + 4 = 7")).toBeTruthy();
    const slots = screen.getByRole("list", { name: "Degrees of C major" });
    expect(slots.textContent).toContain("I");
    expect(slots.textContent).toContain("ii");
    expect(slots.textContent).toContain("Dm");
    press(59); // B3: ignored, the chord is built
    expect(slots.textContent).toContain("Dm");
    fireEvent.click(screen.getByRole("button", { name: "Next degree" }));
    press(66); // F♯4 from E3: 2 octaves… too far, ignored
    press(54); // F♯3: 2 above E3, not a third
    act(() => vi.advanceTimersByTime(3000));
    expect(document.body.textContent).toContain("Major second");
    vi.useRealTimers();
  });
});

describe("chord inversions", () => {
  it("ignores keys that hold no chord tone and moves one that does", () => {
    render(<ChordInversions />);
    press(62); // D4: not in C major triad
    expect(document.body.textContent).toContain("C · E · G");
    press(72); // C5: root moves up
    expect(document.body.textContent).toContain("E · G · C");
    fireEvent.click(screen.getByRole("radio", { name: "One by one" }));
    expect(screen.getByRole("radio", { name: "One by one" }).getAttribute("aria-checked")).toBe(
      "true",
    );
  });
});

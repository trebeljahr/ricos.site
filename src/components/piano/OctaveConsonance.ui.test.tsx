// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { Consonance } from "./Consonance";
import { OctaveDoubling } from "./OctaveDoubling";

beforeAll(() => {
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
});
afterEach(cleanup);

describe("octave doubling", () => {
  it("shows a beat rate near the octave and none on it", () => {
    render(<OctaveDoubling />);
    const slider = screen.getByRole("slider");
    expect(screen.getByText("none")).toBeTruthy();
    fireEvent.change(slider, { target: { value: "1.5" } });
    expect(screen.getByText("too fast to count")).toBeTruthy();
    fireEvent.change(slider, { target: { value: "2.01" } });
    expect(screen.getByText("2.2 per second")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "2 : 1" }));
    expect(screen.getByText("none")).toBeTruthy();
    expect(screen.queryByText(/^[–—-]$/)).toBeNull();
  });
});

describe("consonance", () => {
  it("labels a dip only after the slider visits it", () => {
    render(<Consonance />);
    const slider = screen.getByRole("slider", { name: "Upper note" });
    expect(screen.queryByText("Perfect fifth")).toBeNull();
    fireEvent.click(screen.getByRole("switch", { name: "Snap to the piano keys" }));
    for (let i = 0; i < 6; i++) fireEvent.keyDown(slider, { key: "ArrowRight" });
    expect(screen.getByText("Perfect fifth")).toBeTruthy();
    expect(screen.queryByText("Perfect fourth")).toBeTruthy();
    expect(screen.queryByText("Major sixth")).toBeNull();
  });
});

// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { TutorialSuccess } from "./TutorialSuccess";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

it("uses the shared screen-wide burst while keeping correctness visible", () => {
  vi.useFakeTimers();
  const { container, rerender } = render(
    <TutorialSuccess correct={false} message="All 2 rows match." celebration={0} />,
  );
  rerender(<TutorialSuccess correct message="All 2 rows match." celebration={1} />);
  expect(screen.getByRole("status").textContent).toContain("Correct wiring");
  expect(container.querySelector("[data-tutorial-confetti]")).toBeTruthy();
  const overlay = document.querySelector('[data-slot="confetti-explosion-screen"]');
  expect(overlay).toBeTruthy();
  expect(container.contains(overlay)).toBe(false);
  act(() => vi.advanceTimersByTime(2500));
  expect(container.querySelector("[data-tutorial-confetti]")).toBeNull();
  expect(screen.getByRole("status").textContent).toContain("All 2 rows match");
  expect(container.querySelector("[data-tutorial-confetti]")).toBeNull();
});

it("keeps the status while suppressing particles for reduced motion", () => {
  vi.stubGlobal("matchMedia", () => ({
    matches: true,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
  const { container, rerender } = render(
    <TutorialSuccess correct={false} message="All rows match." celebration={0} />,
  );
  rerender(<TutorialSuccess correct message="All rows match." celebration={1} />);
  expect(screen.getByRole("status").textContent).toContain("Correct wiring");
  expect(container.querySelector("[data-tutorial-confetti]")).toBeNull();
});

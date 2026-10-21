// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { TutorialSuccess } from "./TutorialSuccess";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

it("contains one brief burst while keeping correctness visible and sound opt-in", () => {
  vi.useFakeTimers();
  const { container, rerender } = render(
    <TutorialSuccess correct={false} message="All 2 rows match." celebration={0} />,
  );
  expect(
    screen
      .getByRole("button", { name: "Success sound off. Toggle success sound." })
      .getAttribute("aria-pressed"),
  ).toBe("false");
  rerender(<TutorialSuccess correct message="All 2 rows match." celebration={1} />);
  expect(screen.getByRole("status").textContent).toContain("Correct wiring");
  expect(container.querySelector("[data-tutorial-confetti]")).toBeTruthy();
  act(() => vi.advanceTimersByTime(1400));
  expect(container.querySelector("[data-tutorial-confetti]")).toBeNull();
  expect(screen.getByRole("status").textContent).toContain("All 2 rows match");
  fireEvent.click(screen.getByRole("button", { name: "Success sound off. Toggle success sound." }));
  expect(
    screen
      .getByRole("button", { name: "Success sound on. Toggle success sound." })
      .getAttribute("aria-pressed"),
  ).toBe("true");
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

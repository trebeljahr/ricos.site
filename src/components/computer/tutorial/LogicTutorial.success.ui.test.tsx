// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { levelById } from "src/lib/computer/tutorial/levels";
import { PROGRESS_KEY, progressStore } from "src/lib/computer/tutorial/progress";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { LogicTutorial } from "./LogicTutorial";

beforeEach(() => {
  localStorage.clear();
  progressStore.reset();
  Element.prototype.setPointerCapture = () => {};
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

it("recognizes a manually wired short truth-table solve immediately and does not replay success on Check or Reset", () => {
  vi.useFakeTimers();
  const { container } = render(<LogicTutorial levels={["not"]} />);
  fireEvent.click(screen.getByTitle("Drag NAND onto canvas or click to add"));
  for (const input of screen.getAllByRole("button", { name: /^Connect to NAND/ })) {
    fireEvent.click(screen.getByRole("button", { name: "Wire from A Output" }));
    fireEvent.click(input);
  }
  fireEvent.click(screen.getByRole("button", { name: "Wire from NAND Output" }));
  fireEvent.click(screen.getByRole("button", { name: /^Connect to OUT/ }));
  expect(screen.getByText("✓ Correct wiring.")).toBeTruthy();
  expect(progressStore.get().solved.not.circuit?.wires).toHaveLength(3);
  expect(container.querySelector("[data-tutorial-confetti]")).toBeTruthy();
  act(() => vi.advanceTimersByTime(1400));
  fireEvent.click(screen.getByRole("button", { name: "Check" }));
  fireEvent.click(screen.getByRole("button", { name: "Check" }));
  expect(container.querySelector("[data-tutorial-confetti]")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Reset" }));
  expect(container.querySelector("[data-tutorial-confetti]")).toBeNull();
  expect(screen.queryByText("✓ Correct wiring.")).toBeNull();
});

it("shows restored correctness without celebrating or changing its saved solve", () => {
  const circuit = levelById("not")!.reference!();
  localStorage.setItem(
    PROGRESS_KEY,
    JSON.stringify({
      solved: { not: { at: 1, circuit } },
      drafts: { not: circuit },
      skipped: [],
      settings: { ownParts: "mine" },
    }),
  );
  progressStore.reset();
  const { container } = render(<LogicTutorial levels={["not", "and"]} />);
  expect(screen.getByText("✓ Correct wiring.")).toBeTruthy();
  expect(container.querySelector("[data-tutorial-confetti]")).toBeNull();
  expect(progressStore.get().solved.not.at).toBe(1);
  fireEvent.change(screen.getByRole("combobox", { name: "Level" }), { target: { value: "and" } });
  expect(container.querySelector("[data-tutorial-confetti]")).toBeNull();
  expect(
    within(screen.getByRole("application", { name: "Circuit canvas" })).queryAllByRole("group", {
      name: / part$/,
    }),
  ).toHaveLength(3);
});

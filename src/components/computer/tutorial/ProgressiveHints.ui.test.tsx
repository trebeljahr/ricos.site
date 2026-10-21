// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { progressStore } from "src/lib/computer/tutorial/progress";
import { afterEach, beforeEach, expect, it } from "vitest";
import { LogicTutorial } from "./LogicTutorial";

beforeEach(() => {
  localStorage.clear();
  progressStore.reset();
});
afterEach(cleanup);

it("reveals an idea, count and signal plan only on request, without changing the circuit", () => {
  render(<LogicTutorial levels={["universal-nand-and"]} />);
  const board = screen.getByRole("application", { name: "Circuit canvas" });
  const initialParts = within(board)
    .getAllByRole("group")
    .map((part) => part.getAttribute("data-node-id"));
  const saved = JSON.stringify(progressStore.get());
  expect(screen.queryByRole("list", { name: "Hints" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Check" }));
  expect(screen.queryByRole("list", { name: "Hints" })).toBeNull();

  fireEvent.click(screen.getByRole("button", { name: "Hint" }));
  const clues = () => within(screen.getByRole("list", { name: "Hints" }));
  expect(clues().getByText("Core idea:")).toBeTruthy();
  expect(clues().queryByText("Gate count:")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Another hint" }));
  expect(clues().getByText(/2 NAND gates/)).toBeTruthy();
  expect(clues().queryByText("Signal plan:")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Another hint" }));
  expect(clues().getByText("Signal plan:")).toBeTruthy();
  expect(clues().getByText(/G2 = NAND\(G1, G1\)/)).toBeTruthy();
  expect(screen.queryByText(/For this NAND-only route, place/)).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Another hint" }));
  expect(clues().getByText("Your circuit:")).toBeTruthy();
  expect(
    (screen.getByRole("button", { name: "All hints shown" }) as HTMLButtonElement).disabled,
  ).toBe(true);
  expect(
    within(board)
      .getAllByRole("group")
      .map((part) => part.getAttribute("data-node-id")),
  ).toEqual(initialParts);
  expect(within(board).queryAllByRole("button", { name: /^Select wire from/ })).toHaveLength(0);
  expect(JSON.stringify(progressStore.get())).toBe(saved);
  fireEvent.click(screen.getByRole("button", { name: "Dismiss hints" }));
  expect(screen.queryByRole("list", { name: "Hints" })).toBeNull();
  expect(screen.getByRole("button", { name: "Hint" })).toBeTruthy();
});

it("keeps hints scoped to the selected lesson and clears disclosure on level change and Reset", () => {
  render(<LogicTutorial levels={["universal-nor-xor", "universal-nand-or"]} />);
  fireEvent.click(screen.getByRole("button", { name: "Hint" }));
  fireEvent.click(screen.getByRole("button", { name: "Another hint" }));
  expect(within(screen.getByRole("list", { name: "Hints" })).getByText(/5 NOR gates/)).toBeTruthy();
  fireEvent.change(screen.getByRole("combobox", { name: "Level" }), {
    target: { value: "universal-nand-or" },
  });
  expect(screen.queryByRole("list", { name: "Hints" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Hint" }));
  fireEvent.click(screen.getByRole("button", { name: "Another hint" }));
  expect(
    within(screen.getByRole("list", { name: "Hints" })).getByText(/3 NAND gates/),
  ).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Reset" }));
  expect(screen.queryByRole("list", { name: "Hints" })).toBeNull();
});

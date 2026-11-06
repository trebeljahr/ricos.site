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

it("reveals an idea and a count on request, then places the parts, then gives the last hint", () => {
  render(<LogicTutorial levels={["universal-nand-and"]} />);
  const board = screen.getByRole("application", { name: "Circuit canvas" });
  const parts = () =>
    within(board)
      .getAllByRole("group")
      .map((part) => part.getAttribute("data-node-id"));
  const initialParts = parts();
  const saved = JSON.stringify(progressStore.get());
  expect(screen.queryByRole("list", { name: "Hints" })).toBeNull();

  fireEvent.click(screen.getByRole("button", { name: "Hint" }));
  const clues = () => within(screen.getByRole("list", { name: "Hints" }));
  expect(clues().getByText("Core idea:")).toBeTruthy();
  expect(clues().queryByText("Gate count:")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Another hint" }));
  expect(clues().getByText(/2 NAND gates/)).toBeTruthy();
  expect(parts()).toEqual(initialParts);
  expect(JSON.stringify(progressStore.get())).toBe(saved);
  expect(screen.queryByText("Your circuit:")).toBeNull();

  // An untouched board takes the parts without asking.
  fireEvent.click(screen.getByRole("button", { name: "Place the parts" }));
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(clues().getByText("Parts:")).toBeTruthy();
  expect(parts().length).toBe(initialParts.length + 2);
  expect(within(board).queryAllByRole("button", { name: /^Select wire from/ })).toHaveLength(0);

  fireEvent.click(screen.getByRole("button", { name: "Last hint" }));
  expect(clues().getAllByRole("listitem").at(-1)?.textContent).toMatch(/^Last hint:/);
  expect(
    (screen.getByRole("button", { name: "All hints shown" }) as HTMLButtonElement).disabled,
  ).toBe(true);
  expect(screen.queryByText("Your circuit:")).toBeNull();
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

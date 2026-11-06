// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { PROGRESS_KEY, progressStore } from "src/lib/computer/tutorial/progress";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { LogicTutorial } from "./LogicTutorial";

beforeEach(() => {
  localStorage.clear();
  progressStore.reset();
  Element.prototype.setPointerCapture = () => {};
  HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
    this.open = true;
  });
  HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
    this.open = false;
    this.dispatchEvent(new Event("close"));
  });
});
afterEach(cleanup);

const allHints = () => {
  fireEvent.click(screen.getByRole("button", { name: "Hint" }));
  while (!screen.queryByRole("button", { name: "All hints shown" }))
    fireEvent.click(screen.getByRole("button", { name: /Another hint|Place the parts|Last hint/ }));
};
const boardParts = () =>
  within(screen.getByRole("application", { name: "Circuit canvas" })).queryAllByRole("group", {
    name: / part$/,
  });

it("offers wiring only after the last hint, and asks before replacing the board", () => {
  render(<LogicTutorial levels={["universal-nand-and", "universal-nand-or"]} />);
  expect(screen.queryByRole("button", { name: "Wire it for me" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Hint" }));
  expect(screen.queryByRole("button", { name: "Wire it for me" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Another hint" }));
  fireEvent.click(screen.getByRole("button", { name: "Place the parts" }));
  expect(screen.queryByRole("button", { name: "Wire it for me" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Last hint" }));
  expect(screen.getByText("Last hint:")).toBeTruthy();
  const before = boardParts().length;

  fireEvent.click(screen.getByRole("button", { name: "Wire it for me" }));
  const dialog = screen.getByRole("dialog", { name: "Replace your wiring?" });
  expect(dialog.textContent).toMatch(/removes everything you have on the board/);
  expect(boardParts()).toHaveLength(before);
  fireEvent.click(within(dialog).getByRole("button", { name: "Keep my wiring" }));
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(boardParts()).toHaveLength(before);
  expect(progressStore.get().assisted).toEqual([]);
});

it("wires a working board that is not the reader's solve, until Reset", () => {
  const { container } = render(
    <LogicTutorial levels={["universal-nand-and", "universal-nand-or"]} />,
  );
  allHints();
  fireEvent.click(screen.getByRole("button", { name: "Wire it for me" }));
  fireEvent.click(screen.getByRole("button", { name: "Replace my wiring" }));

  expect(screen.getByText("Wired for you.")).toBeTruthy();
  expect(screen.queryByText("✓ Correct wiring.")).toBeNull();
  expect(screen.queryByText(/You used|Simplest solution/)).toBeNull();
  expect(container.querySelector("[data-tutorial-confetti]")).toBeNull();
  expect(screen.getAllByTitle("passes")).toHaveLength(4);
  expect(screen.getByRole("button", { name: /Next: OR from NAND/ })).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Wire it for me" })).toBeNull();

  const progress = progressStore.get();
  expect(progress.solved["universal-nand-and"]).toBeUndefined();
  expect(progress.assisted).toEqual(["universal-nand-and"]);
  expect(progress.skipped).toEqual(["universal-nand-and"]);

  fireEvent.click(screen.getByRole("button", { name: "Reset" }));
  expect(progressStore.get().assisted).toEqual([]);
  expect(screen.queryByText("Wired for you.")).toBeNull();
});

it("keeps a wired board uncounted after a reload, and leaves an earlier solve in place", () => {
  render(<LogicTutorial levels={["universal-nand-and"]} />);
  allHints();
  fireEvent.click(screen.getByRole("button", { name: "Wire it for me" }));
  fireEvent.click(screen.getByRole("button", { name: "Replace my wiring" }));
  fireEvent(window, new Event("pagehide"));
  cleanup();
  progressStore.reset();
  render(<LogicTutorial levels={["universal-nand-and"]} />);
  expect(screen.getByText("Wired for you.")).toBeTruthy();
  expect(progressStore.get().solved["universal-nand-and"]).toBeUndefined();
  expect(JSON.parse(localStorage.getItem(PROGRESS_KEY)!).assisted).toEqual(["universal-nand-and"]);
});

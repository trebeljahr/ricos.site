// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import type { Circuit } from "../../lib/computer/logic";
import { progressStore } from "../../lib/computer/tutorial/progress";
import { LogicBuilder } from "./LogicBuilder";
import { testButton } from "./testButton";

afterEach(() => {
  cleanup();
  localStorage.clear();
  progressStore.reset();
});

it("opens a RAM lesson in place, keeps hints opt-in, and preserves the bench and undo history", async () => {
  const circuit: Circuit = {
    name: "My bench",
    nodes: [{ id: "source", type: "switch", x: 40, y: 40, label: "SOURCE" }],
    wires: [],
  };
  render(<LogicBuilder initialCircuit={circuit} storageKey="learning-bench" />);
  fireEvent.click(screen.getByTitle("Drag NAND onto canvas or click to add"));
  const saved = localStorage.getItem("learning-bench");
  fireEvent.click(screen.getByText("Learning", { selector: "summary" }));
  fireEvent.click(screen.getByText("Memory", { selector: "summary" }));
  fireEvent.click(screen.getByRole("button", { name: "Addressed RAM cell" }));
  await screen.findByRole("button", { name: "Check" }, { timeout: 30000 });
  expect(screen.getAllByRole("application", { name: "Circuit canvas" })).toHaveLength(1);
  expect(screen.queryByRole("list", { name: "Hints" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Hint" }));
  expect(
    within(screen.getByRole("list", { name: "Hints" })).getByText(
      /WRITE ENABLE permits storage to change/,
    ),
  ).toBeTruthy();
  expect(localStorage.getItem("learning-bench")).toBe(saved);
  fireEvent.click(screen.getByRole("button", { name: /Back to your circuit/ }));
  await waitFor(() => expect(screen.queryByRole("button", { name: "Check" })).toBeNull());
  expect(screen.getByLabelText("NAND — NAND part")).toBeTruthy();
  fireEvent.click(testButton("Undo"));
  expect(screen.queryByLabelText("NAND — NAND part")).toBeNull();
});

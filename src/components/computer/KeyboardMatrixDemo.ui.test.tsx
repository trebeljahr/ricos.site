// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { demoStorageKey } from "../../lib/computer/demoStorage";
import { KeyboardMatrixDemo } from "./KeyboardMatrixDemo";
import { testButton } from "./testButton";

vi.mock("./tutorial/LazyLogicTutorial", () => ({ LazyLogicTutorial: () => null }));
afterEach(() => {
  cleanup();
  localStorage.clear();
});

it("runs keys, sampling, Shift mapping and rewind in the actual editable circuit builder", () => {
  render(<KeyboardMatrixDemo />);
  fireEvent.click(screen.getByText("The scanner as gates"));
  const builder = screen.getByLabelText("Keyboard scanner circuit");
  fireEvent.click(testButton("OFF", within(builder).getByLabelText("A R0 C0 — SWITCH part")));
  fireEvent.click(testButton("OFF", within(builder).getByLabelText("Shift R1 C0 — SWITCH part")));
  const step = testButton("Step ½ cycle", builder);
  for (let i = 0; i < 10; i++) fireEvent.click(step);
  expect(
    within(within(builder).getByLabelText("A STABLE — LAMP part")).getByLabelText("LED on"),
  ).toBeTruthy();
  expect(
    within(within(builder).getByLabelText("SHIFT STATE — LAMP part")).getByLabelText("LED on"),
  ).toBeTruthy();
  // Rewind the same recorded simulation that owns the contact filter.
  for (let i = 0; i < 10; i++) fireEvent.click(testButton("Back ½ cycle", builder));
  expect(
    within(within(builder).getByLabelText("A STABLE — LAMP part")).getByLabelText("LED off"),
  ).toBeTruthy();
  expect(
    localStorage.getItem(demoStorageKey("Keyboard scanner circuit", "2 × 2 keyboard scanner")),
  ).toBeTruthy();
  // About 4s alone, and past 20s in a full run on a busy machine.
}, 60000);

it("uses canvas wiring for ghosting and saves edits separately from the reader's lab", () => {
  localStorage.setItem("ricos-computer-circuits-v1", "saved lab");
  render(<KeyboardMatrixDemo />);
  const builder = screen.getByLabelText("Matrix ghosting circuit");
  for (const label of ["R1 ACTIVE", "CONTACT 0,0", "CONTACT 0,1", "CONTACT 1,1"])
    fireEvent.click(testButton("OFF", within(builder).getByLabelText(`${label} — SWITCH part`)));
  expect(
    within(within(builder).getByLabelText("C0 SENSE LOW — LAMP part")).getByLabelText("LED on"),
  ).toBeTruthy();
  expect(
    within(within(builder).getByLabelText("C1 SENSE LOW — LAMP part")).getByLabelText("LED on"),
  ).toBeTruthy();
  expect(localStorage.getItem("ricos-computer-circuits-v1")).toBe("saved lab");
});

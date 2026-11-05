// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { SignedArithmetic } from "./SignedArithmetic";

afterEach(() => {
  cleanup();
  localStorage.clear();
});

const press = (name: string) => fireEvent.click(screen.getByRole("button", { name }));
const step = (times = 1) => {
  for (let index = 0; index < times; index++) press("STEP");
};
const readout = () =>
  Array.from(
    screen.getByRole("status", { name: "What this step did" }).children,
    (line) => line.textContent,
  );
const sheet = () => screen.getByRole("table", { name: "Long-form working" });
/** A row's cells as text: the label, the carry-out column, the columns from the left, the value. */
const row = (label: string, nth = 0) => {
  const found = within(sheet()).getAllByRole("rowheader", { name: label })[nth]?.parentElement;
  if (!found) throw new Error(`No row ${label}`);
  return Array.from(found.children, (cell) => cell.textContent).slice(1);
};

it("starts at 2 + (−5) with nothing written, then walks the columns from the right", () => {
  render(<SignedArithmetic />);
  expect(readout()).toEqual(["2 + (−5)", "0010 + 1011"]);
  expect(row("A")).toEqual(["", "0", "0", "1", "0", "2"]);
  expect(row("+B")).toEqual(["", "1", "0", "1", "1", "−5"]);
  expect(row("sum")).toEqual(["", "", "", "", "", ""]);

  step();
  expect(readout()).toEqual(["0 + 1 + carry 0 = 1, write 1, carry 0"]);
  expect(row("sum")).toEqual(["", "", "", "", "1", ""]);
  expect(sheet().querySelector("[data-column='0'][class*='current']")).toBeTruthy();
  step();
  expect(readout()).toEqual(["1 + 1 + carry 0 = 10, write 0, carry 1"]);
  expect(row("carry")).toEqual(["", "", "1", "0", "0", ""]);
  press("BACK");
  expect(readout()).toEqual(["0 + 1 + carry 0 = 1, write 1, carry 0"]);
  expect(row("sum")).toEqual(["", "", "", "", "1", ""]);

  press("SHOW ALL");
  expect(row("sum")).toEqual(["", "1", "1", "0", "1", "−3"]);
  expect(readout()[0]).toBe("2 + (−5) = −3");
  expect(sheet().querySelector("[class*='current']")).toBeNull();

  press("RESTART");
  expect(row("sum")).toEqual(["", "", "", "", "", ""]);
  expect(readout()[0]).toBe("2 + (−5)");
});

it("holds still at each end of the walk", () => {
  render(<SignedArithmetic />);
  press("BACK");
  expect(readout()[0]).toBe("2 + (−5)");
  expect(screen.getByRole("button", { name: "BACK" }).getAttribute("aria-disabled")).toBe("true");
  press("SHOW ALL");
  const end = readout();
  step();
  expect(readout()).toEqual(end);
  expect(screen.getByRole("button", { name: "STEP" }).getAttribute("aria-disabled")).toBe("true");
});

it("drops the carry out of the top in two's complement, and the answer holds", () => {
  render(<SignedArithmetic />);
  press("5 + (−3)");
  step(4);
  expect(row("carry")[0]).toBe("1");
  step();
  expect(readout()).toEqual(["carry 1 → dropped"]);
  step();
  expect(readout()).toEqual([
    "5 + (−3) = 2",
    "carry 1 → dropped",
    "carry into top 1 = carry out 1",
  ]);
  expect(row("sum")).toEqual(["", "0", "0", "1", "0", "2"]);
  expect(within(sheet()).queryByRole("rowheader", { name: "final" })).toBeNull();
});

it("walks the end-around carry as a second pass in ones' complement", () => {
  render(<SignedArithmetic />);
  press("5 + (−3)");
  press("Ones’ complement");
  // The sum stays 5 + (−3); its patterns follow the encoding.
  expect(row("+B")).toEqual(["", "1", "1", "0", "0", "−3"]);
  step(4);
  expect(row("sum")).toEqual(["", "0", "0", "0", "1", "1"]);
  expect(within(sheet()).queryByRole("rowheader", { name: "final" })).toBeNull();
  step();
  expect(readout()).toEqual(["carry 1 → back into column 0"]);
  expect(row("carry", 1)).toEqual(["", "", "", "", "1", ""]);
  step();
  expect(readout()).toEqual(["1 + carry 1 = 10, write 0, carry 1"]);
  expect(row("final")).toEqual(["", "", "", "", "0", ""]);
  press("SHOW ALL");
  expect(row("final")).toEqual(["", "0", "0", "1", "0", "2"]);
  expect(readout()[0]).toBe("5 + (−3) = 2");
});

it("lands on negative zero", () => {
  render(<SignedArithmetic />);
  press("Ones’ complement");
  press("5 + (−5)");
  press("SHOW ALL");
  expect(row("sum")).toEqual(["", "1", "1", "1", "1", "−0"]);
  expect(readout()).toContain("two zeros: 0000 = 0, 1111 = −0");
  press("Two’s complement");
  press("5 + (−5)");
  press("SHOW ALL");
  expect(row("sum")).toEqual(["", "0", "0", "0", "0", "0"]);
});

it("shows overflow next to the true value, and the top carries that disagree", () => {
  render(<SignedArithmetic />);
  press("4 + 7");
  press("SHOW ALL");
  expect(readout()).toEqual([
    "4 + 7 → −5",
    "true answer 11, doesn’t fit",
    "carry into top 1 ≠ carry out 0",
  ]);
  press("−8 + (−3)");
  press("SHOW ALL");
  expect(readout()).toEqual([
    "−8 + (−3) → 5",
    "true answer −11, doesn’t fit",
    "carry 1 → dropped",
    "carry into top 0 ≠ carry out 1",
  ]);
});

it("subtracts by flipping B bit by bit, then adding, with the +1 only in two's complement", () => {
  render(<SignedArithmetic />);
  press("5 − 3");
  expect(row("−B")).toEqual(["", "0", "0", "1", "1", "3"]);
  expect(row("+NOT B")).toEqual(["", "", "", "", "", ""]);
  step();
  expect(readout()).toEqual(["flip 1 → 0"]);
  expect(row("+NOT B")).toEqual(["", "", "", "", "0", ""]);
  step(3);
  expect(row("+NOT B")).toEqual(["", "1", "1", "0", "0", "−4"]);
  step();
  expect(readout()).toEqual(["+1 enters as the first carry"]);
  expect(row("carry")).toEqual(["", "", "", "", "1", ""]);
  press("SHOW ALL");
  expect(row("sum")[5]).toBe("2");

  press("Ones’ complement");
  expect(row("+NOT B")).toEqual(["", "", "", "", "", ""]);
  step(5);
  expect(readout()).toEqual(["no +1, first carry stays 0"]);
  press("SHOW ALL");
  expect(row("final")[5]).toBe("2");
});

it("restarts the walk when an input changes", () => {
  render(<SignedArithmetic />);
  const restarted = () => expect(row("sum")).toEqual(["", "", "", "", "", ""]);

  step(2);
  fireEvent.click(screen.getByRole("switch", { name: "A bit 0" }));
  restarted();
  expect(row("A")[5]).toBe("3");

  step(2);
  press("B plus 1");
  restarted();
  expect(row("+B")[5]).toBe("−4");
  press("A minus 1");
  expect(row("A")[5]).toBe("2");

  step(2);
  press("A − B");
  restarted();
  press("A + B");

  step(2);
  press("Ones’ complement");
  restarted();
  press("Two’s complement");

  step(2);
  press("4 + 7");
  restarted();
});

it("widens to eight bits with the same numbers and its own overflow sums", () => {
  render(<SignedArithmetic />);
  press("8 BITS");
  expect(screen.getAllByRole("switch")).toHaveLength(16);
  expect(row("A").slice(1)).toEqual(["0", "0", "0", "0", "0", "0", "1", "0", "2"]);
  expect(row("+B").slice(1)).toEqual(["1", "1", "1", "1", "1", "0", "1", "1", "−5"]);
  press("100 + 100");
  press("SHOW ALL");
  expect(readout()[0]).toBe("100 + 100 → −56");
  expect(readout()[1]).toBe("true answer 200, doesn’t fit");
  press("4 BITS");
  expect(row("A")[5]).toBe("7");
});

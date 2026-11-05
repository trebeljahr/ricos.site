// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { SignedNumberExplorer } from "./SignedNumbers";

afterEach(() => {
  cleanup();
  localStorage.clear();
});

const flip = (bit: number) => fireEvent.click(screen.getByRole("switch", { name: `Bit ${bit}` }));
const mode = (name: string) => fireEvent.click(screen.getByRole("button", { name }));
const value = () => screen.getByLabelText("Interpreted value").textContent;

it("keeps the bit pattern while changing its mode and width, including negative zero", () => {
  render(<SignedNumberExplorer />);
  expect(value()).toBe("−5");
  mode("Sign + magnitude");
  expect(screen.getByRole("button", { name: "Sign + magnitude", pressed: true })).toBeTruthy();
  expect(value()).toBe("−3");
  flip(1);
  flip(0);
  expect(value()).toBe("−0");
  fireEvent.click(screen.getByRole("button", { name: "Next bit pattern" }));
  expect(value()).toBe("−1");
  mode("8 BITS");
  expect(value()).toBe("9");
});

it("writes each digit with its power, then the condensed sum, then the number", () => {
  render(<SignedNumberExplorer />);
  const formula = (encoding: string) => {
    mode(encoding);
    const code = screen.getByLabelText("Interpreted value").parentElement?.querySelector("code");
    return Array.from(code?.children ?? [], (line) => line.textContent);
  };
  expect(formula("Two’s complement")).toEqual([
    "1×(−23) + 0×22 + 1×21 + 1×20",
    "= −8 + 0 + 2 + 1",
    "= −5",
  ]);
  expect(formula("Ones’ complement")).toEqual([
    "1×(−(23−1)) + 0×22 + 1×21 + 1×20",
    "= −7 + 0 + 2 + 1",
    "= −4",
  ]);
  expect(formula("Sign + magnitude")).toEqual(["−(0×22 + 1×21 + 1×20)", "= −(0 + 2 + 1)", "= −3"]);
  expect(formula("Unsigned")).toEqual(["1×23 + 0×22 + 1×21 + 1×20", "= 8 + 0 + 2 + 1", "= 11"]);
});

it("lists the patterns only at four bits, and gives up the count and zero controls", () => {
  render(<SignedNumberExplorer />);
  const list = screen.getByRole("list", { name: "All sixteen bit patterns" });
  expect(within(list).getAllByRole("button")).toHaveLength(16);
  fireEvent.click(within(list).getByRole("button", { name: "1111 −1" }));
  expect(value()).toBe("−1");
  expect(screen.queryByRole("slider")).toBeNull();
  expect(screen.queryByText("COUNT BIT PATTERNS")).toBeNull();
  mode("8 BITS");
  expect(screen.queryByRole("list")).toBeNull();
  expect(screen.getAllByRole("switch")).toHaveLength(8);
});

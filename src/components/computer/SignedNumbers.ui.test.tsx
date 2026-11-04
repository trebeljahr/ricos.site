// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { SignedArithmetic, SignedNumberExplorer } from "./SignedNumbers";

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

it("reads its results and flags from the displayed circuit and preserves saved lab data", () => {
  localStorage.setItem("ricos-computer-circuits-v1", "reader’s saved lab");
  render(<SignedArithmetic />);
  const result = () => screen.getByLabelText("Circuit signed result").textContent;
  const output = screen.getByLabelText("Signed arithmetic circuit");
  expect(result()).toBe("−3");
  fireEvent.click(screen.getByRole("button", { name: "4 + 7" }));
  expect(result()).toBe("−5");
  expect(screen.getByLabelText("Circuit carry out").textContent).toBe("0");
  expect(screen.getByLabelText("Circuit signed overflow").textContent).toBe("1");
  expect(
    within(output).getByText(
      "The exact answer 11 is outside this signed range. The stored bits wrap to −5.",
    ),
  ).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "−8 + (−3)" }));
  expect(result()).toBe("5");
  expect(screen.getByLabelText("Circuit carry out").textContent).toBe("1");
  expect(screen.getByLabelText("Circuit signed overflow").textContent).toBe("1");
  fireEvent.click(screen.getByRole("button", { name: "−1 + 1" }));
  expect(result()).toBe("0");
  expect(screen.getByLabelText("Circuit carry out").textContent).toBe("1");
  expect(screen.getByLabelText("Circuit signed overflow").textContent).toBe("0");
  fireEvent.click(screen.getByRole("button", { name: "2 − 5" }));
  expect(result()).toBe("−3");
  expect(screen.getByRole("button", { name: "A − B", pressed: true })).toBeTruthy();
  expect(screen.getByText("0010 + 1010 + 1 → 1101")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "8 BITS" }));
  fireEvent.click(screen.getByRole("button", { name: "4 + 7" }));
  expect(result()).toBe("11");
  expect(localStorage.getItem("ricos-computer-circuits-v1")).toBe("reader’s saved lab");
});

it("shows why ordinary binary addition fails for a representable sign-magnitude sum", () => {
  render(<SignedArithmetic />);
  fireEvent.click(screen.getByText("Why does the encoding matter to addition?"));
  fireEvent.click(screen.getByRole("button", { name: "Try sign-magnitude 2 + (−5)" }));
  const table = screen.getByRole("table", {
    name: "Same circuit wires under different signed encodings",
  });
  const row = within(table).getByRole("row", { name: "Sign + magnitude 2 + (−5) −3 −7 Mismatch" });
  expect(within(row).getByRole("cell", { name: "−3" })).toBeTruthy();
  expect(within(row).getByRole("cell", { name: "−7" })).toBeTruthy();
  // The main display still reads these same wires as two’s complement: 2 + (−3) = −1.
  expect(screen.getByLabelText("Circuit signed result").textContent).toBe("−1");
  fireEvent.click(screen.getByRole("button", { name: "8 BITS" }));
  fireEvent.click(screen.getByText("Why does the encoding matter to addition?"));
  fireEvent.click(screen.getByRole("button", { name: "Try sign-magnitude 2 + (−5)" }));
  expect(
    screen.getByRole("row", { name: "Sign + magnitude 2 + (−5) −3 −7 Mismatch" }),
  ).toBeTruthy();
});

// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { SignedArithmetic, SignedNumberExplorer } from "./SignedNumbers";

afterEach(() => {
  cleanup();
  localStorage.clear();
});

it("keeps the bit pattern while changing its encoding and width, including negative zero", () => {
  render(<SignedNumberExplorer />);
  expect(screen.getByLabelText("Interpreted value").textContent).toBe("−5");
  fireEvent.click(screen.getByRole("radio", { name: "Sign + magnitude" }));
  expect(screen.getByLabelText("Interpreted value").textContent).toBe("−3");
  fireEvent.click(screen.getByRole("button", { name: "−0 · 1000" }));
  expect(screen.getByLabelText("Interpreted value").textContent).toBe("−0");
  fireEvent.click(screen.getByRole("button", { name: "Next bit pattern" }));
  expect(screen.getByLabelText("Interpreted value").textContent).toBe("−1");
  fireEvent.click(screen.getByRole("button", { name: "8 BITS" }));
  expect(screen.getByLabelText("Interpreted value").textContent).toBe("9");
});

it("labels the top bit and sums the places with each encoding's real weight", () => {
  render(<SignedNumberExplorer />);
  const pattern = screen.getByRole("group", { name: "Stored pattern" });
  const read = (encoding: string) => {
    fireEvent.click(screen.getByRole("radio", { name: encoding }));
    return [
      pattern.querySelector("div")?.textContent,
      screen.getByLabelText("Interpreted value").parentElement?.querySelector("code")?.textContent,
    ];
  };
  expect(read("Two’s complement")).toEqual(["−23−81SIGN BIT", "−8 + 0 + 2 + 1 = −5"]);
  expect(read("Ones’ complement")).toEqual(["−(23−1)−71SIGN BIT", "−7 + 0 + 2 + 1 = −4"]);
  expect(read("Sign + magnitude")).toEqual(["±SIGN1SIGN BIT", "−(0 + 2 + 1) = −3"]);
  expect(read("Unsigned")).toEqual(["2381BIT 3", "8 + 0 + 2 + 1 = 11"]);
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

// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { KeyboardMatrixDemo } from "./KeyboardMatrixDemo";

// The actual controller and gate simulation stay real; separate builder tests cover its editor UI.
vi.mock("./LogicBuilder", () => ({ LogicBuilder: () => null }));
afterEach(cleanup);
const frame = () => fireEvent.click(screen.getByRole("button", { name: "Scan one frame" }));
const meter = (label: string) =>
  screen.getByText(label, { selector: "dt" }).nextElementSibling?.textContent;
it("scans simultaneous Shift+A, reports one press per contact and one release", () => {
  render(<KeyboardMatrixDemo />);
  fireEvent.click(screen.getByRole("button", { name: "Hold Shift + A" }));
  expect(screen.getByRole("button", { name: "A R0 C0" }).getAttribute("aria-pressed")).toBe("true");
  frame();
  expect(meter("STABLE KEYS")).toBe("0");
  frame();
  expect(screen.getByLabelText("Mapped text").textContent).toBe("A");
  expect(meter("SHIFT STATE")).toBe("1");
  frame();
  expect(screen.getByLabelText("Key transitions").children).toHaveLength(2);
  fireEvent.click(screen.getByRole("button", { name: "Release all keys" }));
  frame();
  frame();
  expect(meter("STABLE KEYS")).toBe("0");
  expect(screen.getByLabelText("Key transitions").children).toHaveLength(4);
});
it("exposes the phantom fourth contact and restores isolation when diodes are enabled", () => {
  render(<KeyboardMatrixDemo />);
  fireEvent.click(screen.getByRole("button", { name: "Hold three ghosting corners" }));
  fireEvent.click(screen.getByRole("checkbox", { name: "Per-key COL→ROW diodes" }));
  frame();
  frame();
  expect(meter("HELD CONTACTS")).toBe("3");
  expect(meter("STABLE KEYS")).toBe("4");
  expect(screen.getByRole("button", { name: "Shift R1 C0" }).getAttribute("data-ghost")).toBe(
    "true",
  );
  fireEvent.click(screen.getByRole("checkbox", { name: "Per-key COL→ROW diodes" }));
  frame();
  frame();
  expect(meter("STABLE KEYS")).toBe("3");
});
it("supports held keyboard input, ignores repeats, releases on blur, and scales to QWERTY", () => {
  render(<KeyboardMatrixDemo />);
  fireEvent.click(screen.getByRole("checkbox", { name: "Latch keys for accessible chords" }));
  const key = screen.getByRole("button", { name: "A R0 C0" });
  fireEvent.keyDown(key, { key: " ", repeat: false });
  fireEvent.keyDown(key, { key: " ", repeat: true });
  expect(key.getAttribute("aria-pressed")).toBe("true");
  fireEvent.blur(key);
  expect(key.getAttribute("aria-pressed")).toBe("false");
  fireEvent.click(screen.getByRole("button", { name: "US QWERTY preset" }));
  expect(
    screen.getByRole("combobox", { name: "Matrix rows" }).getAttribute("value") ??
      (screen.getByRole("combobox", { name: "Matrix rows" }) as HTMLSelectElement).value,
  ).toBe("6");
  expect(screen.getByRole("button", { name: "Shift R3 C0" })).toBeTruthy();
  expect(screen.getByRole("button", { name: "A R2 C1" })).toBeTruthy();
});

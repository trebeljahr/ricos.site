// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { ByteExplorer } from "./ByteExplorer";

afterEach(cleanup);

it("shows both place-value readings and subtracts 128 when the first bit is set", () => {
  render(<ByteExplorer />);
  expect(screen.getByTitle("Two’s complement bit 7 weight: -128").textContent).toBe("−128");
  expect(screen.queryByText(/FIXED/)).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Bit 7: 0. Toggle bit." }));
  expect(
    screen.getByRole("button", { name: "Set TWO’S COMPLEMENT. Current value -63" }),
  ).toBeTruthy();
  expect(
    screen.getByRole("button", { name: "Set unsigned decimal value. Current value 193" }),
  ).toBeTruthy();

  for (const [bits, signed, unsigned] of [
    ["10000000", -128, 128],
    ["11111111", -1, 255],
    ["00000000", 0, 0],
    ["01111111", 127, 127],
  ] as const) {
    fireEvent.change(screen.getByLabelText("BINARY"), { target: { value: bits } });
    expect(
      screen.getByRole("button", { name: `Set TWO’S COMPLEMENT. Current value ${signed}` }),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: `Set unsigned decimal value. Current value ${unsigned}` }),
    ).toBeTruthy();
  }
});

it("edits two’s complement values and rejects numbers outside its range", () => {
  HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
    this.open = true;
  });
  HTMLDialogElement.prototype.close = vi.fn();
  render(<ByteExplorer />);
  fireEvent.click(screen.getByRole("button", { name: "Set TWO’S COMPLEMENT. Current value 65" }));
  const input = screen.getByLabelText("NEW VALUE");
  fireEvent.change(input, { target: { value: "128" } });
  fireEvent.submit(input.closest("form")!);
  expect(screen.getByRole("alert").textContent).toBe("Signed byte: −128–127.");
  expect((screen.getByLabelText("BINARY") as HTMLInputElement).value).toBe("01000001");
  fireEvent.change(input, { target: { value: "-128" } });
  fireEvent.submit(input.closest("form")!);
  expect((screen.getByLabelText("BINARY") as HTMLInputElement).value).toBe("10000000");
});

it("loads text, integer, and float examples into the same byte", () => {
  render(<ByteExplorer />);
  for (const [preset, reading, value] of [
    ["CHARACTER &", "ASCII", "&"],
    ["SIGNED −42", "TWO’S COMPLEMENT", "-42"],
    ["SIGNED −128", "TWO’S COMPLEMENT", "-128"],
    ["FLOAT 0.5", "FLOAT · E4M3", "0.5"],
    ["FLOAT ∞", "FLOAT · E4M3", "Infinity"],
  ]) {
    fireEvent.click(screen.getByRole("button", { name: preset }));
    expect(
      screen.getByRole("button", { name: `Set ${reading}. Current value ${value}` }),
    ).toBeTruthy();
  }
  fireEvent.click(screen.getByRole("button", { name: "DECIMAL 42" }));
  expect(
    screen.getByRole("button", { name: "Set unsigned decimal value. Current value 42" }),
  ).toBeTruthy();
});

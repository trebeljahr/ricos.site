// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { FullAdder, HalfAdder } from "./Adders";
import { MemoryMappedScreenDemo } from "./MemoryMappedScreenDemo";
import { testButton } from "./testButton";

afterEach(() => {
  cleanup();
  localStorage.clear();
});

it("uses native adder parts and changes the sum and carry from real switches", () => {
  render(<HalfAdder />);
  fireEvent.click(testButton("OFF", screen.getByLabelText("B — SWITCH part")));
  expect(within(screen.getByLabelText("SUM — LAMP part")).getByLabelText("LED off")).toBeTruthy();
  expect(within(screen.getByLabelText("CARRY — LAMP part")).getByLabelText("LED on")).toBeTruthy();
});

it("starts the boxed full adder with two unfoldable half adders", () => {
  render(<FullAdder unfolded={false} />);
  expect(screen.getByLabelText("HALF ADDER 1 — 1-bit half adder part")).toBeTruthy();
  fireEvent.click(testButton("Unfold HALF ADDER 1 in place"));
  expect(screen.getByLabelText("1-bit half adder expanded circuit")).toBeTruthy();
});

it("stores into the native screen through the CPU address decoder", () => {
  render(<MemoryMappedScreenDemo />);
  const data = screen.getByLabelText("DATA decimal input");
  fireEvent.change(data, { target: { value: "255" } });
  fireEvent.keyDown(data, { key: "Enter" });
  fireEvent.click(testButton("OFF", screen.getByLabelText("WRITE ENABLE — SWITCH part")));
  fireEvent.click(testButton("Step ½ cycle"));
  expect(screen.getByLabelText("SCREEN (F0–F7) rows FF 00 00 00 00 00 00 00")).toBeTruthy();
  fireEvent.click(testButton("Unfold SCREEN (F0–F7) in place"));
  expect(screen.getByLabelText("8×8 screen expanded circuit")).toBeTruthy();
});

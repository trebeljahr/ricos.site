// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { DecoderDemo, MemoryAddressDemo, MultiplexerDemo } from "./AddressRouting";
import { testButton } from "./testButton";

afterEach(() => {
  cleanup();
  localStorage.clear();
});

it("routes native switches through the shared decoder and supports undo", () => {
  render(<DecoderDemo />);
  expect(within(screen.getByLabelText("Y0 — LAMP part")).getByLabelText("LED on")).toBeTruthy();
  fireEvent.click(testButton("OFF", screen.getByLabelText("A0 — SWITCH part")));
  expect(within(screen.getByLabelText("Y1 — LAMP part")).getByLabelText("LED on")).toBeTruthy();
  fireEvent.click(testButton("Undo"));
  expect(within(screen.getByLabelText("Y0 — LAMP part")).getByLabelText("LED on")).toBeTruthy();
});

it("opens on the tutorial's selector parts, which a reader can refold and reopen", () => {
  render(<MultiplexerDemo />);
  const expanded = () => screen.queryAllByLabelText("SELECTOR expanded circuit").length;
  expect(expanded()).toBe(3);
  const part = screen.getByLabelText("LOW PAIR — SELECTOR part");
  fireEvent.click(testButton("Refold box", part));
  expect(expanded()).toBe(2);
  fireEvent.click(testButton("Unfold LOW PAIR in place", part));
  expect(expanded()).toBe(3);
});

it("stores RAM on the native clock and keeps saved lab circuits untouched", () => {
  localStorage.setItem("ricos-computer-circuits-v1", "existing saved lab");
  render(<MemoryAddressDemo />);
  fireEvent.click(testButton("OFF", screen.getByLabelText("WRITE ENABLE — SWITCH part")));
  fireEvent.click(testButton("Step ½ cycle"));
  expect(within(screen.getByLabelText("READ — LAMP part")).getByLabelText("LED on")).toBeTruthy();
  expect(localStorage.getItem("ricos-computer-circuits-v1")).toBe("existing saved lab");
});

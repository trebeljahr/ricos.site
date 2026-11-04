// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { EndianReader } from "./EndianReader";

beforeEach(() => {
  vi.stubGlobal("matchMedia", () => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const preset = (hex: string) => screen.getByRole("button", { name: `Preset ${hex}` });
const pressed = (hex: string) => preset(hex).getAttribute("aria-pressed");

it("keeps a preset key down until the bytes move off its value", () => {
  render(<EndianReader />);
  expect(pressed("00 01")).toBe("true");
  fireEvent.click(preset("A1 A1"));
  expect(pressed("A1 A1")).toBe("true");
  expect(pressed("00 01")).toBe("false");
  const bit = () => screen.getByRole("button", { name: /^Byte 2, bit 0:/ });
  fireEvent.click(bit());
  expect(pressed("A1 A1")).toBe("false");
  fireEvent.click(bit());
  expect(pressed("A1 A1")).toBe("true");
  fireEvent.change(screen.getByLabelText("HEX / TWO BYTES"), { target: { value: "a1a1" } });
  expect(pressed("A1 A1")).toBe("true");
  fireEvent.change(screen.getByLabelText("HEX / TWO BYTES"), { target: { value: "a1" } });
  expect(pressed("A1 A1")).toBe("false");
});

it("puts the two orders in real use first, each reading the bytes its own way", () => {
  render(<EndianReader />);
  fireEvent.click(preset("12 34"));
  const radios = screen.getAllByRole("radio");
  expect(radios[0].getAttribute("aria-label")).toContain("(Big endian)");
  expect(radios[1].getAttribute("aria-label")).toContain("(Little endian)");
  expect(radios[2].getAttribute("aria-label")).not.toContain("endian");
  expect(radios[3].getAttribute("aria-label")).not.toContain("endian");
  const row = (radio: HTMLElement) => radio.closest("label")?.textContent;
  expect(row(radios[0])).toContain("HEX 1234");
  expect(row(radios[1])).toContain("HEX 3412");
});

it("sweeps without a switch and has its sound switch back", () => {
  render(<EndianReader />);
  expect(screen.queryByRole("button", { name: /sweep/i })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Sound on. Toggle sound." }));
  expect(screen.getByRole("button", { name: "Sound off. Toggle sound." })).toBeTruthy();
});

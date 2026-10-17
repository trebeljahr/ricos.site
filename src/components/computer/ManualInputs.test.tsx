// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { decimalInput } from "../../lib/computer/manualInputs";
import { DecimalInput, ManualButton } from "./ManualInputs";
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("decimal input", () => {
  it("accepts only bounded unsigned decimal integers", () => {
    for (const value of [
      "",
      "-1",
      "16",
      "NaN",
      "1.5",
      "1e1",
      "+2",
      " 2",
      "Infinity",
      "99999999999999999999999",
    ])
      expect(decimalInput(value, 4)).toBeNull();
    expect(decimalInput("15", 4)).toBe(15);
    expect(decimalInput("255", 8)).toBe(255);
    expect(decimalInput("256", 8)).toBeNull();
    expect(decimalInput("0003", 4)).toBe(3);
  });
  it("commits on Enter/blur, rejects invalid edits, escapes and follows external bits", () => {
    const change = vi.fn();
    const { rerender } = render(
      <DecimalInput width={4} value={2} label="DATA" onChange={change} />,
    );
    const input = screen.getByRole("textbox", { name: "DATA decimal input" }) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "15" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(change).toHaveBeenLastCalledWith(15);
    fireEvent.change(input, { target: { value: "16" } });
    fireEvent.blur(input);
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(change).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(input, { key: "Escape" });
    expect(input.value).toBe("2");
    rerender(<DecimalInput width={4} value={7} label="DATA" onChange={change} />);
    expect(input.value).toBe("7");
  });
});

describe("manual input", () => {
  it("clicks emit complete pulses; holding is an explicit separate mode", () => {
    const pulse = vi.fn(),
      held = vi.fn(),
      mode = vi.fn();
    render(
      <ManualButton
        label="INC"
        mode="pulse"
        onPulse={pulse}
        onHeldChange={held}
        onModeChange={mode}
      />,
    );
    const button = screen.getByRole("button");
    fireEvent.click(button);
    fireEvent.click(button);
    expect(pulse).toHaveBeenCalledTimes(2);
    expect(held).not.toHaveBeenCalled();
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "held" } });
    expect(mode).toHaveBeenCalledWith("held");
  });
  it("keyboard repeats never retrigger; blur/cancel/unmount always release", () => {
    const change = vi.fn();
    const { unmount } = render(
      <ManualButton
        label="KEY"
        mode="held"
        onPulse={vi.fn()}
        onHeldChange={change}
        onModeChange={vi.fn()}
      />,
    );
    const button = screen.getByRole("button");
    fireEvent.keyDown(button, { key: " ", repeat: false });
    fireEvent.keyDown(button, { key: " ", repeat: true });
    expect(change.mock.calls).toEqual([[true]]);
    fireEvent.keyUp(button, { key: " " });
    expect(change.mock.calls).toEqual([[true], [false]]);
    fireEvent.keyDown(button, { key: "Enter" });
    fireEvent.blur(button);
    expect(change).toHaveBeenLastCalledWith(false);
    fireEvent.keyDown(button, { key: "Enter" });
    fireEvent.pointerCancel(button);
    expect(change).toHaveBeenLastCalledWith(false);
    fireEvent.keyDown(button, { key: "Enter" });
    fireEvent.blur(window);
    expect(change).toHaveBeenLastCalledWith(false);
    fireEvent.keyDown(button, { key: "Enter" });
    unmount();
    expect(change).toHaveBeenLastCalledWith(false);
  });
});

it("a prior pulse flash cannot clear or fake a subsequent held state", () => {
  vi.useFakeTimers();
  const change = vi.fn();
  const props = { label: "CLOCK", onPulse: vi.fn(), onHeldChange: change, onModeChange: vi.fn() };
  const { rerender } = render(<ManualButton {...props} mode="pulse" />);
  fireEvent.click(screen.getByRole("button"));
  rerender(<ManualButton {...props} mode="held" />);
  expect(screen.getByRole("button").getAttribute("aria-pressed")).toBe("false");
  fireEvent.keyDown(screen.getByRole("button"), { key: " " });
  vi.advanceTimersByTime(300);
  expect(screen.getByRole("button").getAttribute("aria-pressed")).toBe("true");
  expect(change).toHaveBeenLastCalledWith(true);
});

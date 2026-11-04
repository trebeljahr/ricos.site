// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { WiredKeyboard } from "./WiredKeyboard";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
beforeEach(() => {
  // A real browser would play a click; jsdom has no audio to play it on.
  vi.stubGlobal("AudioContext", undefined);
});

const typedText = () => screen.getByLabelText("Screen").textContent;
const key = (code: string) => {
  const element = document.querySelector<HTMLElement>(`[data-key="${code}"]`);
  if (!element) throw new Error(`No key ${code}`);
  return element;
};
const hover = () =>
  fireEvent.pointerEnter(screen.getByLabelText("Wired keyboard"), { pointerType: "mouse" });
const realTap = (code: string, char: string, extra = {}) => {
  fireEvent.keyDown(window, { code, key: char, ...extra });
  fireEvent.keyUp(window, { code, key: char, ...extra });
};
const settle = () => act(() => new Promise((resolve) => setTimeout(resolve, 300)));

it("types through the scan with the real keyboard while the pointer is over it", async () => {
  render(<WiredKeyboard />);
  hover();
  expect(screen.getByLabelText("Real keyboard").textContent).toContain("ON");
  realTap("KeyH", "h");
  realTap("KeyI", "i");
  await waitFor(() => expect(typedText()).toBe("hi"));
  expect(screen.getByLabelText("Write pointer").textContent).toBe("0x0402");
  const cell = document.querySelector('[data-address="0x0400"]');
  expect(cell?.textContent).toBe("68h");
});

it("ignores the real keyboard while neither pointed at nor focused", async () => {
  render(<WiredKeyboard />);
  expect(screen.getByLabelText("Real keyboard").textContent).toContain("OFF");
  const event = new KeyboardEvent("keydown", { code: "KeyA", key: "a", cancelable: true });
  window.dispatchEvent(event);
  expect(event.defaultPrevented).toBe(false);
  await settle();
  expect(typedText()).toBe("");
});

it("leaves shortcuts, Tab and function keys to the browser", async () => {
  render(<WiredKeyboard />);
  hover();
  const dispatch = (init: KeyboardEventInit) => {
    const event = new KeyboardEvent("keydown", { cancelable: true, ...init });
    window.dispatchEvent(event);
    window.dispatchEvent(new KeyboardEvent("keyup", { code: init.code, key: init.key }));
    return event.defaultPrevented;
  };
  expect(dispatch({ code: "KeyR", key: "r", metaKey: true })).toBe(false);
  expect(dispatch({ code: "KeyL", key: "l", ctrlKey: true })).toBe(false);
  expect(dispatch({ code: "KeyQ", key: "@", altKey: true })).toBe(false);
  expect(dispatch({ code: "Tab", key: "Tab" })).toBe(false);
  expect(dispatch({ code: "F5", key: "F5" })).toBe(false);
  expect(dispatch({ code: "Space", key: " " })).toBe(true);
  await waitFor(() => expect(typedText()).toBe("\t "));
});

it("leaves typing in a field elsewhere on the page alone", async () => {
  render(
    <>
      <WiredKeyboard />
      <textarea aria-label="Note" />
    </>,
  );
  hover();
  const note = screen.getByLabelText("Note");
  fireEvent.keyDown(note, { code: "KeyA", key: "a" });
  fireEvent.keyUp(note, { code: "KeyA", key: "a" });
  await settle();
  expect(typedText()).toBe("");
});

it("presses on-screen keys by pointer, with Shift held for the next key", async () => {
  render(<WiredKeyboard />);
  fireEvent.pointerDown(key("ShiftLeft"), { pointerId: 1, pointerType: "touch" });
  fireEvent.pointerUp(key("ShiftLeft"), { pointerId: 1, pointerType: "touch" });
  expect(key("ShiftLeft").getAttribute("aria-pressed")).toBe("true");
  fireEvent.pointerDown(key("KeyA"), { pointerId: 2, pointerType: "touch" });
  expect(key("KeyA").getAttribute("aria-pressed")).toBe("true");
  fireEvent.pointerUp(key("KeyA"), { pointerId: 2, pointerType: "touch" });
  expect(key("KeyA").getAttribute("aria-pressed")).toBe("false");
  expect(key("ShiftLeft").getAttribute("aria-pressed")).toBe("false");
  fireEvent.pointerDown(key("KeyB"), { pointerId: 3, pointerType: "touch" });
  fireEvent.pointerUp(key("KeyB"), { pointerId: 3, pointerType: "touch" });
  await waitFor(() => expect(typedText()).toBe("Ab"));
});

it("holds a key on the keyboard while the real key is down and lets go after Command", () => {
  render(<WiredKeyboard />);
  hover();
  fireEvent.keyDown(window, { code: "KeyA", key: "a" });
  expect(key("KeyA").getAttribute("aria-pressed")).toBe("true");
  // macOS never sends the release of a key pressed while Command is down.
  fireEvent.keyUp(window, { code: "MetaLeft", key: "Meta" });
  expect(key("KeyA").getAttribute("aria-pressed")).toBe("false");
});

it("lets go of real keys when the window loses focus", () => {
  render(<WiredKeyboard />);
  hover();
  fireEvent.keyDown(window, { code: "KeyA", key: "a" });
  fireEvent.blur(window);
  expect(key("KeyA").getAttribute("aria-pressed")).toBe("false");
});

it("labels the keys from the browser's layout map and moves to ISO for it", async () => {
  Object.defineProperty(navigator, "keyboard", {
    configurable: true,
    value: {
      getLayoutMap: async () =>
        new Map([
          ["KeyY", "z"],
          ["KeyZ", "y"],
          ["BracketLeft", "ü"],
          ["Backslash", "#"],
        ]),
    },
  });
  render(<WiredKeyboard />);
  await waitFor(() => expect(screen.getByText(/QWERTZ ISO/)).toBeTruthy());
  expect(key("KeyY").textContent).toContain("Z");
  expect(key("BracketLeft").textContent).toContain("Ü");
  expect(key("IntlBackslash")).toBeTruthy();
  fireEvent.pointerDown(key("KeyY"), { pointerId: 1, pointerType: "touch" });
  fireEvent.pointerUp(key("KeyY"), { pointerId: 1, pointerType: "touch" });
  await waitFor(() => expect(typedText()).toBe("z"));
  Reflect.deleteProperty(navigator, "keyboard");
});

it("takes a key's label from a real press where the browser cannot name the layout", async () => {
  render(<WiredKeyboard />);
  hover();
  realTap("Semicolon", "ö");
  await waitFor(() => expect(typedText()).toBe("ö"));
  expect(key("Semicolon").textContent).toContain("Ö");
  expect(document.querySelector('[data-address="0x0400"]')?.textContent).toBe("C3");
});

it("empties the memory and the screen", async () => {
  render(<WiredKeyboard />);
  hover();
  realTap("KeyA", "a");
  await waitFor(() => expect(typedText()).toBe("a"));
  fireEvent.click(screen.getByRole("button", { name: "CLEAR" }));
  await waitFor(() => expect(typedText()).toBe(""));
  expect(screen.getByLabelText("Write pointer").textContent).toBe("0x0400");
});

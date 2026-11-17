// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  parseReading,
  positionToSave,
  READING_KEY,
  saveChapterPosition,
  useReadingPosition,
  useReadingState,
} from "./useReadingPosition";

const stored = () => JSON.parse(localStorage.getItem(READING_KEY) ?? "null");

function setScroll(y: number, height = 5000) {
  Object.defineProperty(window, "scrollY", { configurable: true, value: y });
  Object.defineProperty(document.documentElement, "scrollHeight", {
    configurable: true,
    value: height,
  });
}

beforeEach(() => {
  localStorage.clear();
  setScroll(0);
  window.history.replaceState(null, "", "/computer/test");
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

it.each(["{broken", "null", "4", "[]", '{"last":3,"chapters":{"a":"x","b":-1}}'])(
  "reads malformed storage as empty: %s",
  (raw) => {
    expect(parseReading(raw)).toEqual({ last: null, chapters: {} });
  },
);

it("drops a last chapter that has no saved position", () => {
  expect(parseReading('{"last":"gone","chapters":{"a":12.4}}')).toEqual({
    last: null,
    chapters: { a: 12 },
  });
});

it("forgets the position once the reader reaches the end", () => {
  expect(positionToSave(300, 1000)).toBe(300);
  expect(positionToSave(960, 1000)).toBe(0);
  expect(positionToSave(0, 0)).toBe(0);
});

it("marks the opened chapter as the last one and saves scrolling, throttled", () => {
  vi.useFakeTimers();
  renderHook(() => useReadingPosition("whirlwind-tour"));
  expect(stored()).toEqual({ last: "whirlwind-tour", chapters: { "whirlwind-tour": 0 } });

  setScroll(1200);
  window.dispatchEvent(new Event("scroll"));
  setScroll(1500);
  window.dispatchEvent(new Event("scroll"));
  expect(stored().chapters["whirlwind-tour"]).toBe(0);
  act(() => vi.advanceTimersByTime(600));
  expect(stored().chapters["whirlwind-tour"]).toBe(1500);
});

it("brings a returning reader back to where they were", () => {
  saveChapterPosition("whirlwind-tour", 1800);
  const frames: FrameRequestCallback[] = [];
  vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => frames.push(cb));
  renderHook(() => useReadingPosition("whirlwind-tour"));
  frames.shift()?.(0);
  expect(window.scrollTo).toHaveBeenCalledWith({ top: 1800, behavior: "instant" });
});

it("does not restore when the link points at a #section", () => {
  saveChapterPosition("whirlwind-tour", 1800);
  window.history.replaceState(null, "", "/computer/whirlwind-tour#memory");
  const frames: FrameRequestCallback[] = [];
  vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => frames.push(cb));
  renderHook(() => useReadingPosition("whirlwind-tour"));
  expect(frames).toHaveLength(0);
  expect(window.scrollTo).not.toHaveBeenCalled();
});

it("shares the saved state with the series index", () => {
  const { result } = renderHook(() => useReadingState());
  expect(result.current.last).toBeNull();
  act(() => saveChapterPosition("bits", 40));
  expect(result.current).toEqual({ last: "bits", chapters: { bits: 40 } });
});

it("keeps working when storage is blocked", () => {
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
    throw new Error("blocked");
  });
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new Error("blocked");
  });
  const { result } = renderHook(() => useReadingState());
  expect(() => renderHook(() => useReadingPosition("bits"))).not.toThrow();
  expect(result.current.last).toBeNull();
});

// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { demoStorageKey } from "../lib/computer/demoStorage";
import { useDemoState } from "./useDemoState";

beforeEach(() => localStorage.clear());
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

it("writes even invalid unfinished code immediately and restores it on remount", () => {
  const first = renderHook(() => useDemoState("test:source", "print(1);"));
  act(() => first.result.current[1]("print("));
  expect(localStorage.getItem(demoStorageKey("test:source"))).toBe(JSON.stringify("print("));
  first.unmount();
  const second = renderHook(() => useDemoState("test:source", "print(1);"));
  expect(second.result.current[0]).toBe("print(");
});

it.each(["{broken", "null", "4", "[]"])("ignores malformed text drafts: %s", (raw) => {
  localStorage.setItem(demoStorageKey("test:bad"), raw);
  const { result } = renderHook(() => useDemoState("test:bad", "starter"));
  expect(result.current[0]).toBe("starter");
});

it("rejects codebooks with missing entries and unknown CPU choices", () => {
  localStorage.setItem(demoStorageKey("test:book"), JSON.stringify(["missing"]));
  localStorage.setItem(demoStorageKey("test:cpu"), JSON.stringify("unknown"));
  const book = renderHook(() => useDemoState("test:book", ["A", "B"]));
  const cpu = renderHook(() =>
    useDemoState("test:cpu", "hardware", (value) => value === "hardware" || value === "ram"),
  );
  expect(book.result.current[0]).toEqual(["A", "B"]);
  expect(cpu.result.current[0]).toBe("hardware");
});

it("keeps the editor usable when storage is blocked", () => {
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
    throw new Error("blocked");
  });
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new Error("blocked");
  });
  const { result } = renderHook(() => useDemoState("test:blocked", "starter"));
  expect(result.current[0]).toBe("starter");
  act(() => result.current[1]("unfinished"));
  expect(result.current[0]).toBe("unfinished");
});

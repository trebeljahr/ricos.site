import { describe, expect, it, vi } from "vitest";
import { lazyRecord } from "./lazyRecord";

describe("lazyRecord", () => {
  it("lists its keys without building, and builds each value once on first read", () => {
    const a = vi.fn(() => ({ name: "a" }));
    const b = vi.fn(() => ({ name: "b" }));
    const record = lazyRecord({ a, b });
    expect(Object.keys(record)).toEqual(["a", "b"]);
    expect("a" in record).toBe(true);
    expect(a).not.toHaveBeenCalled();
    expect(record.a).toBe(record.a);
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).not.toHaveBeenCalled();
  });

  it("reads like a plain record", () => {
    const record = lazyRecord({ a: () => 1, b: () => 2 });
    expect(Object.entries(record)).toEqual([
      ["a", 1],
      ["b", 2],
    ]);
    expect(record).toEqual({ a: 1, b: 2 });
    expect(JSON.stringify(record)).toBe('{"a":1,"b":2}');
  });
});

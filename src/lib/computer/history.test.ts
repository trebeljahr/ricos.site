import { describe, expect, it } from "vitest";
import { createHistory, record, redo, undo } from "./history";

describe("circuit history", () => {
  it("undoes and redoes edits, then clears redo after a new edit", () => {
    const edited = record(record(createHistory("initial"), "first"), "second");
    expect(undo(edited).present).toBe("first");
    expect(redo(undo(edited)).present).toBe("second");
    const branched = record(undo(edited), "alternate");
    expect(branched.future).toEqual([]);
    expect(redo(branched).present).toBe("alternate");
  });

  it("skips identical snapshots", () => {
    const initial = createHistory({ value: 1 });
    expect(record(initial, { value: 1 })).toBe(initial);
  });
});

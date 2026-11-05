// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import type { Circuit } from "src/lib/computer/logic";
import type { Grade } from "src/lib/computer/tutorial/grade";
import { afterEach, expect, it, vi } from "vitest";
import { useTutorialSuccess } from "./useTutorialSuccess";

afterEach(cleanup);

const blank: Circuit = {
  name: "NOT",
  nodes: [
    { id: "a", type: "switch", x: 0, y: 0 },
    { id: "out", type: "lamp", x: 400, y: 0 },
  ],
  wires: [],
};
const wired: Circuit = {
  ...blank,
  nodes: [...blank.nodes, { id: "nand", type: "nand", x: 200, y: 0 }],
  wires: [
    { id: "a0", from: "a", to: "nand", input: 0 },
    { id: "a1", from: "a", to: "nand", input: 1 },
    { id: "out", from: "nand", to: "out", input: 0 },
  ],
};
const grade = (pass: boolean): Grade => ({ kind: "truth", pass, rows: [], first: pass ? -1 : 0 });

it("records a genuine live solve once, without render-driven celebration", () => {
  const options = {
    session: {},
    initial: blank,
    circuit: blank,
    liveGrade: grade(false),
    enabled: true,
    recordLivePass: vi.fn(),
  };
  const { result, rerender } = renderHook((props) => useTutorialSuccess(props), {
    initialProps: options,
  });
  expect(result.current.celebration).toBe(0);
  act(() => result.current.noteChange(wired));
  const passing = { ...options, circuit: wired, liveGrade: grade(true) };
  rerender(passing);
  const celebration = result.current.celebration;
  expect(celebration).toBeGreaterThan(0);
  expect(options.recordLivePass).toHaveBeenCalledExactlyOnceWith(wired);
  rerender(passing);
  expect(result.current.celebration).toBe(celebration);
  expect(options.recordLivePass).toHaveBeenCalledTimes(1);
  act(() => result.current.noteChange(blank));
  rerender(options);
  act(() => result.current.noteChange(wired));
  rerender(passing);
  expect(result.current.celebration).toBe(celebration);
});

it("keeps restored correct boards, moves, reset and level changes quiet", () => {
  const options = {
    session: {},
    initial: wired,
    circuit: wired,
    liveGrade: grade(true),
    enabled: true,
    recordLivePass: vi.fn(),
  };
  const { result, rerender } = renderHook((props) => useTutorialSuccess(props), {
    initialProps: options,
  });
  const moved = { ...wired, nodes: wired.nodes.map((node) => ({ ...node, x: node.x + 100 })) };
  act(() => result.current.noteChange(moved));
  rerender({ ...options, circuit: moved });
  expect(result.current.celebration).toBe(0);
  expect(options.recordLivePass).not.toHaveBeenCalled();
  act(() => result.current.resetSuccess(blank));
  act(() => result.current.noteChange(blank));
  rerender({ ...options, circuit: blank, liveGrade: grade(false) });
  expect(result.current.celebration).toBe(0);
  act(() => result.current.noteChange(wired));
  rerender(options);
  expect(result.current.celebration).toBeGreaterThan(0);
  rerender({ ...options, session: {} });
  expect(result.current.celebration).toBe(0);
});

it("waits for a slow level's grade before it credits the board", () => {
  const options: Parameters<typeof useTutorialSuccess>[0] = {
    session: {},
    initial: blank,
    circuit: blank,
    enabled: true,
    recordLivePass: vi.fn(),
  };
  const { result, rerender } = renderHook((props) => useTutorialSuccess(props), {
    initialProps: options,
  });
  act(() => result.current.noteChange(wired));
  rerender({ ...options, circuit: wired });
  expect(result.current.celebration).toBe(0);
  expect(options.recordLivePass).not.toHaveBeenCalled();
  rerender({
    ...options,
    circuit: wired,
    liveGrade: { kind: "sequence", pass: true, ticks: [], first: -1 },
  });
  expect(result.current.celebration).toBeGreaterThan(0);
  expect(options.recordLivePass).toHaveBeenCalledExactlyOnceWith(wired);
});

it("records a restored passing board that is not on record yet, without celebrating", () => {
  const options = {
    session: {},
    initial: wired,
    circuit: wired,
    liveGrade: grade(true),
    enabled: true,
    solved: false,
    recordLivePass: vi.fn(),
  };
  const { result, rerender } = renderHook((props) => useTutorialSuccess(props), {
    initialProps: options,
  });
  rerender(options);
  expect(result.current.celebration).toBe(0);
  expect(options.recordLivePass).toHaveBeenCalledExactlyOnceWith(wired);
});

it("credits nothing while disabled, which is how a board wired for the reader stays uncounted", () => {
  const options = {
    session: {},
    initial: blank,
    circuit: blank,
    liveGrade: grade(false),
    enabled: false,
    solved: false,
    recordLivePass: vi.fn(),
  };
  const { result, rerender } = renderHook((props) => useTutorialSuccess(props), {
    initialProps: options,
  });
  act(() => result.current.noteChange(wired));
  rerender({ ...options, circuit: wired, liveGrade: grade(true) });
  expect(result.current.celebration).toBe(0);
  expect(options.recordLivePass).not.toHaveBeenCalled();
});

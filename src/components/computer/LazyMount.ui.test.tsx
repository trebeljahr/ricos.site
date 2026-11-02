// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LazyMount, preloadWhenIdle } from "./LazyMount";

const flush = () => act(() => new Promise((resolve) => setTimeout(resolve, 5)));

let observers: { fire: () => void }[] = [];

beforeEach(() => {
  observers = [];
  vi.stubGlobal("requestIdleCallback", (work: () => void) => setTimeout(work, 0));
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(private callback: IntersectionObserverCallback) {
        observers.push(this);
      }
      observe() {}
      disconnect() {}
      fire() {
        this.callback(
          [{ isIntersecting: true } as IntersectionObserverEntry],
          this as unknown as IntersectionObserver,
        );
      }
    },
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("preloadWhenIdle", () => {
  it("loads one demo at a time, in the order they asked", async () => {
    const started: string[] = [];
    let finishFirst = () => {};
    preloadWhenIdle(() => {
      started.push("first");
      return new Promise<void>((resolve) => {
        finishFirst = resolve;
      });
    });
    preloadWhenIdle(() => started.push("second"));
    await flush();
    expect(started).toEqual(["first"]);
    finishFirst();
    await flush();
    expect(started).toEqual(["first", "second"]);
  });

  it("moves on after a chunk fails to load", async () => {
    const started: string[] = [];
    preloadWhenIdle(() => Promise.reject(new Error("offline")));
    preloadWhenIdle(() => started.push("next"));
    await flush();
    await flush();
    expect(started).toEqual(["next"]);
  });

  it("loads nothing ahead for a reader who saves data", async () => {
    vi.stubGlobal("navigator", { connection: { saveData: true } });
    const load = vi.fn();
    preloadWhenIdle(load);
    await flush();
    expect(load).not.toHaveBeenCalled();
  });
});

describe("LazyMount", () => {
  it("preloads the code while far away and mounts only when near", async () => {
    const preload = vi.fn();
    render(
      <LazyMount height="auto" placeholder={<p>waiting</p>} preload={preload}>
        <p>demo</p>
      </LazyMount>,
    );
    await flush();
    expect(preload).toHaveBeenCalledTimes(1);
    expect(screen.getByText("waiting")).toBeTruthy();
    expect(screen.queryByText("demo")).toBeNull();
    act(() => observers[0].fire());
    expect(await screen.findByText("demo")).toBeTruthy();
    expect(screen.queryByText("waiting")).toBeNull();
  });
});

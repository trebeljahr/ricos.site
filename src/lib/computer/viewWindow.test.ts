import { describe, expect, it } from "vitest";
import { EVERYTHING, nextViewWindow, pathBox, visibleBox } from "./viewWindow";

const seen = { left: 100, top: 100, right: 200, bottom: 200 };

describe("the view window of a large board", () => {
  it("reaches one view past the view on every side", () => {
    expect(nextViewWindow(null, seen)).toEqual({ left: 0, top: 0, right: 300, bottom: 300 });
  });

  it("draws everything while the viewport has no size", () => {
    expect(nextViewWindow(null, null)).toBe(EVERYTHING);
    expect(visibleBox({ left: 9e9, top: 9e9, right: 9e9, bottom: 9e9 }, EVERYTHING)).toBe(true);
  });

  it("stays the same object while the view moves inside it", () => {
    const first = nextViewWindow(null, seen);
    const moved = { left: 150, top: 120, right: 250, bottom: 220 };
    expect(nextViewWindow(first, moved)).toBe(first);
  });

  it("moves when the view comes near its edge", () => {
    const first = nextViewWindow(null, seen);
    const moved = { left: 180, top: 100, right: 280, bottom: 200 };
    expect(nextViewWindow(first, moved)).toEqual({ left: 80, top: 0, right: 380, bottom: 300 });
  });

  it("shrinks after zooming far in", () => {
    const first = nextViewWindow(null, seen);
    const closer = { left: 140, top: 140, right: 160, bottom: 160 };
    expect(nextViewWindow(first, closer)).toEqual({ left: 120, top: 120, right: 180, bottom: 180 });
  });

  it("leaves EVERYTHING once the viewport has a size", () => {
    expect(nextViewWindow(EVERYTHING, seen)).toEqual({ left: 0, top: 0, right: 300, bottom: 300 });
  });

  it("boxes a path across its subpaths", () => {
    expect(
      pathBox([
        [
          { x: 3, y: 9 },
          { x: 7, y: 1 },
        ],
        [{ x: -2, y: 4 }],
      ]),
    ).toEqual({ left: -2, top: 1, right: 7, bottom: 9 });
  });
});

import { describe, expect, it } from "vitest";
import { foldFocus, followFold } from "./foldViewport";

describe("fold viewport", () => {
  const size = { width: 900, height: 520 };

  it("zooms back toward a shrinking box when that fold level has no saved camera", () => {
    const before = { x: 200, y: 200, width: 4000, height: 2000 };
    const after = { x: 200, y: 200, width: 400, height: 200 };
    const result = followFold({ zoom: 0.1, left: 0, top: 0 }, before, after, size);
    expect(result.zoom).toBe(1);
    expect(after.width * result.zoom).toBe(before.width * 0.1);
  });

  it("follows a displaced box at the existing zoom when it still fits", () => {
    const camera = { zoom: 0.5, left: -100, top: -50 };
    const before = { x: 200, y: 200, width: 200, height: 100 };
    const after = { ...before, x: 800, y: 600, width: 400, height: 200 };
    const result = followFold(camera, before, after, size);
    expect(result.zoom).toBe(camera.zoom);
    expect((after.x + after.width / 2) * result.zoom - result.left).toBe(
      (before.x + before.width / 2) * camera.zoom - camera.left,
    );
    expect((after.y + after.height / 2) * result.zoom - result.top).toBe(
      (before.y + before.height / 2) * camera.zoom - camera.top,
    );
  });

  it("keeps a newly expanded box visible even near the viewport edge", () => {
    const after = { x: 3500, y: -600, width: 8000, height: 3000 };
    const result = followFold(
      { zoom: 2, left: 0, top: 0 },
      { x: 430, y: 200, width: 132, height: 116 },
      after,
      size,
    );
    expect(result.zoom).toBeLessThan(2);
    expect(after.x * result.zoom - result.left).toBeGreaterThanOrEqual(39.99);
    expect(after.y * result.zoom - result.top).toBeGreaterThanOrEqual(39.99);
    expect((after.x + after.width) * result.zoom - result.left).toBeLessThanOrEqual(860.01);
    expect((after.y + after.height) * result.zoom - result.top).toBeLessThanOrEqual(480.01);
  });

  it("uses the visible changed box for bulk folding and ignores disappearing descendants", () => {
    const boxes = new Map([
      ["far", { x: 0, y: 0, width: 200, height: 100 }],
      ["near", { x: 2000, y: 1500, width: 200, height: 100 }],
      ["near/child", { x: 2040, y: 1540, width: 100, height: 50 }],
    ]);
    expect(
      foldFocus(
        boxes,
        new Map([...boxes].slice(0, 2)),
        ["far", "near/child", "near"],
        { zoom: 1, left: 1700, top: 1300 },
        size,
      ),
    ).toBe("near");
  });
});

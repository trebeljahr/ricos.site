import { type RibbonRow, ribbonRows } from "src/lib/utils/ribbonRows";
import { describe, expect, it } from "vitest";

/** Deterministic stand-in for Math.random, so a failure reproduces. */
function lcg(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 2 ** 32;
    return state / 2 ** 32;
  };
}

/**
 * Aspect ratios shaped like the archive after the page's 0.5-2.5 clamp:
 * slightly more portraits than landscapes, the usual camera and phone shapes,
 * and the odd panorama at the clamp.
 */
function archiveLike(count: number, seed: number) {
  const random = lcg(seed);
  const shapes = [2 / 3, 3 / 4, 9 / 16, 1, 3 / 2, 4 / 3, 16 / 9, 2];
  return Array.from({ length: count }, () =>
    random() < 0.02 ? 2.5 : shapes[Math.floor(random() * shapes.length)],
  );
}

/** Width a row takes once every tile in it is scaled. */
function filled(row: RibbonRow, ratios: number[], height: number, gap: number) {
  let sum = 0;
  for (let i = row.start; i < row.end; i++) sum += ratios[i] * height * (row.scale ?? 1);
  return sum + gap * (row.end - row.start - 1);
}

// The page's three breakpoints: phone, tablet and desktop row heights, each at
// the narrowest container that breakpoint sees and at a wide one.
const LAYOUTS = [
  { width: 296, height: 100 },
  { width: 351, height: 100 },
  { width: 616, height: 140 },
  { width: 999, height: 140 },
  { width: 1000, height: 180 },
];

describe("ribbonRows", () => {
  it("covers every tile exactly once, in order", () => {
    const ratios = archiveLike(2000, 1);
    for (const { width, height } of LAYOUTS) {
      const rows = ribbonRows(ratios, width, height, 1, 1.35);
      expect(rows[0].start).toBe(0);
      expect(rows.at(-1)?.end).toBe(ratios.length);
      for (let i = 1; i < rows.length; i++) {
        expect(rows[i].start).toBe(rows[i - 1].end);
        expect(rows[i].end).toBeGreaterThan(rows[i].start);
      }
    }
  });

  it("ends every row but the last flush with both edges", () => {
    // The bug this exists for: rows that came up short and left a hole down
    // the right-hand side of the ribbon.
    const ratios = archiveLike(2000, 2);
    for (const { width, height } of LAYOUTS) {
      const rows = ribbonRows(ratios, width, height, 1, 1.35);
      for (const row of rows.slice(0, -1)) {
        expect(row.scale).not.toBeNull();
        expect(filled(row, ratios, height, 1)).toBeCloseTo(width, 6);
      }
    }
  });

  it("crops no tile by more than a quarter on desktop, or by half on a phone", () => {
    const ratios = archiveLike(5000, 3);
    const worst = (width: number, height: number) =>
      Math.max(
        ...ribbonRows(ratios, width, height, 1, 1.35)
          .slice(0, -1)
          .map((row) => Math.abs(Math.log(row.scale ?? 1))),
      );
    expect(worst(1000, 180)).toBeLessThanOrEqual(Math.log(1.25));
    expect(worst(351, 100)).toBeLessThan(Math.log(1.5));
  });

  it("squeezes the next tile in when that crops less than stretching", () => {
    // 400 + 400 fit a 1000px row, a 300 does not. Stretching the two is
    // 1.25x; taking the third and squeezing all three is 1/1.1x, which is the
    // smaller crop.
    const rows = ribbonRows([4, 4, 3], 1000, 100, 0, 1.35);
    expect(rows).toEqual([{ start: 0, end: 3, scale: 1000 / 1100 }]);
  });

  it("stretches instead when squeezing the next tile in would crop more", () => {
    // Taking the 800 would squeeze all three to 0.625x.
    const rows = ribbonRows([4, 4, 8, 2], 1000, 100, 0, 1.35);
    expect(rows[0]).toEqual({ start: 0, end: 2, scale: 1.25 });
  });

  it("counts the gaps between tiles as part of the row", () => {
    const rows = ribbonRows([3, 3, 3, 3], 1000, 100, 10, 1.35);
    // Three 300s and two 10px gaps are 920; a fourth tile would need 1230.
    expect(rows[0]).toEqual({ start: 0, end: 3, scale: 980 / 900 });
  });

  it("squeezes a tile wider than the row into a row of its own", () => {
    const rows = ribbonRows([12, 1, 1], 1000, 100, 0, 1.35);
    expect(rows[0]).toEqual({ start: 0, end: 1, scale: 1000 / 1200 });
  });

  it("fills the last row when that is a small stretch", () => {
    expect(ribbonRows([4.5, 4], 1000, 100, 0, 1.35)).toEqual([
      { start: 0, end: 2, scale: 1000 / 850 },
    ]);
  });

  it("leaves a short last row at natural width rather than stretching it across", () => {
    expect(ribbonRows([6, 6, 2], 1000, 100, 0, 1.35).at(-1)).toEqual({
      start: 2,
      end: 3,
      scale: null,
    });
  });

  it("never moves a finished row when more tiles are appended", () => {
    // The ribbon appends a chunk under a reader who is looking at the rows
    // above it. Only the trailing row, which the new tiles continue, may
    // change.
    const ratios = archiveLike(1200, 4);
    for (const { width, height } of LAYOUTS) {
      const before = ribbonRows(ratios.slice(0, 900), width, height, 1, 1.35);
      const after = ribbonRows(ratios, width, height, 1, 1.35);
      expect(after.slice(0, before.length - 1)).toEqual(before.slice(0, -1));
    }
  });

  it("returns no rows before the ribbon has been measured", () => {
    expect(ribbonRows([1, 1], 0, 100, 1, 1.35)).toEqual([]);
    expect(ribbonRows([1, 1], 1000, Number.NaN, 1, 1.35)).toEqual([]);
    expect(ribbonRows([], 1000, 100, 1, 1.35)).toEqual([]);
  });
});

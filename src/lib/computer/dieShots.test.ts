import { describe, expect, it } from "vitest";
import {
  COINS,
  coinPlacement,
  dieSizeMm,
  fitView,
  levelFor,
  mmPerPixel,
  PENTIUM_II_DIXON,
  scaleBar,
  tileLevelWidths,
  visibleTiles,
  worldBounds,
} from "./dieShots";

const shot = PENTIUM_II_DIXON;

describe("die shots", () => {
  it("has the tile levels makeDieTiles wrote", () => {
    expect(tileLevelWidths(22036, 13288, 640)).toEqual([345, 689, 1378, 2755, 5509, 11018, 22036]);
  });

  it("sizes the die from its published area and the photo's proportions", () => {
    const { width, height } = dieSizeMm(shot);
    expect(width * height).toBeCloseTo(180, 6);
    expect(width).toBeCloseTo(17.28, 2);
    expect(height).toBeCloseTo(10.42, 2);
    expect(mmPerPixel(shot) * 1000).toBeCloseTo(0.784, 3);
  });

  it("draws each coin to the die's scale, beside it", () => {
    for (const coin of COINS) {
      const placed = coinPlacement(shot, coin);
      expect(placed.diameter * mmPerPixel(shot)).toBeCloseTo(coin.diameterMm, 6);
      expect(placed.x).toBeGreaterThan(shot.width);
      expect(placed.y + placed.diameter / 2).toBeCloseTo(shot.height / 2, 6);
      const bounds = worldBounds(shot, coin);
      expect(bounds.y).toBeLessThan(0);
      expect(bounds.x + bounds.width).toBeCloseTo(placed.x + placed.diameter, 6);
    }
  });

  it("picks the coarsest level that still has a pixel for every device pixel", () => {
    expect(levelFor(shot, 0.01)).toBe(0);
    expect(levelFor(shot, 0.05, 2)).toBe(3);
    expect(levelFor(shot, 1)).toBe(6);
    expect(levelFor(shot, 3, 2)).toBe(6);
  });

  it("returns only the tiles on screen, edge to edge", () => {
    const viewport = { width: 800, height: 500 };
    const whole = fitView({ x: 0, y: 0, width: shot.width, height: shot.height }, viewport, 0);
    const level = levelFor(shot, whole.scale);
    const tiles = visibleTiles(shot, level, whole, viewport);
    expect(level).toBe(2);
    expect(tiles).toHaveLength(6);
    expect(tiles[0].left + tiles[0].width).toBe(tiles[1].left);
    expect(tiles[0].top + tiles[0].height).toBe(tiles[3].top);

    const close = { x: 16637, y: 12378, scale: 2 };
    const near = visibleTiles(shot, 6, close, viewport);
    expect(near.length).toBeGreaterThan(0);
    expect(near.length).toBeLessThanOrEqual(4);
    expect(near.some((tile) => tile.column === 25 && tile.row === 19)).toBe(true);
  });

  it("labels the scale bar with a round length", () => {
    expect(scaleBar(79)).toMatchObject({ label: "10 mm" });
    expect(scaleBar(0.6).label).toBe("50 µm");
    for (const step of [0.3, 2, 40, 300]) {
      const bar = scaleBar(step);
      expect(bar.pixels).toBeGreaterThanOrEqual(60);
      expect(bar.pixels).toBeLessThanOrEqual(150);
    }
  });
});

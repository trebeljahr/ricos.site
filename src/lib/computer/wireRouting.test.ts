import { describe, expect, it } from "vitest";
import { wirePath } from "./wireRouting";

describe("wire routing", () => {
  it("uses a clear lane around a part between connectors", () => {
    const path = wirePath({ x: 0, y: 20 }, { x: 200, y: 160 }, [
      { x: 80, y: 45, width: 50, height: 75 },
    ]);
    const lane = Number(path.match(/Q ([\d.]+) 20/)?.[1]);
    expect(lane).toBeGreaterThan(0);
    expect(lane <= 72 || lane >= 138).toBe(true);
    expect(path).toMatch(/L 200 160$/);
  });
  it("loops backward connections around the parts", () => {
    const path = wirePath({ x: 300, y: 120 }, { x: 100, y: 180 });
    expect(path).toMatch(/^M 300 120/);
    expect(path).toMatch(/L 100 180$/);
    expect(path.match(/ Q /g)?.length).toBeGreaterThanOrEqual(3);
  });
});

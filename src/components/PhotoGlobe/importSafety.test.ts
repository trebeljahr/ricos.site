import { describe, expect, it } from "vitest";

/**
 * The page mounts this component through `next/dynamic` with `ssr: false`, but the module
 * is still resolved on the server. Importing it must not reach for `window`, `document`
 * or a WebGL context — this test runs in a plain node environment, so it fails loudly if
 * anything in the module graph does.
 */
describe("PhotoGlobe module", () => {
  // Pulling three, fiber, drei and three-stdlib through vitest's transform costs several
  // seconds on a cold run, so this one needs more than the 5s default.
  it("imports without a DOM", async () => {
    const globe = await import("./index");
    expect(typeof globe.PhotoGlobe).toBe("function");
    expect(typeof globe.Globe).toBe("function");
    expect(typeof globe.useGlobePalette).toBe("function");
    expect(globe.LEGEND_REGIONS).toHaveLength(7);
    expect(globe.LEGEND_REGIONS).not.toContain("Global");
  }, 30_000);
});

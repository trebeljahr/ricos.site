import { describe, expect, it, vi } from "vitest";

/** A hand-built stand-in for src/content/photography-colors.json.
 *
 *  Deliberately not the real 4,900-photo bake: a test that reads the baked
 *  file asserts what the corpus happens to look like today, so it starts
 *  failing when a new trip is added rather than when this module breaks.
 *  Eleven rows are enough to pin every ordering rule, and they are readable.
 *
 *  Three trips, so the trip tally has something to rank; one photo per
 *  ordering edge case: two photos tied on green strength, one photo listed
 *  in metadata but with no colour row, one colour row with no metadata, one
 *  hue just past 0° and one just short of 360° to catch a hue sort that
 *  sorts the wrap the wrong way round, and two achromatic photos. */
const fixture = {
  version: 1,
  measuredOn: "2026-09-27",
  sample: { images: 11, trips: 3 },
  priors: { green: 0.185, blue: 0.258, red: 0.064 },
  images: {
    // Green, descending strength. The middle two are tied, so the key
    // breaks it: "…/b-leaf" must come before "…/c-leaf".
    "assets/photography/jungle/a-canopy.jpg": {
      buckets: ["green"],
      strength: { green: 0.71 },
      hue: 131.2,
      lightness: 0.44,
      chroma: 0.11,
    },
    "assets/photography/jungle/c-leaf.jpg": {
      buckets: ["green", "blue"],
      strength: { green: 0.4, blue: 0.2 },
      hue: 140.0,
      lightness: 0.5,
      chroma: 0.09,
    },
    "assets/photography/jungle/b-leaf.jpg": {
      buckets: ["green"],
      strength: { green: 0.4 },
      hue: 150.5,
      lightness: 0.52,
      chroma: 0.08,
    },
    "assets/photography/reef/shallows.jpg": {
      buckets: ["teal", "blue"],
      strength: { teal: 0.33, blue: 0.3 },
      hue: 196.4,
      lightness: 0.61,
      chroma: 0.1,
    },
    "assets/photography/reef/deep.jpg": {
      buckets: ["blue"],
      strength: { blue: 0.82 },
      hue: 250.1,
      lightness: 0.4,
      chroma: 0.14,
    },
    "assets/photography/reef/green-water.jpg": {
      buckets: ["green"],
      strength: { green: 0.55 },
      hue: 160.0,
      lightness: 0.47,
      chroma: 0.1,
    },
    // Just past 0°, so it has to sort first of everything chromatic.
    "assets/photography/desert/dawn.jpg": {
      buckets: ["red"],
      strength: { red: 0.36 },
      hue: 1.5,
      lightness: 0.55,
      chroma: 0.12,
    },
    // Just short of 360°, so it has to sort last of everything chromatic —
    // an arithmetic-minded hue sort that treats the circle as a line is the
    // only way to get these two adjacent.
    "assets/photography/desert/dusk.jpg": {
      buckets: ["pink", "red"],
      strength: { pink: 0.3, red: 0.15 },
      hue: 357.8,
      lightness: 0.5,
      chroma: 0.1,
    },
    // Achromatic: no hue, so they close the sweep ordered by lightness.
    "assets/photography/desert/night.jpg": {
      buckets: ["black"],
      strength: { black: 0.9 },
      hue: null,
      lightness: 0.18,
      chroma: 0.01,
    },
    "assets/photography/reef/fog.jpg": {
      buckets: ["white"],
      strength: { white: 0.86 },
      hue: null,
      lightness: 0.79,
      chroma: 0.02,
    },
    // Classified but gone from metadata.json — a photo deleted from the
    // submodule since the last bake. It must not reach a gallery, because
    // there are no dimensions to lay a tile out with.
    "assets/photography/jungle/deleted.jpg": {
      buckets: ["green"],
      strength: { green: 0.99 },
      hue: 135.0,
      lightness: 0.5,
      chroma: 0.1,
    },
  },
};

vi.mock("src/content/photography-colors.json", () => ({ default: fixture }));

vi.mock("src/lib/imageMetadata", () => ({
  getLocalMetadata: () =>
    Object.fromEntries(
      Object.keys(fixture.images)
        .filter((key) => !key.endsWith("deleted.jpg"))
        .map((key) => [
          key,
          { key, width: 3000, height: 2000, aspectRatio: 1.5, existsInS3: true },
        ]),
    ),
}));

const { entryFor, imagesBySpectrum } = await import("src/lib/photographyColors");

describe("imagesBySpectrum", () => {
  it("walks the ring by family, most saturated first inside each band", () => {
    // Bands come from the family a photo belongs to, in ring order: red,
    // then the four greens, then teal, then blue. Inside the green band the
    // order is chroma descending, NOT hue ascending — green-water at 0.10
    // leads c-leaf at 0.09 and b-leaf at 0.08 even though its hue angle is
    // the highest of the three. Most of this archive is close to grey, so a
    // band ordered by angle opens on whatever sits at its low edge, usually
    // something washed out, and stops reading as its own colour.
    const srcs = imagesBySpectrum().map((image) => image.src);
    expect(srcs.slice(0, 7)).toEqual([
      "assets/photography/desert/dawn.jpg", // red band
      "assets/photography/jungle/a-canopy.jpg", // green band, chroma desc
      "assets/photography/reef/green-water.jpg", // c 0.10, h 160.0
      "assets/photography/jungle/c-leaf.jpg", // c 0.09, h 140.0
      "assets/photography/jungle/b-leaf.jpg", // c 0.08, h 150.5
      "assets/photography/reef/shallows.jpg", // teal band
      "assets/photography/reef/deep.jpg", // blue band
    ]);
  });

  it("keeps the near-360 photo at the end of the colour sweep, not next to 0", () => {
    const srcs = imagesBySpectrum().map((image) => image.src);
    expect(srcs[7]).toBe("assets/photography/desert/dusk.jpg");
    expect(srcs.indexOf("assets/photography/desert/dusk.jpg")).toBeGreaterThan(
      srcs.indexOf("assets/photography/reef/deep.jpg"),
    );
  });

  it("closes with the achromatic tail, darkest first", () => {
    const srcs = imagesBySpectrum().map((image) => image.src);
    expect(srcs.slice(-2)).toEqual([
      "assets/photography/desert/night.jpg", // lightness 0.18
      "assets/photography/reef/fog.jpg", // lightness 0.79
    ]);
  });

  it("includes every photo metadata knows about, exactly once", () => {
    const srcs = imagesBySpectrum().map((image) => image.src);
    expect(srcs).toHaveLength(10);
    expect(new Set(srcs).size).toBe(10);
    expect(srcs).not.toContain("assets/photography/jungle/deleted.jpg");
  });

  it("caches the sweep rather than re-sorting on every render", () => {
    expect(imagesBySpectrum()).toBe(imagesBySpectrum());
  });
});

describe("entryFor", () => {
  it("returns the baked row for a classified photo", () => {
    expect(entryFor("assets/photography/reef/deep.jpg")).toEqual({
      buckets: ["blue"],
      strength: { blue: 0.82 },
      hue: 250.1,
      lightness: 0.4,
      chroma: 0.14,
    });
  });

  it("returns null for a photo that was never classified", () => {
    expect(entryFor("assets/photography/jungle/added-yesterday.jpg")).toBeNull();
  });

  it("returns null rather than throwing on a key from another folder", () => {
    expect(entryFor("assets/midjourney-gallery/whatever.png")).toBeNull();
  });
});

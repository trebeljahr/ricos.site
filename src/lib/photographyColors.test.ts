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
      familyHue: { green: 131.2 },
      hue: 131.2,
      lightness: 0.44,
      chroma: 0.11,
    },
    "assets/photography/jungle/c-leaf.jpg": {
      buckets: ["green", "blue"],
      strength: { green: 0.4, blue: 0.2 },
      familyHue: { green: 140.0, blue: 240.0 },
      hue: 140.0,
      lightness: 0.5,
      chroma: 0.09,
    },
    "assets/photography/jungle/b-leaf.jpg": {
      buckets: ["green"],
      strength: { green: 0.4 },
      familyHue: { green: 150.5 },
      hue: 150.5,
      lightness: 0.52,
      chroma: 0.08,
    },
    "assets/photography/reef/shallows.jpg": {
      buckets: ["teal", "blue"],
      strength: { teal: 0.33, blue: 0.3 },
      familyHue: { teal: 196.4, blue: 250.0 },
      hue: 196.4,
      lightness: 0.61,
      chroma: 0.1,
    },
    "assets/photography/reef/deep.jpg": {
      buckets: ["blue"],
      strength: { blue: 0.82 },
      familyHue: { blue: 250.1 },
      hue: 250.1,
      lightness: 0.4,
      chroma: 0.14,
    },
    "assets/photography/reef/green-water.jpg": {
      buckets: ["green"],
      strength: { green: 0.55 },
      familyHue: { green: 160.0 },
      hue: 160.0,
      lightness: 0.47,
      chroma: 0.1,
    },
    // Just past 0°, so it has to sort first of everything chromatic.
    "assets/photography/desert/dawn.jpg": {
      buckets: ["red"],
      strength: { red: 0.36 },
      familyHue: { red: 1.5 },
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
      familyHue: { pink: 340.0, red: 5.0 },
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

const { entryFor, hueOffset, imagesBySpectrum } = await import("src/lib/photographyColors");

describe("imagesBySpectrum", () => {
  it("builds each band to a peak in its middle and eases off again", () => {
    // Bands in ring order: red, then the greens, then blue. Inside a band the
    // order is a ridge — palest at both ends, strongest in the centre — so
    // each colour has an epicentre and neighbouring bands meet pale against
    // pale rather than dropping from one at full strength into the next.
    //
    // Green holds b-leaf 0.40, green-water 0.55 and a-canopy 0.71, so the
    // ridge is b-leaf, a-canopy, green-water. c-leaf is missing because it
    // carries two colours — see the dominance test below.
    const srcs = imagesBySpectrum().map((image) => image.src);
    expect(srcs.slice(0, 5)).toEqual([
      "assets/photography/desert/dawn.jpg", // red band
      "assets/photography/jungle/b-leaf.jpg", // green band: 0.40, rising
      "assets/photography/jungle/a-canopy.jpg", // 0.71, the peak
      "assets/photography/reef/green-water.jpg", // 0.55, falling
      "assets/photography/reef/deep.jpg", // blue band
    ]);
  });

  it("puts a band's weakest members at its edges, where the seams are", () => {
    // The property the ridge exists for, stated independently of the exact
    // order: whatever a band's first and last photos are, neither may be its
    // strongest.
    const all = imagesBySpectrum().map((image) => image.src);
    const green = all.filter((src) => entryFor(src)?.buckets[0] === "green");
    expect(green.length).toBeGreaterThan(2);
    const strength = (src: string) => entryFor(src)?.strength.green ?? 0;
    const peak = Math.max(...green.map(strength));
    expect(strength(green[0])).toBeLessThan(peak);
    expect(strength(green[green.length - 1])).toBeLessThan(peak);
  });

  it("orders a band that wraps past zero by offset from its own centre", () => {
    // The wrap is the subtle part, so it is asserted on the arithmetic rather
    // than through a fixture: a band centred at 10 degrees has to report 350
    // as sitting *before* it, not 340 degrees after it. Get this wrong and
    // red's far-side members sort to the end of their band and the strip
    // jumps most of the way round the circle on its way into orange.
    expect(hueOffset(350, 10)).toBe(-20);
    expect(hueOffset(35, 10)).toBe(25);
    expect(hueOffset(350, 10)).toBeLessThan(hueOffset(35, 10));
    // And the ordinary case is untouched.
    expect(hueOffset(140, 129)).toBe(11);
    expect(hueOffset(120, 129)).toBe(-9);
  });

  it("leaves out a photo that carries two colours rather than one", () => {
    // These three are the whole point of the filter. c-leaf is 0.40 green and
    // 0.20 blue, shallows 0.33 teal and 0.30 blue, dusk 0.30 pink and 0.15
    // red: each has plenty of its winning colour and reads as neither, so no
    // strength bar alone would catch them. Dominance does — a photo has to
    // hold three quarters of its own colour in one family.
    const srcs = imagesBySpectrum().map((image) => image.src);
    expect(srcs).not.toContain("assets/photography/jungle/c-leaf.jpg");
    expect(srcs).not.toContain("assets/photography/reef/shallows.jpg");
    expect(srcs).not.toContain("assets/photography/desert/dusk.jpg");
    // a-canopy is the control: 0.71 green and nothing else.
    expect(srcs).toContain("assets/photography/jungle/a-canopy.jpg");
  });

  it("closes with the achromatic tail, lightest first so it fades to black", () => {
    // Lightest first, not darkest: the sweep leaves the last colour band for
    // white and dims to black, rather than dropping straight from a colour
    // into the darkest frames in the archive.
    const srcs = imagesBySpectrum().map((image) => image.src);
    expect(srcs.slice(-2)).toEqual([
      "assets/photography/reef/fog.jpg", // lightness 0.79
      "assets/photography/desert/night.jpg", // lightness 0.18
    ]);
  });

  it("lists each photo it keeps exactly once, and never a deleted one", () => {
    // Not every photo: the strip is the ones that read as a single colour,
    // plus the colourless tail. What it must never do is repeat one, because
    // the lightbox walks this array, or show one metadata has dropped.
    const srcs = imagesBySpectrum().map((image) => image.src);
    expect(new Set(srcs).size).toBe(srcs.length);
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
      familyHue: { blue: 250.1 },
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

import {
  BLACK_MAX_LIGHTNESS,
  bucketForHex,
  bucketsFromHistogram,
  CHROMA_FLOOR,
  COLOR_BUCKETS,
  type ColorBucketId,
  colorProfileFromHistogram,
  FAMILY_PRIOR,
  familyForOklch,
  familyVoteShares,
  getColorBucket,
  isColorBucketId,
  MAX_FAMILIES,
  MUTED_MAX_CHROMATIC_FRACTION,
  neutralForLightness,
  parseHex,
  rgbToOklch,
  WHITE_MIN_LIGHTNESS,
} from "src/lib/colorBuckets.mjs";
import { describe, expect, it } from "vitest";

/** Build a histogram from `[hex, count]` pairs — the shape the bake script
 *  hands to the bucketer, spelled readably. */
function histogram(entries: Array<[string, number]>) {
  return entries.map(([hex, count]) => {
    const rgb = parseHex(hex);
    if (!rgb) throw new Error(`bad hex in fixture: ${hex}`);
    return { ...rgb, count };
  });
}

/** Two hues exactly 180° apart in OKLCh, found by walking every sRGB
 *  colour with chroma >= CHROMA_FULL_WEIGHT and looking for the closest
 *  antipodal pair: these two agree on 331.29754490727 - 151.29754490727 to
 *  1.4e-12 degrees. Both clamp to a full-weight vote, so equal pixel counts
 *  cancel to a zero-length resultant — the one input for which "the mean
 *  hue of this photo" has no answer. */
const ANTIPODAL_GREEN = "#05a652";
const ANTIPODAL_PINK = "#a6089d";

describe("parseHex", () => {
  it("parses 6-digit hex with and without the hash", () => {
    expect(parseHex("#a87b4f")).toEqual({ r: 0xa8, g: 0x7b, b: 0x4f });
    expect(parseHex("a87b4f")).toEqual({ r: 0xa8, g: 0x7b, b: 0x4f });
  });

  it("parses 3-digit shorthand by doubling each nibble", () => {
    expect(parseHex("#0af")).toEqual({ r: 0x00, g: 0xaa, b: 0xff });
  });

  it("is case-insensitive and tolerates surrounding whitespace", () => {
    expect(parseHex("  #A87B4F ")).toEqual(parseHex("#a87b4f"));
  });

  it("rejects malformed input rather than guessing", () => {
    for (const bad of ["", "#", "#12", "#12345", "#1234567", "#gggggg", "rgb(1,2,3)"]) {
      expect(parseHex(bad)).toBeNull();
    }
    expect(parseHex(null)).toBeNull();
    expect(parseHex(undefined)).toBeNull();
    expect(parseHex(42 as unknown as string)).toBeNull();
  });
});

describe("rgbToOklch", () => {
  it("maps black and white to the lightness extremes with no chroma", () => {
    const black = rgbToOklch(0, 0, 0);
    expect(black.l).toBeCloseTo(0, 5);
    expect(black.c).toBeCloseTo(0, 5);

    const white = rgbToOklch(255, 255, 255);
    expect(white.l).toBeCloseTo(1, 3);
    expect(white.c).toBeCloseTo(0, 3);
  });

  it("gives greys zero chroma and a pinned hue", () => {
    const grey = rgbToOklch(128, 128, 128);
    expect(grey.c).toBeLessThan(1e-4);
    expect(grey.h).toBe(0);
    expect(grey.l).toBeGreaterThan(0.4);
    expect(grey.l).toBeLessThan(0.7);
  });

  it("places the sRGB primaries in the expected hue arcs", () => {
    // Reference OKLCh hues: red ~29deg, green ~142deg, blue ~264deg.
    expect(rgbToOklch(255, 0, 0).h).toBeGreaterThan(20);
    expect(rgbToOklch(255, 0, 0).h).toBeLessThan(40);
    expect(rgbToOklch(0, 255, 0).h).toBeGreaterThan(130);
    expect(rgbToOklch(0, 255, 0).h).toBeLessThan(155);
    expect(rgbToOklch(0, 0, 255).h).toBeGreaterThan(255);
    expect(rgbToOklch(0, 0, 255).h).toBeLessThan(275);
  });

  it("always reports hue in [0, 360)", () => {
    for (let r = 0; r <= 255; r += 51) {
      for (let g = 0; g <= 255; g += 51) {
        for (let b = 0; b <= 255; b += 51) {
          const { h } = rgbToOklch(r, g, b);
          expect(h).toBeGreaterThanOrEqual(0);
          expect(h).toBeLessThan(360);
        }
      }
    }
  });
});

describe("familyForOklch", () => {
  it("returns null below the chroma floor, whatever the hue claims", () => {
    expect(familyForOklch({ l: 0.5, c: CHROMA_FLOOR - 0.001, h: 250 })).toBeNull();
    expect(familyForOklch({ l: 0.5, c: 0, h: 0 })).toBeNull();
  });

  it("admits a sample exactly at the chroma floor", () => {
    expect(familyForOklch({ l: 0.5, c: CHROMA_FLOOR, h: 250 })).toBe("blue");
  });

  it("splits the hue circle into the documented families", () => {
    const cases: Array<[number, ColorBucketId]> = [
      [0, "red"],
      [20, "red"],
      [34.9, "red"],
      [45, "orange"],
      [80, "gold"],
      [130, "green"],
      [190, "teal"],
      [250, "blue"],
      [300, "purple"],
      [340, "pink"],
      [358, "red"],
    ];
    for (const [h, expected] of cases) {
      // Mid-lightness + saturated, so neither the earth nor the pink
      // reclassification applies and the bands are tested on their own.
      expect(familyForOklch({ l: 0.65, c: 0.2, h })).toBe(expected);
    }
  });

  it("keeps pure sRGB primaries in the family they are named after", () => {
    // Regression guard: OKLCh puts sRGB red at 29deg and pure yellow at
    // 110deg. Evenly-spaced bands would file red under orange and yellow
    // under green.
    expect(familyForOklch(rgbToOklch(255, 0, 0))).toBe("red");
    expect(familyForOklch(rgbToOklch(255, 255, 0))).toBe("gold");
    expect(familyForOklch(rgbToOklch(0, 255, 0))).toBe("green");
    expect(familyForOklch(rgbToOklch(0, 0, 255))).toBe("blue");
  });

  it("wraps hues outside [0, 360) instead of falling through to red", () => {
    expect(familyForOklch({ l: 0.75, c: 0.2, h: 610 })).toBe("blue"); // 610 - 360 = 250
    expect(familyForOklch({ l: 0.75, c: 0.2, h: -110 })).toBe("blue"); // -110 + 360 = 250
  });

  it("keeps warm hues in their own wedge however dark or dull they are", () => {
    // These four all used to be demoted to an Earth family. It is gone: a
    // warm pixel belongs to the wedge its angle puts it in, and lightness
    // no longer moves it. See WHY THERE IS NO EARTH FAMILY in the source.
    expect(familyForOklch({ l: 0.45, c: 0.06, h: 70 })).toBe("gold");
    expect(familyForOklch({ l: 0.45, c: 0.15, h: 70 })).toBe("gold");
    expect(familyForOklch({ l: 0.85, c: 0.06, h: 70 })).toBe("gold");
    expect(familyForOklch({ l: 0.3, c: 0.05, h: 50 })).toBe("orange");
  });

  it("leaves cool hues alone too", () => {
    expect(familyForOklch({ l: 0.4, c: 0.05, h: 250 })).toBe("blue");
    expect(familyForOklch({ l: 0.4, c: 0.05, h: 130 })).toBe("green");
  });

  it("reclassifies reds as pink only when both pale and soft", () => {
    // Pale and soft -> pink.
    expect(familyForOklch({ l: 0.87, c: 0.07, h: 10 })).toBe("pink");
    // Pale but vivid -> stays red.
    expect(familyForOklch({ l: 0.87, c: 0.2, h: 10 })).toBe("red");
    // Soft but dark -> stays red.
    expect(familyForOklch({ l: 0.5, c: 0.07, h: 10 })).toBe("red");
  });

  it("never reclassifies non-red hues as pink", () => {
    expect(familyForOklch({ l: 0.87, c: 0.07, h: 250 })).toBe("blue");
    expect(familyForOklch({ l: 0.87, c: 0.07, h: 130 })).toBe("green");
  });
});

describe("neutralForLightness", () => {
  it("bands lightness into white / grey / black", () => {
    expect(neutralForLightness(0.95)).toBe("white");
    expect(neutralForLightness(WHITE_MIN_LIGHTNESS)).toBe("white");
    expect(neutralForLightness(0.6)).toBe("grey");
    expect(neutralForLightness(BLACK_MAX_LIGHTNESS)).toBe("black");
    expect(neutralForLightness(0.05)).toBe("black");
  });

  it("keeps the white band reachable for a photograph", () => {
    // The painting corpus put this at 0.8, which only 8 of the 4,900
    // photographs clear. 0.775 is the measured 99th percentile of mean
    // lightness here, so the band has to admit it or the swatch is dead.
    expect(neutralForLightness(0.775)).toBe("white");
  });
});

describe("bucketForHex", () => {
  it("classifies recognisable colours the way a viewer would name them", () => {
    expect(bucketForHex("#ff0000")).toBe("red");
    expect(bucketForHex("#1f4fa8")).toBe("blue");
    expect(bucketForHex("#2e7d32")).toBe("green");
    expect(bucketForHex("#7a5230")).toBe("orange");
  });

  it("falls back to a neutral band for achromatic input", () => {
    expect(bucketForHex("#ffffff")).toBe("white");
    expect(bucketForHex("#808080")).toBe("grey");
    expect(bucketForHex("#000000")).toBe("black");
  });

  it("returns null for non-colours instead of throwing", () => {
    expect(bucketForHex("not a colour")).toBeNull();
    expect(bucketForHex(null)).toBeNull();
  });
});

describe("bucketsFromHistogram", () => {
  it("returns an empty array for an empty histogram", () => {
    expect(bucketsFromHistogram([])).toEqual([]);
  });

  it("ignores entries with a non-positive count", () => {
    expect(bucketsFromHistogram(histogram([["#1f4fa8", 0]]))).toEqual([]);
    expect(bucketsFromHistogram(histogram([["#1f4fa8", -5]]))).toEqual([]);
  });

  it("calls a solidly blue photo blue", () => {
    expect(bucketsFromHistogram(histogram([["#1f4fa8", 1000]]))).toEqual(["blue"]);
  });

  it("puts an achromatic photo in a neutral band only", () => {
    // A whiteout: snow and a dark rock, no chroma anywhere.
    expect(
      bucketsFromHistogram(
        histogram([
          ["#f2efe6", 900],
          ["#1a1a18", 100],
        ]),
      ),
    ).toEqual(["white"]);
  });

  it("appends the neutral band to a mostly-achromatic but tinted photo", () => {
    // A misty frame: overwhelmingly pale haze, with just enough warm
    // ground to name a family. 7% chromatic, under MUTED_MAX.
    const buckets = bucketsFromHistogram(
      histogram([
        ["#efe9dc", 930],
        ["#7a5230", 70],
      ]),
    );
    expect(buckets).toContain("orange");
    expect(buckets).toContain("white");
  });

  it("stops appending the neutral band right at the muted threshold", () => {
    // MUTED_MAX_CHROMATIC_FRACTION came down from 0.16 to 0.08, which is
    // the difference between tagging 691 photos with a neutral band and
    // tagging 313. One percentage point either side of the gate has to
    // flip, or the constant is not the thing doing the work.
    const at = bucketsFromHistogram(
      histogram([
        ["#efe9dc", 920],
        ["#7a5230", 80],
      ]),
    );
    expect(MUTED_MAX_CHROMATIC_FRACTION).toBe(0.08);
    expect(at).toEqual(["orange"]);
  });

  it("does not append a neutral band to a fully saturated photo", () => {
    const buckets = bucketsFromHistogram(
      histogram([
        ["#1f4fa8", 500],
        ["#2e7d32", 500],
      ]),
    );
    expect(buckets).not.toContain("grey");
    expect(buckets).not.toContain("white");
    expect(buckets).not.toContain("black");
  });

  it("orders families by prior-normalised score, primary first", () => {
    // Blue is the plurality by pixel count, but blue is also the most
    // common family in this archive (prior 0.258) while red is among the
    // rarest (0.064) — so the photo reads as red first. This is the
    // behaviour the prior exists to produce, and it is the opposite way
    // round from the painting corpus, where blue was the rare one.
    const buckets = bucketsFromHistogram(
      histogram([
        ["#1482d5", 600],
        ["#a2202c", 400],
      ]),
    );
    expect(buckets[0]).toBe("red");
    expect(buckets).toContain("blue");
  });

  it("suppresses a family that is merely corpus-typical", () => {
    // Blue at 25% share sits just under its 0.258 prior, so it adds no
    // information about this photo; green at 75% is four times its own.
    const buckets = bucketsFromHistogram(
      histogram([
        ["#2e7d32", 750],
        ["#1482d5", 250],
      ]),
    );
    expect(buckets).toContain("green");
    expect(buckets).not.toContain("blue");
  });

  it("drops families below the raw share floor even when the prior is tiny", () => {
    // Pink's prior is 0.014, so without the share floor a 2% sliver would
    // score ~1.4x and be listed.
    const buckets = bucketsFromHistogram(
      histogram([
        ["#1482d5", 980],
        ["#bc5c91", 20],
      ]),
    );
    expect(buckets).not.toContain("pink");
    expect(buckets).toEqual(["blue"]);
  });

  it("never lists more than MAX_FAMILIES colour families", () => {
    const buckets = bucketsFromHistogram(
      histogram([
        ["#a2202c", 200],
        ["#d06816", 200],
        ["#477400", 200],
        ["#009194", 200],
        ["#1482d5", 200],
        ["#6e5dae", 200],
      ]),
    );
    const chromatic = buckets.filter((id) => !getColorBucket(id).neutral);
    expect(chromatic.length).toBeLessThanOrEqual(MAX_FAMILIES);
  });

  it("falls back to the plurality family when nothing clears the score bar", () => {
    // Pure gold: share 1.0, which does clear its prior — the guard that
    // matters is that a colourful photo never silently becomes a neutral.
    const buckets = bucketsFromHistogram(histogram([["#ca9200", 1000]]));
    expect(buckets).toContain("gold");
    expect(buckets.some((id) => !getColorBucket(id).neutral)).toBe(true);
  });

  it("is deterministic for the same histogram regardless of entry order", () => {
    const entries = histogram([
      ["#1f4fa8", 400],
      ["#4f7a3a", 350],
      ["#c9a227", 250],
    ]);
    const forwards = bucketsFromHistogram(entries);
    const backwards = bucketsFromHistogram([...entries].reverse());
    expect(backwards).toEqual(forwards);
  });

  it("only ever emits known bucket ids", () => {
    const buckets = bucketsFromHistogram(
      histogram([
        ["#a8322b", 300],
        ["#efe9dc", 400],
        ["#1f4fa8", 300],
      ]),
    );
    for (const id of buckets) expect(isColorBucketId(id)).toBe(true);
  });

  it("never repeats a bucket id", () => {
    const buckets = bucketsFromHistogram(
      histogram([
        ["#7a5230", 500],
        ["#efe9dc", 480],
        ["#1f4fa8", 20],
      ]),
    );
    expect(new Set(buckets).size).toBe(buckets.length);
  });
});

describe("bucket registry", () => {
  it("has unique ids and a prior for every chromatic family", () => {
    const ids = COLOR_BUCKETS.map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const bucket of COLOR_BUCKETS) {
      if (bucket.neutral) continue;
      expect(FAMILY_PRIOR[bucket.id]).toBeGreaterThan(0);
    }
  });

  it("gives every bucket a parseable swatch and a label", () => {
    for (const bucket of COLOR_BUCKETS) {
      expect(parseHex(bucket.swatch)).not.toBeNull();
      expect(bucket.label.length).toBeGreaterThan(0);
    }
  });

  it("paints each swatch a colour that belongs to the bucket it opens", () => {
    // The wheel is a chooser, so a swatch has to be an example of what is
    // behind it. Earth is the one this catches: at the chroma the other
    // eight swatches are scaled to, #6f4200 classifies as gold.
    for (const bucket of COLOR_BUCKETS) {
      expect(bucketForHex(bucket.swatch), `${bucket.id} swatch`).toBe(bucket.id);
    }
  });

  it("recognises its own ids and rejects anything else", () => {
    for (const bucket of COLOR_BUCKETS) expect(isColorBucketId(bucket.id)).toBe(true);
    for (const bad of ["", "chartreuse", "RED", null, undefined, 3]) {
      expect(isColorBucketId(bad)).toBe(false);
    }
  });

  it("throws on an unknown id rather than returning a partial bucket", () => {
    expect(() => getColorBucket("chartreuse" as ColorBucketId)).toThrow(/unknown colour bucket/);
  });

  it("keeps the measured priors summing to the whole chromatic vote", () => {
    // They are per-photo mean shares of one vote, so they sum to 1 by
    // construction. A hand edit that breaks that has changed what the
    // normalisation means, not just how strong it is.
    const sum = Object.values(FAMILY_PRIOR).reduce((total, value) => total + value, 0);
    expect(sum).toBeCloseTo(1, 2);
  });
});

describe("colorProfileFromHistogram strengths", () => {
  it("reports no strengths for an empty histogram", () => {
    expect(colorProfileFromHistogram([])).toEqual({
      buckets: [],
      strength: {},
      familyHue: {},
      hue: null,
      lightness: 0,
      chroma: 0,
    });
  });

  it("scores every bucket it lists, and nothing it doesn't", () => {
    const profile = colorProfileFromHistogram(
      histogram([
        ["#1f4fa8", 600],
        ["#a8322b", 400],
      ]),
    );
    expect(Object.keys(profile.strength).sort()).toEqual([...profile.buckets].sort());
  });

  it("measures the share of the whole image, not of the chromatic part", () => {
    // The failure this guards: a foggy morning whose only colour is one
    // red jacket is 100% red *among its chromatic pixels* while being a
    // grey picture. Ranking by that measure would put it above a photo of
    // a red wall.
    const jacket = colorProfileFromHistogram(
      histogram([
        ["#8c8c88", 970],
        ["#a8322b", 30],
      ]),
    );
    const wall = colorProfileFromHistogram(
      histogram([
        ["#a8322b", 700],
        ["#8c8c88", 300],
      ]),
    );
    expect(jacket.strength.red ?? 0).toBeLessThan(wall.strength.red ?? 0);
  });

  it("ranks two photos of the same family by how much of it they carry", () => {
    const strengthOf = (blue: number) =>
      colorProfileFromHistogram(
        histogram([
          ["#1f4fa8", blue],
          ["#8c8c88", 1000 - blue],
        ]),
      ).strength.blue ?? 0;
    expect(strengthOf(900)).toBeGreaterThan(strengthOf(500));
    expect(strengthOf(500)).toBeGreaterThan(strengthOf(200));
  });

  it("keeps strengths inside 0-1", () => {
    const profile = colorProfileFromHistogram(histogram([["#1f4fa8", 1000]]));
    for (const value of Object.values(profile.strength)) {
      expect(value).toBeGreaterThan(0);
      expect(value).toBeLessThanOrEqual(1);
    }
  });

  it("gives a neutral band the amount of that band actually present", () => {
    // Snow and a dark rock: mean lightness names white, and the snow
    // really is ~90% of the frame, so white should read near 0.9 rather
    // than inheriting the whole achromatic remainder of 1.0.
    const profile = colorProfileFromHistogram(
      histogram([
        ["#f2efe6", 900],
        ["#1a1a18", 100],
      ]),
    );
    expect(profile.buckets).toEqual(["white"]);
    expect(profile.strength.white).toBeCloseTo(0.9, 2);
  });

  it("agrees with the membership-only wrapper", () => {
    const entries = histogram([
      ["#1f4fa8", 500],
      ["#a8322b", 300],
      ["#8c8c88", 200],
    ]);
    expect(bucketsFromHistogram(entries)).toEqual(colorProfileFromHistogram(entries).buckets);
  });
});

describe("colorProfileFromHistogram scalars", () => {
  it("reports a single colour's own hue, lightness and chroma", () => {
    const profile = colorProfileFromHistogram(histogram([["#1482d5", 1000]]));
    const sample = rgbToOklch(0x14, 0x82, 0xd5);
    expect(profile.hue ?? -1).toBeCloseTo(sample.h, 6);
    expect(profile.lightness).toBeCloseTo(sample.l, 6);
    expect(profile.chroma).toBeCloseTo(sample.c, 6);
  });

  it("averages lightness and chroma over every pixel, chromatic or not", () => {
    // Both are pixel-weighted means of the whole frame — they describe the
    // picture, not its colourful part, which is what makes them usable as
    // the sort key for the achromatic tail of the spectrum page.
    const profile = colorProfileFromHistogram(
      histogram([
        ["#ffffff", 500],
        ["#000000", 500],
      ]),
    );
    const white = rgbToOklch(255, 255, 255);
    const black = rgbToOklch(0, 0, 0);
    expect(profile.lightness).toBeCloseTo((white.l + black.l) / 2, 6);
    expect(profile.chroma).toBeCloseTo((white.c + black.c) / 2, 6);
  });

  it("takes the circular mean across 0 degrees instead of the arithmetic one", () => {
    // The whole reason the hue is accumulated as a vector sum. These two
    // sit at 349.75 and 9.93 degrees: the circular mean is ~0, which is
    // where a viewer would put the frame, while the arithmetic mean of the
    // two angles is 179.8 — the far side of the circle, in teal, which
    // would drop a red photo into the middle of the spectrum page.
    const profile = colorProfileFromHistogram(
      histogram([
        ["#9f577b", 500],
        ["#a75463", 500],
      ]),
    );
    expect(profile.hue).not.toBeNull();
    const hue = profile.hue ?? -1;
    // Within a couple of degrees of 0, approached from either side.
    expect(Math.min(hue, 360 - hue)).toBeLessThan(2);
  });

  it("stays on the short arc for any pair straddling the wrap", () => {
    // Same property swept rather than spot-checked: for every pair of
    // hues a few degrees apart across 0, the mean must be between them on
    // the short arc, never 180 degrees away.
    for (const [a, b] of [
      ["#a75463", "#9f577b"],
      ["#a75463", "#a6089d"],
      ["#05a652", "#009194"],
    ] as const) {
      const profile = colorProfileFromHistogram(
        histogram([
          [a, 400],
          [b, 400],
        ]),
      );
      const rgbA = parseHex(a);
      const rgbB = parseHex(b);
      if (!rgbA || !rgbB) throw new Error("bad fixture");
      const hueA = rgbToOklch(rgbA.r, rgbA.g, rgbA.b).h;
      const hueB = rgbToOklch(rgbB.r, rgbB.g, rgbB.b).h;
      const mean = profile.hue;
      expect(mean).not.toBeNull();
      // Angular distance from the mean to each end must be at most half
      // the angular distance between the ends, plus slack for the
      // chroma weighting pulling the mean off the midpoint.
      const arc = (from: number, to: number) => Math.abs(((to - from + 540) % 360) - 180);
      const span = arc(hueA, hueB);
      expect(arc(hueA, mean ?? 0)).toBeLessThanOrEqual(span + 1e-6);
      expect(arc(hueB, mean ?? 0)).toBeLessThanOrEqual(span + 1e-6);
    }
  });

  it("weights the mean hue by chroma, exactly as the family vote is weighted", () => {
    // If the two disagreed, the spectrum ordering and the colour pages
    // would tell two different stories about the same picture. A vivid
    // blue outvotes a barely-tinted warm haze of the same pixel count, so
    // the mean hue has to land in the blue arc.
    const profile = colorProfileFromHistogram(
      histogram([
        ["#1482d5", 500],
        ["#b5a882", 500],
      ]),
    );
    const family = bucketsFromHistogram(
      histogram([
        ["#1482d5", 500],
        ["#b5a882", 500],
      ]),
    );
    expect(family[0]).toBe("blue");
    expect(profile.hue ?? 0).toBeGreaterThan(215);
    expect(profile.hue ?? 0).toBeLessThan(275);
  });

  it("reports no hue for an achromatic frame, keeping its lightness", () => {
    const profile = colorProfileFromHistogram(histogram([["#8c8c88", 1000]]));
    expect(profile.hue).toBeNull();
    expect(profile.buckets).toEqual(["grey"]);
    expect(profile.lightness).toBeGreaterThan(0.6);
  });

  it("reports no hue when the chromatic pixels cancel out", () => {
    // Two hues exactly 180 degrees apart at equal weight: the resultant
    // vector is zero, so any angle we returned would be a coin flip and
    // would park the photo at an arbitrary point on the spectrum. Null is
    // the honest answer, and sorts it with the neutral tail.
    const profile = colorProfileFromHistogram(
      histogram([
        [ANTIPODAL_GREEN, 500],
        [ANTIPODAL_PINK, 500],
      ]),
    );
    expect(profile.hue).toBeNull();
    // It still gets its colour families — only the single-angle summary
    // is undefined, and the families are what the ring browses by.
    expect(profile.buckets).toContain("green");
    expect(profile.buckets).toContain("pink");
  });

  it("recovers a hue as soon as the cancellation is broken", () => {
    // Guard against the floor swallowing real photographs: tilt the same
    // pair 60/40 and the mean snaps to the heavier side.
    const profile = colorProfileFromHistogram(
      histogram([
        [ANTIPODAL_GREEN, 600],
        [ANTIPODAL_PINK, 400],
      ]),
    );
    expect(profile.hue).not.toBeNull();
    expect(profile.hue ?? 0).toBeCloseTo(151.3, 0);
  });

  it("gives an achromatic photo a null hue even with a few tinted pixels", () => {
    // Under NEUTRAL_MAX_CHROMATIC_FRACTION the photo has no hue worth
    // sorting by, and the spectrum page relies on null to park it in the
    // neutral tail rather than wedged between two colour photos.
    const profile = colorProfileFromHistogram(
      histogram([
        ["#8c8c88", 980],
        ["#1482d5", 20],
      ]),
    );
    expect(profile.buckets).toEqual(["grey"]);
    expect(profile.hue).toBeNull();
  });
});

describe("familyVoteShares", () => {
  it("returns an empty map when no pixel carries a hue", () => {
    expect(familyVoteShares(histogram([["#8c8c88", 1000]]))).toEqual({});
    expect(familyVoteShares([])).toEqual({});
  });

  it("splits one vote across the families present", () => {
    const shares = familyVoteShares(
      histogram([
        ["#1482d5", 600],
        ["#a2202c", 400],
      ]),
    );
    // Both hexes clamp to a full-weight vote, so the shares are the pixel
    // proportions exactly.
    expect(shares.blue).toBeCloseTo(0.6, 6);
    expect(shares.red).toBeCloseTo(0.4, 6);
    const sum = Object.values(shares).reduce((total, value) => total + value, 0);
    expect(sum).toBeCloseTo(1, 6);
  });

  it("ignores achromatic pixels rather than counting them as a family", () => {
    // This is what makes FAMILY_PRIOR a share of the *chromatic* vote: a
    // hazy frame contributes its one colour at full share, which is why
    // the priors are means over photos rather than over pixels.
    const shares = familyVoteShares(
      histogram([
        ["#8c8c88", 900],
        ["#1482d5", 100],
      ]),
    );
    expect(shares.blue).toBeCloseTo(1, 6);
  });

  it("weights by chroma, so a vivid sliver outvotes a dull expanse", () => {
    const shares = familyVoteShares(
      histogram([
        ["#1482d5", 300], // chroma 0.155, clamps to weight 1.0
        ["#7a5230", 300], // chroma 0.072, weight 0.6
      ]),
    );
    expect(shares.blue ?? 0).toBeGreaterThan(shares.gold ?? 0);
  });
});

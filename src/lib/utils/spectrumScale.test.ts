import { COLOR_BUCKETS, parseHex, rgbToOklch } from "src/lib/colorBuckets.mjs";
import {
  alongBand,
  bandAt,
  inGamut,
  intoGamut,
  mixOklch,
  positionInBand,
  STRIP_CHROMA_BOOST,
  segmentGradient,
} from "src/lib/utils/spectrumScale";
import { describe, expect, it } from "vitest";

// Gold as the real page has it: photos 136 to 601 of 1,950, so index 135 and
// a count of 466.
const gold = { index: 135, count: 466 };

describe("positionInBand", () => {
  it("lands at the start of the band at its left edge", () => {
    expect(positionInBand(gold, 0)).toBe(135);
  });

  it("lands proportionally inside the band, between photos too", () => {
    expect(positionInBand(gold, 0.25)).toBe(135 + 116.5);
    expect(positionInBand(gold, 0.5)).toBe(135 + 233);
  });

  it("clamps a fraction from outside the segment", () => {
    expect(positionInBand(gold, -3)).toBe(135);
    expect(positionInBand(gold, 12)).toBe(135 + 466);
  });

  it("survives a band of none", () => {
    expect(positionInBand({ index: 40, count: 0 }, 0.5)).toBe(40);
  });
});

describe("alongBand", () => {
  it("undoes positionInBand, so the marker lands under the pointer", () => {
    for (const along of [0, 0.1, 0.333, 0.5, 0.9, 1]) {
      expect(alongBand(gold, positionInBand(gold, along))).toBeCloseTo(along, 12);
    }
  });

  it("clamps a position outside the band", () => {
    expect(alongBand(gold, 0)).toBe(0);
    expect(alongBand(gold, 5000)).toBe(1);
  });

  it("returns the start for a band of none rather than dividing by it", () => {
    expect(alongBand({ index: 40, count: 0 }, 40)).toBe(0);
  });
});

describe("bandAt", () => {
  const bands = [{ index: 0, count: 19 }, { index: 19, count: 116 }, gold];

  it("finds the band holding a position", () => {
    expect(bandAt(bands, 0)).toBe(0);
    expect(bandAt(bands, 18.9)).toBe(0);
    expect(bandAt(bands, 100)).toBe(1);
    expect(bandAt(bands, 300)).toBe(2);
  });

  it("gives a boundary to the band starting there", () => {
    expect(bandAt(bands, 19)).toBe(1);
    expect(bandAt(bands, 135)).toBe(2);
  });

  it("keeps the end of the sweep in the last band", () => {
    expect(bandAt(bands, 601)).toBe(2);
    expect(bandAt(bands, 9999)).toBe(2);
  });
});

describe("mixOklch", () => {
  const gold = { l: 0.7, c: 0.15, h: 84 };
  const green = { l: 0.5, c: 0.15, h: 129 };

  it("returns the endpoints unchanged", () => {
    expect(mixOklch(gold, green, 0)).toEqual(gold);
    expect(mixOklch(gold, green, 1)).toEqual(green);
  });

  it("walks the hue circle instead of cutting across it", () => {
    // sRGB put this midpoint at an olive brown. Here the chroma holds.
    const mid = mixOklch(gold, green, 0.5);
    expect(mid.h).toBeCloseTo(106.5);
    expect(mid.c).toBeCloseTo(0.15);
  });

  it("goes the short way round past 0°", () => {
    const pink = { l: 0.6, c: 0.14, h: 348 };
    const red = { l: 0.5, c: 0.17, h: 22 };
    expect(mixOklch(pink, red, 0.5).h).toBeCloseTo(5);
  });

  it("keeps a colour's hue when blending it with a neutral", () => {
    const pink = { l: 0.6, c: 0.14, h: 348 };
    const white = { l: 0.93, c: 0, h: 80 };
    const mid = mixOklch(pink, white, 0.5);
    expect(mid.h).toBe(348);
    expect(mid.c).toBeCloseTo(0.07);
  });

  it("clamps a fraction from outside the range", () => {
    expect(mixOklch(gold, green, -1)).toEqual(gold);
    expect(mixOklch(gold, green, 5)).toEqual(green);
  });
});

/** The stops of a `segmentGradient` result, as `[colour, position]`. */
const stopsOf = (gradient: string) =>
  gradient
    .replace(/^linear-gradient\(to right, /, "")
    .replace(/\)$/, "")
    .split(", ")
    .map((stop) => {
      const at = stop.lastIndexOf(" ");
      return [stop.slice(0, at), stop.slice(at + 1)] as const;
    });

/** Parse an `oklch(L% C H)` stop back into numbers. */
const oklchOf = (css: string) => {
  const [l, c, h] = css.replace(/^oklch\(|\)$/g, "").split(" ");
  return { l: Number.parseFloat(l) / 100, c: Number(c), h: Number(h) };
};

const swatch = (id: string) => COLOR_BUCKETS.find((bucket) => bucket.id === id)?.swatch ?? "";

describe("segmentGradient", () => {
  const [orange, gold, green] = ["orange", "gold", "green"].map(swatch);

  it("meets its neighbours at a shared colour", () => {
    // Gold between orange and green: the stop it ends on has to be the stop
    // green begins on, or the seam is visible.
    const goldStops = stopsOf(segmentGradient(gold, orange, green));
    const greenStops = stopsOf(segmentGradient(green, gold, null));
    expect(goldStops.at(-1)?.[1]).toBe("100%");
    expect(greenStops[0][1]).toBe("0%");
    expect(goldStops.at(-1)?.[0]).toBe(greenStops[0][0]);
  });

  it("holds its own colour at the ends of the strip", () => {
    const first = stopsOf(segmentGradient(swatch("red"), null, orange));
    expect(first[0][1]).toBe("0%");
    expect(first[1]).toEqual([first[0][0], "50%"]);
    const last = stopsOf(segmentGradient(swatch("black"), swatch("grey"), null));
    expect(last.at(-1)?.[1]).toBe("100%");
    expect(last.at(-2)).toEqual([last.at(-1)?.[0], "50%"]);
  });

  it("paints the band's own hue, as saturated as the screen allows", () => {
    const rgb = parseHex(gold);
    if (!rgb) throw new Error("gold swatch is not a hex colour");
    const measured = rgbToOklch(rgb.r, rgb.g, rgb.b);
    const own = (gamut: "srgb" | "p3") =>
      oklchOf(
        stopsOf(segmentGradient(gold, orange, green, gamut)).find(([, at]) => at === "50%")?.[0] ??
          "",
      );
    for (const gamut of ["srgb", "p3"] as const) {
      expect(own(gamut).h).toBeCloseTo(measured.h, 0);
      expect(own(gamut).l).toBeCloseTo(measured.l, 3);
    }
    // Gold's swatch already sits on the edge of sRGB, so the boost only shows
    // on a wide-gamut screen.
    expect(own("srgb").c).toBeGreaterThanOrEqual(measured.c - 1e-3);
    expect(own("p3").c).toBeGreaterThan(own("srgb").c);
    expect(own("p3").c).toBeLessThanOrEqual(measured.c * STRIP_CHROMA_BOOST);
  });

  it("fades pink into white without passing through another hue", () => {
    const pink = oklchOf(stopsOf(segmentGradient(swatch("pink"), null, null))[0][0]);
    const whiteStops = stopsOf(segmentGradient(swatch("white"), swatch("pink"), swatch("grey")));
    for (const [css] of whiteStops) {
      const stop = oklchOf(css);
      if (stop.c > 0) expect(stop.h).toBeCloseTo(pink.h, 0);
    }
  });

  it("eases out of its own colour instead of leaving it at a corner", () => {
    // The first step away from the centre is far smaller than a step at the
    // seam, so the colour lingers there. A straight ramp made them equal.
    const stops = stopsOf(segmentGradient(gold, orange, green)).map(([css, at]) => ({
      ...oklchOf(css),
      at,
    }));
    const centre = stops.findIndex(({ at }) => at === "50%");
    const step = (a: { l: number }, b: { l: number }) => Math.abs(a.l - b.l);
    const atSeam = step(stops[stops.length - 2], stops[stops.length - 1]);
    expect(step(stops[centre], stops[centre + 1])).toBeLessThan(atSeam / 4);
    expect(step(stops[centre - 1], stops[centre])).toBeLessThan(atSeam / 4);
  });

  it("keeps every stop inside the gamut it was built for", () => {
    const fills = COLOR_BUCKETS.map((bucket) => bucket.swatch);
    for (const gamut of ["srgb", "p3"] as const) {
      fills.forEach((fill, i) => {
        const gradient = segmentGradient(fill, fills[i - 1] ?? null, fills[i + 1] ?? null, gamut);
        for (const [css] of stopsOf(gradient)) expect(inGamut(oklchOf(css), gamut)).toBe(true);
      });
    }
  });

  it("uses the extra room a wide-gamut screen has", () => {
    const [teal, blue] = ["teal", "blue"].map(swatch);
    const own = (gamut: "srgb" | "p3") =>
      oklchOf(
        stopsOf(segmentGradient(teal, green, blue, gamut)).find(([, at]) => at === "50%")?.[0] ??
          "",
      );
    expect(own("p3").c).toBeGreaterThan(own("srgb").c);
    expect(own("p3").h).toBeCloseTo(own("srgb").h, 0);
  });

  it("returns a fill it cannot parse as it is", () => {
    expect(segmentGradient("rebeccapurple", null, null)).toBe("rebeccapurple");
  });
});

describe("intoGamut", () => {
  it("leaves a colour the screen can show alone", () => {
    const grey = { l: 0.6, c: 0, h: 0 };
    expect(intoGamut(grey, "srgb")).toEqual(grey);
  });

  it("lowers only the chroma of one it cannot", () => {
    const tooGreen = { l: 0.6, c: 0.3, h: 140 };
    const mapped = intoGamut(tooGreen, "srgb");
    expect(inGamut(tooGreen, "srgb")).toBe(false);
    expect(inGamut(mapped, "srgb")).toBe(true);
    expect(mapped.l).toBe(tooGreen.l);
    expect(mapped.h).toBe(tooGreen.h);
    expect(mapped.c).toBeLessThan(tooGreen.c);
    // Close to the edge, not far inside it.
    expect(inGamut({ ...mapped, c: mapped.c + 0.005 }, "srgb")).toBe(false);
  });
});

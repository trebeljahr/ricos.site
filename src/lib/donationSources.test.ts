import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  isFreshSource,
  SOURCE_TTL_MS,
  SUPPORTED_QUERY_KEY,
  supportedUrl,
  withReference,
} from "./donation";
import { getDonationSource, SOURCE_BRANDS } from "./donationSources";
import { PROJECTS } from "./projects";

describe("getDonationSource", () => {
  it("names a project from the catalogue and links back to its site", () => {
    expect(getDonationSource("fractal-garden")).toMatchObject({
      slug: "fractal-garden",
      name: "Fractal Garden",
      url: "https://fractal.garden",
      cover: { src: "/projects/fractal-garden.webp" },
    });
  });

  it("accepts every catalogue slug", () => {
    for (const { slug } of PROJECTS) {
      expect(getDonationSource(slug)?.slug, slug).toBe(slug);
    }
  });

  it("knows projects that are not on /projects yet", () => {
    expect(getDonationSource("chemistry-sketcher")?.name).toBe("Chemistry Sketcher");
  });

  it("offers no way back for a page on this site", () => {
    expect(getDonationSource("interactive-3d-demos")?.url).toBeUndefined();
  });

  it("ignores unknown or malformed slugs", () => {
    expect(getDonationSource("not-a-project")).toBeNull();
    expect(getDonationSource(["fractal-garden"])).toBeNull();
    expect(getDonationSource(undefined)).toBeNull();
  });

  // Stripe silently drops a client_reference_id with other characters.
  it("only uses slugs Stripe keeps as a client_reference_id", () => {
    for (const { slug } of PROJECTS) {
      expect(slug, slug).toMatch(/^[A-Za-z0-9_-]{1,200}$/);
    }
  });
});

describe("withReference", () => {
  it("adds the reference and keeps the link's own query", () => {
    const tagged = new URL(
      withReference("https://buy.stripe.com/test_abc?prefilled_email=a%40b.c", "conv3d"),
    );
    expect(tagged.searchParams.get("client_reference_id")).toBe("conv3d");
    expect(tagged.searchParams.get("prefilled_email")).toBe("a@b.c");
  });
});

describe("supportedUrl", () => {
  it("marks the way back so the project can quiet its asks", () => {
    const back = new URL(supportedUrl("https://fractal.garden"));
    expect(back.origin).toBe("https://fractal.garden");
    expect(back.searchParams.get(SUPPORTED_QUERY_KEY)).toBe("1");
  });
});

describe("isFreshSource", () => {
  it("expires a stored slug after the TTL", () => {
    const now = 1_000_000_000_000;
    expect(isFreshSource(null, now)).toBe(false);
    expect(isFreshSource({ slug: "conv3d", at: now - 1000 }, now)).toBe(true);
    expect(isFreshSource({ slug: "conv3d", at: now - SOURCE_TTL_MS - 1 }, now)).toBe(false);
  });
});

// WCAG relative luminance and contrast ratio for #rrggbb colours.
function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = Number.parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// The card behind every accent link: bg-white, and Tailwind 4's gray-800 in dark mode.
const CARD_LIGHT = "#ffffff";
const CARD_DARK = "#1e2939";

describe("SOURCE_BRANDS", () => {
  const entries = Object.entries(SOURCE_BRANDS);

  it("only brands slugs the donate page accepts", () => {
    for (const [slug] of entries) expect(getDonationSource(slug), slug).not.toBeNull();
  });

  // Links on the card use the accent as text, so it has to pass AA for body text.
  it("keeps every accent readable as text on the light and the dark card", () => {
    for (const [slug, brand] of entries) {
      expect(brand.accent, slug).toMatch(/^#[0-9a-f]{6}$/);
      expect(brand.accentDark, slug).toMatch(/^#[0-9a-f]{6}$/);
      expect(contrast(brand.accent, CARD_LIGHT), `${slug} light`).toBeGreaterThanOrEqual(4.5);
      expect(contrast(brand.accentDark, CARD_DARK), `${slug} dark`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("points every icon at a file in public/", () => {
    for (const [slug, { icon }] of entries) {
      if (icon) expect(existsSync(resolve("public", `.${icon}`)), slug).toBe(true);
    }
  });
});

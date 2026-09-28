import { describe, expect, it } from "vitest";
import {
  isFreshSource,
  SOURCE_TTL_MS,
  SUPPORTED_QUERY_KEY,
  supportedUrl,
  withReference,
} from "./donation";
import { getDonationSource } from "./donationSources";
import { PROJECTS } from "./projects";

describe("getDonationSource", () => {
  it("names a project from the catalogue and links back to its site", () => {
    expect(getDonationSource("fractal-garden")).toEqual({
      slug: "fractal-garden",
      name: "Fractal Garden",
      url: "https://fractal.garden",
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

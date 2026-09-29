import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { DONATION_DESIGNS, getDonationDesign } from "./donationDesigns";
import { getDonationSource } from "./donationSources";
import { PROJECTS } from "./projects";

function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = Number.parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a: string, b: string) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe("donation designs", () => {
  it("provides a complete design for every recognized project", () => {
    for (const slug of [...PROJECTS.map((project) => project.slug), "chemistry-sketcher"]) {
      expect(DONATION_DESIGNS[slug], slug).toBeDefined();
    }
    for (const slug of Object.keys(DONATION_DESIGNS)) {
      expect(getDonationSource(slug), slug).not.toBeNull();
    }
  });

  it("keeps text and accent links readable on the page and payment surface", () => {
    for (const [slug, design] of Object.entries(DONATION_DESIGNS)) {
      for (const surface of [design.background, design.surface]) {
        for (const text of [design.ink, design.muted, design.accent]) {
          expect(contrast(text, surface), `${slug}: ${text} on ${surface}`).toBeGreaterThanOrEqual(
            4.5,
          );
        }
      }
    }
  });

  it("ships every custom visual locally", () => {
    for (const [slug, design] of Object.entries(DONATION_DESIGNS)) {
      if (design.image) {
        expect(existsSync(resolve("public", `.${design.image.src}`)), slug).toBe(true);
        expect(design.image.alt.length).toBeGreaterThan(0);
      }
    }
  });

  it("gives newly registered projects a usable design without a custom entry", () => {
    expect(getDonationDesign({ slug: "future-project", name: "Future project" })).toMatchObject({
      layout: "studio",
      dark: false,
    });
  });
});

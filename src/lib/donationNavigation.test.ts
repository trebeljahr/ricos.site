import { afterEach, describe, expect, it, vi } from "vitest";
import { SOURCE_TTL_MS, supportedUrl } from "./donation";
import {
  donationPath,
  donationReturnForVisit,
  donationSourceFromCookie,
  sourceFromReferrer,
  validateDonationReturn,
} from "./donationNavigation";
import { getDonationSource } from "./donationSources";

const beauty = getDonationSource("collection-of-beauty")!;
const garden = getDonationSource("fractal-garden")!;
const artwork = "https://collectionofbeauty.com/artwork/a-wave?colour=blue&sort=year#details";

afterEach(() => vi.unstubAllEnvs());

describe("project donation navigation", () => {
  it("keeps local project return URLs in development only", () => {
    const urls = [
      "http://localhost:1111/explore?set=julia#view",
      "http://127.0.0.1:51234/gallery?sort=year#painting",
      "http://[::1]:51234/gallery",
    ];
    vi.stubEnv("NODE_ENV", "development");
    for (const url of urls) {
      expect(validateDonationReturn(garden, url)).toBe(url);
      expect(donationReturnForVisit(garden, url, null, false)).toBe(url);
      expect(sourceFromReferrer(url)).toBeNull();
    }
    for (const url of [
      "http://localhost.evil.test:1111/",
      "http://192.168.1.2:1111/",
      "http://user@localhost:1111/",
      "http://localhost:3713/donate/fractal-garden",
    ])
      expect(validateDonationReturn(garden, url)).toBeNull();
    vi.stubEnv("NODE_ENV", "production");
    for (const url of urls) expect(validateDonationReturn(garden, url)).toBeNull();
  });

  it("restores only a recognized project from the checkout-return cookie", () => {
    expect(donationSourceFromCookie("theme=dark; donation-project=fractal-garden")?.slug).toBe(
      "fractal-garden",
    );
    expect(donationSourceFromCookie("donation-project=unknown")).toBeNull();
    expect(donationSourceFromCookie("donation-project=raptor-runner")).toBeNull();
    expect(donationSourceFromCookie("donation-project=%invalid")).toBeNull();
    expect(donationSourceFromCookie(undefined)).toBeNull();
  });
  it("preserves the complete originating page through checkout", () => {
    expect(validateDonationReturn(beauty, artwork)).toBe(artwork);
    const stored = { slug: beauty.slug, at: Date.now(), returnTo: artwork };
    expect(donationReturnForVisit(beauty, undefined, stored, true)).toBe(artwork);
    const returned = new URL(supportedUrl(artwork));
    expect(returned.pathname).toBe("/artwork/a-wave");
    expect(returned.searchParams.get("colour")).toBe("blue");
    expect(returned.searchParams.get("supported")).toBe("1");
    expect(returned.hash).toBe("#details");
  });

  it("rejects other hosts, spoofed hosts, credentials, and unsafe protocols", () => {
    for (const candidate of [
      "https://evil.test/",
      "//evil.test/",
      "https://collectionofbeauty.com.evil.test/",
      "https://collectionofbeauty.com@evil.test/",
      "https://user@collectionofbeauty.com/",
      "javascript:alert(1)",
      "http://collectionofbeauty.com/",
      [artwork],
      undefined,
    ]) {
      expect(validateDonationReturn(beauty, candidate), String(candidate)).toBeNull();
    }
  });

  it("does not restore a stale or different project's return destination", () => {
    const stored = { slug: beauty.slug, at: Date.now(), returnTo: artwork };
    expect(donationReturnForVisit(garden, undefined, stored, true)).toBe(garden.url);
    expect(
      donationReturnForVisit(
        beauty,
        undefined,
        { ...stored, at: Date.now() - SOURCE_TTL_MS - 1 },
        true,
      ),
    ).toBe(beauty.url);
    expect(donationReturnForVisit(beauty, undefined, stored, false)).toBe(beauty.url);
  });

  it("gives an explicit valid return destination priority", () => {
    expect(
      donationReturnForVisit(
        beauty,
        artwork,
        { slug: beauty.slug, at: Date.now(), returnTo: beauty.url },
        true,
      ),
    ).toBe(artwork);
  });

  it("infers the source of legacy links from a matching referrer", () => {
    expect(sourceFromReferrer(artwork)?.slug).toBe(beauty.slug);
    expect(sourceFromReferrer("https://evil.test/")).toBeNull();
    expect(sourceFromReferrer("https://raptorrunner.com/")).toBeNull();
    expect(sourceFromReferrer("https://ricos.site/posts/a-post")).toBeNull();
  });

  it("gives projects distinct routes and avoids a return loop", () => {
    expect(donationPath(beauty.slug)).toBe("/donate/collection-of-beauty");
    expect(
      validateDonationReturn(
        getDonationSource("interactive-3d-demos")!,
        "https://ricos.site/donate/fractal-garden",
      ),
    ).toBeNull();
  });
});

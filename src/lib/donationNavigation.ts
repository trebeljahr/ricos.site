import { type DonationSource, isFreshSource, type StoredDonationSource } from "./donation";
import { getDonationSource } from "./donationSources";
import { PROJECTS } from "./projects";

export const RETURN_QUERY_KEY = "returnTo";
export const DONATION_SOURCE_COOKIE = "donation-project";
const SITE_ORIGIN = "https://ricos.site";

export function donationPath(slug: string) {
  return `/donate/${encodeURIComponent(slug)}`;
}

export function projectHome(source: DonationSource) {
  return (
    source.url ??
    (source.slug === "interactive-3d-demos" ? `${SITE_ORIGIN}/r3f` : `${SITE_ORIGIN}/projects`)
  );
}

/** A return link may only navigate within the project it claims to come from. */
export function validateDonationReturn(source: DonationSource, candidate: unknown): string | null {
  if (typeof candidate !== "string" || candidate.length > 8192) return null;
  try {
    const home = new URL(projectHome(source));
    const url = new URL(candidate, home);
    if (url.protocol !== "https:" || url.username || url.password) return null;
    const allowed = new Set([home.origin]);
    if (!allowed.has(url.origin)) return null;
    // Never loop back into a donation page, including a stale same-site referrer.
    if (url.origin === SITE_ORIGIN && /^\/donate(?:\/|$)/.test(url.pathname)) return null;
    return url.href;
  } catch {
    return null;
  }
}

export function sourceFromReferrer(referrer: unknown): DonationSource | null {
  if (typeof referrer !== "string") return null;
  return (
    [...PROJECTS.map(({ slug }) => slug), "chemistry-sketcher"]
      .map(getDonationSource)
      .find((source) => source?.url && validateDonationReturn(source, referrer)) ?? null
  );
}

export function donationReturnForVisit(
  source: DonationSource,
  candidate: unknown,
  stored: StoredDonationSource | null,
  justDonated: boolean,
) {
  return (
    validateDonationReturn(source, candidate) ??
    (justDonated && isFreshSource(stored) && stored?.slug === source.slug
      ? validateDonationReturn(source, stored.returnTo)
      : null) ??
    projectHome(source)
  );
}

/** The short-lived cookie lets a checkout return render its project before hydration. */
export function donationSourceFromCookie(cookie: string | undefined) {
  const value = cookie
    ?.split(";")
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(`${DONATION_SOURCE_COOKIE}=`))
    ?.slice(DONATION_SOURCE_COOKIE.length + 1);
  try {
    return getDonationSource(value ? decodeURIComponent(value) : undefined);
  } catch {
    return null;
  }
}

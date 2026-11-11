import {
  type DonationSource,
  FROM_QUERY_KEY,
  isFreshSource,
  type StoredDonationSource,
  THANKS_QUERY_KEY,
} from "./donation";
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

/** Production stays within the project; development also accepts local project servers. */
export function validateDonationReturn(
  source: DonationSource,
  candidate: unknown,
  allowLocal = process.env.NODE_ENV === "development",
): string | null {
  if (typeof candidate !== "string" || candidate.length > 8192) return null;
  try {
    const home = new URL(projectHome(source));
    const url = new URL(candidate, home);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) return null;
    const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    if (!(allowLocal && local) && (url.protocol !== "https:" || url.origin !== home.origin)) {
      return null;
    }
    // Never loop back into a donation page, including a stale same-site referrer.
    if (
      (url.origin === SITE_ORIGIN || (local && url.port === "2222")) &&
      /^\/donate(?:\/|$)/.test(url.pathname)
    )
      return null;
    return url.href;
  } catch {
    return null;
  }
}

export function sourceFromReferrer(referrer: unknown): DonationSource | null {
  if (typeof referrer !== "string") return null;
  return (
    PROJECTS.map(({ slug }) => getDonationSource(slug)).find(
      (source) => source?.url && validateDonationReturn(source, referrer, false),
    ) ?? null
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

/**
 * Where a visit to plain /donate belongs. A visit that names a project, a
 * checkout return that the cookie ties to one, or a click from a project's
 * own site goes to that project's /donate/<slug> page; everything else
 * stays (`null`). The page runs this in the browser after hydration: the
 * site is a static export, so nothing reads the request on a server.
 */
export function donationRedirect({
  query,
  cookie,
  referrer,
}: {
  query: Record<string, unknown>;
  cookie: string | undefined;
  referrer: string | undefined;
}): string | null {
  const from = query[FROM_QUERY_KEY];
  const thanks = query[THANKS_QUERY_KEY] !== undefined;
  const source =
    getDonationSource(from) ??
    (thanks ? donationSourceFromCookie(cookie) : null) ??
    (from === undefined && !thanks ? sourceFromReferrer(referrer || undefined) : null);
  if (!source) return null;
  const params = new URLSearchParams();
  const returnTo =
    validateDonationReturn(source, query[RETURN_QUERY_KEY]) ??
    validateDonationReturn(source, referrer || undefined);
  if (returnTo) params.set(RETURN_QUERY_KEY, returnTo);
  if (thanks) params.set(THANKS_QUERY_KEY, "1");
  return `${donationPath(source.slug)}${params.size ? `?${params}` : ""}`;
}

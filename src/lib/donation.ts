// Shared data for every donation surface on the site: the full card on
// /donate, the strip under long posts, the footer line. The Stripe Payment
// Link URLs are public checkout URLs read from NEXT_PUBLIC_* env vars, so they
// are inlined at build time; an unset var leaves that option out.

export type DonationMode = "monthly" | "once";

export type DonationOption = {
  label: string;
  note: string;
  // A small, static picture of roughly what the amount buys.
  emoji?: string;
  href?: string;
};

// Monthly is fixed tiers: a plain Stripe Payment Link cannot take a
// customer-chosen recurring amount, so each amount is its own subscription.
export const monthlyOptions: DonationOption[] = [
  {
    label: "EUR 3",
    note: "I can buy some cookies.",
    emoji: "🍪",
    href: process.env.NEXT_PUBLIC_STRIPE_DONATION_MONTHLY_3_URL,
  },
  {
    label: "EUR 5",
    note: "A coffee-ish amount.",
    emoji: "☕",
    href: process.env.NEXT_PUBLIC_STRIPE_DONATION_MONTHLY_5_URL,
  },
  {
    label: "EUR 10",
    note: "Did I say I love pizza?",
    emoji: "🍕",
    href: process.env.NEXT_PUBLIC_STRIPE_DONATION_MONTHLY_10_URL,
  },
  {
    label: "EUR 25",
    note: "Wow. Thanks.",
    emoji: "😇",
    href: process.env.NEXT_PUBLIC_STRIPE_DONATION_MONTHLY_25_URL,
  },
];

// One-time is a single pay-what-you-want Stripe link (Stripe's "customers
// choose what to pay"). No fixed tiles: the donor names the amount on Stripe's
// page, with EUR 10 suggested and a EUR 1 floor.
export const oneTimeUrl = process.env.NEXT_PUBLIC_STRIPE_DONATION_ONETIME_CUSTOM_URL;

// Stripe's hosted customer portal (Dashboard → Settings → Billing → Customer
// portal → "Activate link"). Donors log in with their email and a one-time
// code, then cancel a monthly donation, change their card or download invoices
// on their own. Unset until the link is activated; the thanks card then falls
// back to asking by mail.
export const manageDonationUrl = process.env.NEXT_PUBLIC_STRIPE_CUSTOMER_PORTAL_URL;

export type DonationDoor = {
  name: string;
  url: string;
  // Doors with a blurb get a full tile; the rest share one row, logo and name.
  blurb?: string;
};

// Extra doors for people who would rather not use a card on Stripe. PayPal and
// Wise both let the sender choose any amount. Ko-fi, Buy Me a Coffee and
// Patreon (the only third-party monthly option) are for people who already
// have an account there, so their name is enough.
export const otherDoors: DonationDoor[] = [
  {
    name: "PayPal",
    url: "https://www.paypal.com/ncp/payment/2TV2FC34E2XGG",
    blurb: "Any amount, one-time.",
  },
  {
    name: "Wise",
    url: "https://wise.com/pay/business/ricoslabsllc",
    blurb: "Any amount, good for non-euro senders.",
  },
  {
    name: "Ko-fi",
    url: "https://ko-fi.com/trebeljahr",
  },
  {
    name: "Buy Me a Coffee",
    url: "https://buymeacoffee.com/trebeljahr",
  },
  {
    name: "Patreon",
    url: "https://www.patreon.com/RicoTrebeljahr",
  },
].filter((door) => door.url);

export const hasMonthlyLinks = monthlyOptions.some((option) => option.href);
export const hasOneTimeLink = Boolean(oneTimeUrl);
export const hasAnyStripeLinks = hasMonthlyLinks || hasOneTimeLink;
export const hasOtherDoors = otherDoors.length > 0;
export const defaultDonationMode: DonationMode =
  hasMonthlyLinks || !hasOneTimeLink ? "monthly" : "once";

// For the compact strip under posts: the pay-what-you-want door and the
// smallest monthly tier.
export const quickMonthly = monthlyOptions[0];

// Stripe sends donors back to /donate?thanks=1 after checkout (configured per
// Payment Link in the Stripe dashboard). The page records the moment so the
// inline asks stay quiet for a while afterwards.
export const THANKS_QUERY_KEY = "thanks";
export const SUPPORTED_AT_STORAGE_KEY = "donation-supported-at";
export const QUIET_PERIOD_MS = 90 * 24 * 60 * 60 * 1000;

export function isInQuietPeriod(supportedAt: number | null, now = Date.now()) {
  return supportedAt !== null && now - supportedAt < QUIET_PERIOD_MS;
}

// Every other project links its donate button here as /donate?from=<slug>,
// with the slug from src/lib/projects.ts (see src/lib/donationSources.ts).
// The page names the project, tags the Stripe payment with the slug and, after
// the thanks, offers the way back.
export const FROM_QUERY_KEY = "from";

// The project's own look, taken from its code, so the page feels like a step
// on from the site the donor just left rather than a different place.
export type DonationBrand = {
  // The project's link/button colour, tuned where needed to read as text on
  // the white card (accent) and on the dark card (accentDark).
  accent: string;
  accentDark: string;
  // The project's square icon, under public/donate/sources/.
  icon?: string;
  // A tile behind an icon drawn on nothing, in the project's own page colour.
  iconBackground?: string;
};

export type DonationSource = {
  slug: string;
  name: string;
  // Absolute URL of the project's site; without one the thanks has no way back.
  url?: string;
  // One line on what the project is, from the /projects catalogue.
  subtitle?: string;
  // A screenshot of the project, from the /projects catalogue.
  cover?: { src: string; alt: string };
  brand?: DonationBrand;
};

// The tag on donations that start on ricos.site itself.
export const SITE_REFERENCE = "ricos-site";

// Stripe Payment Links copy a client_reference_id from their URL onto the
// payment, so one set of links still shows which project a donation came from.
export function withReference(href: string, reference: string) {
  const url = new URL(href);
  url.searchParams.set("client_reference_id", reference);
  return url.toString();
}

// Stripe's redirect back to /donate?thanks=1 cannot carry the slug, so the
// page stores it on arrival and reads it on the thanks view. Old enough and it
// no longer belongs to this donation.
export const DONATION_SOURCE_STORAGE_KEY = "donation-source";
export const SOURCE_TTL_MS = 6 * 60 * 60 * 1000;

export type StoredDonationSource = { slug: string; at: number };

export function isFreshSource(stored: StoredDonationSource | null, now = Date.now()) {
  return stored !== null && now - stored.at < SOURCE_TTL_MS;
}

// The way back carries ?supported=1, so the project can quiet its own asks.
// Its localStorage cannot see this site's, so it has to be told.
export const SUPPORTED_QUERY_KEY = "supported";

export function supportedUrl(projectUrl: string) {
  const url = new URL(projectUrl);
  url.searchParams.set(SUPPORTED_QUERY_KEY, "1");
  return url.toString();
}

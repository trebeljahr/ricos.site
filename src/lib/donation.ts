// Shared data for every donation surface on the site: the full card on
// /donate, the strip under long posts, the footer line. The Stripe Payment
// Link URLs are public checkout URLs read from NEXT_PUBLIC_* env vars, so they
// are inlined at build time; an unset var leaves that option out.

export type DonationMode = "monthly" | "once";

export type DonationOption = {
  label: string;
  note: string;
  href?: string;
};

export const monthlyOptions: DonationOption[] = [
  {
    label: "EUR 3",
    note: "Small monthly nudge.",
    href: process.env.NEXT_PUBLIC_STRIPE_DONATION_MONTHLY_3_URL,
  },
  {
    label: "EUR 5",
    note: "A coffee-ish amount.",
    href: process.env.NEXT_PUBLIC_STRIPE_DONATION_MONTHLY_5_URL,
  },
  {
    label: "EUR 10",
    note: "Keeps the lights brighter.",
    href: process.env.NEXT_PUBLIC_STRIPE_DONATION_MONTHLY_10_URL,
  },
  {
    label: "EUR 25",
    note: "Patron saint mode.",
    href: process.env.NEXT_PUBLIC_STRIPE_DONATION_MONTHLY_25_URL,
  },
];

export const oneTimeOptions: DonationOption[] = [
  {
    label: "EUR 5",
    note: "A small thank-you.",
    href: process.env.NEXT_PUBLIC_STRIPE_DONATION_ONETIME_5_URL,
  },
  {
    label: "EUR 10",
    note: "A generous nudge.",
    href: process.env.NEXT_PUBLIC_STRIPE_DONATION_ONETIME_10_URL,
  },
  {
    label: "EUR 25",
    note: "A proper boost.",
    href: process.env.NEXT_PUBLIC_STRIPE_DONATION_ONETIME_25_URL,
  },
  {
    label: "Custom",
    note: "Choose your own amount.",
    href: process.env.NEXT_PUBLIC_STRIPE_DONATION_ONETIME_CUSTOM_URL,
  },
];

export const fallbackLinks = [
  {
    name: "Ko-fi",
    url: "https://ko-fi.com/trebeljahr",
    blurb: "One-time tip jar.",
  },
  {
    name: "Buy Me a Coffee",
    url: "https://buymeacoffee.com/trebeljahr",
    blurb: "Same idea, different button.",
  },
  {
    name: "Patreon",
    url: "https://www.patreon.com/RicoTrebeljahr",
    blurb: "Monthly patronage.",
  },
];

export const hasMonthlyLinks = monthlyOptions.some((option) => option.href);
export const hasOneTimeLinks = oneTimeOptions.some((option) => option.href);
export const hasAnyStripeLinks = hasMonthlyLinks || hasOneTimeLinks;
export const defaultDonationMode: DonationMode =
  hasMonthlyLinks || !hasOneTimeLinks ? "monthly" : "once";

// The two cheapest doors, for the compact strip under posts.
export const quickOnce = oneTimeOptions[0];
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

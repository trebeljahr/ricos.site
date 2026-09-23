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

// Monthly is fixed tiers: a plain Stripe Payment Link cannot take a
// customer-chosen recurring amount, so each amount is its own subscription.
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

// One-time is a single pay-what-you-want Stripe link (Stripe's "customers
// choose what to pay"). No fixed tiles: the donor names the amount on Stripe's
// page, with EUR 10 suggested and a EUR 1 floor.
export const oneTimeUrl = process.env.NEXT_PUBLIC_STRIPE_DONATION_ONETIME_CUSTOM_URL;

// Extra one-time doors for people who would rather not use a card on Stripe.
// PayPal and Wise both let the sender choose any amount. Patreon is the only
// third-party monthly option kept, for people already on it.
export const otherDoors = [
  {
    name: "PayPal",
    // TODO: set to the PayPal.Me link, e.g. https://paypal.me/<handle>
    url: "",
    blurb: "Any amount, one-time.",
  },
  {
    name: "Wise",
    url: "https://wise.com/pay/business/ricoslabsllc",
    blurb: "Any amount, good for non-euro senders.",
  },
  {
    name: "Patreon",
    url: "https://www.patreon.com/RicoTrebeljahr",
    blurb: "Monthly patronage.",
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

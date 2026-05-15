import clsx from "clsx";
import { useState } from "react";
import { ExternalLink } from "./ExternalLink";

type DonationMode = "monthly" | "once";

type DonationOption = {
  label: string;
  note: string;
  href?: string;
};

const monthlyOptions: DonationOption[] = [
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

const oneTimeOptions: DonationOption[] = [
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

const fallbackLinks = [
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

const hasMonthlyLinks = monthlyOptions.some((option) => option.href);
const hasOneTimeLinks = oneTimeOptions.some((option) => option.href);
const defaultDonationMode: DonationMode = hasMonthlyLinks || !hasOneTimeLinks ? "monthly" : "once";

type DonationCardProps = {
  className?: string;
};

export function DonationCard({ className }: DonationCardProps) {
  const [mode, setMode] = useState<DonationMode>(defaultDonationMode);
  const options = mode === "monthly" ? monthlyOptions : oneTimeOptions;
  const configuredOptions = options.filter((option) => option.href);
  const hasStripeLinks = configuredOptions.length > 0;

  return (
    <section className={clsx("not-prose w-full", className)} aria-labelledby="donation-card-title">
      <div className="rounded-lg border-4 border-gray-200 bg-white px-5 py-10 dark:border-gray-700 dark:bg-gray-800">
        <p className="m-0 text-sm font-semibold text-myBlue">donating = loving</p>
        <h2 id="donation-card-title" className="mt-2 mb-3 text-2xl font-bold">
          Keep this place alive
        </h2>
        <p className="m-0 max-w-prose text-gray-700 dark:text-gray-200">
          This is a small labor of love, made because I like making useful and beautiful things for
          the internet. If it made your day a little better, a donation is one way to say: keep
          going.
        </p>

        <div className="mt-6 inline-flex rounded-md border-2 border-gray-200 bg-gray-100 p-1 dark:border-gray-700 dark:bg-gray-900">
          {[
            ["monthly", "Monthly"],
            ["once", "One-time"],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={clsx(
                "min-w-24 rounded-sm px-4 py-2 text-sm font-semibold transition-colors",
                mode === value
                  ? "bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white"
                  : "text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white",
              )}
              aria-pressed={mode === value}
              onClick={() => setMode(value as DonationMode)}
            >
              {label}
            </button>
          ))}
        </div>

        {hasStripeLinks ? (
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {configuredOptions.map((option) => (
              <ExternalLink
                key={option.label}
                href={option.href ?? "#"}
                className="group flex min-h-24 flex-col justify-between rounded-md border-2 border-gray-200 px-4 py-3 no-underline transition-colors hover:border-myBlue dark:border-gray-700"
              >
                <span className="text-xl font-bold text-gray-900 dark:text-white">
                  {option.label}
                  {mode === "monthly" ? " / month" : ""}
                </span>
                <span className="mt-2 text-sm text-gray-600 group-hover:text-gray-800 dark:text-gray-300 dark:group-hover:text-gray-100">
                  {option.note}
                </span>
              </ExternalLink>
            ))}
          </div>
        ) : (
          <p className="mt-5 rounded-md border-2 border-dashed border-gray-200 px-4 py-3 text-sm text-gray-600 dark:border-gray-700 dark:text-gray-300">
            Direct Stripe donations are coming online. Until then, the older doors below still work.
          </p>
        )}

        <details className="mt-5 text-sm text-gray-600 dark:text-gray-300">
          <summary className="w-fit cursor-pointer font-semibold hover:text-myBlue">
            Prefer another platform?
          </summary>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            {fallbackLinks.map((link) => (
              <ExternalLink
                key={link.name}
                href={link.url}
                className="rounded-md border border-gray-200 px-3 py-2 no-underline transition-colors hover:border-myBlue dark:border-gray-700"
              >
                <span className="font-semibold text-gray-900 dark:text-white">{link.name}</span>
                <span className="ml-2 text-gray-600 dark:text-gray-300">{link.blurb}</span>
              </ExternalLink>
            ))}
          </div>
        </details>
      </div>
    </section>
  );
}

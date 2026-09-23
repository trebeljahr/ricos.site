import clsx from "clsx";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  type DonationMode,
  defaultDonationMode,
  hasAnyStripeLinks,
  hasMonthlyLinks,
  hasOneTimeLink,
  hasOtherDoors,
  isInQuietPeriod,
  monthlyOptions,
  oneTimeUrl,
  otherDoors,
  quickMonthly,
  SUPPORTED_AT_STORAGE_KEY,
} from "src/lib/donation";
import useLocalStorageState from "use-local-storage-state";
import { ExternalLink } from "./ExternalLink";

type DonationCardProps = {
  className?: string;
};

// localStorage is only readable after hydration; until then every surface
// renders its server markup so the page does not shift.
function useIsMounted() {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);
  return isMounted;
}

export function useDonationSupportedAt() {
  return useLocalStorageState<number | null>(SUPPORTED_AT_STORAGE_KEY, {
    defaultValue: null,
  });
}

// PayPal, Wise, Patreon: the doors that do not run through Stripe. Shown as a
// visible row, not buried, but after the Stripe options.
function OtherDoors() {
  if (!hasOtherDoors) return null;
  return (
    <div className="mt-stack">
      <p className="m-0 text-sm font-semibold text-gray-600 dark:text-gray-300">
        Other ways to give
      </p>
      <div className="mt-label flex flex-col gap-tight sm:flex-row sm:flex-wrap">
        {otherDoors.map((door) => (
          <ExternalLink
            key={door.name}
            href={door.url}
            className="inline-flex min-h-14 flex-1 basis-44 flex-col justify-center rounded-md border-2 border-gray-200 px-4 py-3 no-underline transition-colors hover:border-accent dark:border-gray-700"
          >
            <span className="font-semibold text-gray-900 dark:text-white">{door.name}</span>
            <span className="mt-hair text-sm text-gray-600 dark:text-gray-300">{door.blurb}</span>
          </ExternalLink>
        ))}
      </div>
    </div>
  );
}

/** The full card. Lives on /donate only. */
export function DonationCard({ className }: DonationCardProps) {
  const isMounted = useIsMounted();
  const [mode, setMode] = useState<DonationMode>(defaultDonationMode);
  const showStripe = isMounted && hasAnyStripeLinks;
  // The monthly/once toggle only earns its place when both exist.
  const showToggle = hasMonthlyLinks && hasOneTimeLink;
  const monthlyTiles = monthlyOptions.filter((option) => option.href);

  return (
    <section className={clsx("not-prose w-full", className)} aria-labelledby="donation-card-title">
      <div className="rounded-lg border-4 border-gray-200 bg-white px-5 py-10 dark:border-gray-700 dark:bg-gray-800">
        <h2
          id="donation-card-title"
          className="m-0 text-2xl font-bold text-gray-900 dark:text-white"
        >
          Keep this place alive
        </h2>
        <p className="mt-label mb-0 max-w-prose text-gray-700 dark:text-gray-200">
          This is a small labor of love, made because I like making useful and beautiful things for
          the internet. If it made your day a little better, a donation is one way to say: keep
          going.
        </p>

        {showStripe ? (
          <>
            {showToggle && (
              <div className="mt-para inline-flex rounded-md border-2 border-gray-200 bg-gray-100 p-1 dark:border-gray-700 dark:bg-gray-900">
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
            )}

            {(showToggle ? mode === "monthly" : hasMonthlyLinks) ? (
              <div className="mt-stack grid gap-label sm:grid-cols-2">
                {monthlyTiles.map((option) => (
                  <ExternalLink
                    key={option.label}
                    href={option.href ?? "#"}
                    className="group flex min-h-24 flex-col justify-between rounded-md border-2 border-gray-200 px-4 py-3 no-underline transition-colors hover:border-accent dark:border-gray-700"
                  >
                    <span className="text-xl font-bold text-gray-900 dark:text-white">
                      {option.label} / month
                    </span>
                    <span className="mt-tight text-sm text-gray-600 group-hover:text-gray-800 dark:text-gray-300 dark:group-hover:text-gray-100">
                      {option.note}
                    </span>
                  </ExternalLink>
                ))}
              </div>
            ) : (
              <div className="mt-stack">
                <ExternalLink
                  href={oneTimeUrl ?? "#"}
                  className="group flex min-h-20 flex-col justify-center rounded-md border-2 border-gray-200 px-5 py-4 no-underline transition-colors hover:border-accent dark:border-gray-700"
                >
                  <span className="text-xl font-bold text-gray-900 dark:text-white">
                    Donate any amount
                  </span>
                  <span className="mt-tight text-sm text-gray-600 group-hover:text-gray-800 dark:text-gray-300 dark:group-hover:text-gray-100">
                    You choose on the next page. EUR 10 suggested, EUR 1 minimum.
                  </span>
                </ExternalLink>
              </div>
            )}

            <OtherDoors />
          </>
        ) : (
          <OtherDoors />
        )}
      </div>
    </section>
  );
}

const stripButtonClass =
  "inline-flex items-center rounded-md border-2 border-gray-200 px-4 py-2 font-semibold text-gray-900 no-underline transition-colors hover:border-accent dark:border-gray-700 dark:text-white";

/**
 * One sentence and two doors, for the end of a long post. The reader has
 * finished, so the ask is earned. Goes quiet for a while after a donation
 * (see /donate?thanks=1), and never appears on short pages.
 */
export function DonationStrip({ className }: DonationCardProps) {
  const isMounted = useIsMounted();
  const [supportedAt] = useDonationSupportedAt();

  if (isMounted && isInQuietPeriod(supportedAt)) return null;

  const hasQuickLinks = Boolean(oneTimeUrl || quickMonthly.href);

  return (
    <aside
      aria-label="Support this site"
      className={clsx(
        "not-prose rounded-lg border-2 border-gray-200 px-5 py-6 dark:border-gray-700",
        className,
      )}
    >
      <p className="m-0 font-semibold text-gray-900 dark:text-white">
        Free to read. Not free to make.
      </p>
      <p className="mt-tight mb-0 max-w-prose text-gray-700 dark:text-gray-200">
        If this piece was worth something to you, a small donation keeps the place ad-free and gives
        me room for the next one.
      </p>
      <div className="mt-stack flex flex-wrap items-center gap-tight">
        {isMounted && hasQuickLinks ? (
          <>
            {oneTimeUrl && (
              <ExternalLink href={oneTimeUrl} className={stripButtonClass}>
                Donate once
              </ExternalLink>
            )}
            {quickMonthly.href && (
              <ExternalLink href={quickMonthly.href} className={stripButtonClass}>
                {quickMonthly.label} / month
              </ExternalLink>
            )}
            <Link href="/donate" className="ml-tight text-sm hover:text-accent">
              All options
            </Link>
          </>
        ) : (
          <Link href="/donate" className={stripButtonClass}>
            Support this site
          </Link>
        )}
      </div>
    </aside>
  );
}

/** Replaces the card on /donate after Stripe sends the donor back. */
export function DonationThanks({ className }: DonationCardProps) {
  return (
    <section
      className={clsx("not-prose w-full", className)}
      aria-labelledby="donation-thanks-title"
    >
      <div className="relative overflow-hidden rounded-lg border-4 border-gray-200 bg-white px-5 py-10 dark:border-gray-700 dark:bg-gray-800">
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-green-400 via-teal-400 to-blue-600"
        />
        <h2
          id="donation-thanks-title"
          className="m-0 text-2xl font-bold text-gray-900 dark:text-white"
        >
          Thank you
        </h2>
        <p className="mt-label mb-0 max-w-prose text-gray-700 dark:text-gray-200">
          Your donation went through. It keeps this place ad-free and gives me room for the next
          thing. Stripe sends the receipt by email.
        </p>
        <p className="mt-stack mb-0 max-w-prose text-sm text-gray-600 dark:text-gray-300">
          Monthly donations can be stopped at any time. Write me through the{" "}
          <Link href="/imprint" className="text-accent hover:underline">
            imprint
          </Link>{" "}
          page and I take care of it.
        </p>
      </div>
    </section>
  );
}

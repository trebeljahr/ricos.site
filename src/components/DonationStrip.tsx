import clsx from "clsx";
import Link from "next/link";
import { useEffect, useState } from "react";
import { isInQuietPeriod, SUPPORTED_AT_STORAGE_KEY } from "src/lib/donation";
import useLocalStorageState from "use-local-storage-state";

type Props = { className?: string };

// localStorage is only readable after hydration; until then every surface
// renders its server markup so the page does not shift.
export function useIsMounted() {
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

export const stripButtonClass =
  "donation-option inline-flex items-center rounded-md border-2 border-gray-200 px-4 py-2 font-semibold donation-ink text-gray-900 no-underline transition-colors hover:border-accent dark:border-gray-700 dark:text-white";

/**
 * One sentence and a link to the donation page, for the end of a long post. The reader has
 * finished, so the ask is earned. Goes quiet for a while after a donation
 * (see /donate?thanks=1), and never appears on short pages.
 *
 * Apart from DonationCard because this one does not animate, and every post imports it.
 */
export function DonationStrip({ className }: Props) {
  const isMounted = useIsMounted();
  const [supportedAt] = useDonationSupportedAt();

  if (isMounted && isInQuietPeriod(supportedAt)) return null;

  return (
    <aside
      aria-label="Support this site"
      className={clsx(
        "not-prose rounded-lg border-2 border-gray-200 px-5 py-6 dark:border-gray-700",
        className,
      )}
    >
      <p className="m-0 font-semibold donation-ink text-gray-900 dark:text-white">
        Free to read. Not free to make.
      </p>
      <p className="mt-tight mb-0 max-w-prose donation-muted text-gray-700 dark:text-gray-200">
        If this piece was worth something to you, buy me a coffee. It keeps the place ad-free and
        gives me room for the next one.
      </p>
      <div className="mt-stack flex flex-wrap items-center gap-tight">
        <Link href="/donate" className={stripButtonClass}>
          Buy me a coffee
        </Link>
      </div>
    </aside>
  );
}

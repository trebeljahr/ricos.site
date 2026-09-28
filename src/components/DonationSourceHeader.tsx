import clsx from "clsx";
import Image from "next/image";
import type { CSSProperties } from "react";
import type { DonationBrand, DonationSource } from "src/lib/donation";

// The inline half of .donation-brand (globals.css): the project's colours,
// which the class then binds to the site accent in light and dark mode.
export function donationBrandStyle(brand: DonationBrand) {
  return {
    "--brand-accent": brand.accent,
    "--brand-accent-dark": brand.accentDark,
  } as CSSProperties;
}

type DonationSourceHeaderProps = {
  source: DonationSource;
  className?: string;
};

/**
 * The top of /donate?from=<slug>: the project's screenshot, icon and name, so
 * a donor arriving from it sees the place they just left. The rest of the page
 * takes the project's colour through .donation-brand (globals.css).
 */
export function DonationSourceHeader({ source, className }: DonationSourceHeaderProps) {
  const icon = source.brand?.icon;
  const iconBackground = source.brand?.iconBackground;

  return (
    <section
      aria-label={`From ${source.name}`}
      className={clsx(
        "not-prose relative overflow-hidden rounded-xl border-2 border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800",
        className,
      )}
    >
      {source.cover && (
        // The screenshot fades out under the text, so the name always reads.
        <div aria-hidden className="absolute inset-y-0 right-0 w-full sm:w-3/5">
          <Image
            src={source.cover.src}
            alt=""
            aria-hidden="true"
            fill
            sizes="(max-width: 640px) 100vw, 420px"
            className="object-cover"
          />
          {/* On a phone the text spans the whole screenshot, so it fades evenly. */}
          <div className="absolute inset-0 bg-white/90 sm:bg-transparent sm:bg-linear-to-r sm:from-white sm:via-white/85 sm:to-white/10 dark:bg-gray-800/90 dark:sm:bg-transparent dark:sm:from-gray-800 dark:sm:via-gray-800/85 dark:sm:to-gray-800/10" />
        </div>
      )}

      <div className="relative flex items-center gap-stack p-para sm:py-group">
        {icon && (
          <span
            className={clsx(
              "flex size-14 shrink-0 overflow-hidden rounded-xl shadow-md",
              iconBackground && "p-tight",
            )}
            style={iconBackground ? { background: iconBackground } : undefined}
          >
            <Image src={icon} alt="" aria-hidden="true" width={56} height={56} />
          </span>
        )}
        <div className="min-w-0">
          <p className="m-0 text-xl font-bold text-gray-900 dark:text-white">{source.name}</p>
          {source.subtitle && (
            <p className="mt-hair mb-0 max-w-sm text-sm text-gray-700 dark:text-gray-200">
              {source.subtitle}
            </p>
          )}
          {source.url && (
            <a
              href={source.url}
              className="mt-tight inline-block text-sm font-semibold text-accent no-underline hover:underline"
            >
              ← Back to {source.name}
            </a>
          )}
        </div>
      </div>

      <div aria-hidden className="absolute inset-x-0 bottom-0 h-1 bg-accent" />
    </section>
  );
}

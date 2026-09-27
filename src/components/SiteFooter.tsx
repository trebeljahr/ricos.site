import Link from "next/link";
import { EggCounter } from "./EasterEggs/EggCounter";
import { NightOwl } from "./EasterEggs/NightOwl";

/**
 * Tiny site-wide footer rendered at the bottom of every Layout. Keep this
 * lean — it's on every page and most visitors don't engage with footers.
 * Just enough to surface the things people occasionally hunt for: RSS,
 * donations, legal.
 */
export const SiteFooter = () => {
  return (
    <footer className="relative mt-region border-t border-gray-200 dark:border-gray-800 py-group px-gutter text-sm text-gray-600 dark:text-gray-400">
      <NightOwl />
      <div className="mx-auto max-w-(--breakpoint-lg) flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <span className="flex flex-wrap gap-x-5 gap-y-2">
          <span className="inline-flex items-center gap-1">
            Made with
            <svg viewBox="0 0 24 24" className="size-4 fill-red-500" role="img" aria-label="love">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
            by Rico Trebeljahr
          </span>
          <Link href="/donate" className="hover:text-accent">
            Donation Box
          </Link>
          <EggCounter />
        </span>
        <nav className="flex flex-wrap gap-x-5 gap-y-2">
          <a
            href="/rss.xml"
            className="hover:text-accent"
            target="_blank"
            rel="noopener noreferrer"
          >
            RSS
          </a>
          <Link href="/now" className="hover:text-accent">
            Now
          </Link>
          <Link href="/imprint" className="hover:text-accent">
            Imprint
          </Link>
          <Link href="/privacy" className="hover:text-accent">
            Privacy
          </Link>
        </nav>
      </div>
    </footer>
  );
};

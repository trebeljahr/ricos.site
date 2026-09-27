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
    <footer
      id="site-footer"
      className="site-footer relative mt-region border-t border-gray-200 dark:border-gray-800 py-group px-gutter text-sm text-gray-600 dark:text-gray-400"
    >
      <NightOwl />
      {/* Narrow screens: the byline on top, the links wrapping underneath it.
          From lg the byline takes the middle of three columns, and the two
          equal 1fr columns keep it centred however wide either side is. */}
      <div className="mx-auto max-w-(--breakpoint-lg) flex flex-wrap justify-center gap-x-5 gap-y-2 text-center lg:grid lg:grid-cols-[1fr_auto_1fr] lg:items-center lg:gap-x-12">
        <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 lg:justify-self-end">
          <Link href="/donate" className="hover:text-accent">
            Donation Box
          </Link>
          <EggCounter />
        </div>
        {/* Plain inline text, not flex, so the byline copies as "Made with
            love by …". The heart is aria-hidden and the sr-only "love"
            right after it is what screen readers and the clipboard get.
            Keep it flush against </svg>: a space before it garbles the
            copied spacing. Heart path and color match fractal.garden. */}
        <span className="order-first mb-1 basis-full lg:order-none lg:mb-0">
          Made with{" "}
          <svg
            className="inline-block size-3.5 align-[-0.15em] fill-current text-[#e8839b] animate-heartbeat motion-reduce:animate-none"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
          </svg>
          <span className="sr-only">love</span> by Rico Trebeljahr
        </span>
        <nav className="flex flex-wrap justify-center gap-x-5 gap-y-2 lg:justify-self-start">
          <a
            href="/rss.xml"
            className="hover:text-accent"
            target="_blank"
            rel="noopener noreferrer"
          >
            RSS
          </a>
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

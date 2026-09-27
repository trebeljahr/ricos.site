import { PAGE_COLUMN } from "@components/PostHeader";
import clsx from "clsx";
import Link from "next/link";
import { EggCounter } from "./EasterEggs/EggCounter";
import { Heart, HeartbeatProvider, HeartMonitor } from "./EasterEggs/Heartbeat";
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
      className="site-footer relative mt-region border-t border-gray-200 dark:border-gray-800 py-group text-sm text-gray-600 dark:text-gray-400"
    >
      <HeartbeatProvider>
        <HeartMonitor />
        <NightOwl />
        {/* Narrow screens: the byline on top, the links wrapping underneath it.
            From lg the byline takes the middle of three columns: the two equal
            1fr columns keep it centred however wide either side is, and each
            link group pushes out to its edge of the page column. */}
        <div
          className={clsx(
            PAGE_COLUMN,
            "flex flex-wrap justify-center gap-x-5 gap-y-2 text-center lg:grid lg:grid-cols-[1fr_auto_1fr] lg:items-center lg:gap-x-12",
          )}
        >
          <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 lg:justify-self-start">
            <Link href="/donate" className="hover:text-accent">
              Donation Box
            </Link>
            <EggCounter />
          </div>
          <span className="order-first mb-1 basis-full lg:order-none lg:mb-0">
            Made with <Heart /> by Rico Trebeljahr
          </span>
          <nav className="flex flex-wrap justify-center gap-x-5 gap-y-2 lg:justify-self-end">
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
      </HeartbeatProvider>
    </footer>
  );
};

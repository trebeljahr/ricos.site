import Link from "next/link";

/**
 * Tiny site-wide footer rendered at the bottom of every Layout. Keep this
 * lean — it's on every page and most visitors don't engage with footers.
 * Just enough to surface the things people occasionally hunt for: RSS,
 * support, legal.
 */
export const SiteFooter = () => {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-20 border-t border-gray-200 dark:border-gray-800 py-8 px-3 text-sm text-gray-600 dark:text-gray-400">
      <div className="mx-auto max-w-(--breakpoint-lg) flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <span>© {year} Rico Trebeljahr</span>
        <nav className="flex flex-wrap gap-x-5 gap-y-2">
          <Link href="/support" className="hover:text-myBlue">
            Support
          </Link>
          <a
            href="/rss.xml"
            className="hover:text-myBlue"
            target="_blank"
            rel="noopener noreferrer"
          >
            RSS
          </a>
          <Link href="/now" className="hover:text-myBlue">
            Now
          </Link>
          <Link href="/imprint" className="hover:text-myBlue">
            Imprint
          </Link>
          <Link href="/privacy" className="hover:text-myBlue">
            Privacy
          </Link>
        </nav>
      </div>
    </footer>
  );
};

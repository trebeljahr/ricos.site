import { DidYouMean } from "@components/DidYouMean";
import Layout from "@components/Layout";
import { PageMain } from "@components/PostHeader";
import Link from "next/link";

/** Somewhere to go instead: the start of the site, and the best of it. */
const OTHER_PAGES = [
  "/start-here",
  "/photography/best-of",
  "/needlestack",
  "/posts/diatoms",
  "/posts/the-best-yellow",
  "/r3f",
  "/quotes",
  "/timeline",
  "/now",
  "/principles",
  "/booknotes",
  "/newsletters",
];

/*
 * The picture, cut off its paper, in two layers over the same 4:3 box so they
 * line up as they did in the painting. Both are built by
 * src/scripts/dev/make404Cutout.py from assets/blog/404.jpg, which explains
 * how; the version in the URLs is bumped when they are rebuilt, since they
 * keep their names.
 *
 *   404-pipe.png   the pipe, in the browns it was painted in
 *   404-words.png  the handwriting, as a shape only: it is stamped in the
 *                  page's own ink, because the grey it was written in
 *                  disappears against a dark page
 */
const WORDS = {
  maskImage: "url(/static/404-words.png?v=3)",
  WebkitMaskImage: "url(/static/404-words.png?v=3)",
  maskRepeat: "no-repeat",
  WebkitMaskRepeat: "no-repeat",
  maskPosition: "center",
  WebkitMaskPosition: "center",
  maskSize: "contain",
  WebkitMaskSize: "contain",
} as const;

/** The picture takes its height from the picture, so the box around it is the
    same shape as what is in it and lines up with the words beside it. */
const Picture = ({ className = "", hidden = false }: { className?: string; hidden?: boolean }) => (
  <div
    className={`relative ${className}`}
    // The copy in the flow carries the description; the one on a wide screen
    // is the same picture again, so it says nothing twice.
    {...(hidden
      ? { "aria-hidden": true as const }
      : { role: "img", "aria-label": "this is not a page pipe meme joke" })}
  >
    <img src="/static/404-pipe.png?v=3" alt="" className="block w-full" />
    <div className="absolute inset-0 bg-gray-900/90 dark:bg-gray-100/90" style={WORDS} />
  </div>
);

export default function Custom404() {
  return (
    <Layout
      title="404 Page"
      description="A 404 page, there is nothing here to look at..."
      url="404"
      keywords={["404", "page not found", "error"]}
      image="/assets/blog/404.jpg"
      imageAlt="this is not a page pipe meme joke"
      fillViewport
    >
      <PageMain className="text-center md:flex md:items-center md:gap-region md:text-left">
        <div className="md:w-3/5">
          <Picture className="mx-auto mb-group w-full md:hidden" />
          {/* The title without the site's usual page top: that carries a
              spacer where breadcrumbs would go, and on a page whose title is
              placed by being centred against the picture, the spacer only
              pushes the words half its height below it. */}
          <header className="mb-group">
            <hgroup className="post-header">
              <h1>404 - Page Not Found</h1>
            </hgroup>
          </header>
          <p>Sorry but this page does not exist</p>
          <DidYouMean />
          <p>Try one of these pages instead:</p>
          <ul className="flex list-none flex-wrap justify-center gap-2 p-0 md:justify-start">
            {OTHER_PAGES.map((href) => (
              <li key={href} className="m-0 p-0">
                <Link
                  href={href}
                  className="rounded-full border border-dashed border-gray-500/50 px-2.5 py-1 font-mono text-xs text-gray-800 no-underline hover:border-solid hover:border-accent hover:text-accent sm:text-sm dark:border-gray-400/50 dark:text-gray-100"
                >
                  {href}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Held to a share of the window's height as well as its width: the
            picture is 614x450, so the width that gives it is about 1.36 of
            the height. On a short window an unchecked picture would push the
            footer out of view. */}
        <Picture className="hidden md:block md:w-2/5 md:max-w-[50vh]" hidden />
      </PageMain>
    </Layout>
  );
}

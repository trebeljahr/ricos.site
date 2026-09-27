import { SearchPartyEgg } from "@components/EasterEggs/SearchParty";
import { DidYouMean } from "@components/EasterEggs/SearchParty/DidYouMean";
import Layout from "@components/Layout";
import Header, { PageMain } from "@components/PostHeader";

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
  maskImage: "url(/static/404-words.png?v=2)",
  WebkitMaskImage: "url(/static/404-words.png?v=2)",
  maskRepeat: "no-repeat",
  WebkitMaskRepeat: "no-repeat",
  maskPosition: "center",
  WebkitMaskPosition: "center",
  maskSize: "contain",
  WebkitMaskSize: "contain",
} as const;

const Picture = () => (
  <>
    <img
      src="/static/404-pipe.png?v=2"
      alt=""
      className="absolute inset-0 h-full w-full object-contain"
    />
    <div className="absolute inset-0 bg-gray-900/90 dark:bg-gray-100/90" style={WORDS} />
  </>
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
    >
      {/* The words sit over the haze and the picture stays under it, level
          with them, so the page says what it is while the picture is still
          something to find. The z-index is on the words alone: on the page
          itself it would take the picture up with them. */}
      <PageMain className="relative min-h-[calc(100vh-15rem)] text-center md:flex md:max-w-none md:items-center md:gap-region md:px-[7vw] md:text-left">
        {/* The column is only as solid as what is written in it: its box
            covers half the window, and left to itself it would take the
            pointer away from every link hiding behind it. */}
        <div className="relative z-41 pointer-events-none [&>*]:pointer-events-auto md:w-[46%]">
          <div
            role="img"
            aria-label="this is not a page pipe meme joke"
            className="relative mx-auto mb-group aspect-[4/3] w-full md:hidden"
          >
            <Picture />
          </div>
          <Header title="404 - Page Not Found" />
          <p>Sorry but this page does not exist</p>
          <DidYouMean />
          <p>Try if you can find some other pages instead.</p>
          <SearchPartyEgg />
        </div>

        <div
          data-page-picture
          aria-hidden="true"
          className="relative hidden aspect-[4/3] md:block md:w-[46%]"
        >
          <Picture />
        </div>
      </PageMain>
    </Layout>
  );
}

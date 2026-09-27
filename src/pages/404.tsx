import { SearchPartyEgg } from "@components/EasterEggs/SearchParty";
import Layout from "@components/Layout";
import Header, { PageMain } from "@components/PostHeader";

/*
 * The picture, cut off its paper, in two layers over the same 4:3 box so they
 * line up as they did in the painting. Both come from assets/blog/404.jpg:
 * a pixel's alpha is how far its colour stands from the flat colour of the
 * border, which keeps the pipe's highlights — lighter than the paper, not
 * darker — as solid as its shadows, and the cream it was painted on is taken
 * back out of what is left.
 *
 *   404-pipe.png   the pipe, in the browns it was painted in
 *   404-words.png  the handwriting, as a shape only: it is stamped in the
 *                  page's own ink, because the grey it was written in
 *                  disappears against a dark page
 */
const WORDS = {
  maskImage: "url(/static/404-words.png)",
  WebkitMaskImage: "url(/static/404-words.png)",
  maskRepeat: "no-repeat",
  WebkitMaskRepeat: "no-repeat",
  maskPosition: "center",
  WebkitMaskPosition: "center",
  maskSize: "contain",
  WebkitMaskSize: "contain",
} as const;

const PICTURE = "relative aspect-[4/3] w-full";
const INK = "absolute inset-0 bg-gray-900/90 dark:bg-gray-100/90";

const Picture = () => (
  <>
    <img
      src="/static/404-pipe.png"
      alt=""
      className="absolute inset-0 h-full w-full object-contain"
    />
    <div className={INK} style={WORDS} />
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
      {/* The picture hangs in the half of the window the words leave free. On
          a phone it goes in the flow instead, above a title that lines up
          with it, where it cannot land on anything. */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 select-none">
        <div className="absolute inset-y-0 right-0 hidden w-[46%] items-center justify-center md:flex">
          <div data-page-picture className={`${PICTURE} w-[86%] max-w-[30rem]`}>
            <Picture />
          </div>
        </div>
      </div>

      {/* Tall enough that the footer sits at the bottom of the window rather
          than halfway up it: the page itself is only a few lines long. */}
      <PageMain className="min-h-[calc(100vh-15rem)] text-center md:mr-auto md:ml-[7vw] md:max-w-[42%] md:text-left lg:ml-[9vw]">
        <div
          role="img"
          aria-label="this is not a page pipe meme joke"
          className={`${PICTURE} mx-auto mb-group md:hidden`}
        >
          <Picture />
        </div>
        {/* All of it is behind the glass until the looking glass passes over. */}
        <Header title="404 - Page Not Found" />
        <p>Sorry but this page does not exist</p>
        <p>Try if you can find some other pages instead.</p>
        <SearchPartyEgg />
      </PageMain>
    </Layout>
  );
}

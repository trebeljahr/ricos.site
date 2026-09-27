import { SearchPartyEgg } from "@components/EasterEggs/SearchParty";
import Layout from "@components/Layout";
import Header, { PageMain } from "@components/PostHeader";

/**
 * The picture, cut out of its paper. public/static/404-stamp.png is
 * assets/blog/404.jpg with the cream taken out of it: every pixel's alpha is
 * how much darker than the border colour it was, so what is left is the pipe,
 * its shading and the handwriting. Stamped through that cutout, the page's
 * own ink stands in for the paint, which is how the picture belongs to both
 * themes rather than only the one it was painted for.
 */
const stamp = {
  maskImage: "url(/static/404-stamp.png)",
  WebkitMaskImage: "url(/static/404-stamp.png)",
  maskRepeat: "no-repeat",
  WebkitMaskRepeat: "no-repeat",
  maskPosition: "center",
  WebkitMaskPosition: "center",
  maskSize: "contain",
  WebkitMaskSize: "contain",
} as const;

const INK = "bg-gray-900/90 dark:bg-gray-100/90";

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
      {/* The stamp hangs in the half of the window the words leave free. On a
          phone it goes in the flow instead, above a title that lines up with
          it, where it cannot land on anything. */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 select-none">
        <div className="absolute inset-y-0 right-0 hidden w-[46%] items-center justify-center md:flex">
          <div
            data-page-picture
            className={`aspect-[4/3] w-[86%] max-w-[30rem] ${INK}`}
            style={stamp}
          />
        </div>
      </div>

      {/* Tall enough that the footer sits at the bottom of the window rather
          than halfway up it: the page itself is only a few lines long. */}
      <PageMain className="min-h-[calc(100vh-15rem)] text-center md:mr-auto md:ml-[7vw] md:max-w-[42%] md:text-left lg:ml-[9vw]">
        <div
          role="img"
          aria-label="this is not a page pipe meme joke"
          className={`mx-auto mb-group aspect-[4/3] w-full md:hidden ${INK}`}
          style={stamp}
        />
        {/* All of it is behind the glass until the looking glass passes over. */}
        <Header title="404 - Page Not Found" />
        <p>Sorry but this page does not exist</p>
        <p>Try if you can find some other pages instead.</p>
        <SearchPartyEgg />
      </PageMain>
    </Layout>
  );
}

import { SearchPartyEgg } from "@components/EasterEggs/SearchParty";
import { ImageWithLoader } from "@components/ImageWithLoader";
import Layout from "@components/Layout";
import Header, { PageMain } from "@components/PostHeader";
import type { CSSProperties } from "react";

/** The flat border colour of the picture, which all four of its corners share.
    The page is painted in it, so the picture has no edges to speak of. */
const PAPER = "#f3e4bb";
/** What is written on that paper, in either theme. Also in SearchPartyEgg. */
const INK = "#2f2a20";

const paper = {
  "--tw-prose-body": INK,
  "--tw-prose-headings": INK,
  "--tw-prose-links": INK,
  "--tw-prose-invert-body": INK,
  "--tw-prose-invert-headings": INK,
  "--tw-prose-invert-links": INK,
  color: INK,
} as CSSProperties;

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
      {/* Paper the colour of the picture's own border, over the whole window,
          so the two are one surface. The picture hangs in the half of it the
          words leave free — on a wide screen only; a phone gets it in the
          flow, where it cannot land on top of anything. */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10 select-none"
        style={{ backgroundColor: PAPER }}
      >
        <div className="absolute inset-y-0 right-0 hidden w-[46%] items-center justify-center md:flex">
          <div className="relative aspect-[4/3] w-[88%] max-w-[32rem]">
            <ImageWithLoader src="/assets/blog/404.jpg" alt="" fill priority sizes="46vw" />
          </div>
        </div>
      </div>

      <PageMain className="md:mr-auto md:ml-0 md:max-w-[50%]">
        <div style={paper}>
          <div className="relative mb-group aspect-[4/3] w-full md:hidden">
            <ImageWithLoader
              src="/assets/blog/404.jpg"
              alt="this is not a page pipe meme joke"
              fill
              priority
              sizes="100vw"
            />
          </div>
          {/* All of it is behind the glass until the looking glass passes over. */}
          <Header title="404 - Page Not Found" />
          <p>Sorry but this page does not exist</p>
          <p>Try if you can find some other pages instead.</p>
          <SearchPartyEgg />
        </div>
      </PageMain>
    </Layout>
  );
}

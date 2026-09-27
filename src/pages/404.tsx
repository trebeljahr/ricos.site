import { SearchPartyEgg } from "@components/EasterEggs/SearchParty";
import { ImageWithLoader } from "@components/ImageWithLoader";
import Layout from "@components/Layout";
import Header, { PageMain } from "@components/PostHeader";

/*
 * The colours of this page, written out wherever they are used, because
 * Tailwind reads class names out of the source exactly as they are typed and
 * cannot follow a constant:
 *
 *   #f3e4bb  paper, which is the flat colour of all four corners of the
 *            picture, so the two are one surface with no edge between them
 *   #281a00  the same corner once the picture is turned into its own negative
 *            for dark mode
 *   #2f2a20  ink on the light paper, and #f0e6d2 on the dark. SearchPartyEgg
 *            writes the links in the same two.
 */
const INK_VARS =
  // Headings read the variable at the heading itself, so they need the pair.
  "[--tw-prose-headings:#2f2a20] [--tw-prose-links:#2f2a20] " +
  "dark:[--tw-prose-headings:#f0e6d2] dark:[--tw-prose-links:#f0e6d2] " +
  // Paragraphs inherit their colour from the body, which was settled long
  // before this element, so they need a colour of their own to inherit.
  "text-[#2f2a20] dark:text-[#f0e6d2]";

/** The picture in reverse. Inverting alone turns the warm paper blue, so the
    hue goes back round the wheel after it: dark brown paper, a pale pipe. */
const NEGATIVE = "dark:invert dark:hue-rotate-180";

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
          flow, above a title that lines up with it. */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10 select-none bg-[#f3e4bb] dark:bg-[#281a00]"
      >
        <div className="absolute inset-y-0 right-0 hidden w-[46%] items-center justify-center md:flex">
          <div
            data-page-picture
            className={`relative aspect-[4/3] w-[86%] max-w-[30rem] ${NEGATIVE}`}
          >
            <ImageWithLoader src="/assets/blog/404.jpg" alt="" fill priority sizes="46vw" />
          </div>
        </div>
      </div>

      {/* Tall enough that the footer sits at the bottom of the window rather
          than halfway up it: the page itself is only a few lines long. */}
      <PageMain className="min-h-[calc(100vh-15rem)] text-center md:mr-auto md:ml-[7vw] md:max-w-[42%] md:text-left lg:ml-[9vw]">
        <div className={INK_VARS}>
          <div className={`relative mx-auto mb-group aspect-[4/3] w-full md:hidden ${NEGATIVE}`}>
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

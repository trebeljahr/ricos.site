import { ExternalLink } from "@components/ExternalLink";
import { FancyLink } from "@components/FancyUI";
import { HomePageSection } from "@components/HomePageSection";
import { ImageWithLoader } from "@components/ImageWithLoader";
import { WebSiteJsonLd } from "@components/JsonLd";
import Layout from "@components/Layout";
import { NewsletterForm } from "@components/NewsletterForm";
import { WavingHand } from "@components/WavingHand";
import type { SectionDescription } from "@velite";
import Link from "next/link";
import type { CommonMetadata, ImageProps } from "src/@types";
import { type SeoInfo, getSeoInfo } from "src/lib/getSeoInfo";
import { turnKebabIntoTitleCase } from "src/lib/utils/turnKebapIntoTitleCase";

import { extractAndSortMetadata } from "src/lib/utils/extractAndSortMetadata";

// Hand-curated picks for the homepage — keep small so the page stays fast.
const FEATURED_PHOTOGRAPHY_TRIPS = [
  "best-of",
  "alps",
  "italy",
  "vietnam",
  "sri-lanka",
  "india-2023",
];

const FEATURED_R3F_DEMOS: { name: string; href: string }[] = [
  { name: "shader-art-demo", href: "/r3f/scenes/shader-art-demo" },
  { name: "underwater-shader", href: "/r3f/scenes/underwater-shader" },
  { name: "ocean", href: "/r3f/scenes/ocean" },
  { name: "terrain", href: "/r3f/scenes/terrain" },
  { name: "grass-experiments", href: "/r3f/scenes/grass-experiments" },
  { name: "fbo-demo", href: "/r3f/particles/fbo-demo" },
];

const IndexPage = ({ seo, ...props }: Props) => {
  return (
    <Layout
      title={seo?.metaTitle || "Home"}
      description={
        seo?.metaDescription ||
        "A collection of blog posts, booknotes, photography, travel stories and creative coding experiments by Rico Trebeljahr."
      }
      image={
        seo?.ogImage ||
        "/assets/midjourney/young-man-looking-absolutely-relaxed-while-reading-a-book-in-the-milkyway.jpg"
      }
      imageAlt={seo?.ogImageAlt || "a person reading a book, while floating in space"}
      keywords={
        seo?.keywords || ["programming", "traveling", "photography", "writing", "Rico Trebeljahr"]
      }
      url="/"
      fullScreen={true}
    >
      <WebSiteJsonLd />
      <main className="mt-32">
        <section className="px-3 pb-20">
          <div className="mx-auto max-w-(--breakpoint-lg)">
            <div className="max-w-prose">
              <h1 className="text-4xl">
                Hi there <WavingHand />
              </h1>
              <span>
                I am Rico Trebeljahr. A programmer, traveler, photographer, writer and fellow human.
                This is my personal website. It&apos;s where I write, publish my newsletter, collect
                booknotes, quotes, traveling stories, and photography.
              </span>
              <p>
                New here? <Link href="/start-here">Start here</Link> for a guided tour of the best
                stuff on this site.
              </p>
              <p>
                Wanna know what I like on the internet? I have a{" "}
                <Link as={`/needlestack`} href="/needlestack">
                  /needlestack
                </Link>{" "}
                page.
              </p>
              <p>
                Wanna know what makes me tick? I have a{" "}
                <Link as={`/principles`} href="/principles">
                  /principles
                </Link>{" "}
                page.
              </p>

              <p>
                Wanna know what I am up to? I have a{" "}
                <Link as={`/now`} href="/now">
                  /now
                </Link>{" "}
                page.
              </p>
            </div>
          </div>
        </section>

        <section className="dark:bg-gray-950 bg-slate-100 pt-1 pb-20 px-3">
          <HomePageSection
            cardGalleryProps={{
              content: props.postsSelection,
              withSubtitle: true,
            }}
            title="Writing 📝"
            description={props.texts.writing}
            linkElem={<FancyLink href="/posts" text="Browse All Posts" />}
          />
        </section>

        <section className="pt-1 pb-20 px-3">
          <HomePageSection
            cardGalleryProps={{
              content: props.travelBlogsSelection,
            }}
            title="Traveling Stories 🌍"
            description={props.texts.traveling}
            carousel={true}
            linkElem={<FancyLink href="/travel" text="Explore More Travel Stories" />}
          />
        </section>

        <section className="dark:bg-gray-950 bg-slate-100 pt-1 pb-20 px-3">
          <HomePageSection
            cardGalleryProps={{
              content: props.newsletterSelection,
            }}
            title="Live and Learn Newsletter 💌"
            description={props.texts.newsletter}
            linkElem={<NewsletterForm />}
          />
        </section>

        <section className="pt-1 pb-20 px-3">
          <HomePageSection
            cardGalleryProps={{
              content: props.booknotesSelection,
            }}
            title="Booknotes 📚"
            description={props.texts.booknotes}
            carousel={true}
            linkElem={<FancyLink href="/booknotes" text="Search All Booknotes" />}
          />
        </section>

        <section className="pt-1 pb-20 px-3">
          <div className="mx-auto max-w-(--breakpoint-lg)">
            <h2 className="text-5xl">Photography 📸</h2>
            <p className="mb-14 max-w-prose">
              Trips through Asia, Europe, the Caribbean and South America, told in pictures. Six
              of my favourite collections below — see <Link href="/photography">all trips</Link>{" "}
              for the rest.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-12">
              {props.featuredTrips.map(({ tripName, image }) => (
                <Link
                  key={tripName}
                  href={`/photography/${tripName}`}
                  className="relative aspect-square overflow-hidden no-underline"
                >
                  <ImageWithLoader
                    src={image.src}
                    alt={image.alt || `Photo from ${tripName}`}
                    width={image.width}
                    height={image.height}
                    sizes="(max-width: 768px) 50vw, 33vw"
                    style={{ filter: "brightness(60%)" }}
                    className="absolute inset-0 z-0 object-cover w-full h-full hover:scale-105 transform transition-transform duration-300 ease-in-out"
                  />
                  <div className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center">
                    <h3 className="text-lg md:text-xl font-bold text-white">
                      {turnKebabIntoTitleCase(tripName)}
                    </h3>
                  </div>
                </Link>
              ))}
            </div>
            <FancyLink href="/photography" text="Browse All Trips" />
          </div>
        </section>

        <section className="dark:bg-gray-950 bg-slate-100 pt-1 pb-20 px-3">
          <div className="mx-auto max-w-(--breakpoint-lg)">
            <h2 className="text-5xl">Creative Coding 🎨</h2>
            <p className="mb-14 max-w-prose">
              Three.js / R3F experiments — shaders, oceans, generative terrain, particle systems.
              These are the standouts; the full playground has dozens more.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-12">
              {FEATURED_R3F_DEMOS.map(({ name, href }) => (
                <Link
                  key={name}
                  href={href}
                  className="group block no-underline rounded-lg overflow-hidden border-2 border-gray-200 dark:border-gray-700 hover:border-myBlue transition-colors"
                >
                  <div className="relative aspect-video overflow-hidden bg-gray-900">
                    <ImageWithLoader
                      src={`/assets/pages/${name}.png`}
                      alt={`Preview of the ${turnKebabIntoTitleCase(name)} R3F demo`}
                      width={400}
                      height={225}
                      sizes="(max-width: 768px) 50vw, 33vw"
                      className="absolute inset-0 object-cover w-full h-full group-hover:scale-105 transform transition-transform duration-300"
                    />
                  </div>
                  <div className="p-3">
                    <h3 className="text-base font-semibold m-0">
                      {turnKebabIntoTitleCase(name)}
                    </h3>
                  </div>
                </Link>
              ))}
            </div>
            <FancyLink href="/r3f" text="Open the Playground" />
          </div>
        </section>

        <section className="pt-1 pb-20 px-3">
          <div className="mx-auto max-w-(--breakpoint-lg)">
            <div className="max-w-prose">
              <h2>Webpages</h2>
              <p>
                You can also find me on other places around the internet, like{" "}
                <ExternalLink href="https://www.instagram.com/ricotrebeljahr/">
                  Instagram
                </ExternalLink>
                , <ExternalLink href="https://github.com/trebeljahr">Github</ExternalLink>,{" "}
                <ExternalLink href="https://www.linkedin.com/in/trebeljahr">LinkedIn</ExternalLink>,{" "}
                <ExternalLink href="https://twitter.com/ricotrebeljahr">Twitter</ExternalLink>, or
                at my <ExternalLink href="https://portfolio.trebeljahr.com">Portfolio</ExternalLink>
                .
              </p>
            </div>
          </div>
        </section>
      </main>
    </Layout>
  );
};

export default IndexPage;

type Props = {
  travelBlogsSelection: CommonMetadata[];
  postsSelection: CommonMetadata[];
  newsletterSelection: CommonMetadata[];
  booknotesSelection: CommonMetadata[];
  featuredTrips: { tripName: string; image: ImageProps }[];
  texts: {
    booknotes?: SectionDescription["content"];
    traveling?: SectionDescription["content"];
    writing?: SectionDescription["content"];
    newsletter?: SectionDescription["content"];
  };
  seo: SeoInfo | null;
};

export const getStaticProps = async (): Promise<{ props: Props }> => {
  const { loadVeliteData } = await import("src/lib/loadVeliteData");
  const { trips } = await import("src/pages/photography");
  const { getImgWidthAndHeightDuringBuild } = await import(
    "src/lib/getImgWidthAndHeightDuringBuild"
  );
  const { getFirstImageFromMetadata, photographyFolder } = await import(
    "src/lib/imageMetadata"
  );

  const travelblogs = loadVeliteData("travelblogs.json");
  const posts = loadVeliteData("posts.json");
  const newsletters = loadVeliteData("newsletters.json");
  const booknotes = loadVeliteData("booknotes.json");
  const sectionDescriptions = loadVeliteData("sectionDescriptions.json");

  const travelBlogsSelection = extractAndSortMetadata(travelblogs).slice(0, 15);

  const postsSelection = extractAndSortMetadata(posts).slice(0, 6);

  const newsletterSelection = extractAndSortMetadata(newsletters).slice(0, 6);

  const booknotesSelection = extractAndSortMetadata(booknotes)
    .filter(({ summary }: any) => summary)
    .slice(0, 30);

  const featuredTrips = await Promise.all(
    FEATURED_PHOTOGRAPHY_TRIPS.map(async (name) => {
      const trip = trips.find((t) => t.name === name);
      if (trip && trip.src) {
        const { width, height } = await getImgWidthAndHeightDuringBuild(trip.src);
        return {
          tripName: name,
          image: { width, height, src: trip.src, alt: trip.alt } as ImageProps,
        };
      }
      const image = getFirstImageFromMetadata(photographyFolder + name) as ImageProps;
      return { tripName: name, image };
    }),
  );

  return {
    props: {
      seo: getSeoInfo("/"),
      travelBlogsSelection,
      postsSelection,
      newsletterSelection,
      booknotesSelection,
      featuredTrips,
      texts: {
        booknotes: sectionDescriptions.find(
          ({ title }: SectionDescription) => title === "Booknotes",
        )?.content,
        traveling: sectionDescriptions.find(
          ({ title }: SectionDescription) => title === "Traveling Stories",
        )?.content,
        writing: sectionDescriptions.find(({ title }: SectionDescription) => title === "Writing")
          ?.content,
        newsletter: sectionDescriptions.find(
          ({ title }: SectionDescription) => title === "Newsletter",
        )?.content,
      },
    },
  };
};

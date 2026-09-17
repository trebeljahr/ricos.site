import { Card } from "@components/Card";
import { BooknotesEgg } from "@components/EasterEggs/Booknotes";
import { CreativeCodingEgg } from "@components/EasterEggs/CreativeCoding";
import { NewsletterEgg } from "@components/EasterEggs/Newsletter";
import { PhotographyEgg } from "@components/EasterEggs/Photography";
import { ProjectsEgg } from "@components/EasterEggs/Projects";
import { TravelingEgg } from "@components/EasterEggs/Traveling";
import { WebpagesEgg } from "@components/EasterEggs/Webpages";
import { WritingEgg } from "@components/EasterEggs/Writing";
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
import { getSeoInfo, type SeoInfo } from "src/lib/getSeoInfo";
import { FEATURED_PROJECTS } from "src/lib/projects";
import { extractAndSortMetadata } from "src/lib/utils/extractAndSortMetadata";
import { turnKebabIntoTitleCase } from "src/lib/utils/turnKebapIntoTitleCase";

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
  { name: "plasma-ball", href: "/r3f/scenes/plasma-ball" },
  { name: "ocean", href: "/r3f/scenes/ocean" },
  { name: "snow-forest", href: "/r3f/scenes/snow-forest" },
  { name: "mesh-merger", href: "/r3f/particles/mesh-merger" },
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
      <main className="mt-16">
        <section className="px-3 pb-20">
          <div className="mx-auto max-w-(--breakpoint-lg)">
            <div className="max-w-prose">
              <h1 className="text-3xl md:text-4xl">
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

        <section className="dark:bg-nightBlue bg-slate-100 pt-1 pb-20 px-3">
          <HomePageSection
            cardGalleryProps={{
              content: props.postsSelection,
              withSubtitle: true,
            }}
            title={<WritingEgg />}
            description={props.texts.writing}
            linkElem={<FancyLink href="/posts" text="Browse All Posts" />}
          />
        </section>

        <section className="pt-1 pb-20 px-3">
          <HomePageSection
            cardGalleryProps={{
              content: props.travelBlogsSelection,
            }}
            title={<TravelingEgg />}
            description={props.texts.traveling}
            carousel={true}
            linkElem={<FancyLink href="/travel" text="Explore More Travel Stories" />}
          />
        </section>

        <section className="dark:bg-nightBlue bg-slate-100 pt-1 pb-20 px-3">
          <HomePageSection
            cardGalleryProps={{
              content: props.newsletterSelection,
            }}
            title={<NewsletterEgg />}
            description={props.texts.newsletter}
            linkElem={<NewsletterForm />}
          />
        </section>

        <section className="pt-1 pb-20 px-3">
          <HomePageSection
            cardGalleryProps={{
              content: props.booknotesSelection,
            }}
            title={<BooknotesEgg />}
            description={props.texts.booknotes}
            carousel={true}
            linkElem={<FancyLink href="/booknotes" text="Search All Booknotes" />}
          />
        </section>

        <section className="pt-1 pb-20 px-3">
          <div className="mx-auto max-w-(--breakpoint-lg)">
            <h2 className="text-3xl md:text-5xl">
              <PhotographyEgg photos={props.featuredTrips} />
            </h2>
            <p className="mb-14 max-w-prose">
              Trips through Asia, Europe, the Caribbean and South America, told in pictures. Six of
              my favourite collections below. See <Link href="/photography">all trips</Link> for the
              rest.
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
                    sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 336px"
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

        <section className="dark:bg-nightBlue bg-slate-100 pt-1 pb-20 px-3">
          <div className="mx-auto max-w-(--breakpoint-lg)">
            <h2 className="text-3xl md:text-5xl">
              <CreativeCodingEgg />
            </h2>
            <p className="mb-14 max-w-prose">
              Three.js and R3F experiments. Shaders, oceans, generative terrain, particle systems.
              These are the standouts; the full playground has dozens more.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 mb-12">
              {FEATURED_R3F_DEMOS.map(({ name, href }) => (
                <Card
                  key={name}
                  link={href}
                  title={turnKebabIntoTitleCase(name)}
                  headingAs="h3"
                  size="compact"
                  coverAspect="video"
                  cover={{
                    src: `/assets/pages/${name}.png`,
                    alt: `Preview of the ${turnKebabIntoTitleCase(name)} R3F demo`,
                    width: 400,
                    height: 225,
                  }}
                  sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 336px"
                />
              ))}
            </div>
            <FancyLink href="/r3f" text="Open the Playground" />
          </div>
        </section>

        <section className="pt-1 pb-20 px-3">
          <HomePageSection
            cardGalleryProps={{
              content: FEATURED_PROJECTS,
              withSubtitle: true,
              coverAspect: "video",
            }}
            title={<ProjectsEgg />}
            linkElem={<FancyLink href="/projects" text="See All Projects" />}
          >
            <p>
              Some of the things I have built. Games, tools, and a few things that are just nice to
              look at.{" "}
              <ExternalLink href="https://ricoslabs.com" rel="noopener">
                Ricos Labs
              </ExternalLink>{" "}
              is where I make games, and the umbrella for the rest of my software work.
            </p>
          </HomePageSection>
        </section>

        <section className="dark:bg-nightBlue bg-slate-100 pt-1 pb-20 px-3">
          <div className="mx-auto max-w-(--breakpoint-lg)">
            <div className="max-w-prose">
              <h2 className="text-3xl md:text-5xl">
                <WebpagesEgg />
              </h2>
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
  const { getFirstImageFromMetadata, photographyFolder } = await import("src/lib/imageMetadata");

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
      if (trip?.src) {
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

import { ExternalLink } from "@components/ExternalLink";
import { FancyLink } from "@components/FancyUI";
import { HomePageSection } from "@components/HomePageSection";
import { WebSiteJsonLd } from "@components/JsonLd";
import Layout from "@components/Layout";
import { NewsletterForm } from "@components/NewsletterForm";
import { WavingHand } from "@components/WavingHand";
import type { SectionDescription } from "@velite";
import Link from "next/link";
import { type CommonMetadata } from "src/@types";
import { getSeoInfo, SeoInfo } from "src/lib/getSeoInfo";

import { extractAndSortMetadata } from "src/lib/utils/extractAndSortMetadata";

const IndexPage = ({ seo, ...props }: Props) => {
  return (
    <Layout
      title={seo?.metaTitle || "Home"}
      description={seo?.metaDescription || "A collection of blog posts, booknotes, photography, travel stories and creative coding experiments by Rico Trebeljahr."}
      image={seo?.ogImage || "/assets/midjourney/young-man-looking-absolutely-relaxed-while-reading-a-book-in-the-milkyway.jpg"}
      imageAlt={seo?.ogImageAlt || "a person reading a book, while floating in space"}
      keywords={seo?.keywords || ["programming", "traveling", "photography", "writing", "Rico Trebeljahr"]}
      url="/"
      fullScreen={true}
    >
      <WebSiteJsonLd />
      <main className="mt-32">
        <section className="px-3 pb-20">
          <div className="mx-auto max-w-(--breakpoint-lg)">
            <div className="max-w-prose">
              <h2 className="text-4xl">
                Hi there <WavingHand />
              </h2>
              <span>
                I am Rico Trebeljahr. A programmer, traveler, photographer,
                writer and fellow human. This is my personal website. It&apos;s
                where I write, publish my newsletter, collect booknotes, quotes,
                traveling stories, and photography.
              </span>
              <p>
                New here?{" "}
                <Link href="/start-here">
                  Start here
                </Link>{" "}
                for a guided tour of the best stuff on this site.
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
            linkElem={
              <FancyLink href="/travel" text="Explore More Travel Stories" />
            }
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
            linkElem={
              <FancyLink href="/booknotes" text="Search All Booknotes" />
            }
          />
        </section>

        <section className="dark:bg-gray-950 bg-slate-100 pt-1 pb-20 px-3">
          <div className="mx-auto max-w-(--breakpoint-lg)">
            <div className="max-w-prose">
              <h2>Webpages</h2>
              <p>
                You can also find me on other places around the internet, like{" "}
                <ExternalLink href="https://www.instagram.com/ricotrebeljahr/">
                  Instagram
                </ExternalLink>
                ,{" "}
                <ExternalLink href="https://github.com/trebeljahr">
                  Github
                </ExternalLink>
                ,{" "}
                <ExternalLink href="https://www.linkedin.com/in/trebeljahr">
                  LinkedIn
                </ExternalLink>
                ,{" "}
                <ExternalLink href="https://twitter.com/ricotrebeljahr">
                  Twitter
                </ExternalLink>
                , or at my{" "}
                <ExternalLink href="https://portfolio.trebeljahr.com">
                  Portfolio
                </ExternalLink>
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

  return {
    props: {
      seo: getSeoInfo("/"),
      travelBlogsSelection,
      postsSelection,
      newsletterSelection,
      booknotesSelection,
      texts: {
        booknotes: sectionDescriptions.find(
          ({ title }: SectionDescription) => title === "Booknotes"
        )?.content,
        traveling: sectionDescriptions.find(
          ({ title }: SectionDescription) => title === "Traveling Stories"
        )?.content,
        writing: sectionDescriptions.find(({ title }: SectionDescription) => title === "Writing")
          ?.content,
        newsletter: sectionDescriptions.find(
          ({ title }: SectionDescription) => title === "Newsletter"
        )?.content,
      },
    },
  };
};

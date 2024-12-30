import { ExternalLink } from "@components/ExternalLink";
import { FancyLink } from "@components/FancyUI";
import { HomePageSection } from "@components/HomePageSection";
import Layout from "@components/Layout";
import { NewsletterForm } from "@components/NewsletterSignup";
import { WavingHand } from "@components/WavingHand";
import { booknotes, newsletters, posts, travelblogs } from "@velite";
import Link from "next/link";
import {
  byDate,
  byOnlyPublished,
  type CommonMetadata,
  toOnlyMetadata,
} from "src/lib/utils";

const booknotesText = `
I read a lot and usually take notes because this is one of the best ways to learn information and remember it. My goal is to read 1000 books in my lifetime, then pick the best 50 and read them over and over again. Reading has taught me so so much already and I am sharing my notes here because I hope you can learn from them too. They can help you choose which books *you* might want to read, too.
`;

const travelingText = `
Traveling for me is about storytelling and learning how different places *feel*. For me photography is an integral part of that and I love to capture the moments I experience and *combine* them with words so that I can inspire others to travel too. 

My unwritten rule is to have an adventure a year: going around in a Tuk Tuk in India, crossing the Atlantic by sailboat, hiking across the whole Alps, or cycling across South America, I've done those!
`;

const writingText = `
Writing, to me, is a way to think more clearly about something. In the process I gain a better understanding and aim to share this understanding with you. This is *why* this blog exists. I write about a wide wide list of things, among them philosophy, programming, AI and productivity–all topics that deeply interest me.

In my writing, I strive for deep instead of shallow.
`;

const newsletterText = `
Live and Learn is a newsletter about all the crazy things that happen in the world of AI and technology. I send it out every two weeks on a Sunday, distilling down hundreds of links and articles into a few that I think are worth sharing, and providing short summaries on why these developments matter. 

Reading it should save you a couple of hours of research every two weeks.`;

const IndexPage = (props: Props) => {
  const description = `trebeljahr - a website about the things Rico Trebeljahr does, reads and thinks about. The topics can vary widely, 
from programming, bio-chemistry, the brain, investing, physics, philosophy to photography, traveling and back...`;

  return (
    <Layout
      title="home - Hi there 👋🏻 I am Rico. A programmer, traveler, photographer..."
      description={description}
      image="/assets/midjourney/young-man-looking-absolutely-relaxed-while-reading-a-book-in-the-milkyway.jpg"
      imageAlt={"a person reading a book, while floating in space"}
      keywords={[
        "programming",
        "traveling",
        "photography",
        "writing",
        "newsletter",
        "booknotes",
        "travel stories",
        "life",
        "live and learn",
        "quotes",
        "trebeljahr",
        "trebeljahr.com",
        "ricotrebeljahr.com",
        "ricotrebeljahr.de",
        "ricos.site",
        "Rico Trebeljahr",
        "philosophy",
      ]}
      url="/"
      fullScreen={true}
    >
      <main>
        <section className="mx-auto max-w-4xl px-3 md:px-0 pb-20">
          <div className="max-w-3xl">
            <h2 className="text-4xl">
              Hi there <WavingHand />
            </h2>
            <span>
              I am Rico. A programmer, traveler, photographer, writer and fellow
              human. This is my personal website. It&apos;s where I write,
              publish my newsletter, collect booknotes, quotes, traveling
              stories, and photography.
            </span>
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
        </section>

        <section className="dark:bg-slate-900 bg-slate-100 pt-1 pb-20 px-3">
          <HomePageSection
            cardGalleryProps={{
              content: props.postsSelection,
            }}
            title="Writing 📝"
            description={writingText}
            linkElem={<FancyLink href="/posts" text="Browse All Posts" />}
          />
        </section>

        <section className="pt-1 pb-20 px-3">
          <HomePageSection
            cardGalleryProps={{
              content: props.travelBlogsSelection,
            }}
            title="Traveling Stories 🌍"
            description={travelingText}
            carousel={true}
            linkElem={
              <FancyLink href="/travel" text="Explore More Travel Stories" />
            }
          />
        </section>

        <section className="dark:bg-slate-900 bg-slate-100 pt-1 pb-20 px-3">
          <HomePageSection
            cardGalleryProps={{
              content: props.newsletterSelection,
            }}
            title="Live and Learn Newsletter 💌"
            description={newsletterText}
            linkElem={<NewsletterForm />}
          />
        </section>

        <section className="pt-1 pb-20 px-3">
          <HomePageSection
            cardGalleryProps={{
              content: props.booknotesSelection,
            }}
            title="Booknotes 📚"
            description={booknotesText}
            carousel={true}
            linkElem={
              <FancyLink href="/booknotes" text="Search All Booknotes" />
            }
          />
        </section>

        <section className="dark:bg-slate-900 bg-slate-100 pt-1 pb-20 px-3">
          <div className="mx-auto max-w-4xl">
            <div className="max-w-2xl">
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
                <Link href="https://portfolio.trebeljahr.com">Portfolio</Link>.
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
};

export const getStaticProps = async (): Promise<{ props: Props }> => {
  const travelBlogsSelection = travelblogs
    .filter(byOnlyPublished)
    .sort(byDate)
    .map(toOnlyMetadata)
    .slice(0, 15);

  const postsSelection = posts
    .filter(byOnlyPublished)
    .sort(byDate)
    .map(toOnlyMetadata)
    .slice(0, 6);

  const newsletterSelection = newsletters
    .filter(byOnlyPublished)
    .sort(byDate)
    .map(toOnlyMetadata)
    .slice(0, 6);

  const booknotesSelection = booknotes
    .filter(byOnlyPublished)
    .filter(({ summary }) => summary)
    .sort(byDate)
    .map(toOnlyMetadata)
    .slice(0, 30);

  return {
    props: {
      travelBlogsSelection,
      postsSelection,
      newsletterSelection,
      booknotesSelection,
    },
  };
};

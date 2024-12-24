import { ExternalLink } from "@components/ExternalLink";
import { FancyLink } from "@components/FancyUI";
import Layout from "@components/Layout";
import { NewsletterForm } from "@components/NewsletterSignup";
import { SmallCardsGallery } from "@components/NiceCard";
import { SwipeableCardCarousel } from "@components/SwipeableCardCarousel";
import { WavingHand } from "@components/WavingHand";
import { booknotes, newsletters, posts, travelblogs } from "@velite";
import Link from "next/link";
import {
  byDate,
  byOnlyPublished,
  type CommonMetadata,
  toOnlyMetadata,
} from "src/lib/utils";

const IndexPage = (props: Props) => {
  const description = `trebeljahr - a website about the things Rico Trebeljahr does, reads and thinks about. The topics can vary widely, 
from programming, bio-chemistry, the brain, investing, physics, philosophy to photography, traveling and back...`;

  return (
    <Layout
      title="home - Hi there 👋🏻 I am Rico. A programmer, traveler, photographer..."
      description={description}
      image="/assets/midjourney/young-man-looking-absolutely-relaxed-while-reading-a-book-in-the-milkyway.jpg"
      url="/"
      imageAlt={"a person reading a book, while floating in space"}
      fullScreen={true}
    >
      <main>
        <section className="mx-auto max-w-3xl px-3 pb-20">
          <h2 className="text-4xl">
            Hi there <WavingHand />
          </h2>
          <span>
            I am Rico. A programmer, traveler, photographer, writer and fellow
            human. This is my personal website. It&apos;s where I write, publish
            my newsletter, collect booknotes, quotes, traveling stories, and
            photography.
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
        </section>

        <section className="dark:bg-slate-900 bg-slate-100 pt-1 pb-20 px-3">
          <SmallCardsGallery
            content={props.postsSelection}
            title="Writing 📝"
          />
          <FancyLink href="/posts" />
        </section>

        <section className="pt-1 pb-20 px-3">
          <SwipeableCardCarousel
            content={props.travelBlogsSelection}
            title="Travel Stories 🛫"
          />

          <FancyLink href="/travel" />
        </section>

        <section className="dark:bg-slate-900 bg-slate-100 pt-1 pb-20 px-3">
          <SmallCardsGallery
            content={props.newsletterSelection}
            title="Live and Learn Newsletter 💌"
            // withExcerpt
          />
          {/* <FancyLink href="/newsletters" /> */}

          <div className="mx-auto max-w-3xl mt-20 mb-10">
            <NewsletterForm />
          </div>
        </section>

        <section className="pt-1 pb-20 px-3">
          <SwipeableCardCarousel
            content={props.booknotesSelection}
            title="Booknotes 📚"
          />

          <FancyLink href="/booknotes" />
        </section>

        <section className="dark:bg-slate-900 bg-slate-100 pt-1 pb-20 px-3">
          <div className="mx-auto max-w-3xl">
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

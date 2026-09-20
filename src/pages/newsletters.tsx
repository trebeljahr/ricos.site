import { Card } from "@components/Card";
import { MonkeyEgg } from "@components/EasterEggs/Monkey";
import Layout from "@components/Layout";
import { NewsletterForm } from "@components/NewsletterForm";
import Header, { PageMain } from "@components/PostHeader";
import { ToTopButton } from "@components/ToTopButton";
import type { CommonMetadata } from "src/@types";
import { getSeoInfo, type SeoInfo } from "src/lib/getSeoInfo";

import { extractAndSortMetadata } from "src/lib/utils/extractAndSortMetadata";

type Props = {
  newsletterData: CommonMetadata[];
  seo: SeoInfo | null;
};

const sortByNumbers = (arr: CommonMetadata[]) => {
  const collator = new Intl.Collator(undefined, {
    numeric: true,
    sensitivity: "base",
  });

  return arr.sort((a, b) => -collator.compare(a.number as string, b.number as string));
};

const toNiceCard = (
  { link, title, markdownExcerpt, cover, date, metadata: { readingTime } }: CommonMetadata,
  index: number,
) => {
  const priority = index === 0;

  return (
    <Card
      layout="horizontal"
      key={link}
      cover={cover}
      link={link}
      markdownExcerpt={markdownExcerpt}
      priority={priority}
      title={title}
      date={date}
      readingTime={readingTime}
    />
  );
};

const Newsletters = ({ newsletterData, seo }: Props) => {
  const url = "newsletters";
  return (
    <Layout
      title={seo?.metaTitle || "Live and Learn Newsletter"}
      description={
        seo?.metaDescription ||
        "An archive overview page of all the Live and Learn editions I have published in the past."
      }
      url={url}
      keywords={seo?.keywords || ["newsletters", "live and learn", "archive"]}
      image={seo?.ogImage || "/assets/midjourney/live-and-learn-cover.png"}
      imageAlt={
        seo?.ogImageAlt || "a young boy absorbed in reading a book with sparks flying out of it"
      }
    >
      <PageMain>
        <section>
          <Header
            breadcrumbs={{ path: url }}
            subtitle={"All the newsletters I have published so far since 2022."}
            title={"Live and Learn Newsletters"}
          />
          <div className="mt-region">{newsletterData.slice(0, 2).map(toNiceCard)}</div>

          <div className="my-region">
            <NewsletterForm
              // biome-ignore lint/complexity/noUselessFragments: empty fragment is truthy, suppresses NewsletterForm's default link
              link={<></>}
              heading={
                <h2 className="flush-top">
                  Not subscribed yet? <MonkeyEgg />
                </h2>
              }
            />
          </div>

          {newsletterData.slice(2).map(toNiceCard)}
        </section>
        <footer className="mt-section">
          <NewsletterForm
            // biome-ignore lint/complexity/noUselessFragments: empty fragment is truthy, suppresses NewsletterForm's default link
            link={<></>}
          />
          <ToTopButton />
        </footer>
      </PageMain>
    </Layout>
  );
};

export default Newsletters;

export const getStaticProps = async () => {
  const { loadVeliteData } = await import("src/lib/loadVeliteData");
  const newsletters = loadVeliteData("newsletters.json");
  const newsletterData = extractAndSortMetadata(newsletters).map((newsletter: CommonMetadata) => ({
    ...newsletter,
    excerpt: newsletter.excerpt
      .replace("Welcome to this edition of Live and Learn. ", "")
      .replace("Enjoy.", ""),
  }));

  return {
    props: { newsletterData: sortByNumbers(newsletterData), seo: getSeoInfo("/newsletters") },
  };
};

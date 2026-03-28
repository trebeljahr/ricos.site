import { BreadCrumbs } from "@components/BreadCrumbs";
import Layout from "@components/Layout";
import { NewsletterForm } from "@components/NewsletterForm";
import { HorizontalCard } from "@components/NiceCards";
import Header from "@components/PostHeader";
import { ToTopButton } from "@components/ToTopButton";
import newsletters from "../../.velite/newsletters.meta.json";
import { CommonMetadata } from "src/@types";
import { SeoInfo } from "src/lib/getSeoInfo";
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

  return arr.sort(
    (a, b) => -collator.compare(a.number as string, b.number as string),
  );
};

const toNiceCard = (
  {
    link,
    number,
    title,
    markdownExcerpt,
    cover,
    date,
    metadata: { readingTime },
  }: CommonMetadata,
  index: number,
) => {
  const priority = index <= 1;

  return (
    <HorizontalCard
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
      description={seo?.metaDescription || "An archive overview page of all the Live and Learn editions I have published in the past."}
      url={url}
      keywords={seo?.keywords || ["newsletters", "live and learn", "archive"]}
      image={seo?.ogImage || "/assets/midjourney/live-and-learn-cover.png"}
      imageAlt={seo?.ogImageAlt || "a young boy absorbed in reading a book with sparks flying out of it"}
    >
      <main className="py-20 px-3 max-w-5xl mx-auto">
        <BreadCrumbs path={url} />

        <section>
          <Header
            subtitle={"All the newsletters I have published so far since 2022."}
            title={"Live and Learn Newsletters 💌"}
          />
          <div className="mt-20">
            {newsletterData.slice(0, 2).map(toNiceCard)}
          </div>

          <div className="my-32">
            <NewsletterForm
              link={<></>}
              heading={<h2 className="!mt-0">Not subscribed yet? 🙊</h2>}
            />
          </div>

          {newsletterData.slice(2).map(toNiceCard)}
        </section>
        <footer>
          <NewsletterForm link={<></>} />
          <ToTopButton />
        </footer>
      </main>
    </Layout>
  );
};

export default Newsletters;

export const getStaticProps = async () => {
  const { getSeoInfo } = await import("src/lib/getSeoInfo");
  const newsletterData = extractAndSortMetadata(newsletters).map(
    (newsletter) => ({
      ...newsletter,
      excerpt: newsletter.excerpt
        .replace("Welcome to this edition of Live and Learn. ", "")
        .replace("Enjoy.", ""),
    }),
  );

  return {
    props: { newsletterData: sortByNumbers(newsletterData), seo: getSeoInfo("/newsletters") },
  };
};

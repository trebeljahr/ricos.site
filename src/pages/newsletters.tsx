import { type Newsletter, newsletters } from "@velite";
import { ToTopButton } from "@components/ToTopButton";
import Layout from "@components/Layout";
import { NewsletterForm } from "@components/NewsletterSignup";
import { NiceCard } from "@components/NiceCard";
import Header from "@components/PostHeader";
import { byOnlyPublished } from "src/lib/utils";
import { BreadCrumbs } from "@components/BreadCrumbs";

type NewsletterData = Pick<
  Newsletter,
  "link" | "number" | "title" | "excerpt" | "cover" | "metadata" | "date"
>;

type Props = {
  newsletterData: NewsletterData[];
};

const sortByNumbers = (arr: NewsletterData[]) => {
  const collator = new Intl.Collator(undefined, {
    numeric: true,
    sensitivity: "base",
  });
  return arr.sort((a, b) => -collator.compare(a.number, b.number));
};

const toNiceCard = (
  {
    link,
    number,
    title,
    excerpt,
    cover,
    date,
    metadata: { readingTime },
  }: NewsletterData,
  index: number
) => {
  const priority = index <= 1;

  return (
    <NiceCard
      key={link}
      cover={cover}
      link={link}
      excerpt={excerpt}
      priority={priority}
      title={`${title} | Live and Learn #${number}`}
      date={date}
      readingTime={readingTime}
    />
  );
};

const Newsletters = ({ newsletterData }: Props) => {
  const url = "newsletters";
  return (
    <Layout
      title="Newsletters - Live and Learn"
      description="An archive overview page of all the Live and Learn editions I have published in the past."
      url={url}
      keywords={[
        "newsletters",
        "live and learn",
        "archive",
        "past editions",
        "all newsletters",
        "AI",
        "programming",
        "machine learning",
        "neuroscience",
        "biochemistry",
        "physics",
        "evolution",
        "engineering",
        "personal development",
        "AI news",
        "programming news",
        "machine learning news",
        "neuroscience news",
        "biochemistry news",
        "AI newsletter",
        "programming newsletter",
        "machine learning newsletter",
      ]}
      image="/assets/midjourney/live-and-learn-cover.png"
      imageAlt="a young boy absorbed in reading a book with sparks flying out of it"
    >
      <main className="mb-20 px-3">
        <BreadCrumbs path={url} />

        <section>
          <Header
            subtitle={"All the Live and Learn Newsletters"}
            title={"Newsletters"}
          />
          {newsletterData.slice(0, 2).map(toNiceCard)}

          <div className="my-32">
            <NewsletterForm
              link={<></>}
              heading={<h2 className="mt-0">Not subscribed yet? 🙊</h2>}
            />
          </div>

          {newsletterData.slice(2).map(toNiceCard)}
        </section>
      </main>

      <footer className="mb-20 px-3">
        <NewsletterForm link={<></>} />
        <ToTopButton />
      </footer>
    </Layout>
  );
};

export default Newsletters;

export const getStaticProps = async () => {
  const newsletterData = newsletters
    .filter(byOnlyPublished)
    .map(({ link, number, title, excerpt = "", cover, metadata, date }) => ({
      link,
      number,
      title,
      cover,
      metadata,
      date,
      excerpt: excerpt
        .replace("Welcome to this edition of Live and Learn. ", "")
        .replace("Enjoy.", ""),
    }));

  return {
    props: { newsletterData: sortByNumbers(newsletterData) },
  };
};

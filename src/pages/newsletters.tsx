import { Newsletter, newsletters } from "@velite";
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

const Newsletters = ({ newsletterData }: Props) => {
  const url = "newsletters";
  return (
    <Layout
      title="Newsletters - Live and Learn"
      description="An archive overview page of all the Live and Learn editions I have published in the past."
      url={url}
      image="/assets/midjourney/live-and-learn-cover.png"
      imageAlt="a young boy absorbed in reading a book with sparks flying out of it"
    >
      <BreadCrumbs path={url} />
      <main>
        <section>
          <Header
            subtitle={"All the Live and Learn Newsletters"}
            title={"Newsletters"}
          />
          {newsletterData.map(
            (
              {
                link,
                number,
                title,
                excerpt,
                cover,
                date,
                metadata: { readingTime },
              },
              index
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
            }
          )}
        </section>
      </main>

      <footer>
        <NewsletterForm />
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

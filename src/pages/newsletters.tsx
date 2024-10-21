import { Newsletter, newsletters } from "@velite";
import { ToTopButton } from "@components/ToTopButton";
import Layout from "@components/Layout";
import { NewsletterForm } from "@components/NewsletterSignup";
import { NiceCard } from "@components/NiceCard";
import Header from "@components/PostHeader";
import { byOnlyPublished } from "src/lib/utils";

type NewsletterData = Pick<
  Newsletter,
  "link" | "number" | "title" | "excerpt" | "cover"
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
  return (
    <Layout
      title="Newsletters - an archive of newsletters"
      description="An archive overview page of all the Newsletters I have published in the past at trebeljahr.com."
      url="newsletters"
    >
      <main>
        <section>
          <Header
            subtitle={"All the Live and Learn Newsletters"}
            title={"Newsletters"}
          />
          {newsletterData.map(
            ({ link, number, title, excerpt, cover }, index) => {
              const priority = index <= 1;

              return (
                <NiceCard
                  key={link}
                  cover={cover}
                  link={link}
                  excerpt={excerpt}
                  priority={priority}
                  title={`${title} | Live and Learn #${number}`}
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
    .map(({ link, number, title, excerpt = "", cover }) => ({
      link,
      number,
      title,
      cover,
      excerpt: excerpt
        .replace("Welcome to this edition of Live and Learn. ", "")
        .replace("Enjoy.", ""),
    }));

  return {
    props: { newsletterData: sortByNumbers(newsletterData) },
  };
};

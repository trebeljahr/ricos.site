import Layout from "../components/layout";
import Link from "next/link";
import { ToTopButton } from "../components/ToTopButton";
import { NewsletterForm } from "../components/newsletter-signup";
import { allNewsletters } from "contentlayer/generated";

type NewsletterData = {
  slug: string;
  newsletterNumber: number;
  title: string;
  excerpt: string;
};

type Props = {
  newsletterData: NewsletterData[];
};

const sortSlugs = (slugArray: NewsletterData[]) => {
  const collator = new Intl.Collator(undefined, {
    numeric: true,
    sensitivity: "base",
  });
  return slugArray.sort((a, b) => -collator.compare(a.slug, b.slug));
};

const Newsletters = ({ newsletterData }: Props) => {
  return (
    <Layout
      title="Newsletters - an archive of newsletters"
      description="An archive overview page of all the Newsletters I have published in the past at trebeljahr.com."
    >
      <article>
        <section className="main-section">
          {newsletterData.map(({ slug, newsletterNumber, title, excerpt }) => {
            return (
              <div key={slug} className="Podcastnote-link-card">
                <Link href={slug}>
                  <h2>
                    {title} | Live and Learn #{newsletterNumber}
                  </h2>
                </Link>

                <p>{excerpt}</p>
              </div>
            );
          })}
        </section>
        <section className="main-section">
          <NewsletterForm />
          <ToTopButton />
        </section>
      </article>
    </Layout>
  );
};

export default Newsletters;

export const getStaticProps = async () => {
  const newsletterData = allNewsletters.map(
    ({ slug, newsletterNumber, title, excerpt = "" }) => ({
      slug,
      newsletterNumber,
      title,
      excerpt: excerpt
        .replace("Welcome to this edition of Live and Learn. ", "")
        .replace("Enjoy.", ""),
    })
  );

  return {
    props: { newsletterData: sortSlugs(newsletterData) },
  };
};

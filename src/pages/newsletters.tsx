import Layout from "../components/layout";
import Link from "next/link";
import { ToTopButton } from "../components/ToTopButton";
import { NewsletterForm } from "../components/newsletter-signup";
import { allNewsletters } from "contentlayer/generated";

type Props = {
  newsletterSlugs: { slug: string; newsletterNumber: number }[];
};

const Newsletters = ({ newsletterSlugs }: Props) => {
  return (
    <Layout
      title="Newsletters - an archive of newsletters"
      description="An archive overview page of all the Newsletters I have published in the past at trebeljahr.com."
    >
      <article>
        <section className="main-section">
          {newsletterSlugs.map(({ slug, newsletterNumber }) => {
            return (
              <h3 key={slug}>
                <Link as={slug} href={slug}>
                  Newsletter #{newsletterNumber}
                </Link>
              </h3>
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
  const newsletterSlugs = allNewsletters.map(({ slug, newsletterNumber }) => ({
    slug,
    newsletterNumber,
  }));

  console.log(newsletterSlugs);

  return {
    props: { newsletterSlugs },
  };
};

import Layout from "../components/layout";
import { getAllNewsletters, getAllPosts } from "../lib/api";
import Link from "next/link";
import { ToTopButton } from "../components/ToTopButton";
import { NewsletterForm } from "../components/newsletter-signup";

type Props = {
  newsletterSlugs: { slug: string }[];
};

const Newsletters = ({ newsletterSlugs }: Props) => {
  return (
    <Layout
      title="Newsletters - an archive of newsletters"
      description="An archive overview page of all the Newsletters I have published in the past at trebeljahr.com."
    >
      <article>
        <section className="main-section">
          {newsletterSlugs.map(({ slug: number }) => {
            return (
              <h3 key={number}>
                <Link
                  as={`/newsletters/${number}`}
                  href={`/newsletters/${number}`}
                >
                  <a> Newsletter #{number}</a>
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
  const newsletterSlugs = await getAllNewsletters(["slug"]);
  return {
    props: { newsletterSlugs },
  };
};

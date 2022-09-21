import Layout from "../components/layout";
import { getAllNewsletters, getAllPosts } from "../lib/api";
import Link from "next/link";

type Props = {
  newsletterSlugs: { slug: string }[];
};

const Newsletters = ({ newsletterSlugs }: Props) => {
  return (
    <Layout pageTitle="Newsletters">
      <article>
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
      </article>
    </Layout>
  );
};

export default Newsletters;

export const getStaticProps = async () => {
  const newsletterSlugs = getAllNewsletters(["slug"]);
  return {
    props: { newsletterSlugs },
  };
};

import Layout from "../components/layout";
import { ToTopButton } from "../components/ToTopButton";
import { NewsletterForm } from "../components/newsletter-signup";
import { allDocuments } from "contentlayer/generated";

type Props = {
  tags: string[];
};

const Newsletters = ({ tags }: Props) => {
  return (
    <Layout
      title="Experiment"
      description="An Experimental Overview over All Pages"
    >
      <article>
        <section className="main-section">
          <h1>Tags:</h1>
          {/* {tags.map((tag) => {
            <p key={tag}>{tag}</p>;
          })} */}
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

export function getStaticProps() {
  const allTags = allDocuments.flatMap(({ tags }) => tags);
  console.log(allTags);
  const dedupedTags = [...new Set(allTags)];
  console.log(dedupedTags);

  return {
    props: {},
  };
}

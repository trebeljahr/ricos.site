import {
  posts,
  booknotes,
  pages,
  newsletters,
  podcastnotes,
  travelblogs,
} from "@velite";
import Link from "next/link";
import Layout from "@components/Layout";
import { NewsletterForm } from "@components/NewsletterSignup";
import { ToTopButton } from "@components/ToTopButton";
import { toTitleCase } from "src/lib/toTitleCase";

const allDocuments = [
  ...posts,
  ...booknotes,
  ...pages,
  ...newsletters,
  ...podcastnotes,
  ...travelblogs,
];

const mainCategories = [
  "philosophy",
  "psychology",
  "neuroscience",
  "biochemistry",
  "physics",
  "evolution",
  "engineering",
  "personal development",
  "AI",
  "programming",
  "finances",
  "mathematics",
  "traveling",
  "design",
  "beauty",
];
type LinksOnTag<T> = { tag: string; links: T[] };

type TaggedDocumentData = LinksOnTag<
  Pick<(typeof allDocuments)[0], "title" | "link" | "metadata" | "date">
>;

type Props = {
  tags: TaggedDocumentData[];
  categories: TaggedDocumentData[];
};

const RenderTags = ({ tags }: { tags: TaggedDocumentData[] }) => {
  return (
    <div className="tag-filter-container">
      {tags.map(({ tag, links }) => {
        return (
          <Link
            key={tag}
            href={"#" + tag}
            as={"#" + tag}
            className="tag-filter clickable"
          >
            {tag} ({links.length})
          </Link>
        );
      })}
    </div>
  );
};

const byReadingTime = (
  a: { metadata?: { readingTime?: number } },
  b: { metadata?: { readingTime?: number } }
) => {
  const aTime = a.metadata?.readingTime || 0;
  const bTime = b.metadata?.readingTime || 0;

  return bTime - aTime;
};

const RenderAnchors = ({ tags }: { tags: TaggedDocumentData[] }) => {
  return (
    <>
      {tags.map(({ tag, links }) => {
        return (
          <div key={tag}>
            <h2 id={tag}>{toTitleCase(tag)}</h2>
            <ul>
              {links
                .sort(byReadingTime)
                .map(({ link, title, metadata: { readingTime } = {} }) => {
                  return (
                    <li key={title}>
                      <Link href={link || ""} as={link}>
                        {title} – {readingTime || 0} min
                      </Link>
                    </li>
                  );
                })}
            </ul>
          </div>
        );
      })}
    </>
  );
};

const ShowTags = ({ categories }: Props) => {
  return (
    <Layout
      title="Experiment"
      description="An Experimental Overview over All Pages"
      url="experiment"
    >
      <main>
        <section>
          <h2>Categories:</h2>
          <RenderTags tags={categories} />
          <h2>Links:</h2>
          <RenderAnchors tags={categories} />
        </section>
      </main>

      <footer>
        <NewsletterForm />
        <ToTopButton />
      </footer>
    </Layout>
  );
};

export default ShowTags;

export async function getStaticProps() {
  const categories = mainCategories.map((tag) => {
    return {
      tag,
      links: allDocuments
        .filter(({ tags }) => {
          return tags?.includes(tag);
        })
        .map(({ link, title, metadata, date }) => ({
          link,
          title,
          metadata,
          date,
        })),
    };
  });

  return {
    props: {
      categories,
    },
  };
}

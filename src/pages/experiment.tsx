import { allDocuments, DocumentTypes } from "@contentlayer/generated";
import Link from "next/link";
import Layout from "@components/Layout";
import { NewsletterForm } from "@components/NewsletterSignup";
import { ToTopButton } from "@components/ToTopButton";

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
  Pick<DocumentTypes, "title" | "slug" | "type" | "readingTime">
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

const RenderAnchors = ({ tags }: { tags: TaggedDocumentData[] }) => {
  return (
    <>
      {tags.map(({ tag, links }) => {
        return (
          <div key={tag}>
            <h2 id={tag}>{tag}</h2>
            <ul>
              {links.map(({ slug, title, type, readingTime }) => {
                return (
                  <li key={slug}>
                    <Link href={slug || ""} as={slug}>
                      {title} ({type}) {readingTime}
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

const ShowTags = ({ tags, categories }: Props) => {
  return (
    <Layout
      title="Experiment"
      description="An Experimental Overview over All Pages"
      url="experiment"
    >
      <article className="prose">
        <section>
          <h2>Categories:</h2>
          <RenderTags tags={categories} />
          <h2>Tags:</h2>
          <RenderTags tags={tags} />
          <h2>Links:</h2>
          <RenderAnchors tags={categories} />
        </section>
        <section>
          <NewsletterForm />
          <ToTopButton />
        </section>
      </article>
    </Layout>
  );
};

export default ShowTags;

export async function getStaticProps() {
  const allTags = allDocuments
    .filter((document) => {
      return document.type !== "Note";
    })
    .flatMap(({ tags }) => tags);
  const dedupedTags = [...new Set(allTags)];

  const tags = dedupedTags.map((tag) => {
    return {
      tag,
      links: allDocuments
        .filter(({ tags }) => {
          return tags?.includes(tag || "");
        })
        .map(({ slug, type, title }) => ({ slug, type, title })),
    };
  });

  const categories = mainCategories.map((tag) => {
    return {
      tag,
      links: allDocuments
        .filter(({ tags }) => {
          return tags?.includes(tag);
        })
        .map(({ slug, type, title, readingTime }) => ({
          slug,
          type,
          title,
          readingTime,
        })),
    };
  });

  return {
    props: {
      tags,
      categories,
    },
  };
}

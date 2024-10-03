import { allDocuments, DocumentTypes } from "@contentlayer/generated";
import Link from "next/link";
import Layout from "@components/Layout";
import { NewsletterForm } from "@components/NewsletterSignup";
import { ToTopButton } from "@components/ToTopButton";
import { toTitleCase } from "src/lib/toTitleCase";
import React from "react";

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
  Pick<DocumentTypes, "title" | "slug" | "type" | "readingTime" | "date">
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
  a: { readingTime: string },
  b: { readingTime: string }
) => {
  const aTime = parseInt(a.readingTime.split(" ")[0]);
  const bTime = parseInt(b.readingTime.split(" ")[0]);

  return aTime - bTime;
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
                .map(({ slug, title, type, readingTime, date }) => {
                  return (
                    <li key={slug}>
                      <Link href={slug || ""} as={slug}>
                        {title} ({type}) – {readingTime}
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
        .map(({ slug, type, title, readingTime, date }) => ({
          slug,
          type,
          title,
          readingTime,
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

import Layout from "../components/layout";
import { ToTopButton } from "../components/ToTopButton";
import { NewsletterForm } from "../components/newsletter-signup";
import { allDocuments, DocumentTypes } from "contentlayer/generated";
import Link from "next/link";

const mainCategories = [
  "philosophy",
  "psychology",
  "neuroscience",
  "biochemistry",
  "cells",
  "physics",
  "engineering",
  "personal development",
  "music",
  "ai",
  "programming",
  "hacking",
  "finances",
  "mathematics",
  "traveling",
  "design",
  "politics",
  "problems",
  "art",
];
type LinksOnTag<T> = { tag: string; links: T[] };

type LinksInfo = LinksOnTag<Pick<DocumentTypes, "title" | "slug" | "type">>;

type Props = {
  tags: LinksInfo[];
  categories: LinksInfo[];
};

const RenderTags = ({ tags }: { tags: LinksInfo[] }) => {
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
const ShowTags = ({ tags, categories }: Props) => {
  console.log(tags);
  console.log(categories);
  return (
    <Layout
      title="Experiment"
      description="An Experimental Overview over All Pages"
    >
      <article>
        <section className="main-section main-text">
          <h2>Categories:</h2>
          <RenderTags tags={categories} />

          <h2>Tags:</h2>
          <RenderTags tags={tags} />

          {tags.map(({ tag, links }) => {
            return (
              <div key={tag}>
                <h2 id={tag}>{tag}</h2>
                <ul>
                  {links.map(({ slug, title, type }) => {
                    return (
                      <li key={slug}>
                        <Link href={slug} as={slug}>
                          {title} ({type})
                        </Link>
                      </li>
                    );
                  })}
                </ul>
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

export default ShowTags;

export function getStaticProps() {
  const allTags = allDocuments.flatMap(({ tags }) => tags);
  console.log(allTags);
  const dedupedTags = [...new Set(allTags)];
  console.log(dedupedTags);

  const tags = dedupedTags.map((tag) => {
    return {
      tag,
      links: allDocuments
        .filter(({ tags }) => {
          return tags.includes(tag);
        })
        .map(({ slug, type, title }) => ({ slug, type, title })),
    };
  });

  const categories = mainCategories.map((tag) => {
    return {
      tag,
      links: allDocuments
        .filter(({ tags }) => {
          return tags.includes(tag);
        })
        .map(({ slug, type, title }) => ({ slug, type, title })),
    };
  });

  console.log(categories);

  return {
    props: {
      tags,
      categories,
    },
  };
}

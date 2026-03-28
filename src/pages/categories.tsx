import Link from "next/link";
import Layout from "@components/Layout";
import { NewsletterForm } from "@components/NewsletterForm";
import { ToTopButton } from "@components/ToTopButton";
import { BreadCrumbs } from "@components/BreadCrumbs";
import { byReadingTime } from "src/lib/utils/sorting";
import { byOnlyPublished } from "src/lib/utils/filters";
import { toTitleCase } from "src/lib/utils/toTitleCase";
import { getSeoInfo, SeoInfo } from "src/lib/getSeoInfo";

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

type DocumentLink = {
  title: string;
  link: string;
  metadata: { readingTime?: number };
  date: string;
  contentType: string;
};

type TaggedDocumentData = LinksOnTag<DocumentLink>;

type Props = {
  tags: TaggedDocumentData[];
  categories: TaggedDocumentData[];
  seo: SeoInfo | null;
};

const RenderTags = ({ tags }: { tags: TaggedDocumentData[] }) => {
  return (
    <div className="flex flex-wrap items-center">
      {tags.map(({ tag, links }) => {
        return (
          <Link key={tag} href={"#" + tag} as={"#" + tag} className="mr-4">
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
            <h2 id={tag}>{toTitleCase(tag)}</h2>
            <ul>
              {links
                .sort(byReadingTime)
                .map(
                  ({
                    link,
                    title,
                    contentType,
                    metadata: { readingTime } = {},
                  }) => {
                    return (
                      <li key={title}>
                        <Link href={link || ""} as={link}>
                          {title} - {contentType} - {readingTime || 0} min
                        </Link>
                      </li>
                    );
                  }
                )}
            </ul>
          </div>
        );
      })}
    </>
  );
};

const ShowTags = ({ categories, seo }: Props) => {
  const url = "categories";
  return (
    <Layout
      title={seo?.metaTitle || "Categories"}
      description={seo?.metaDescription || `Browse all content on ricos.site by category: ${mainCategories.slice(0, 5).join(", ")}, and more.`}
      url={url}
      keywords={seo?.keywords || mainCategories}
      image={seo?.ogImage || "/assets/blog/network.jpg"}
      imageAlt={seo?.ogImageAlt || "a network of connected dots"}
    >
      <main className="py-20 px-3 max-w-5xl mx-auto">
        <BreadCrumbs path={url} />

        <section>
          <h2>Categories:</h2>
          <RenderTags tags={categories} />
          <h2>Links:</h2>
          <RenderAnchors tags={categories} />
        </section>

        <footer>
          <NewsletterForm />
          <ToTopButton />
        </footer>
      </main>
    </Layout>
  );
};

export default ShowTags;

export async function getStaticProps() {
  const posts = require("../../.velite/posts.json");
  const booknotes = require("../../.velite/booknotes.json");
  const pages = require("../../.velite/pages.json");
  const newsletters = require("../../.velite/newsletters.json");
  const podcastnotes = require("../../.velite/podcastnotes.json");
  const travelblogs = require("../../.velite/travelblogs.json");

  const allDocuments = [
    ...posts,
    ...booknotes,
    ...pages,
    ...newsletters,
    ...podcastnotes,
    ...travelblogs,
  ];

  const categories = mainCategories.map<TaggedDocumentData>((tag) => {
    return {
      tag,
      links: allDocuments
        .filter(byOnlyPublished)
        .filter(({ tags }: any) => {
          return tags?.includes(tag);
        })
        .map(({ link, title, metadata, date, contentType }: any) => ({
          link,
          title,
          metadata,
          date,
          contentType,
        })),
    };
  });

  return {
    props: {
      categories,
      seo: getSeoInfo("/categories"),
    },
  };
}

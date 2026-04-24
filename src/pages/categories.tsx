import { BreadCrumbs } from "@components/BreadCrumbs";
import Layout from "@components/Layout";
import { NewsletterForm } from "@components/NewsletterForm";
import { ToTopButton } from "@components/ToTopButton";
import Link from "next/link";
import { type SeoInfo, getSeoInfo } from "src/lib/getSeoInfo";
import { byOnlyPublished } from "src/lib/utils/filters";
import { byReadingTime } from "src/lib/utils/sorting";
import { toTitleCase } from "src/lib/utils/toTitleCase";

type DocumentLink = {
  title: string;
  link: string;
  metadata: { readingTime?: number };
  date: string;
  contentType: string;
};

type TaggedDocumentData = { tag: string; links: DocumentLink[] };

type Props = {
  categories: TaggedDocumentData[];
  seo: SeoInfo | null;
};

const RenderTags = ({ tags }: { tags: TaggedDocumentData[] }) => {
  return (
    <div className="flex flex-wrap gap-2 mb-10">
      {tags.map(({ tag, links }) => (
        <Link
          key={tag}
          href={"#" + tag}
          className="inline-block px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-sm hover:bg-gray-200 dark:hover:bg-gray-700 no-underline"
        >
          {toTitleCase(tag)}{" "}
          <span className="text-gray-500 dark:text-gray-400">({links.length})</span>
        </Link>
      ))}
    </div>
  );
};

const RenderAnchors = ({ tags }: { tags: TaggedDocumentData[] }) => {
  return (
    <>
      {tags.map(({ tag, links }) => (
        <div key={tag}>
          <h2 id={tag}>
            {toTitleCase(tag)}{" "}
            <span className="text-gray-500 text-base font-normal">({links.length})</span>
          </h2>
          <ul>
            {links
              .sort(byReadingTime)
              .map(({ link, title, contentType, metadata: { readingTime } = {} }) => (
                <li key={link}>
                  <Link href={link || ""}>{title}</Link>
                  <span className="text-gray-500 dark:text-gray-400 text-sm ml-2">
                    {contentType} · {readingTime || 0} min
                  </span>
                </li>
              ))}
          </ul>
        </div>
      ))}
    </>
  );
};

export default function CategoriesPage({ categories, seo }: Props) {
  const url = "categories";
  return (
    <Layout
      title={seo?.metaTitle || "Categories – Browse All Content by Topic"}
      description={
        seo?.metaDescription ||
        `Browse all content on ricos.site by category. ${categories.length} topics spanning philosophy, science, programming, travel, and more.`
      }
      url={url}
      keywords={seo?.keywords || categories.map((c) => c.tag)}
      image={seo?.ogImage || "/assets/blog/network.jpg"}
      imageAlt={seo?.ogImageAlt || "a network of connected dots"}
    >
      <main className="py-20 px-3 max-w-5xl mx-auto">
        <BreadCrumbs path={url} />

        <section>
          <h1 className="mt-16!">Categories</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {categories.length} topics across{" "}
            {categories.reduce((sum, c) => sum + c.links.length, 0)} pieces of content.
          </p>
          <RenderTags tags={categories} />
          <RenderAnchors tags={categories} />
        </section>

        <footer>
          <NewsletterForm />
          <ToTopButton />
        </footer>
      </main>
    </Layout>
  );
}

export async function getStaticProps() {
  const { loadVeliteData } = await import("src/lib/loadVeliteData");
  const posts = loadVeliteData("posts.json");
  const booknotes = loadVeliteData("booknotes.json");
  const pages = loadVeliteData("pages.json");
  const newsletters = loadVeliteData("newsletters.json");
  const podcastnotes = loadVeliteData("podcastnotes.json");
  const travelblogs = loadVeliteData("travelblogs.json");

  const allDocuments = [
    ...posts,
    ...booknotes,
    ...pages,
    ...newsletters,
    ...podcastnotes,
    ...travelblogs,
  ].filter(byOnlyPublished);

  // Auto-discover all tags from content
  const tagMap = new Map<string, DocumentLink[]>();

  for (const doc of allDocuments) {
    const tags = (doc.tags || "")
      .split(",")
      .map((t: string) => t.trim().toLowerCase())
      .filter(Boolean);

    for (const tag of tags) {
      if (!tagMap.has(tag)) tagMap.set(tag, []);
      tagMap.get(tag)!.push({
        link: doc.link,
        title: doc.title,
        metadata: doc.metadata,
        date: doc.date,
        contentType: doc.contentType,
      });
    }
  }

  // Sort categories by number of links (most content first)
  const categories = Array.from(tagMap.entries())
    .map(([tag, links]) => ({ tag, links }))
    .sort((a, b) => b.links.length - a.links.length);

  return {
    props: {
      categories,
      seo: getSeoInfo("/categories"),
    },
  };
}

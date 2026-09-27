/**
 * /needlestack/everything — the old needlestack page, kept alive.
 *
 * `src/content/Notes/pages/needlestack.md` is still the only place ~490 of
 * these links are published: the new pages show a needle once Rico has reviewed
 * it, and that queue is thousands long. So the markdown keeps rendering here,
 * off the main URL and out of the index, until the doors carry the same links.
 * When they do, this route and the markdown file go together.
 */

import Layout from "@components/Layout";
import { MDXContent } from "@components/MDXContent";
import { MetadataDisplay } from "@components/MetadataDisplay";
import { NewsletterForm } from "@components/NewsletterForm";
import Header, { PageMain } from "@components/PostHeader";
import { ToTopButton } from "@components/ToTopButton";
import type { Page as PageType } from "@velite";
import Link from "next/link";
import { pickProps } from "src/lib/utils/pickProps";

const PAGE_FIELDS = [
  "title",
  "subtitle",
  "date",
  "cover",
  "tags",
  "metadata",
  "metaDescription",
  "content",
] as const;

type Props = { page: PageType };

export default function NeedlestackEverythingPage({ page }: Props) {
  return (
    <Layout
      title="The old needlestack – one long list"
      description={page.metaDescription}
      image={page.cover.src}
      imageAlt={page.cover.alt}
      url="needlestack/everything"
      keywords={["needlestack", "curated links", "best of internet"]}
      // The hub at /needlestack owns this subject now; this page is a holding
      // pen while the links move onto the paths.
      noindex={true}
    >
      <PageMain>
        <article className="mx-auto max-w-prose">
          <Header
            breadcrumbs={{ path: "needlestack/everything" }}
            meta={<MetadataDisplay date={page.date} readingTime={page.metadata.readingTime} eggs />}
            title="The old needlestack"
            subtitle="One long list, grouped by format – the version before the rewrite"
          />
          <p className="text-gray-600 dark:text-gray-300">
            This is the page as it stood for years. It is being taken apart link by link into{" "}
            <Link href="/needlestack">the doors and paths</Link>, which is where new notes go.
          </p>
          <MDXContent source={page.content} />
        </article>

        <footer className="mt-section">
          <NewsletterForm />
          <ToTopButton />
        </footer>
      </PageMain>
    </Layout>
  );
}

export async function getStaticProps() {
  const { loadVeliteData } = await import("src/lib/loadVeliteData");
  const pages: PageType[] = loadVeliteData("pages.json");
  const page = pages.find((one: PageType) => one.slug === "needlestack");
  if (!page) return { notFound: true } as const;

  return { props: { page: pickProps(page, PAGE_FIELDS) } };
}

import type { Page as PageType } from "@velite";
import Header from "@components/PostHeader";
import { ToTopButton } from "@components/ToTopButton";
import Layout from "@components/Layout";
import { NewsletterForm } from "@components/NewsletterForm";
import { MDXContent } from "@components/MDXContent";
import { loadVeliteData } from "src/lib/loadVeliteData";
import { MetadataDisplay } from "@components/MetadataDisplay";
import { BreadCrumbs } from "@components/BreadCrumbs";
import dynamic from "next/dynamic";

const MDXContentWithDemos = dynamic(
  () => import("@components/MDXContentWithDemos").then((m) => m.MDXContentWithDemos),
  { ssr: true }
);
type Props = {
  page: PageType;
};

export default function Page({ page }: Props) {
  const { subtitle, title, cover } = page;

  return (
    <Layout
      title={page.seoTitle || title + " – " + subtitle}
      description={page.metaDescription}
      image={page.seoOgImage || cover.src}
      imageAlt={page.seoOgImageAlt || cover.alt}
      url={page.slug}
      keywords={page.seoKeywords.length > 0 ? page.seoKeywords : page.tags.split(",")}
      withProgressBar={true}
    >
      <main className="py-20 px-3 max-w-5xl mx-auto">
        <article className="mx-auto max-w-prose">
          <BreadCrumbs path={page.slug} />
          <MetadataDisplay
            date={page.date}
            readingTime={page.metadata.readingTime}
          />
          <Header subtitle={subtitle} title={title} />

          {page.hasDemos ? (
            <MDXContentWithDemos source={page.content} />
          ) : (
            <MDXContent source={page.content} />
          )}
        </article>

        <footer>
          <NewsletterForm />
          <ToTopButton />
        </footer>
      </main>
    </Layout>
  );
}

type Params = {
  params: { id: string };
};

export async function getStaticPaths() {
  const pages: PageType[] = loadVeliteData("pages.json");
  return {
    paths: pages.map<Params>(({ slug }: PageType) => ({
      params: { id: slug },
    })),
    fallback: false,
  };
}

export async function getStaticProps({ params }: Params) {
  const pages: PageType[] = loadVeliteData("pages.json");
  const page = pages.find((page: PageType) => page.slug === params.id);

  return { props: { page } };
}

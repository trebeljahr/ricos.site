import type { Page as PageType } from "@velite";
import { pages } from "@velite";
import Header from "@components/PostHeader";
import { ToTopButton } from "@components/ToTopButton";
import Layout from "@components/Layout";
import { NewsletterForm } from "@components/NewsletterForm";
import { MDXContent } from "@components/MDXContent";
import { MetadataDisplay } from "@components/MetadataDisplay";
import { BreadCrumbs } from "@components/BreadCrumbs";
type Props = {
  page: PageType;
};

export default function Page({ page }: Props) {
  const { subtitle, title, excerpt, cover } = page;

  return (
    <Layout
      title={title + " – " + subtitle}
      description={excerpt}
      image={cover.src}
      imageAlt={cover.alt}
      url={page.slug}
      keywords={page.tags.split(",")}
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

          <MDXContent source={page.content} />
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
  return {
    paths: pages.map<Params>(({ slug }: PageType) => ({
      params: { id: slug },
    })),
    fallback: false,
  };
}

export async function getStaticProps({ params }: Params) {
  const page = pages.find((page: PageType) => page.slug === params.id);

  return { props: { page } };
}

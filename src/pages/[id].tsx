import type { Page as PageType } from "@velite";
import { pages } from "@velite";
import Header from "@components/PostHeader";
import { ToTopButton } from "@components/ToTopButton";
import Layout from "@components/Layout";
import { NewsletterForm } from "@components/NewsletterSignup";
import { MDXContent } from "@components/MDXContent";
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
    >
      <Header subtitle={subtitle} title={title} />
      <main>
        <article>
          <MDXContent code={page.content} />
        </article>
      </main>

      <footer>
        <NewsletterForm />
        <ToTopButton />
      </footer>
    </Layout>
  );
}

export async function getStaticPaths() {
  return {
    paths: pages.map(({ slug }: PageType) => ({ params: { id: slug } })),
    fallback: false,
  };
}

export async function getStaticProps({ params }: { params: { slug: string } }) {
  const page = pages.find((page: PageType) => page.slug === params.slug);

  return { props: { page } };
}

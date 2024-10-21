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
          <MDXContent source={page.content} />
        </article>
      </main>

      <footer>
        <NewsletterForm />
        <ToTopButton />
      </footer>
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

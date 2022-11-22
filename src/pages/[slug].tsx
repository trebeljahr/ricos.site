import { useMDXComponent } from "next-contentlayer/hooks";
import Layout from "../components/layout";
import { NewsletterForm } from "../components/newsletter-signup";
import { ToTopButton } from "../components/ToTopButton";
import { allPages } from "contentlayer/generated";
import type { Page as PageType } from "contentlayer/generated";
import PostHeader from "src/components/post-header";

type Props = {
  page: PageType;
};

export default function Page({ page }: Props) {
  const Component = useMDXComponent(page.body.code);
  const { subtitle, title, description } = page;
  return (
    <Layout title={title + " – " + subtitle} description={description}>
      <article>
        <PostHeader subtitle={subtitle} title={title} />
        <section className="main-section main-text">
          <Component />
        </section>
        <section className="main-section">
          <NewsletterForm />
          <ToTopButton />
        </section>
      </article>
    </Layout>
  );
}

export async function getStaticPaths() {
  return {
    paths: allPages.map((page: PageType) => ({ params: { slug: page.slug } })),
    fallback: false,
  };
}

export async function getStaticProps({ params }: { params: { slug: string } }) {
  const page = allPages.find((page: PageType) => page.slug === params.slug);

  return { props: { page } };
}

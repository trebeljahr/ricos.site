import type { Page as PageType } from "@contentlayer/generated";
import { allPages } from "@contentlayer/generated";
import { useMDXComponent } from "next-contentlayer/hooks";
import PostHeader from "@components/PostHeader";
import { ToTopButton } from "@components/ToTopButton";
import Layout from "@components/Layout";
import { NewsletterForm } from "@components/NewsletterSignup";

type Props = {
  page: PageType;
};

export default function Page({ page }: Props) {
  const Component = useMDXComponent(page.body.code);
  const { subtitle, title, description, cover } = page;
  return (
    <Layout
      title={title + " – " + subtitle}
      description={description}
      image={cover.src}
      imageAlt={cover.alt}
    >
      <article className="main-content">
        <section>
          <PostHeader subtitle={subtitle} title={title} />
          <Component />
        </section>
        <section>
          <NewsletterForm />
          <ToTopButton />
        </section>
      </article>
    </Layout>
  );
}

export async function getStaticPaths() {
  return {
    paths: allPages.map(({ id }: PageType) => ({ params: { id } })),
    fallback: false,
  };
}

export async function getStaticProps({ params }: { params: { id: string } }) {
  const page = allPages.find((page: PageType) => page.id === params.id);

  return { props: { page } };
}

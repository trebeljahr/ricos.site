import type { Page as PageType } from "@contentlayer/generated";
import { allPages } from "@contentlayer/generated";
import { useMDXComponent } from "next-contentlayer2/hooks";
import Header from "@components/PostHeader";
import { ToTopButton } from "@components/ToTopButton";
import Layout from "@components/Layout";
import { NewsletterForm } from "@components/NewsletterSignup";
type Props = {
  page: PageType;
};

export default function Page({ page }: Props) {
  const Component = useMDXComponent(page.body.code);
  console.log(page);

  const { subtitle, title, description, cover } = page;
  return (
    <Layout
      title={title + " – " + subtitle}
      description={description}
      image={cover.src}
      imageAlt={cover.alt}
    >
      <Header subtitle={subtitle} title={title} />
      <main>
        <article>
          <Component />
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
    paths: allPages.map(({ id }: PageType) => ({ params: { id } })),
    fallback: false,
  };
}

export async function getStaticProps({ params }: { params: { id: string } }) {
  const page = allPages.find((page: PageType) => page.id === params.id);

  return { props: { page } };
}

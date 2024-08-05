import type { Page as PageType } from "@contentlayer/generated";
import { allPages } from "@contentlayer/generated";
import { useMDXComponent } from "next-contentlayer/hooks";
import Header from "@components/PostHeader";
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

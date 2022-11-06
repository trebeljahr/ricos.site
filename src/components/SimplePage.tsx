import Layout from "./layout";
import { NewsletterForm } from "./newsletter-signup";
import PostBody from "./post-body";
import { PostTitle } from "./post-title";
import { ToTopButton } from "./ToTopButton";

type Props = {
  content: string;
  description: string;
  title: string;
  subtitle: string;
};

export function SimplePage({ content, description, title, subtitle }: Props) {
  return (
    <Layout title={title + " – " + subtitle} description={description}>
      <article>
        <section className="main-section">
          <PostTitle>{title}</PostTitle>
          <PostBody content={content} />
        </section>
        <section className="main-section">
          <NewsletterForm />
          <ToTopButton />
        </section>
      </article>
    </Layout>
  );
}

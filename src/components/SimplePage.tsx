import { UtteranceComments } from "./comments";
import Layout from "./layout";
import { NewsletterForm } from "./newsletter-signup";
import PostBody from "./post-body";
import { PostTitle } from "./post-title";
import { ToTopButton } from "./ToTopButton";

type Props = {
  content: string;
  description: string;
  title: string;
};

export function SimplePage({ content, description, title }: Props) {
  return (
    <Layout pageTitle={title} description={description}>
      <article>
        <section className="main-section">
          <PostTitle>{title}</PostTitle>
          <PostBody content={content} />
        </section>
        <section className="main-section">
          <NewsletterForm />
          <UtteranceComments />
          <ToTopButton />
        </section>
      </article>
    </Layout>
  );
}

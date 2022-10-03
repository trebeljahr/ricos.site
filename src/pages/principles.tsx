import Layout from "../components/layout";
import PostBody from "../components/post-body";
import { ToTopButton } from "../components/ToTopButton";
import { join } from "path";
import fs from "fs/promises";
import matter from "gray-matter";
import { NewsletterForm } from "../components/newsletter-signup";
import { UtteranceComments } from "../components/comments";

export default function Principles({ content }: { content: string }) {
  return (
    <Layout pageTitle="Principles">
      <article>
        <section className="main-section">
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

export async function getStaticProps() {
  const todoSrc = join(
    process.cwd(),
    "src",
    "content",
    "pages",
    "principles.md"
  );
  const fileContents = await fs.readFile(todoSrc, "utf-8");
  return {
    props: {
      content: matter(fileContents).content || "",
    },
  };
}

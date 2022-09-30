import Layout from "../components/layout";
import { join } from "path";
import matter from "gray-matter";
import fs from "fs/promises";
import PostBody from "../components/post-body";
import { UtteranceComments } from "../components/comments";
import { ToTopButton } from "../components/ToTopButton";
import { NewsletterForm } from "../components/newsletter-signup";

export default function Needlestack({ content }: { content: string }) {
  return (
    <Layout pageTitle="Needlestack">
      <article>
        <section className="needlestack main-section">
          <PostBody content={content} />
        </section>
        <section className="main-section">
          <NewsletterForm />
          <ToTopButton />
          <UtteranceComments />
        </section>
      </article>
    </Layout>
  );
}

export async function getStaticProps() {
  const needlestackSrc = join(
    process.cwd(),
    "src",
    "content",

    "pages",
    "needlestack.md"
  );
  const fileContents = await fs.readFile(needlestackSrc, "utf-8");
  return {
    props: {
      content: matter(fileContents).content || "",
    },
  };
}

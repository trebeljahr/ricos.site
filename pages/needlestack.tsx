import Layout from "../components/layout";
import { join } from "path";
import matter from "gray-matter";
import fs from "fs/promises";
import PostBody from "../components/post-body";
import { UtteranceComments } from "../components/comments";
import { ToTopButton } from "../components/ToTopButton";

export default function Needlestack({ content }: { content: string }) {
  return (
    <Layout pageTitle="Needlestack">
      <PostBody content={content} />
      <ToTopButton />
      <UtteranceComments />
    </Layout>
  );
}

export async function getStaticProps() {
  const quotesSrc = join(process.cwd(), "_pages", "needlestack.md");
  const fileContents = await fs.readFile(quotesSrc, "utf-8");
  return {
    props: {
      content: matter(fileContents).content || "",
    },
  };
}

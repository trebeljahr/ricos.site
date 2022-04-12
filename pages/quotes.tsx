import Layout from "../components/layout";
import fs from "fs/promises";
import { join } from "path";
import matter from "gray-matter";

type Quote = {
  author: string;
  text: string;
};

type Props = {
  quotes: Quote[];
};
export default function Quotes({ quotes }: Props) {
  console.log({ quotes });
  return (
    <Layout>
      <h1>Quotes</h1>
      {quotes.map(({ author, text }, index) => {
        return (
          <div key={author + index} className="quote">
            <h3>{text}</h3>
            <p>by {author}</p>
          </div>
        );
      })}
    </Layout>
  );
}

export async function getStaticProps() {
  const quotesSrc = join(process.cwd(), "quotes.md");
  const fileContents = await fs.readFile(quotesSrc, "utf-8");
  const { data, content } = matter(fileContents);
  const [, ...quotes] = content.split("\n> ");
  const quoteData = quotes.map((quote) => {
    const [text, author] = quote
      .split("\n— ")
      .map((str) => str.replace("\n", "").trim());
    return { text, author };
  });
  console.log("first author", quotes[0]);

  return {
    props: {
      quotes: quoteData,
    },
  };
}

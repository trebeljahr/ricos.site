import Layout from "../components/layout";
import fs from "fs/promises";
import { join } from "path";
import matter from "gray-matter";
import { Search, useSearch } from "../components/SearchBar";
import { ToTopButton } from "../components/ToTopButton";
import { UtteranceComments } from "../components/comments";
import { NewsletterForm } from "../components/newsletter-signup";

function toFilters({ author }: Quote) {
  return { author };
}

type Quote = {
  author: string;
  text: string;
};

type Props = {
  quotes: Quote[];
};

export default function Quotes({ quotes }: Props) {
  const { byFilters, filters, setFilters } = useSearch(quotes.map(toFilters));
  const filteredQuotes = quotes.filter(byFilters);

  return (
    <Layout
      pageTitle="Quotes"
      description="Here, on this page, I collect quotes I have found from all kinds of different sources. Books, movies, series, blog posts, whenever I find a phrase I really like, I put it here eventually."
    >
      <article>
        <section className="main-section">
          <Search setFilters={setFilters} filters={filters} />
          <h1>Quotes</h1>
          <p>Amount: {filteredQuotes.length}</p>
        </section>
        <section className="main-section">
          {filteredQuotes.map(({ author, text }, index) => {
            return (
              <div key={author + index} className="quote">
                <blockquote>
                  <p>{text}</p>
                </blockquote>
                <p>— {author}</p>
              </div>
            );
          })}
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
  const quotesSrc = join(process.cwd(), "src", "content", "pages", "quotes.md");
  const fileContents = await fs.readFile(quotesSrc, "utf-8");
  const { content } = matter(fileContents);
  const [, ...quotes] = content.split("\n> ");
  const quoteData = quotes.map((quote) => {
    const [text, author] = quote
      .split("\n– ")
      .map((str) => str.replace("\n", "").trim());
    return { text, author };
  });
  return {
    props: {
      quotes: quoteData,
    },
  };
}
